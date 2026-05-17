/**
 * gps-tracker.js - GPS tracking module for Easy Sport outdoor sessions
 * Phase B: watchPosition, distance, pace, elevation
 * Phase C: planned route display (blue polyline), waypoint marker, guidance update hook
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
    this._onGuidance = null; // callback(guidanceResult) - Phase C
    this._map = null;
    this._polyline = null;         // red - user trace
    this._routePolyline = null;    // blue - planned route
    this._waypointMarker = null;   // blue marker - next waypoint
    this._marker = null;           // position marker
    this._leafletAvailable = false;
    this._routePlanner = null;     // Phase C: injected planner
    this._routeGuidance = null;    // Phase C: injected guidance
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

  // ---- Map integration ----

  initMap(containerId) {
    console.log('[GPS] initMap called, containerId:', containerId);

    // Check Leaflet loaded
    if (typeof L === 'undefined') {
      console.warn('[GPS] Leaflet not available (L undefined)');
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
      this._routePolyline = null;
      this._waypointMarker = null;
      this._marker = null;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('[GPS] container #' + containerId + ' not found in DOM');
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

      tileLayer.on('tileerror', (e) => {
        console.warn('[GPS] tileerror:', e.tile ? e.tile.src : e);
      });

      tileLayer.addTo(this._map);

      // Blue polyline for planned route (Phase C) - drawn first (below)
      this._routePolyline = L.polyline([], {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.7,
        lineJoin: 'round',
        dashArray: null
      }).addTo(this._map);

      // Red polyline for user trace (Phase B)
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

      // Waypoint marker for next turn (Phase C)
      const waypointIcon = L.divIcon({
        className: '',
        html: '<div style="width:16px;height:16px;background:#3b82f6;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(59,130,246,0.8)"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      this._waypointMarker = L.marker([0, 0], { icon: waypointIcon, opacity: 0 }).addTo(this._map);

      // Force invalidateSize after overlay is fully painted
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (this._map) {
            const w = container.offsetWidth;
            const h = container.offsetHeight;
            console.log('[GPS] invalidateSize called, container: ' + w + 'x' + h);
            this._map.invalidateSize({ animate: false });
          }
        }, 50);
      });

    } catch (err) {
      console.error('[GPS] map init error:', err);
      return false;
    }

    return true;
  }

  // ---- Phase C: inject planned route onto map ----

  setPlannedRoute(routePoints) {
    if (!this._map || !this._leafletAvailable) return;
    if (!routePoints || !routePoints.length) {
      this._routePolyline.setLatLngs([]);
      return;
    }
    this._routePolyline.setLatLngs(routePoints);
    // Fit map to show whole route
    try {
      const bounds = this._routePolyline.getBounds();
      if (bounds.isValid()) {
        this._map.fitBounds(bounds, { padding: [20, 20] });
      }
    } catch (e) {}
  }

  clearPlannedRoute() {
    if (this._routePolyline) this._routePolyline.setLatLngs([]);
    if (this._waypointMarker) this._waypointMarker.setOpacity(0);
  }

  // ---- Phase C: attach planner + guidance ----

  attachGuidance(routePlanner, routeGuidance, onGuidance) {
    this._routePlanner = routePlanner;
    this._routeGuidance = routeGuidance;
    this._onGuidance = onGuidance;
  }

  detachGuidance() {
    this._routePlanner = null;
    this._routeGuidance = null;
    this._onGuidance = null;
  }

  _updateMap(lat, lng) {
    if (!this._map || !this._leafletAvailable) return;
    const latlng = [lat, lng];

    // Update red trace
    if (this._trace.length > 0) {
      const latLngs = this._trace.map(p => [p.lat, p.lng]);
      this._polyline.setLatLngs(latLngs);
    }

    this._marker.setLatLng(latlng);

    // Update waypoint marker (Phase C)
    if (this._routePlanner && this._routePlanner.getCurrentRoute()) {
      const next = this._routePlanner.getNextInstruction(lat, lng);
      if (next && next.instruction.sign !== 0 && next.instruction.sign !== 5) {
        this._waypointMarker.setLatLng([next.instruction.lat, next.instruction.lng]);
        this._waypointMarker.setOpacity(1);
      } else {
        this._waypointMarker.setOpacity(0);
      }
    }

    // Soft auto-pan
    const bounds = this._map.getBounds();
    if (!bounds.contains(latlng)) {
      this._map.panTo(latlng, { animate: true, duration: 0.5 });
    }
  }

  invalidateMapSize() {
    if (this._map) {
      setTimeout(() => {
        if (this._map) {
          console.log('[GPS] invalidateSize (post-fullscreen toggle)');
          this._map.invalidateSize({ animate: false });
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
    }, 1000);
  }

  pause() {
    if (this._state !== 'running') return;
    this._state = 'paused';
    this._pauseTs = Date.now();
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
      const dtSec = (point.ts - this._lastPoint.ts) / 1000;
      const speed = dtSec > 0 ? dist * 1000 / dtSec : 0;
      if (speed > 100) return; // filter GPS jump

      this._totalDistanceKm += dist;
    }

    this._trace.push(point);
    this._recentPoints.push(point);
    this._lastPoint = point;

    this._updateMap(lat, lng);

    // Phase C: guidance update
    if (this._routePlanner && this._routeGuidance) {
      const guidanceResult = this._routeGuidance.update(lat, lng, this._routePlanner);
      if (this._onGuidance) this._onGuidance(guidanceResult);
    }

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
