'use strict';
/**
 * TraceWise Auth Modal
 * Handles the login/register overlay shown before the student app loads.
 * Calls window.api (api.js must be loaded first).
 * Fires 'cp:logged-in' custom event when auth succeeds.
 */

(function () {
  // ─── Modal HTML ────────────────────────────────────────────────────────────
  const MODAL_HTML = `
    <div id="authModal" style="
      display:flex; position:fixed; inset:0;
      background:rgba(15,23,42,0.75); backdrop-filter:blur(4px);
      z-index:9999; align-items:center; justify-content:center;
      font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;
    ">
      <div style="
        background:#fff; border-radius:20px; padding:36px;
        width:100%; max-width:420px; box-shadow:0 25px 60px rgba(0,0,0,0.3);
        margin:16px;
      ">
        <div style="text-align:center; margin-bottom:28px;">
          <div style="font-size:40px; margin-bottom:8px;">🎯</div>
          <h1 style="margin:0 0 4px; font-size:26px; font-weight:800; color:#0f172a; letter-spacing:-0.5px;">Trace<span style="color:#4f46e5;">Wise</span></h1>
          <p style="margin:0; color:#64748b; font-size:14px;">Adaptive Code Learning for Everyone</p>
        </div>

        <!-- Tab buttons -->
        <div style="display:flex; background:#f3f4f6; border-radius:10px; padding:4px; margin-bottom:24px;">
          <button id="authTabLogin" onclick="AuthModal.showTab('login')" style="
            flex:1; padding:8px; border:none; border-radius:8px;
            font-size:14px; font-weight:600; cursor:pointer;
            background:#fff; color:#111827; box-shadow:0 1px 3px rgba(0,0,0,0.1);
          ">Sign In</button>
          <button id="authTabRegister" onclick="AuthModal.showTab('register')" style="
            flex:1; padding:8px; border:none; border-radius:8px;
            font-size:14px; font-weight:600; cursor:pointer;
            background:transparent; color:#6b7280;
          ">Create Account</button>
        </div>

        <!-- Login form -->
        <form id="authLoginForm" onsubmit="AuthModal.handleLogin(event)">
          <div style="margin-bottom:16px;">
            <label style="display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px;">Email</label>
            <input id="authEmail" type="email" placeholder="your@email.com" required style="
              width:100%; padding:10px 14px; border:1.5px solid #d1d5db; border-radius:10px;
              font-size:15px; outline:none; box-sizing:border-box;
            " onfocus="this.style.borderColor='#60a5fa'" onblur="this.style.borderColor='#d1d5db'" />
          </div>
          <div style="margin-bottom:20px;">
            <label style="display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px;">Password</label>
            <input id="authPassword" type="password" placeholder="••••••••" required style="
              width:100%; padding:10px 14px; border:1.5px solid #d1d5db; border-radius:10px;
              font-size:15px; outline:none; box-sizing:border-box;
            " onfocus="this.style.borderColor='#60a5fa'" onblur="this.style.borderColor='#d1d5db'" />
          </div>
          <button type="submit" id="authLoginBtn" style="
            width:100%; padding:12px; background:#3b82f6; color:#fff;
            border:none; border-radius:10px; font-size:15px; font-weight:600;
            cursor:pointer; transition:background 0.2s;
          " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
            Sign In →
          </button>
          <p style="text-align:center; margin-top:12px; font-size:13px; color:#6b7280;">
            Demo: <strong>student@tracewise.edu</strong> / <strong>password</strong>
          </p>
        </form>

        <!-- Register form (hidden by default) -->
        <form id="authRegisterForm" style="display:none;" onsubmit="AuthModal.handleRegister(event)">
          <div style="margin-bottom:16px;">
            <label style="display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px;">Username</label>
            <input id="authUsername" type="text" placeholder="yourname" required minlength="3" style="
              width:100%; padding:10px 14px; border:1.5px solid #d1d5db; border-radius:10px;
              font-size:15px; outline:none; box-sizing:border-box;
            " onfocus="this.style.borderColor='#60a5fa'" onblur="this.style.borderColor='#d1d5db'" />
          </div>
          <div style="margin-bottom:16px;">
            <label style="display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px;">Email</label>
            <input id="authRegEmail" type="email" placeholder="your@email.com" required style="
              width:100%; padding:10px 14px; border:1.5px solid #d1d5db; border-radius:10px;
              font-size:15px; outline:none; box-sizing:border-box;
            " onfocus="this.style.borderColor='#60a5fa'" onblur="this.style.borderColor='#d1d5db'" />
          </div>
          <div style="margin-bottom:20px;">
            <label style="display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px;">Password</label>
            <input id="authRegPassword" type="password" placeholder="Min. 8 characters" required minlength="8" style="
              width:100%; padding:10px 14px; border:1.5px solid #d1d5db; border-radius:10px;
              font-size:15px; outline:none; box-sizing:border-box;
            " onfocus="this.style.borderColor='#60a5fa'" onblur="this.style.borderColor='#d1d5db'" />
          </div>
          <button type="submit" id="authRegBtn" style="
            width:100%; padding:12px; background:#22c55e; color:#fff;
            border:none; border-radius:10px; font-size:15px; font-weight:600;
            cursor:pointer; transition:background 0.2s;
          " onmouseover="this.style.background='#16a34a'" onmouseout="this.style.background='#22c55e'">
            Create Account →
          </button>
        </form>

        <!-- Error message -->
        <div id="authError" style="
          display:none; margin-top:12px; padding:10px 14px;
          background:#fef2f2; border:1px solid #fecaca; border-radius:8px;
          color:#dc2626; font-size:14px; text-align:center;
        "></div>
      </div>
    </div>
  `;

  // ─── AuthModal Namespace ───────────────────────────────────────────────────
  window.AuthModal = {
    show() {
      if (!document.getElementById('authModal')) {
        document.body.insertAdjacentHTML('afterbegin', MODAL_HTML);
      }
      document.getElementById('authModal').style.display = 'flex';
    },

    hide() {
      const el = document.getElementById('authModal');
      if (el) el.style.display = 'none';
    },

    showTab(tab) {
      const isLogin = tab === 'login';
      document.getElementById('authLoginForm').style.display    = isLogin ? 'block' : 'none';
      document.getElementById('authRegisterForm').style.display = isLogin ? 'none' : 'block';
      document.getElementById('authTabLogin').style.background    = isLogin ? '#fff' : 'transparent';
      document.getElementById('authTabLogin').style.color         = isLogin ? '#111827' : '#6b7280';
      document.getElementById('authTabLogin').style.boxShadow     = isLogin ? '0 1px 3px rgba(0,0,0,0.1)' : 'none';
      document.getElementById('authTabRegister').style.background = isLogin ? 'transparent' : '#fff';
      document.getElementById('authTabRegister').style.color      = isLogin ? '#6b7280' : '#111827';
      document.getElementById('authTabRegister').style.boxShadow  = isLogin ? 'none' : '0 1px 3px rgba(0,0,0,0.1)';
      this.clearError();
    },

    showError(msg) {
      const el = document.getElementById('authError');
      el.textContent = msg;
      el.style.display = 'block';
    },

    clearError() {
      const el = document.getElementById('authError');
      if (el) el.style.display = 'none';
    },

    setLoading(btnId, loading) {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.disabled = loading;
      btn.textContent = loading ? 'Loading...' : btn.getAttribute('data-label') || btn.textContent;
    },

    async handleLogin(e) {
      e.preventDefault();
      this.clearError();
      const email    = document.getElementById('authEmail').value.trim();
      const password = document.getElementById('authPassword').value;
      const btn = document.getElementById('authLoginBtn');
      const origText = btn.textContent;
      btn.textContent = 'Signing in...'; btn.disabled = true;
      try {
        await window.api.login(email, password);
        this.hide();
        window.dispatchEvent(new CustomEvent('cp:logged-in'));
      } catch (err) {
        const messages = {
          invalid_credentials: 'Invalid email or password.',
          missing_fields:      'Please fill in all fields.',
        };
        this.showError(messages[err.code] || 'Login failed. Please try again.');
      } finally {
        btn.textContent = origText; btn.disabled = false;
      }
    },

    async handleRegister(e) {
      e.preventDefault();
      this.clearError();
      const username = document.getElementById('authUsername').value.trim();
      const email    = document.getElementById('authRegEmail').value.trim();
      const password = document.getElementById('authRegPassword').value;
      const btn = document.getElementById('authRegBtn');
      const origText = btn.textContent;
      btn.textContent = 'Creating account...'; btn.disabled = true;
      try {
        await window.api.register(username, email, password);
        this.hide();
        window.dispatchEvent(new CustomEvent('cp:logged-in'));
      } catch (err) {
        const messages = {
          username_or_email_taken: 'That username or email is already taken.',
          weak_password:           'Password must be at least 8 characters.',
          missing_fields:          'Please fill in all fields.',
        };
        this.showError(messages[err.code] || 'Registration failed. Please try again.');
      } finally {
        btn.textContent = origText; btn.disabled = false;
      }
    },
  };

  // ─── Auto-show on load if not logged in ───────────────────────────────────
  function checkAuth() {
    if (!window.api.isLoggedIn) {
      AuthModal.show();
    } else {
      window.dispatchEvent(new CustomEvent('cp:logged-in'));
    }
  }

  // Listen for auth-required events (e.g. token expired mid-session)
  window.addEventListener('cp:auth-required', () => {
    AuthModal.show();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
  } else {
    checkAuth();
  }
})();
