/**
 * route-planner.js - Phase C: GraphHopper route generation + guidance logic
 * Handles API calls, instruction parsing, waypoint tracking, off-route detection
 */

const GRAPHHOPPER_KEY_LS = 'easy-sport.graphhopper-key';

// GraphHopper sign -> direction info
const GH_SIGNS = {
  '-7': { emoji: '↰', text: 'Demi-tour', short: 'Demi-tour' },
  '-3': { emoji: '↰', text: 'Virage serré à gauche', short: 'Serré gauche' },
  '-2': { emoji: '⬅️', text: 'Tournez à gauche', short: 'Gauche' },
  '-1': { emoji: '↖️', text: 'Légèrement à gauche', short: 'Lég. gauche' },
  '0':  { emoji: '⬆️', text: 'Tout droit', short: 'Tout droit' },
  '1':  { emoji: '↗️', text: 'Légèrement à droite', short: 'Lég. droite' },
  '2':  { emoji: '➡️', text: 'Tournez à droite', short: 'Droite' },
  '3':  { emoji: '↱', text: 'Virage serré à droite', short: 'Serré droite' },
  '4':  { emoji: '🏁', text: 'Arrivée', short: 'Arrivée' },
  '5':  { emoji: '⬆️', text: 'Continuez', short: 'Continuez' },
  '6':  { emoji: '🔄', text: 'Rond-point', short: 'Rond-point' },
  '7':  { emoji: '🔄', text: 'Sortie rond-point', short: 'Sortie' }
};

class RoutePlannerClass {
  constructor() {
    this._apiKey = null;
    this._currentRoute = null;  // {points: [[lat,lng],...], instructions: [...], distanceM, timeMs}
    this._waypoints = [];       // simplified instruction points
  }

  // ---- API Key management ----

  getApiKey() {
    if (!this._apiKey) {
      this._apiKey = localStorage.getItem(GRAPHHOPPER_KEY_LS) || null;
    }
    return this._apiKey;
  }

  saveApiKey(key) {
    this._apiKey = key.trim();
    localStorage.setItem(GRAPHHOPPER_KEY_LS, this._apiKey);
  }

  clearApiKey() {
    this._apiKey = null;
    localStorage.removeItem(GRAPHHOPPER_KEY_LS);
  }

  hasApiKey() {
    return !!this.getApiKey();
  }

  // ---- Route generation ----

  /**
   * Generate a round-trip route via GraphHopper
   * @param {number} lat
   * @param {number} lng
   * @param {number} distanceKm
   * @param {string} profile  'foot' | 'hike'
   * @param {string} pathType 'roads' | 'trails' | 'mix'
   * @param {number} seed     random seed (0-9999)
   * @returns {Promise<{points, instructions, distanceM, timeMs, distanceKm}>}
   */
  async generateRoute(lat, lng, distanceKm, profile, pathType, seed) {
    const key = this.getApiKey();
    if (!key) throw new Error('NO_API_KEY');

    const distM = Math.round(distanceKm * 1000);
    const ghProfile = (profile === 'hike') ? 'hike' : 'foot';

    let url = `https://graphhopper.com/api/1/route?point=${lat},${lng}&profile=${ghProfile}&algorithm=round_trip&round_trip.distance=${distM}&round_trip.seed=${seed}&points_encoded=false&instructions=true&key=${key}`;

    // Avoid features for road profile
    if (pathType === 'roads' && ghProfile === 'foot') {
      url += '&avoid_features=track,steps';
    }

    let resp;
    try {
      resp = await fetch(url);
    } catch (e) {
      throw new Error('NETWORK_ERROR');
    }

    if (resp.status === 401 || resp.status === 403) throw new Error('INVALID_KEY');
    if (resp.status === 429) throw new Error('QUOTA_EXCEEDED');
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error('API_ERROR: ' + resp.status + ' ' + body.slice(0, 200));
    }

    const data = await resp.json();
    if (!data.paths || !data.paths.length) throw new Error('NO_ROUTE');

