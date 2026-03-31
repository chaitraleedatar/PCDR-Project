'use strict';
/**
 * TraceWise WebSocket Client with reconnect
 * Used by the teacher dashboard (dashboard.html) only.
 */
class WsClient {
  constructor(handlers = {}) {
    this._handlers     = handlers; // { onMessage, onOpen, onClose, onError }
    this._ws           = null;
    this._retries      = 0;
    this._maxRetries   = 10;
    this._closed       = false; // true when intentionally closed
  }

  connect() {
    if (this._closed) return;
    const url = window.api.getWsUrl();
    console.log('[WS] Connecting to', url);
    this._ws = new WebSocket(url);

    this._ws.onopen = () => {
      console.log('[WS] Connected');
      this._retries = 0;
      if (this._handlers.onOpen) this._handlers.onOpen();
    };

    this._ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (this._handlers.onMessage) this._handlers.onMessage(msg);
      } catch (err) {
        console.warn('[WS] Parse error:', err.message);
      }
    };

    this._ws.onclose = (event) => {
      console.log(`[WS] Closed (code: ${event.code})`);
      if (this._handlers.onClose) this._handlers.onClose(event);
      if (!this._closed && event.code !== 4001) {
        this._scheduleReconnect();
      }
    };

    this._ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      if (this._handlers.onError) this._handlers.onError(err);
    };
  }

  _scheduleReconnect() {
    if (this._retries >= this._maxRetries) {
      console.error('[WS] Max retries reached. Give up reconnecting.');
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, this._retries), 30000);
    this._retries++;
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this._retries})`);
    setTimeout(() => this.connect(), delay);
  }

  send(data) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(data));
    }
  }

  close() {
    this._closed = true;
    if (this._ws) this._ws.close(1000, 'Client closed');
  }
}

window.WsClient = WsClient;
