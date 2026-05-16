/**
 * gps-tracker.js - GPS tracking module for Easy Sport outdoor sessions (Phase B)
 * Handles watchPosition, distance calculation (Haversine), pace, elevation
 */

class GPSTracker {
  constructor() {
    this._watchId = null;
    this._state = 'idle'; // idle | running | paused | stopped
    this._trace = [];        // [{lat, lng, ts, alt}]
    this._pausedSegments = []; // [{start, end}] timestamps of paused periods
    this._activeDurationMs = 0; // ms of active (non-paused) time
    this._startTs = null;
    this._pauseTs = null;
    this._totalDistanceKm = 0;
    this._lastPoint = null;
    this._recentPoints = []; // for instantaneous pace (30s window)
    this._onUpdate = null;   // callback(stats)
    this._onError = null;    // callback(err)
    this._map = null;
    this._polyline = null;
    this._marker = null;
    this._leafletAvailable = false;
    // Debug panel counters
    this._dbg = { tilesOk: 0, tilesErr: 0, mapInit: null };
  }

  // ---- State ----

  getState() { return this._state; }
  isRunning() { return this._state === 'running'; }
  isPaused() { return this._state === 'paused'; }
  getTrace() { return this._trace; }
  getTotalDistanceKm() { return this._totalDistanceKm; }

  getActiveDurationMs() {
    if (this._state === 'running' && this._startTs) {
      return this._activeDurationMs + (Date.now() - (this._pauseTs || this._startTs));
    }
    return this._activeDurationMs;
  }

  getActiveDurationMin() {
    return this.getActiveDurationMs() / 60000;
  }

  // ---- Haversine distance ----

  _haversine(lat1, lng1, lat2, lng2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
  }

  // ---- Pace calculation ----

  _calcPaceStr(distKm, durationMin) {
    if (!distKm || distKm <= 0 || !durationMin || durationMin <= 0) return '--\'--"';
    const paceMinkm = durationMin / distKm;
    const paceMin = Math.floor(paceMinkm);
    const paceSec = Math.round((paceMinkm - paceMin) * 60);
    return `${paceMin}'${paceSec.toString().padStart(2, '0')}"`;
  }

  _calcInstantPace() {
    const now = Date.now();
    const windowMs = 30000; // 30s
    // Keep only points in last 30s
    this._recentPoints = this._recentPoints.filter(p => now - p.ts <= windowMs);
    if (this._recentPoints.length < 2) return null;
    const first = this._recentPoints[0];
    const last = this._recentPoints[this._recentPoints.length - 1];
    const dist = this._haversine(first.lat, first.lng, last.lat, last.lng);
    const durMin = (last.ts - first.ts) / 60000;
    return this._calcPaceStr(dist, durMin);
  }

  // ---- Elevation gain ----

  _calcElevationGain() {
    let gain = 0;
    for (let i = 1; i < this._trace.length; i++) {
      const prev = this._trace[i - 1];
      const curr = this._trace[i];
      if (prev.alt != null && curr.alt != null) {
        const diff = curr.alt - prev.alt;
        if (diff > 0) gain += diff;
      }
    }
    return Math.round(gain);
  }

  // ---- Stats snapshot ----

  getStats() {
    const distKm = this._totalDistanceKm;
    const durationMin = this.getActiveDurationMin();
    return {
      distanceKm: Math.round(distKm * 100) / 100,
      durationMin: Math.round(durationMin * 10) / 10,
      durationMs: this.getActiveDurationMs(),
      avgPace: this._calcPaceStr(distKm, durationMin),
      instantPace: this._calcInstantPace(),
      elevationM: this._calcElevationGain(),
      pointCount: this._trace.length,
      state: this._state
    };
  }

  // ---- Debug panel ----

  _updateDebugPanel() {
    const panel = document.getElementById('gps-debug-panel');
    if (!panel || panel.classList.contains('dbg-hidden')) return;

    const container = document.getElementById('tracking-map');
    const cw = container ? container.offsetWidth : 0;
    const ch = container ? container.offsetHeight : 0;

    // Get SW version from cache name if available
    let swVer = 'N/A';
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Will be filled async; use cached value
      swVer = window._swCacheName || 'actif';
    } else if ('serviceWorker' in navigator) {
      swVer = 'aucun SW';
    }

    const lines = [
      `Leaflet: ${typeof L !== 'undefined' ? 'L loaded ✓' : 'L MISSING ✗'}`,
      `Container: ${cw}x${ch} px`,
      `Map init: ${this._dbg.mapInit === null ? 'pas encore' : this._dbg.mapInit === true ? 'OK ✓' : 'FAIL ✗ ' + this._dbg.mapInitErr}`,
      `Tuiles: ${this._dbg.tilesOk} OK / ${this._dbg.tilesErr} err`,
      `SW: ${swVer}`,
      `GPS state: ${this._state} | pts: ${this._trace.length}`
    ];

