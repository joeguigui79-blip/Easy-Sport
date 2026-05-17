/**
 * route-guidance.js - Phase C: Guidance module (visual / vibration / voice)
 * Manages turn-by-turn guidance during a GPS session with planned route
 */

class RouteGuidanceClass {
  constructor() {
    this._mode = 'visual';  // 'visual' | 'vibration' | 'voice'
    this._muted = false;
    this._lastAlertDistM = null;   // distance at which we last alerted
    this._speechInitiated = false; // iOS requires user gesture for first speak
    this._voiceEnabled = false;
    this._vibrationSupported = ('vibrate' in navigator);
    this._speechSupported = ('speechSynthesis' in window);
    this._frVoice = null;
    this._offRouteAlerted = false;
  }

  // ---- Setup ----

  setMode(mode) {
    this._mode = mode;
    if (mode === 'voice') {
      this._voiceEnabled = true;
      this._initVoice();
    } else {
      this._voiceEnabled = false;
    }
    this._lastAlertDistM = null;
    this._offRouteAlerted = false;
  }

  setMuted(muted) {
    this._muted = muted;
    if (muted && this._speechSupported) {
      window.speechSynthesis.cancel();
    }
  }

  isMuted() { return this._muted; }

  _initVoice() {
    if (!this._speechSupported) return;
    // Find French voice
    const tryLoad = () => {
      const voices = window.speechSynthesis.getVoices();
      this._frVoice = voices.find(v => v.lang && v.lang.startsWith('fr')) || null;
    };
    tryLoad();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = tryLoad;
    }
  }

  // Must be called from a user-gesture click handler (for iOS)
  markUserGesture() {
    this._speechInitiated = true;
  }

  // ---- Main update call (from GPS position updates) ----

  /**
   * Called on each GPS position update while tracking with a route
   * @param {number} lat
   * @param {number} lng
   * @param {object} routePlanner  RoutePlannerClass instance
   * @returns {{ indicator: string, offRoute: boolean }}
   */
  update(lat, lng, routePlanner) {
    const result = { indicator: null, offRoute: false };

    // 1. Off-route check
    if (routePlanner.getCurrentRoute()) {
      const offRoute = routePlanner.isOffRoute(lat, lng);
      result.offRoute = offRoute;

      if (offRoute && !this._offRouteAlerted) {
        this._offRouteAlerted = true;
        this._triggerOffRoute();
      } else if (!offRoute) {
        this._offRouteAlerted = false;
      }
    }

    // 2. Next instruction
    const next = routePlanner.getNextInstruction(lat, lng);
    if (next) {
      const { instruction, distanceM } = next;
      const info = RoutePlannerClass.signInfo(instruction.sign);

      // Build indicator text
      if (distanceM < 15) {
        result.indicator = `${info.emoji} ${info.short}`;
      } else {
        result.indicator = `${info.emoji} ${info.short} dans ${this._fmtDist(distanceM)}`;
      }

      // Trigger alerts at thresholds
      this._checkThresholds(distanceM, instruction, info);
    } else {
      result.indicator = null;
    }

    return result;
  }

  _fmtDist(m) {
    if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
    if (m >= 100) return `${Math.round(m / 50) * 50} m`;
    return `${Math.round(m / 10) * 10} m`;
  }

  _checkThresholds(distM, instruction, info) {
    // Thresholds: 200m, 50m, 15m (on the turn)
    const thresholds = [200, 50, 15];

    for (const threshold of thresholds) {
      if (distM <= threshold && (this._lastAlertDistM === null || this._lastAlertDistM > threshold)) {
        this._lastAlertDistM = threshold;
        this._triggerTurn(threshold, instruction, info);
        break;
      }
    }

    // Reset when moved away from turn (> 300m)
    if (distM > 300) {
      this._lastAlertDistM = null;
    }
  }

  _triggerTurn(threshold, instruction, info) {
    if (instruction.sign === 4) return; // finish handled separately

    if (this._mode === 'vibration' || this._mode === 'voice') {
      if (this._mode === 'vibration') {
        this._vibrate(threshold);
      }
    }

    if (this._mode === 'voice' && !this._muted && this._speechInitiated) {
      let text;
      if (threshold === 200) {
        text = `Dans 200 mètres, ${info.text.toLowerCase()}`;
      } else if (threshold === 50) {
        text = info.text;
      } else {
        text = info.text;
      }
      this._speak(text);
    }
  }

  _vibrate(threshold) {
    if (!this._vibrationSupported) return;
    try {
      if (threshold === 200) {
        navigator.vibrate(100);
      } else if (threshold === 50) {
        navigator.vibrate(300);
      } else {
        navigator.vibrate([100, 80, 100]);
      }
    } catch (e) {
      // Silently ignore (iOS etc.)
    }
  }

  _speak(text) {
    if (!this._speechSupported || this._muted || !this._speechInitiated) return;
    try {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = 'fr-FR';
      if (this._frVoice) utt.voice = this._frVoice;
      utt.rate = 1.0;
      utt.pitch = 1.0;
      utt.volume = 1.0;
      window.speechSynthesis.speak(utt);
    } catch (e) {
      // Silently ignore
    }
  }

  _triggerOffRoute() {
    if (this._mode === 'vibration') {
      this._vibrate(50);
      setTimeout(() => this._vibrate(50), 400);
    }
    if (this._mode === 'voice' && !this._muted && this._speechInitiated) {
      this._speak('Vous vous êtes écarté de l\'itinéraire');
    }
  }

  // ---- Finish ----

  triggerFinish() {
    if (this._mode === 'vibration') {
      try {
        navigator.vibrate([200, 100, 200, 100, 400]);
      } catch (e) {}
    }
    if (this._mode === 'voice' && !this._muted && this._speechInitiated) {
      this._speak('Vous êtes arrivé, bravo !');
    }
  }

  reset() {
    this._lastAlertDistM = null;
    this._offRouteAlerted = false;
    if (this._speechSupported) {
      window.speechSynthesis.cancel();
    }
  }

  // ---- Capability info ----

  isVibrationSupported() { return this._vibrationSupported; }
  isSpeechSupported() { return this._speechSupported; }
}

const RouteGuidance = new RouteGuidanceClass();