    const path = data.paths[0];
    const points = path.points.coordinates.map(c => [c[1], c[0]]); // [lng,lat] -> [lat,lng]
    const instructions = (path.instructions || []).map(ins => {
      const pIdx = ins.interval ? ins.interval[0] : 0;
      const pt = points[pIdx] || [lat, lng];
      return {
        sign: ins.sign,
        text: ins.text,
        distanceM: Math.round(ins.distance),
        timeMs: ins.time,
        pointIndex: pIdx,
        lat: pt[0],
        lng: pt[1]
      };
    });

    this._currentRoute = {
      points,
      instructions,
      distanceM: Math.round(path.distance),
      timeMs: path.time,
      distanceKm: Math.round(path.distance / 100) / 10
    };

    this._buildWaypoints();
    return this._currentRoute;
  }

  _buildWaypoints() {
    if (!this._currentRoute) return;
    // Keep only turning instructions (not straight/continue)
    this._waypoints = this._currentRoute.instructions
      .filter(ins => ins.sign !== 0 && ins.sign !== 5)
      .map(ins => ({ ...ins, reached: false }));
  }

  getCurrentRoute() { return this._currentRoute; }
  getWaypoints() { return this._waypoints; }
  clearRoute() { this._currentRoute = null; this._waypoints = []; }

  // ---- Haversine distance (meters) ----

  distanceM(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
  }

  // ---- Nearest point on route ----

  /**
   * Find closest point on the route polyline to given position
   * Returns { distM, segmentIndex }
   */
  nearestOnRoute(lat, lng) {
    if (!this._currentRoute || !this._currentRoute.points.length) return null;
    const pts = this._currentRoute.points;
    let minDist = Infinity;
    let minIdx = 0;
    for (let i = 0; i < pts.length; i++) {
      const d = this.distanceM(lat, lng, pts[i][0], pts[i][1]);
      if (d < minDist) { minDist = d; minIdx = i; }
    }
    return { distM: minDist, segmentIndex: minIdx };
  }

  /**
   * Check if user is off route (> 30m from nearest point)
   */
  isOffRoute(lat, lng) {
    const nearest = this.nearestOnRoute(lat, lng);
    if (!nearest) return false;
    return nearest.distM > 30;
  }

  // ---- Next waypoint / instruction ----

  /**
   * Get the next upcoming instruction ahead on the route
   * Returns { instruction, distanceM } or null
   */
  getNextInstruction(lat, lng) {
    if (!this._currentRoute) return null;
    const nearest = this.nearestOnRoute(lat, lng);
    if (!nearest) return null;
    const curIdx = nearest.segmentIndex;

    // Find next instruction whose pointIndex is ahead of current position
    for (const ins of this._currentRoute.instructions) {
      if (ins.pointIndex >= curIdx) {
        const distM = this.distanceM(lat, lng, ins.lat, ins.lng);
        // Skip if we're already past it (< 10m) and it's not the finish
        if (distM < 10 && ins.sign !== 4) continue;
        return { instruction: ins, distanceM: Math.round(distM) };
      }
    }
    return null;
  }

  // ---- Sign to display info ----

  static signInfo(sign) {
    const s = String(sign);
    return GH_SIGNS[s] || { emoji: '⬆️', text: 'Continuez', short: 'Continuez' };
  }

  // ---- Estimated time (walking/running) ----

  static estimatedTime(distanceM, profile) {
    // walking ~5km/h = 12min/km, hiking/trail ~15min/km average
    const minPerKm = (profile === 'hike') ? 15 : 12;
    const totalMin = Math.round(distanceM / 1000 * minPerKm);
    if (totalMin >= 60) {
      return `${Math.floor(totalMin / 60)}h${(totalMin % 60).toString().padStart(2, '0')}`;
    }
    return `${totalMin} min`;
  }
}

// Singleton
const RoutePlanner = new RoutePlannerClass();
