/**
 * auth.js - Verrou d'acces par mot de passe partage
 * Mot de passe verifie cote client uniquement (protection contre les curieux).
 * Session valide jusqu'a fermeture du navigateur (sessionStorage).
 */

const AuthManager = {
  // SHA-256 de 'easy-sport-2024:easysport2024'
  _HASH: '996064c51ffbcc10f37039c2a425ba6ff8bdc8cc656abd2ec35c774c821818e5',

  async _hash(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode('easy-sport-2024:' + password);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  /* Retourne immediatement si deja authentifiee dans cette session */
  async init() {
    if (sessionStorage.getItem('authenticated') === '1') return;
    await this._showLockScreen();
  },

  _showLockScreen() {
    return new Promise(resolve => {
      const overlay = this._buildOverlay();
      document.body.appendChild(overlay);

      const input = overlay.querySelector('#auth-input');
      const btn   = overlay.querySelector('#auth-btn');
      const error = overlay.querySelector('#auth-error');

      const attempt = async () => {
        const password = input.value;
        const hash = await this._hash(password);
        if (hash === this._HASH) {
          sessionStorage.setItem('authenticated', '1');
          overlay.querySelector('.auth-inner').classList.add('auth-success');
          setTimeout(() => {
            overlay.remove();
            resolve();
          }, 400);
        } else {
          input.value = '';
          error.classList.remove('hidden');
          this._shake(overlay);
          input.focus();
        }
      };

      btn.addEventListener('click', attempt);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') attempt();
        if (!error.classList.contains('hidden')) error.classList.add('hidden');
      });
      input.addEventListener('input', () => {
        if (!error.classList.contains('hidden')) error.classList.add('hidden');
      });

      setTimeout(() => input.focus(), 100);
    });
  },

  _shake(overlay) {
    const inner = overlay.querySelector('.auth-inner');
    inner.classList.remove('auth-shake');
    void inner.offsetWidth;
    inner.classList.add('auth-shake');
    inner.addEventListener('animationend', () => inner.classList.remove('auth-shake'), { once: true });
  },

  _buildOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'auth-overlay';
    overlay.innerHTML = `
      <div class="auth-inner">
        <div class="auth-logo">
          <svg width="72" height="72" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="40" fill="url(#authGrad)"/>
            <path d="M22 40h8l4-12 8 24 4-12h12" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
            <defs>
              <linearGradient id="authGrad" x1="0" y1="0" x2="80" y2="80">
                <stop stop-color="#e040fb"/>
                <stop offset="1" stop-color="#7c3aed"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 class="auth-title">Easy Sport</h1>
        <p class="auth-subtitle">Entrez le mot de passe pour continuer</p>

        <div class="auth-form">
          <div class="auth-input-wrap">
            <svg class="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <input
              id="auth-input"
              type="password"
              class="auth-input"
              placeholder="Mot de passe"
              autocomplete="current-password"
              spellcheck="false"
            />
          </div>
          <p id="auth-error" class="auth-error hidden">Mot de passe incorrect</p>
          <button id="auth-btn" class="auth-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Entrer
          </button>
        </div>
      </div>
    `;
    return overlay;
  }
};