    const content = panel.querySelector('#dbg-content');
    if (content) content.textContent = lines.join('\n');
  }

  createDebugPanel() {
    // Avoid duplicates
    const existing = document.getElementById('gps-debug-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'gps-debug-panel';
    panel.className = 'gps-debug-panel';
    panel.innerHTML = `
      <div class="dbg-header">
        <span class="dbg-title">DEBUG</span>
        <button id="dbg-copy-btn" class="dbg-btn" title="Copier les logs">Copier</button>
        <button id="dbg-close-btn" class="dbg-btn dbg-close" title="Fermer">X</button>
      </div>
      <pre id="dbg-content" class="dbg-content">Initialisation...</pre>
    `;

    panel.querySelector('#dbg-close-btn').addEventListener('click', () => {
      panel.classList.add('dbg-hidden');
    });

    panel.querySelector('#dbg-copy-btn').addEventListener('click', () => {
      const content = panel.querySelector('#dbg-content');
      const text = content ? content.textContent : '';
      const ua = navigator.userAgent;
      const full = `=== Easy Sport GPS Debug ===\n${text}\nUA: ${ua}\n===`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(full).then(() => {
          panel.querySelector('#dbg-copy-btn').textContent = 'Copie !';
          setTimeout(() => {
            const btn = panel.querySelector('#dbg-copy-btn');
            if (btn) btn.textContent = 'Copier';
          }, 2000);
        }).catch(() => this._fallbackCopy(full));
      } else {
        this._fallbackCopy(full);
      }
    });

    // Retrieve SW cache name asynchronously
    if ('caches' in window) {
      caches.keys().then(keys => {
        const sw = keys.find(k => k.startsWith('easy-sport'));
        if (sw) window._swCacheName = sw;
        this._updateDebugPanel();
      });
    }

    return panel;
  }

  _fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(ta);
  }

  // ---- Map integration ----

  initMap(containerId) {
    console.log('[GPS] initMap called, containerId:', containerId);

    // Reset debug counters
    this._dbg = { tilesOk: 0, tilesErr: 0, mapInit: null };

    // Check Leaflet loaded
    if (typeof L === 'undefined') {
      console.warn('[GPS] Leaflet not available (L undefined)');
      this._dbg.mapInit = false;
      this._dbg.mapInitErr = 'L undefined';
      this._updateDebugPanel();
      // Show visible error in container
      const cont = document.getElementById(containerId);
      if (cont) {
        cont.style.background = '#1a1a1a';
        cont.style.display = 'flex';
        cont.style.alignItems = 'center';
        cont.style.justifyContent = 'center';
        cont.innerHTML = '<div style="color:#f87171;text-align:center;padding:16px;font-size:13px">Leaflet non charge<br>Verifiez votre connexion internet</div>';
      }
      return false;
    }
    this._leafletAvailable = true;

    // Destroy previous map if exists
    if (this._map) {
      this._map.remove();
      this._map = null;
      this._polyline = null;
      this._marker = null;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('[GPS] container #' + containerId + ' not found in DOM');
      this._dbg.mapInit = false;
      this._dbg.mapInitErr = 'container missing';
      this._updateDebugPanel();
      return false;
    }
    const cw = container.offsetWidth;
    const ch = container.offsetHeight;
    console.log('[GPS] container size at init: ' + cw + 'x' + ch);

    try {
      this._map = L.map(containerId, {
        zoomControl: true,
        attributionControl: true
      }).setView([46.5, 2.5], 13);

      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
        subdomains: 'abc',
        crossOrigin: true
      });

      // Hook tile events for debug counters
      tileLayer.on('tileload', () => {
        this._dbg.tilesOk++;
        this._updateDebugPanel();
      });
      tileLayer.on('tileerror', (e) => {
        this._dbg.tilesErr++;
        console.warn('[GPS] tileerror:', e.tile ? e.tile.src : e);
        this._updateDebugPanel();
      });
      tileLayer.on('tileloadstart', () => {
        this._updateDebugPanel();
      });

      tileLayer.addTo(this._map);

      this._polyline = L.polyline([], {
        color: '#ef4444',
        weight: 4,
        opacity: 0.85,
        lineJoin: 'round'
      }).addTo(this._map);

      // Custom pulsing marker icon
      const pulseIcon = L.divIcon({
        className: 'gps-pulse-marker',
        html: '<div class="gps-pulse-ring"></div><div class="gps-pulse-dot"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      this._marker = L.marker([46.5, 2.5], { icon: pulseIcon }).addTo(this._map);

      this._dbg.mapInit = true;
      this._updateDebugPanel();

      // Force invalidateSize after overlay is fully painted (rAF + 50ms covers CSS transitions)
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (this._map) {
            const w = container.offsetWidth;
            const h = container.offsetHeight;
            console.log('[GPS] invalidateSize called, container: ' + w + 'x' + h);
            this._map.invalidateSize({ animate: false });
            this._updateDebugPanel();
          }
        }, 50);
      });

    } catch (err) {
      console.error('[GPS] map init error:', err);
      this._dbg.mapInit = false;
      this._dbg.mapInitErr = String(err).slice(0, 60);
      this._updateDebugPanel();
      return false;
    }

    return true;
  }

  _updateMap(lat, lng) {
    if (!this._map || !this._leafletAvailable) return;
    const latlng = [lat, lng];

    if (this._trace.length > 0) {
      const latLngs = this._trace.map(p => [p.lat, p.lng]);
      this._polyline.setLatLngs(latLngs);
    }

    this._marker.setLatLng(latlng);

    // Soft auto-pan (only if marker is near edge of view)
    const bounds = this._map.getBounds();
    if (!bounds.contains(latlng)) {
      this._map.panTo(latlng, { animate: true, duration: 0.5 });
    }
  }

  invalidateMapSize() {
    if (this._map) {
      // Wait for CSS transition (300ms on .tracking-map-wrapper) to complete
      setTimeout(() => {
        if (this._map) {
          console.log('[GPS] invalidateSize (post-fullscreen toggle)');
          this._map.invalidateSize({ animate: false });
          this._updateDebugPanel();
        }
      }, 350);
    }
  }

  // ---- Start / Pause / Resume / Stop ----

  start(onUpdate, onError) {
    if (!('geolocation' in navigator)) {
      if (onError) onError('GPS_UNAVAILABLE');
      return;
    }

    this._onUpdate = onUpdate;
    this._onError = onError;
    this._state = 'running';
    this._trace = [];
    this._activeDurationMs = 0;
    this._totalDistanceKm = 0;
    this._lastPoint = null;
    this._recentPoints = [];
    this._startTs = Date.now();
    this._pauseTs = null;

    this._watchId = navigator.geolocation.watchPosition(
      (pos) => this._onPosition(pos),
      (err) => this._onGeoError(err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );

    // Start live stats update interval
    this._statsInterval = setInterval(() => {
      if (this._state === 'running' && this._onUpdate) {
        this._onUpdate(this.getStats());
      }
      this._updateDebugPanel();
    }, 1000);
  }

  pause() {
    if (this._state !== 'running') return;
    this._state = 'paused';
    this._pauseTs = Date.now();
    // Accumulate active time up to now
    if (this._startTs) {
      this._activeDurationMs += Date.now() - this._startTs;
      this._startTs = null;
    }
  }

  resume() {
    if (this._state !== 'paused') return;
    this._state = 'running';
    this._startTs = Date.now();
    this._pauseTs = null;
  }

  stop() {
    if (this._watchId != null) {
      navigator.geolocation.clearWatch(this._watchId);
      this._watchId = null;
    }
    if (this._statsInterval) {
      clearInterval(this._statsInterval);
      this._statsInterval = null;
    }

    // Finalize duration
    if (this._state === 'running' && this._startTs) {
      this._activeDurationMs += Date.now() - this._startTs;
      this._startTs = null;
    }

    this._state = 'stopped';

    const finalStats = this.getStats();
    if (this._onUpdate) this._onUpdate(finalStats);
    return finalStats;
  }

  // ---- Position handler ----

  _onPosition(pos) {
    if (this._state !== 'running') return;

    const { latitude: lat, longitude: lng, altitude: alt, accuracy } = pos.coords;

    // Filter noisy points
    if (accuracy > 30) return;

    const point = { lat, lng, ts: Date.now(), alt: alt != null ? Math.round(alt) : null };

    if (this._lastPoint) {
      const dist = this._haversine(this._lastPoint.lat, this._lastPoint.lng, lat, lng);
      // Ignore implausible jumps (>100m/s ~ 360km/h)
      const dtSec = (point.ts - this._lastPoint.ts) / 1000;
      const speed = dtSec > 0 ? dist * 1000 / dtSec : 0;
      if (speed > 100) return; // filter GPS jump

      this._totalDistanceKm += dist;
    }

    this._trace.push(point);
    this._recentPoints.push(point);
    this._lastPoint = point;

    this._updateMap(lat, lng);

    if (this._onUpdate) this._onUpdate(this.getStats());
  }

  _onGeoError(err) {
    console.error('GPS error:', err);
    if (this._onError) {
      let msg = 'Erreur GPS';
      if (err.code === 1) msg = 'GPS_DENIED';
      else if (err.code === 2) msg = 'GPS_UNAVAILABLE';
      else if (err.code === 3) msg = 'GPS_TIMEOUT';
      this._onError(msg);
    }
  }

  // ---- Replay helper ----

  buildReplayLatLngs() {
    return this._trace.map(p => [p.lat, p.lng]);
  }

  destroy() {
    this.stop();
    if (this._map) {
      this._map.remove();
      this._map = null;
    }
  }
}

// Singleton
const GPS = new GPSTracker();
