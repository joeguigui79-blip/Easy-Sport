/**
 * pin.js - Gestionnaire de PIN pour Easy Sport
 * PIN 4-6 chiffres, haché SHA-256, stocké dans IndexedDB (settings > 'pin')
 */

const PinManager = {
  _unlocked: false,

  /* ---- Point d'entrée ---- */
  async init() {
    const storedHash = await DB.getSetting('pin');
    if (!storedHash) {
      await this._showSetupFlow();
    } else {
      await this._showEntryFlow(storedHash);
    }
    this._unlocked = true;
  },

  /* ---- Hachage SHA-256 ---- */
  async _hash(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode('easy-sport-2024:' + pin);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  /* ========== FLUX CREATION (premier lancement) ========== */
  _showSetupFlow() {
    return new Promise(resolve => {
      const overlay = this._buildOverlay();
      document.body.appendChild(overlay);

      let step = 1;   // 1 = saisie, 2 = confirmation
      let firstPin = '';

      const setHeader = (title, sub) => {
        overlay.querySelector('.pin-title').textContent = title;
        overlay.querySelector('.pin-subtitle').textContent = sub;
      };

      setHeader('Créer votre PIN', 'Choisissez un code à 4-6 chiffres');

      this._attachKeypad(overlay, async (pin) => {
        if (step === 1) {
          firstPin = pin;
          step = 2;
          setHeader('Confirmer le PIN', 'Entrez à nouveau votre PIN');
        } else {
          if (pin === firstPin) {
            const hash = await this._hash(pin);
            await DB.setSetting('pin', hash);
            this._animateSuccess(overlay, () => {
              overlay.remove();
              resolve();
            });
          } else {
            this._shakeError(overlay);
            step = 1;
            firstPin = '';
            setHeader('Créer votre PIN', 'Code différent, recommencez');
          }
        }
      });
    });
  },

  /* ========== FLUX SAISIE (lancements suivants) ========== */
  _showEntryFlow(storedHash) {
    return new Promise(resolve => {
      const overlay = this._buildOverlay();
      document.body.appendChild(overlay);

      overlay.querySelector('.pin-title').textContent = 'Easy Sport';
      overlay.querySelector('.pin-subtitle').textContent = 'Entrez votre PIN';

      this._attachKeypad(overlay, async (pin) => {
        const hash = await this._hash(pin);
        if (hash === storedHash) {
          this._animateSuccess(overlay, () => {
            overlay.remove();
            resolve();
          });
        } else {
          this._shakeError(overlay);
        }
      });
    });
  },

  /* ========== FLUX CHANGEMENT DE PIN ========== */
  changePin() {
    return new Promise(async resolve => {
      const storedHash = await DB.getSetting('pin');
      const overlay = this._buildOverlay();
      document.body.appendChild(overlay);

      let step = 1;   // 1=vérif actuel, 2=nouveau, 3=confirmation
      let newPin = '';

      const setHeader = (title, sub) => {
        overlay.querySelector('.pin-title').textContent = title;
        overlay.querySelector('.pin-subtitle').textContent = sub;
      };

      // Bouton annuler
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'pin-cancel-btn';
      cancelBtn.textContent = 'Annuler';
      cancelBtn.addEventListener('click', () => {
        overlay.remove();
        resolve(false);
      });
      overlay.querySelector('.pin-inner').appendChild(cancelBtn);

      // Si pas de PIN existant, on saute la vérif
      if (!storedHash) {
        step = 2;
        setHeader('Nouveau PIN', 'Choisissez un code à 4-6 chiffres');
      } else {
        setHeader('Votre PIN actuel', 'Entrez votre code actuel');
      }

      this._attachKeypad(overlay, async (pin) => {
        if (step === 1) {
          const hash = await this._hash(pin);
          if (hash === storedHash) {
            step = 2;
            setHeader('Nouveau PIN', 'Choisissez un code à 4-6 chiffres');
          } else {
            this._shakeError(overlay);
          }
        } else if (step === 2) {
          newPin = pin;
          step = 3;
          setHeader('Confirmer le PIN', 'Entrez à nouveau votre nouveau PIN');
        } else {
          if (pin === newPin) {
            const hash = await this._hash(pin);
            await DB.setSetting('pin', hash);
            this._animateSuccess(overlay, () => {
              overlay.remove();
              resolve(true);
            });
          } else {
            this._shakeError(overlay);
            step = 2;
            newPin = '';
            setHeader('Nouveau PIN', 'Code différent, recommencez');
          }
        }
      });
    });
  },

  /* ========== CONSTRUCTION DU DOM ========== */
  _buildOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'pin-overlay';
    overlay.innerHTML = `
      <div class="pin-inner">
        <div class="pin-logo">
          <svg width="64" height="64" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="40" fill="url(#pinGrad)"/>
            <path d="M22 40h8l4-12 8 24 4-12h12" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
            <defs>
              <linearGradient id="pinGrad" x1="0" y1="0" x2="80" y2="80">
                <stop stop-color="#e040fb"/>
                <stop offset="1" stop-color="#7c3aed"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 class="pin-title">Easy Sport</h1>
        <p class="pin-subtitle">Entrez votre PIN</p>

        <div class="pin-dots">
          <div class="pin-dot"></div>
          <div class="pin-dot"></div>
          <div class="pin-dot"></div>
          <div class="pin-dot"></div>
          <div class="pin-dot"></div>
          <div class="pin-dot"></div>
        </div>

        <div class="pin-keypad">
          <button class="pin-key" data-digit="1" aria-label="1">1</button>
          <button class="pin-key" data-digit="2" aria-label="2">2</button>
          <button class="pin-key" data-digit="3" aria-label="3">3</button>
          <button class="pin-key" data-digit="4" aria-label="4">4</button>
          <button class="pin-key" data-digit="5" aria-label="5">5</button>
          <button class="pin-key" data-digit="6" aria-label="6">6</button>
          <button class="pin-key" data-digit="7" aria-label="7">7</button>
          <button class="pin-key" data-digit="8" aria-label="8">8</button>
          <button class="pin-key" data-digit="9" aria-label="9">9</button>
          <div class="pin-key-empty"></div>
          <button class="pin-key" data-digit="0" aria-label="0">0</button>
          <button class="pin-key pin-key-del" id="pin-del" aria-label="Effacer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              <line x1="18" y1="9" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="12" y1="9" x2="18" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    return overlay;
  },

  /* ---- Logique clavier ---- */
  _attachKeypad(overlay, onComplete) {
    const MIN = 4;
    const MAX = 6;
    let current = '';
    let submitTimer = null;
    let submitting = false;

    const dots = overlay.querySelectorAll('.pin-dot');

    const updateDots = () => {
      dots.forEach((dot, i) => {
        dot.classList.toggle('filled', i < current.length);
        dot.classList.toggle('active', i === current.length - 1 && current.length > 0);
      });
    };

    const reset = () => {
      current = '';
      submitting = false;
      clearTimeout(submitTimer);
      dots.forEach(d => d.classList.remove('filled', 'active'));
    };

    // Expose reset so callers can reset after shakeError
    overlay._resetInput = reset;

    const trySubmit = async () => {
      if (submitting) return;
      const pin = current;
      reset();
      submitting = false;
      await onComplete(pin);
    };

    overlay.querySelectorAll('.pin-key[data-digit]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (submitting || current.length >= MAX) return;
        current += btn.dataset.digit;
        updateDots();
        clearTimeout(submitTimer);
        if (current.length >= MIN) {
          // Auto-submit after a short pause (allows entering more digits up to MAX)
          submitTimer = setTimeout(trySubmit, current.length === MAX ? 150 : 500);
        }
      });
    });

    overlay.querySelector('#pin-del').addEventListener('click', () => {
      if (submitting) return;
      clearTimeout(submitTimer);
      if (current.length > 0) {
        current = current.slice(0, -1);
        updateDots();
      }
    });
  },

  /* ---- Helpers animation ---- */
  _resetDots(overlay) {
    if (overlay._resetInput) {
      overlay._resetInput();
    } else {
      overlay.querySelectorAll('.pin-dot').forEach(d => d.classList.remove('filled', 'active'));
    }
  },

  _shakeError(overlay) {
    this._resetDots(overlay);
    const dotsEl = overlay.querySelector('.pin-dots');
    dotsEl.classList.remove('pin-shake');
    void dotsEl.offsetWidth; // reflow
    dotsEl.classList.add('pin-shake');
    dotsEl.addEventListener('animationend', () => dotsEl.classList.remove('pin-shake'), { once: true });
  },

  _animateSuccess(overlay, callback) {
    overlay.querySelector('.pin-inner').classList.add('pin-success');
    setTimeout(callback, 400);
  }
};
