'use strict';

/**
 * ColorPath API Client
 * Handles auth tokens, request queuing, event batching, and all HTTP calls.
 * Used by both student app (index.html) and teacher dashboard (dashboard.html).
 */
class ApiClient {
  constructor() {
    this.baseUrl = window.location.origin;
    this._accessToken = localStorage.getItem('cp_access_token') || null;
    this._refreshToken = localStorage.getItem('cp_refresh_token') || null;
    this._user = JSON.parse(localStorage.getItem('cp_user') || 'null');
    this._eventQueue = [];
    this._sessionId = null;
    this._flushTimer = null;
    this._stepStartTime = Date.now();
    this._refreshPromise = null; // deduplicate concurrent refresh calls
  }

  // ─── Auth State ────────────────────────────────────────────────────────────

  get user() { return this._user; }
  get isLoggedIn() { return !!this._accessToken && !!this._user; }

  _saveTokens(accessToken, refreshToken, user) {
    this._accessToken  = accessToken;
    this._refreshToken = refreshToken;
    this._user         = user;
    localStorage.setItem('cp_access_token',  accessToken);
    if (refreshToken) localStorage.setItem('cp_refresh_token', refreshToken);
    localStorage.setItem('cp_user', JSON.stringify(user));
  }

  _clearTokens() {
    this._accessToken  = null;
    this._refreshToken = null;
    this._user         = null;
    this._sessionId    = null;
    localStorage.removeItem('cp_access_token');
    localStorage.removeItem('cp_refresh_token');
    localStorage.removeItem('cp_user');
  }

  // ─── HTTP ──────────────────────────────────────────────────────────────────

  async _request(method, path, body, retried = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (this._accessToken) headers['Authorization'] = `Bearer ${this._accessToken}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    // Attempt token refresh on 401
    if (res.status === 401 && !retried && this._refreshToken) {
      const refreshed = await this._tryRefresh();
      if (refreshed) return this._request(method, path, body, true);
      this._clearTokens();
      window.dispatchEvent(new CustomEvent('cp:auth-required'));
      throw Object.assign(new Error('Authentication required'), { code: 'auth_required' });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'unknown_error' }));
      throw Object.assign(new Error(err.error || err.message || 'Request failed'), {
        status: res.status,
        code: err.error,
        data: err,
      });
    }

    if (res.status === 204) return null;
    return res.json();
  }

  async _tryRefresh() {
    if (!this._refreshToken) return false;
    // Deduplicate concurrent refresh calls
    if (this._refreshPromise) return this._refreshPromise;
    this._refreshPromise = (async () => {
      try {
        const data = await this._request('POST', '/api/auth/refresh', { refreshToken: this._refreshToken }, true);
        this._accessToken = data.accessToken;
        localStorage.setItem('cp_access_token', data.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        this._refreshPromise = null;
      }
    })();
    return this._refreshPromise;
  }

  get(path)          { return this._request('GET',    path); }
  post(path, body)   { return this._request('POST',   path, body); }
  patch(path, body)  { return this._request('PATCH',  path, body); }
  delete(path)       { return this._request('DELETE', path); }

  // ─── Auth API ──────────────────────────────────────────────────────────────

  async register(username, email, password) {
    const data = await this.post('/api/auth/register', { username, email, password });
    this._saveTokens(data.accessToken, data.refreshToken, data.user);
    return data.user;
  }

  async login(email, password) {
    const data = await this.post('/api/auth/login', { email, password });
    this._saveTokens(data.accessToken, data.refreshToken, data.user);
    return data.user;
  }

  async logout() {
    try {
      await this.post('/api/auth/logout', { refreshToken: this._refreshToken });
    } catch (_) {}
    this._clearTokens();
  }

  // ─── Problems API ──────────────────────────────────────────────────────────

  async getProblems() {
    return this.get('/api/problems');
  }

  async getProblem(id) {
    return this.get(`/api/problems/${id}`);
  }

  async createProblem(data) {
    return this.post('/api/problems', data);
  }

  async togglePublish(id, isPublished) {
    return this.patch(`/api/problems/${id}/publish`, { is_published: isPublished });
  }

  // ─── Session API ───────────────────────────────────────────────────────────

  async startSession(problemId) {
    const data = await this.post('/api/sessions', { problemId });
    this._sessionId = data.sessionId;
    this._stepStartTime = Date.now();
    return data.sessionId;
  }

  async completeSession(stats) {
    if (!this._sessionId) return;
    // Flush any remaining queued events first
    await this.flushEvents();
    try {
      await this.patch(`/api/sessions/${this._sessionId}/complete`, stats);
    } catch (err) {
      console.warn('[API] completeSession error:', err.message);
    }
    this._sessionId = null;
  }

  getSessions() {
    return this.get('/api/sessions');
  }

  // ─── Event Queue ───────────────────────────────────────────────────────────

  /**
   * Mark the start of a new step (reset latency timer).
   */
  markStepStart() {
    this._stepStartTime = Date.now();
  }

  /**
   * Queue a step event for batch submission.
   * @param {object} event
   */
  queueEvent(event) {
    if (!this._sessionId) return;
    this._eventQueue.push({
      ...event,
      latencyMs: Date.now() - this._stepStartTime,
    });
    // Auto-flush on correct answer or every 5 events
    if (event.eventType === 'mc_correct' || this._eventQueue.length >= 5) {
      this.flushEvents();
    }
  }

  /**
   * Send all queued events to the backend.
   */
  async flushEvents() {
    if (!this._sessionId || this._eventQueue.length === 0) return;
    const batch = this._eventQueue.splice(0);
    try {
      await this.post('/api/events', { sessionId: this._sessionId, events: batch });
    } catch (err) {
      console.warn('[API] Event flush error:', err.message);
      // Re-queue on failure (avoid infinite loop by not retrying more than once)
    }
  }

  // ─── Hints API ─────────────────────────────────────────────────────────────

  /**
   * Request an LLM-generated hint for a struggling student.
   * Falls back to stepExplain automatically on server error.
   */
  async requestHint({ stepIndex, phase, question, wrongAnswers, conceptTag, formula, stepExplain }) {
    if (!this._sessionId) return { hint: stepExplain, source: 'offline' };
    try {
      return await this.post('/api/hints', {
        sessionId: this._sessionId,
        stepIndex,
        phase,
        question,
        wrongAnswers,
        conceptTag,
        formula,
        stepExplain,
      });
    } catch (err) {
      console.warn('[API] Hint request failed:', err.message);
      return { hint: stepExplain || 'Review the step carefully and try again.', source: 'static' };
    }
  }

  // ─── Mastery API ───────────────────────────────────────────────────────────

  getMyMastery() {
    return this.get('/api/mastery/me');
  }

  // ─── Dashboard API (teacher/admin) ─────────────────────────────────────────

  getClassView() {
    return this.get('/api/dashboard/class');
  }

  getHeatmap(since) {
    const q = since ? `?since=${since}` : '';
    return this.get(`/api/dashboard/heatmap${q}`);
  }

  getStudents() {
    return this.get('/api/dashboard/students');
  }

  getStudentProfile(userId) {
    return this.get(`/api/dashboard/student/${userId}`);
  }

  // ─── WebSocket URL ─────────────────────────────────────────────────────────

  getWsUrl() {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = this._accessToken || '';
    return `${proto}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
  }
}

// Singleton export
window.api = new ApiClient();
