/**
 * outdoor.js - Gestion des seances de sport exterieur
 * Phase A: saisie manuelle
 * Phase B: GPS tracking
 * Phase C: itineraires GraphHopper + guidage + favoris
 */

// ============================================================
// DEFAULT outdoor activities (seed / fallback)
// ============================================================
const OUTDOOR_ACTIVITIES_DEFAULT = [
  { id: 'running', label: 'Course a pied', icon: '🏃' },
  { id: 'walk_fast', label: 'Marche rapide', icon: '🚶' },
  { id: 'nordic_walk', label: 'Marche nordique', icon: '🥾' },
  { id: 'trail', label: 'Trail', icon: '⛰️' },
  { id: 'cycling_road', label: 'Velo de route', icon: '🚴' },
  { id: 'cycling_mtb', label: 'VTT', icon: '🏔️' },
  { id: 'swimming_open', label: 'Natation en eau libre', icon: '🏊' },
  { id: 'swimming_outdoor', label: 'Natation en piscine ext.', icon: '🏊‍♀️' },
  { id: 'hiking', label: 'Randonnee pedestre', icon: '🥾' },
  { id: 'sprint', label: 'Sprint / fractionne', icon: '⚡' },
  { id: 'roller', label: 'Roller / patin a roulettes', icon: '⛸️' },
  { id: 'rowing', label: 'Aviron / kayak / canoe', icon: '🚣' },
  { id: 'sup', label: 'Stand-up paddle (SUP)', icon: '🏄' },
  { id: 'climbing_outdoor', label: 'Escalade ext. / via ferrata', icon: '🧗' },
  { id: 'orienteering', label: 'Course d\'orientation', icon: '🧭' },
  { id: 'street_workout', label: 'Parcours sportif / street workout', icon: '🤸' },
  { id: 'boxing_outdoor', label: 'Boxe en exterieur', icon: '🥊' },
  { id: 'crossfit_outdoor', label: 'Crossfit / HIIT en exterieur', icon: '🔥' }
];

// Keep backward-compat alias (used in legacy code referencing OUTDOOR_ACTIVITIES directly)
const OUTDOOR_ACTIVITIES = OUTDOOR_ACTIVITIES_DEFAULT;

// ============================================================
// Persistence helpers — localStorage
// ============================================================
const OUTDOOR_ACTIVITIES_KEY = 'easy-sport.outdoor-activities-custom';

/**
 * Returns the effective list of outdoor activities.
 * If the user has customized the list, that list is returned.
 * Otherwise, the 18 defaults are used.
 */
function getOutdoorActivities() {
  try {
    const raw = localStorage.getItem(OUTDOOR_ACTIVITIES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return OUTDOOR_ACTIVITIES_DEFAULT.slice();
}

/**
 * Adds a custom activity and persists the list.
 * @param {{ id: string, label: string, icon: string }} activity
 */
function addOutdoorActivity(activity) {
  const list = getOutdoorActivities();
  // Avoid duplicate id
  if (list.some(a => a.id === activity.id)) return;
  list.push(activity);
  localStorage.setItem(OUTDOOR_ACTIVITIES_KEY, JSON.stringify(list));
}

/**
 * Removes an activity by id and persists the list.
 * If no custom list exists yet, initializes from defaults then removes.
 * @param {string} id
 */
function deleteOutdoorActivity(id) {
  let list = getOutdoorActivities();
  // If list hasn't been customized yet, initialize it first
  if (!localStorage.getItem(OUTDOOR_ACTIVITIES_KEY)) {
    localStorage.setItem(OUTDOOR_ACTIVITIES_KEY, JSON.stringify(list));
  }
  list = list.filter(a => a.id !== id);
  localStorage.setItem(OUTDOOR_ACTIVITIES_KEY, JSON.stringify(list));
}

class OutdoorManager {
  constructor() {
    this._sessions = [];
    this._routes = [];
    this._activeTrackingActivity = null;
    this._mapFullscreen = false;
    this._statsTimer = null;
    this._activeRoute = null;      // Phase C: currently loaded route
    this._guidanceMode = 'visual'; // visual | vibration | voice
  }

  async init() {
    await this.refresh();
  }

  async refresh() {
    this._sessions = await DB.getAllOutdoorSessions();
    this._sessions.sort((a, b) => b.date - a.date);
    this._routes = await DB.getAllOutdoorRoutes();
    return this._sessions;
  }

  getAll() { return this._sessions; }
  getRoutes() { return this._routes; }

  getActivityLabel(id) {
    const activities = getOutdoorActivities();
    const a = activities.find(x => x.id === id);
    // Graceful fallback: show raw id if unknown (sessions with deleted types are preserved)
    return a ? a.label : id;
  }

  getActivityIcon(id) {
    const activities = getOutdoorActivities();
    const a = activities.find(x => x.id === id);
    return a ? a.icon : '🏃';
  }

  calcPace(distKm, durationMin) {
    if (!distKm || distKm <= 0 || !durationMin || durationMin <= 0) return null;
    const paceMinkm = durationMin / distKm;
    const paceMin = Math.floor(paceMinkm);
    const paceSec = Math.round((paceMinkm - paceMin) * 60);
    return `${paceMin}'${paceSec.toString().padStart(2, '0')}"`;
  }

  async add(data) {
    const session = {
      ...data,
      category: 'exterieur',
      date: data.date || Date.now()
    };
    if (session.distanceKm && session.durationMin && !session.pace) {
      session.pace = this.calcPace(session.distanceKm, session.durationMin);
    }
    const id = await DB.addOutdoorSession(session);
    await this.refresh();
    return id;
  }

  async update(session) {
    if (session.distanceKm && session.durationMin) {
      session.pace = this.calcPace(session.distanceKm, session.durationMin);
    }
    await DB.updateOutdoorSession(session);
    await this.refresh();
  }

  async delete(id) {
    await DB.deleteOutdoorSession(id);
    await this.refresh();
  }

  getStats(sessions, period) {
    let list = sessions || this._sessions;
    const now = new Date();
    if (period === '7d') {
      const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 7);
      list = list.filter(s => new Date(s.date) >= cutoff);
    } else if (period === '30d') {
      const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 30);
      list = list.filter(s => new Date(s.date) >= cutoff);
    } else if (period === 'month') {
      list = list.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }
    const totalMin = list.reduce((a, s) => a + (s.durationMin || 0), 0);
    const totalKm = list.reduce((a, s) => a + (s.distanceKm || 0), 0);
    const count = list.length;
    return { totalMin, totalKm, count };
  }

  // ============================================================
  // PHASE C: GraphHopper API key management
  // ============================================================

  showApiKeyModal(onSaved) {
    const existing = document.getElementById('gh-key-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'gh-key-overlay';
    overlay.innerHTML = `
      <div class="modal modal-large">
        <div class="modal-header">
          <h3 class="modal-title">🗺️ Configurer GraphHopper</h3>
        </div>
        <div class="modal-body">
          <p style="color:var(--text-secondary);font-size:var(--font-size-sm);margin-bottom:16px">
            Pour générer des itinéraires, créez une clé gratuite sur graphhopper.com (2 min) :
          </p>
          <ol style="color:var(--text-secondary);font-size:var(--font-size-sm);padding-left:20px;margin-bottom:16px;line-height:2">
            <li>Allez sur <a href="https://www.graphhopper.com/dashboard/" target="_blank" style="color:var(--color-primary)">graphhopper.com/dashboard/</a></li>
            <li>Créez un compte gratuit</li>
            <li>Copiez votre API key</li>
            <li>Collez-la ci-dessous</li>
          </ol>
          <p style="color:var(--text-muted);font-size:11px;margin-bottom:16px">
            Votre clé est gardée localement sur cet appareil, jamais envoyée ailleurs.
          </p>
          <div class="form-group">
            <label class="form-label">API Key GraphHopper</label>
            <input type="text" id="gh-key-input" class="form-input" placeholder="Collez votre clé ici..." autocomplete="off" spellcheck="false">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" id="gh-key-cancel">Annuler</button>
          <button class="btn-primary" id="gh-key-save">Enregistrer</button>
        </div>
      </div>
    `;

    // Pre-fill if existing
    const existing_key = RoutePlanner.getApiKey();
    if (existing_key) overlay.querySelector('#gh-key-input').value = existing_key;

    overlay.querySelector('#gh-key-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#gh-key-save').addEventListener('click', () => {
      const val = overlay.querySelector('#gh-key-input').value.trim();
      if (!val) { App.showToast('Clé invalide', 'error'); return; }
      RoutePlanner.saveApiKey(val);
      overlay.remove();
      App.showToast('Clé GraphHopper enregistrée !', 'success');
      if (onSaved) onSaved();
    });

    document.body.appendChild(overlay);
    setTimeout(() => overlay.querySelector('#gh-key-input').focus(), 100);
  }

  // ============================================================
  // PHASE C+B: GPS mode selection modal (updated)
  // ============================================================

  showStartModal(onManual, onGPS) {
    const existing = document.getElementById('outdoor-start-overlay');
    if (existing) existing.remove();

    const actOptions = getOutdoorActivities().map(a =>
      `<option value="${a.id}">${a.icon} ${a.label}</option>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'outdoor-start-overlay';
    overlay.innerHTML = `
      <div class="modal modal-large">
        <div class="modal-header">
          <h3 class="modal-title">Nouvelle seance</h3>
          <button class="btn-icon" id="ostart-close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="modal-body" id="ostart-body">
          <div id="ostart-step1">
            <div class="form-group" style="margin-bottom:20px">
              <label class="form-label">Activite</label>
              <select id="ostart-activity" class="form-select">${actOptions}</select>
            </div>
            <p class="form-label" style="margin-bottom:12px">Comment enregistrer cette seance ?</p>
            <div class="ostart-choices">
              <button class="ostart-choice-btn" id="ostart-gps">
                <div class="ostart-choice-icon">📍</div>
                <div class="ostart-choice-info">
                  <div class="ostart-choice-title">Avec GPS</div>
                  <div class="ostart-choice-desc">Trace automatique, distance et allure en temps reel</div>
                </div>
              </button>
              <button class="ostart-choice-btn" id="ostart-manual">
                <div class="ostart-choice-icon">✏️</div>
                <div class="ostart-choice-info">
                  <div class="ostart-choice-title">Saisie manuelle</div>
                  <div class="ostart-choice-desc">Entrer distance, duree et details apres la seance</div>
                </div>
              </button>
            </div>
          </div>

          <!-- Step 2: GPS sub-choice -->
          <div id="ostart-step2" class="hidden">
            <button class="btn-back-step" id="ostart-back1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
              Retour
            </button>
            <p class="form-label" style="margin-bottom:12px">Type de seance GPS</p>
            <div class="ostart-choices">
              <button class="ostart-choice-btn" id="ostart-free">
                <div class="ostart-choice-icon">🏃</div>
                <div class="ostart-choice-info">
                  <div class="ostart-choice-title">Course libre</div>
                  <div class="ostart-choice-desc">Trace libre sans itineraire predefini</div>
                </div>
              </button>
              <button class="ostart-choice-btn" id="ostart-route">
                <div class="ostart-choice-icon">🗺️</div>
                <div class="ostart-choice-info">
                  <div class="ostart-choice-title">Itineraire propose</div>
                  <div class="ostart-choice-desc">Generez une boucle autour de vous</div>
                </div>
              </button>
            </div>

            <!-- Favorites section -->
            <div id="ostart-favorites-section" style="margin-top:20px">
              <p class="form-label" style="margin-bottom:8px">⭐ Mes parcours favoris</p>
              <div id="ostart-favorites-list" class="favorites-list">
                <p class="empty-state" style="font-size:12px">Aucun favori enregistre</p>
              </div>
            </div>
          </div>

          <!-- Step 3: Route config -->
          <div id="ostart-step3" class="hidden">
            <button class="btn-back-step" id="ostart-back2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
              Retour
            </button>
            <p class="form-label" style="margin-bottom:10px">Distance de la boucle</p>
            <div class="route-dist-btns">
              <button class="route-dist-btn active" data-km="3">3 km</button>
              <button class="route-dist-btn" data-km="5">5 km</button>
              <button class="route-dist-btn" data-km="7">7 km</button>
              <button class="route-dist-btn" data-km="10">10 km</button>
            </div>
            <div class="form-group" style="margin-top:10px">
              <label class="form-label" style="font-size:12px">Autre distance (km)</label>
              <input type="number" id="route-custom-dist" class="form-input" placeholder="Ex: 8" min="1" max="30" step="0.5" style="max-width:120px">
            </div>

            <p class="form-label" style="margin:14px 0 8px">Type de chemin</p>
            <div class="route-type-btns">
              <button class="route-type-btn active" data-type="mix" data-profile="foot">🔀 Mix</button>
              <button class="route-type-btn" data-type="roads" data-profile="foot">🛣️ Routes</button>
              <button class="route-type-btn" data-type="trails" data-profile="hike">🌳 Sentiers</button>
            </div>

            <p class="form-label" style="margin:14px 0 8px">Guidage</p>
            <div class="guidance-btns">
              <button class="guidance-btn active" data-mode="visual">👁️ Visuel</button>
              <button class="guidance-btn" data-mode="vibration">📳 Vibration</button>
              <button class="guidance-btn" data-mode="voice">🔊 Voix</button>
            </div>

            <button class="btn-primary btn-full" id="btn-generate-route" style="margin-top:20px">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" stroke="currentColor" stroke-width="2"/></svg>
              Generer l'itineraire
            </button>
          </div>

          <!-- Step 4: Route preview -->
          <div id="ostart-step4" class="hidden">
            <button class="btn-back-step" id="ostart-back3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
              Retour
            </button>
            <div id="route-preview-map" style="width:100%;height:220px;border-radius:12px;background:#1a1a2e;margin-bottom:12px"></div>
            <div class="route-preview-stats" id="route-preview-stats"></div>
            <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
              <button class="btn-ghost" id="btn-regen-route" style="flex:1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                Autre boucle
              </button>
              <button class="btn-secondary" id="btn-save-route-before" style="flex:1">
                ⭐ Sauvegarder
              </button>
              <button class="btn-primary" id="btn-start-with-route" style="flex:1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                Demarrer
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    let selectedActivity = getOutdoorActivities()[0].id;
    let selectedDistKm = 3;
    let selectedProfile = 'foot';
    let selectedPathType = 'mix';
    let selectedGuidanceMode = 'visual';
    let routePreviewMap = null;
    let routePreviewPolyline = null;
    let currentSeed = Math.floor(Math.random() * 9999);

    const step1 = overlay.querySelector('#ostart-step1');
    const step2 = overlay.querySelector('#ostart-step2');
    const step3 = overlay.querySelector('#ostart-step3');
    const step4 = overlay.querySelector('#ostart-step4');

    const showStep = (n) => {
      [step1, step2, step3, step4].forEach((s, i) => s.classList.toggle('hidden', i + 1 !== n));
    };

    // Close
    overlay.querySelector('#ostart-close').addEventListener('click', () => overlay.remove());

    // Manual
    overlay.querySelector('#ostart-manual').addEventListener('click', () => {
      selectedActivity = overlay.querySelector('#ostart-activity').value;
      overlay.remove();
      if (onManual) onManual(selectedActivity);
    });

    // GPS -> step2
    overlay.querySelector('#ostart-gps').addEventListener('click', () => {
      selectedActivity = overlay.querySelector('#ostart-activity').value;
      this._loadFavoritesInModal(overlay, (route) => {
        this._activeRoute = route;
        overlay.remove();
        if (onGPS) onGPS(selectedActivity, { mode: 'favorite', route });
      });
      showStep(2);
    });

    // Back buttons
    overlay.querySelector('#ostart-back1').addEventListener('click', () => showStep(1));
    overlay.querySelector('#ostart-back2').addEventListener('click', () => showStep(2));
    overlay.querySelector('#ostart-back3').addEventListener('click', () => showStep(3));

    // Free GPS
    overlay.querySelector('#ostart-free').addEventListener('click', () => {
      overlay.remove();
      if (onGPS) onGPS(selectedActivity, { mode: 'free' });
    });

    // Route planning
    overlay.querySelector('#ostart-route').addEventListener('click', () => {
      if (!RoutePlanner.hasApiKey()) {
        overlay.remove();
        this.showApiKeyModal(() => {
          this.showStartModal(onManual, onGPS);
        });
        return;
      }
      showStep(3);
    });

    // Distance buttons
    overlay.querySelectorAll('.route-dist-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.route-dist-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedDistKm = parseFloat(btn.dataset.km);
        overlay.querySelector('#route-custom-dist').value = '';
      });
    });

    overlay.querySelector('#route-custom-dist').addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (v >= 1 && v <= 30) {
        selectedDistKm = v;
        overlay.querySelectorAll('.route-dist-btn').forEach(b => b.classList.remove('active'));
      }
    });

    // Path type buttons
    overlay.querySelectorAll('.route-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.route-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedPathType = btn.dataset.type;
        selectedProfile = btn.dataset.profile;
      });
    });

    // Guidance buttons
    overlay.querySelectorAll('.guidance-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.guidance-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedGuidanceMode = btn.dataset.mode;
        // Mark user gesture for voice (required for iOS)
        RouteGuidance.markUserGesture();
      });
    });

    // Generate route
    overlay.querySelector('#btn-generate-route').addEventListener('click', async () => {
      const genBtn = overlay.querySelector('#btn-generate-route');
      genBtn.disabled = true;
      genBtn.textContent = 'Localisation...';

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          genBtn.textContent = 'Generation...';
          try {
            currentSeed = Math.floor(Math.random() * 9999);
            const route = await RoutePlanner.generateRoute(latitude, longitude, selectedDistKm, selectedProfile, selectedPathType, currentSeed);
            this._activeRoute = {
              ...route,
              profile: selectedProfile,
              pathType: selectedPathType,
              distance_km: selectedDistKm
            };
            showStep(4);
            this._renderRoutePreview(overlay, route, latitude, longitude, routePreviewMap, (mapRef) => { routePreviewMap = mapRef; });
            overlay.querySelector('#route-preview-stats').innerHTML = `
              <div class="route-preview-stat-row">
                <span>🗺️ <strong>${route.distanceKm} km</strong></span>
                <span>⏱️ <strong>${RoutePlannerClass.estimatedTime(route.distanceM, selectedProfile)}</strong></span>
                <span>📍 <strong>${route.instructions.length} instructions</strong></span>
              </div>
            `;
          } catch (err) {
            genBtn.disabled = false;
            genBtn.textContent = 'Generer l\'itineraire';
            const msg = this._ghErrorMsg(err.message);
            App.showToast(msg, 'error');
          }
        },
        (err) => {
          genBtn.disabled = false;
          genBtn.textContent = 'Generer l\'itineraire';
          App.showToast('GPS requis pour generer un itineraire', 'error');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

    // Regenerate
    overlay.querySelector('#btn-regen-route').addEventListener('click', async () => {
      const regenBtn = overlay.querySelector('#btn-regen-route');
      regenBtn.disabled = true;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            currentSeed = Math.floor(Math.random() * 9999);
            const route = await RoutePlanner.generateRoute(pos.coords.latitude, pos.coords.longitude, selectedDistKm, selectedProfile, selectedPathType, currentSeed);
            this._activeRoute = { ...route, profile: selectedProfile, pathType: selectedPathType, distance_km: selectedDistKm };
            this._renderRoutePreview(overlay, route, pos.coords.latitude, pos.coords.longitude, routePreviewMap, (m) => { routePreviewMap = m; });
            overlay.querySelector('#route-preview-stats').innerHTML = `
              <div class="route-preview-stat-row">
                <span>🗺️ <strong>${route.distanceKm} km</strong></span>
                <span>⏱️ <strong>${RoutePlannerClass.estimatedTime(route.distanceM, selectedProfile)}</strong></span>
                <span>📍 <strong>${route.instructions.length} instructions</strong></span>
              </div>
            `;
          } catch (err) {
            App.showToast(this._ghErrorMsg(err.message), 'error');
          }
          regenBtn.disabled = false;
        },
        () => { regenBtn.disabled = false; App.showToast('GPS requis', 'error'); },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

    // Save before start
    overlay.querySelector('#btn-save-route-before').addEventListener('click', async () => {
      if (!this._activeRoute) return;
      await this._promptSaveRoute(this._activeRoute);
    });

    // Start with route
    overlay.querySelector('#btn-start-with-route').addEventListener('click', () => {
      if (!this._activeRoute) return;
      RouteGuidance.setMode(selectedGuidanceMode);
      RouteGuidance.markUserGesture();
      overlay.remove();
      if (onGPS) onGPS(selectedActivity, { mode: 'route', route: this._activeRoute, guidanceMode: selectedGuidanceMode });
    });

    document.body.appendChild(overlay);
  }

  _renderRoutePreview(overlay, route, lat, lng, existingMap, setMap) {
    if (typeof L === 'undefined') return;
    setTimeout(() => {
      const container = overlay.querySelector('#route-preview-map');
      if (!container) return;

      let map = existingMap;
      if (map) {
        // Update existing
        try {
          map.eachLayer(l => { if (l instanceof L.Polyline) map.removeLayer(l); });
        } catch (e) {}
      } else {
        map = L.map(container, {
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
        setMap(map);
      }

      const poly = L.polyline(route.points, { color: '#3b82f6', weight: 4, opacity: 0.8 }).addTo(map);
      L.circleMarker([lat, lng], { radius: 8, color: '#4ade80', fillColor: '#4ade80', fillOpacity: 1 }).addTo(map);
      map.fitBounds(poly.getBounds(), { padding: [10, 10] });
    }, 150);
  }

  _loadFavoritesInModal(overlay, onSelect) {
    const container = overlay.querySelector('#ostart-favorites-list');
    if (!container) return;
    if (!this._routes || !this._routes.length) return;

    container.innerHTML = '';
    this._routes.forEach(r => {
      const item = document.createElement('div');
      item.className = 'fav-route-item';
      item.innerHTML = `
        <div class="fri-info">
          <div class="fri-name">${r.name}</div>
          <div class="fri-meta">${r.distance_km} km · ${r.used_count || 0}x effectue</div>
        </div>
        <div class="fri-actions">
          <button class="btn-primary-sm fri-use-btn">Utiliser</button>
          <button class="btn-icon fri-del-btn" title="Supprimer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
      `;
      item.querySelector('.fri-use-btn').addEventListener('click', () => {
        onSelect(r);
      });
      item.querySelector('.fri-del-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Supprimer "${r.name}" ?`)) {
          await DB.deleteOutdoorRoute(r.id);
          await this.refresh();
          item.remove();
          if (!overlay.querySelectorAll('.fav-route-item').length) {
            container.innerHTML = '<p class="empty-state" style="font-size:12px">Aucun favori enregistre</p>';
          }
        }
      });
      container.appendChild(item);
    });
  }

  async _promptSaveRoute(routeData) {
    return new Promise((resolve) => {
      const existing = document.getElementById('save-route-modal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'save-route-modal';
      modal.innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">⭐ Sauvegarder ce parcours</h3>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Nom du parcours</label>
              <input type="text" id="route-name-input" class="form-input" placeholder="Ex: Tour du parc 5km" maxlength="50">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" id="srm-cancel">Annuler</button>
            <button class="btn-primary" id="srm-save">⭐ Sauvegarder</button>
          </div>
        </div>
      `;

      modal.querySelector('#srm-cancel').addEventListener('click', () => {
        modal.remove();
        resolve(null);
      });

      modal.querySelector('#srm-save').addEventListener('click', async () => {
        const name = modal.querySelector('#route-name-input').value.trim();
        if (!name) { App.showToast('Donnez un nom au parcours', 'error'); return; }
        const id = await DB.addOutdoorRoute({
          name,
          distance_km: routeData.distanceKm || routeData.distance_km,
          profile: routeData.profile || 'foot',
          pathType: routeData.pathType || 'mix',
          points: routeData.points,
          instructions: routeData.instructions,
          created_at: Date.now(),
          used_count: 0
        });
        await this.refresh();
        modal.remove();
        App.showToast(`Parcours "${name}" sauvegardé !`, 'success');
        resolve(id);
      });

      document.body.appendChild(modal);
      setTimeout(() => modal.querySelector('#route-name-input').focus(), 100);
    });
  }

  _ghErrorMsg(errMsg) {
    if (errMsg === 'NO_API_KEY') return 'Clé GraphHopper manquante';
    if (errMsg === 'INVALID_KEY') return 'Clé GraphHopper invalide';
    if (errMsg === 'QUOTA_EXCEEDED') return 'Quota GraphHopper dépassé (500 req/jour)';
    if (errMsg === 'NETWORK_ERROR') return 'Erreur réseau. Vérifiez votre connexion.';
    if (errMsg === 'NO_ROUTE') return 'Aucun itinéraire trouvé pour cette zone.';
    return 'Erreur GraphHopper : ' + errMsg;
  }

  // ============================================================
  // PHASE B+C: GPS tracking screen
  // ============================================================

  showTrackingScreen(activity, options) {
    options = options || { mode: 'free' };
    const existing = document.getElementById('outdoor-tracking-overlay');
    if (existing) existing.remove();

    const actLabel = this.getActivityLabel(activity);
    const actIcon = this.getActivityIcon(activity);
    const hasRoute = options.mode === 'route' || options.mode === 'favorite';

    const overlay = document.createElement('div');
    overlay.id = 'outdoor-tracking-overlay';
    overlay.className = 'tracking-overlay';
    overlay.innerHTML = `
      <div class="tracking-header">
        <button class="btn-icon tracking-back-btn" id="tracking-cancel-btn" title="Annuler la seance">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <span class="tracking-title">${actIcon} ${actLabel}</span>
        <div class="tracking-header-right">
          ${hasRoute && (options.guidanceMode === 'voice' || (options.route && options.route.guidanceMode === 'voice')) ? `
            <button class="btn-icon" id="btn-mute-guidance" title="Couper/activer le son">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          ` : ''}
          <div class="tracking-gps-badge" id="tracking-gps-badge">
            <span class="gps-dot"></span> GPS
          </div>
        </div>
      </div>

      <!-- Direction indicator (Phase C) -->
      ${hasRoute ? `
        <div class="direction-indicator" id="direction-indicator">
          <span class="di-text" id="di-text">⬆️ Calcul de l'itineraire...</span>
          <span class="di-offroute hidden" id="di-offroute">⚠️ Hors itineraire</span>
        </div>
      ` : ''}

      <!-- Carte Leaflet -->
      <div class="tracking-map-wrapper ${hasRoute ? 'tracking-map-wrapper--with-indicator' : ''}" id="tracking-map-wrapper">
        <div id="tracking-map" class="tracking-map"></div>
        <button class="btn-map-fullscreen" id="btn-map-fullscreen" title="Plein ecran">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="btn-map-exit-fullscreen hidden" id="btn-map-exit-fullscreen" title="Quitter plein ecran">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 0 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        ${hasRoute ? `<button class="btn-recalculate hidden" id="btn-recalculate" title="Recalculer depuis ici">Recalculer depuis ici</button>` : ''}
      </div>

      <!-- Stats live -->
      <div class="tracking-stats-grid">
        <div class="tracking-stat-card">
          <div class="tsc-val" id="tsc-distance">0.00</div>
          <div class="tsc-lbl">km</div>
        </div>
        <div class="tracking-stat-card">
          <div class="tsc-val" id="tsc-duration">0:00</div>
          <div class="tsc-lbl">temps actif</div>
        </div>
        <div class="tracking-stat-card">
          <div class="tsc-val" id="tsc-avg-pace">--'--"</div>
          <div class="tsc-lbl">allure moy</div>
        </div>
        <div class="tracking-stat-card">
          <div class="tsc-val" id="tsc-instant-pace">--'--"</div>
          <div class="tsc-lbl">allure now</div>
        </div>
      </div>

      <!-- Init GPS -->
      <div class="tracking-init-msg" id="tracking-init-msg">
        <div class="tracking-spinner"></div>
        <span>Acquisition GPS en cours...</span>
      </div>

      <!-- Boutons Pause / Reprendre / Terminer -->
      <div class="tracking-controls" id="tracking-controls">
        <button class="btn-tracking-pause" id="btn-tracking-pause">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          Pause
        </button>
        <button class="btn-tracking-finish" id="btn-tracking-finish">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          Terminer
        </button>
      </div>
      <div class="tracking-controls hidden" id="tracking-controls-paused">
        <div class="tracking-paused-label">En pause</div>
        <button class="btn-tracking-resume" id="btn-tracking-resume">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          Reprendre
        </button>
        <button class="btn-tracking-finish" id="btn-tracking-finish-paused">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          Terminer
        </button>
      </div>
    `;

    document.body.appendChild(overlay);
    this._activeTrackingActivity = activity;
    this._mapFullscreen = false;

    // Init map
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        GPS.initMap('tracking-map');
        // If route mode: draw planned route on map
        if (hasRoute && options.route && options.route.points) {
          GPS.setPlannedRoute(options.route.points);
          // Attach guidance
          const gMode = options.guidanceMode || this._guidanceMode;
          RouteGuidance.setMode(gMode);
          RouteGuidance.reset();
          GPS.attachGuidance(RoutePlanner, RouteGuidance, (guidanceResult) => {
            this._updateGuidanceUI(guidanceResult, overlay);
          });
        }
      });
    });

    // Mute button (voice mode)
    const muteBtn = overlay.querySelector('#btn-mute-guidance');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = RouteGuidance.isMuted();
        RouteGuidance.setMuted(!isMuted);
        muteBtn.style.opacity = !isMuted ? '0.4' : '1';
      });
    }

    // Fullscreen map toggle
    overlay.querySelector('#btn-map-fullscreen').addEventListener('click', () => this._setMapFullscreen(true));
    overlay.querySelector('#btn-map-exit-fullscreen').addEventListener('click', () => this._setMapFullscreen(false));

    // Recalculate button
    const recalcBtn = overlay.querySelector('#btn-recalculate');
    if (recalcBtn) {
      recalcBtn.addEventListener('click', async () => {
        if (!options.route) return;
        recalcBtn.disabled = true;
        recalcBtn.textContent = 'Recalcul...';
        navigator.geolocation.getCurrentPosition(async (pos) => {
          try {
            const newRoute = await RoutePlanner.generateRoute(
              pos.coords.latitude, pos.coords.longitude,
              options.route.distanceKm || options.route.distance_km || 5,
              options.route.profile || 'foot',
              options.route.pathType || 'mix',
              Math.floor(Math.random() * 9999)
            );
            options.route = { ...newRoute, profile: options.route.profile, pathType: options.route.pathType };
            GPS.setPlannedRoute(newRoute.points);
            recalcBtn.classList.add('hidden');
            App.showToast('Itineraire recalcule !', 'success');
          } catch (e) {
            App.showToast(this._ghErrorMsg(e.message), 'error');
          }
          recalcBtn.disabled = false;
          recalcBtn.textContent = 'Recalculer depuis ici';
        }, () => {
          recalcBtn.disabled = false;
          recalcBtn.textContent = 'Recalculer depuis ici';
        }, { enableHighAccuracy: true, timeout: 8000 });
      });
    }

    // Cancel
    overlay.querySelector('#tracking-cancel-btn').addEventListener('click', () => {
      if (GPS.isRunning() || GPS.isPaused()) {
        if (!confirm('Annuler la seance en cours ? La trace ne sera pas sauvegardee.')) return;
      }
      GPS.stop();
      GPS.detachGuidance();
      RouteGuidance.reset();
      overlay.remove();
    });

    // Pause
    overlay.querySelector('#btn-tracking-pause').addEventListener('click', () => {
      GPS.pause();
      overlay.querySelector('#tracking-controls').classList.add('hidden');
      overlay.querySelector('#tracking-controls-paused').classList.remove('hidden');
    });

    // Resume
    overlay.querySelector('#btn-tracking-resume').addEventListener('click', () => {
      GPS.resume();
      overlay.querySelector('#tracking-controls-paused').classList.add('hidden');
      overlay.querySelector('#tracking-controls').classList.remove('hidden');
    });

    // Finish
    const finishHandler = () => {
      const stats = GPS.stop();
      GPS.detachGuidance();
      if (hasRoute) RouteGuidance.triggerFinish();
      RouteGuidance.reset();
      overlay.remove();
      this._showGPSSaveModal(activity, stats, options);
    };
    overlay.querySelector('#btn-tracking-finish').addEventListener('click', finishHandler);
    overlay.querySelector('#btn-tracking-finish-paused').addEventListener('click', finishHandler);

    // Start GPS
    GPS.start(
      (stats) => this._updateTrackingUI(stats),
      (errCode) => this._handleGPSError(errCode, activity)
    );

    // Increment route usage if using a favorite
    if (options.mode === 'favorite' && options.route && options.route.id) {
      DB.incrementRouteUsage(options.route.id).catch(() => {});
    }
  }

  _updateGuidanceUI(guidanceResult, overlay) {
    if (!guidanceResult) return;
    const diText = overlay.querySelector('#di-text');
    const diOffRoute = overlay.querySelector('#di-offroute');
    const recalcBtn = overlay.querySelector('#btn-recalculate');

    if (diText && guidanceResult.indicator) {
      diText.textContent = guidanceResult.indicator;
    }

    if (diOffRoute) {
      if (guidanceResult.offRoute) {
        diOffRoute.classList.remove('hidden');
        if (recalcBtn) recalcBtn.classList.remove('hidden');
      } else {
        diOffRoute.classList.add('hidden');
        if (recalcBtn) recalcBtn.classList.add('hidden');
      }
    }
  }

  _setMapFullscreen(full) {
    const wrapper = document.getElementById('tracking-map-wrapper');
    const btnFS = document.getElementById('btn-map-fullscreen');
    const btnExit = document.getElementById('btn-map-exit-fullscreen');
    if (!wrapper) return;

    this._mapFullscreen = full;
    if (full) {
      wrapper.classList.add('map-fullscreen');
      btnFS.classList.add('hidden');
      btnExit.classList.remove('hidden');
    } else {
      wrapper.classList.remove('map-fullscreen');
      btnFS.classList.remove('hidden');
      btnExit.classList.add('hidden');
    }
    GPS.invalidateMapSize();
  }

  _updateTrackingUI(stats) {
    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    if (stats.pointCount > 0) {
      const initMsg = document.getElementById('tracking-init-msg');
      if (initMsg) initMsg.style.display = 'none';
    }

    setEl('tsc-distance', stats.distanceKm.toFixed(2));
    setEl('tsc-avg-pace', stats.avgPace || '--\'--"');
    setEl('tsc-instant-pace', stats.instantPace || '--\'--"');

    const ms = stats.durationMs || 0;
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const durStr = h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
    setEl('tsc-duration', durStr);
  }

  _handleGPSError(errCode, activity) {
    const overlay = document.getElementById('outdoor-tracking-overlay');
    if (overlay) overlay.remove();

    let msg = 'Erreur GPS. Bascule vers la saisie manuelle.';
    if (errCode === 'GPS_DENIED') msg = 'Acces GPS refuse. Vous pouvez saisir votre seance manuellement.';
    else if (errCode === 'GPS_UNAVAILABLE') msg = 'GPS non disponible sur cet appareil. Saisie manuelle activee.';
    else if (errCode === 'GPS_TIMEOUT') msg = 'Delai GPS depasse. Saisie manuelle activee.';

    App.showToast(msg, 'error');
    setTimeout(() => {
      this.renderFormModal({ activity }, null, null);
    }, 800);
  }

  // ============================================================
  // PHASE B+C: Save GPS session modal
  // ============================================================

  _showGPSSaveModal(activity, stats, options) {
    options = options || { mode: 'free' };
    const existing = document.getElementById('outdoor-gps-save-overlay');
    if (existing) existing.remove();

    const trace = GPS.getTrace();
    const actLabel = this.getActivityLabel(activity);
    const actIcon = this.getActivityIcon(activity);
    const distKm = stats.distanceKm;
    const durationMin = Math.round(stats.durationMin * 10) / 10;
    const avgPace = stats.avgPace;
    const elevM = stats.elevationM;
    const formatDateLocal = (ts) => new Date(ts).toISOString().slice(0, 16);
    const hasRoute = options.mode === 'route' || options.mode === 'favorite';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'outdoor-gps-save-overlay';
    overlay.innerHTML = `
      <div class="modal modal-large">
        <div class="modal-header">
          <h3 class="modal-title">${actIcon} Seance terminee</h3>
        </div>
        <div class="modal-body">
          <div class="gps-save-stats">
            <div class="gps-save-stat">
              <div class="gss-val">${distKm.toFixed(2)}</div>
              <div class="gss-lbl">km</div>
            </div>
            <div class="gps-save-stat">
              <div class="gss-val">${durationMin}</div>
              <div class="gss-lbl">min actifs</div>
            </div>
            <div class="gps-save-stat">
              <div class="gss-val">${avgPace}</div>
              <div class="gss-lbl">allure moy</div>
            </div>
            ${elevM > 0 ? `<div class="gps-save-stat"><div class="gss-val">+${elevM}</div><div class="gss-lbl">m D+</div></div>` : ''}
          </div>

          ${trace.length > 1 ? `
            <div class="gps-replay-map-wrap">
              <div id="gps-replay-map" class="gps-replay-map"></div>
              <div class="gps-replay-label">${trace.length} points GPS</div>
            </div>
          ` : '<p class="hint-text" style="text-align:center;margin-bottom:16px">Peu de points GPS enregistres</p>'}

          <!-- Save as favorite (Phase C) -->
          <div class="save-as-fav-row" id="save-as-fav-row">
            <button class="btn-fav-route" id="btn-save-as-fav">
              ⭐ Sauvegarder ce parcours en favori
            </button>
          </div>

          <form id="gps-save-form" class="form">
            <div class="form-group">
              <label class="form-label" for="gps-save-datetime">Date et heure</label>
              <input type="datetime-local" id="gps-save-datetime" class="form-input" value="${formatDateLocal(Date.now())}">
            </div>
            <div class="form-group">
              <label class="form-label" for="gps-save-location">Lieu (optionnel)</label>
              <input type="text" id="gps-save-location" class="form-input" placeholder="Ex: Foret de Broceliande">
            </div>
            <div class="form-group">
              <label class="form-label">Ressenti</label>
              <div class="feeling-row" id="gps-feeling-row">
                ${[1,2,3,4,5].map(v => `
                  <button type="button" class="feeling-btn ${v === 3 ? 'active' : ''}" data-val="${v}">
                    ${v === 1 ? '😓' : v === 2 ? '😕' : v === 3 ? '😐' : v === 4 ? '😊' : '🔥'}
                  </button>
                `).join('')}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="gps-save-notes">Notes</label>
              <textarea id="gps-save-notes" class="form-input form-textarea" placeholder="Conditions, sensations..."></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" id="gps-save-discard">Ignorer</button>
          <button class="btn-primary" id="gps-save-confirm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" stroke-width="2"/><polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" stroke-width="2"/></svg>
            Sauvegarder
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Init replay map
    if (trace.length > 1) {
      setTimeout(() => {
        if (typeof L === 'undefined') return;
        const replayMap = L.map('gps-replay-map', {
          zoomControl: false, attributionControl: false,
          dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(replayMap);
        const latLngs = trace.map(p => [p.lat, p.lng]);
        // Blue route if available
        if (hasRoute && options.route && options.route.points && options.route.points.length) {
          L.polyline(options.route.points, { color: '#3b82f6', weight: 3, opacity: 0.6 }).addTo(replayMap);
        }
        const poly = L.polyline(latLngs, { color: '#ef4444', weight: 3 }).addTo(replayMap);
        replayMap.fitBounds(poly.getBounds(), { padding: [12, 12] });
        L.circleMarker(latLngs[0], { radius: 6, color: '#4ade80', fillColor: '#4ade80', fillOpacity: 1 }).addTo(replayMap);
        L.circleMarker(latLngs[latLngs.length - 1], { radius: 6, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }).addTo(replayMap);
      }, 200);
    }

    // Save as favorite button
    overlay.querySelector('#btn-save-as-fav').addEventListener('click', async () => {
      let routeData;
      if (hasRoute && options.route) {
        routeData = options.route;
      } else if (trace.length > 1) {
        // Free run - build minimal route from trace
        routeData = {
          points: trace.map(p => [p.lat, p.lng]),
          instructions: [],
          distanceKm: distKm,
          profile: 'foot',
          pathType: 'free'
        };
      }
      if (routeData) {
        await this._promptSaveRoute(routeData);
      }
    });

    // Feeling buttons
    let selectedFeeling = 3;
    const feelingBtns = overlay.querySelectorAll('.feeling-btn');
    feelingBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        selectedFeeling = parseInt(btn.dataset.val);
        feelingBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.val) === selectedFeeling));
      });
    });

    overlay.querySelector('#gps-save-discard').addEventListener('click', () => {
      overlay.remove();
      App.showToast('Seance ignoree', 'error');
    });

    overlay.querySelector('#gps-save-confirm').addEventListener('click', async () => {
      const datetimeVal = overlay.querySelector('#gps-save-datetime').value;
      const dateTs = datetimeVal ? new Date(datetimeVal).getTime() : Date.now();

      const data = {
        activity,
        date: dateTs,
        durationMin,
        distanceKm: distKm,
        distance_gps: distKm,
        elevationM: elevM > 0 ? elevM : null,
        pace: avgPace && avgPace !== '--\'--"' ? avgPace : this.calcPace(distKm, durationMin),
        location: overlay.querySelector('#gps-save-location').value.trim() || null,
        feeling: selectedFeeling,
        notes: overlay.querySelector('#gps-save-notes').value.trim() || null,
        trace: trace,
        category: 'exterieur',
        gpsTracked: true,
        routeId: (hasRoute && options.route && options.route.id) ? options.route.id : null
      };

      await this.add(data);
      overlay.remove();
      App.showToast('Seance GPS sauvegardee !', 'success');
      if (typeof App !== 'undefined' && App._currentPage === 'outdoor') {
        App._renderOutdoorPage();
      }
    });
  }

  // ============================================================
  // PHASE A: Manual form modal
  // ============================================================

  renderFormModal(session, onSave, onCancel) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay outdoor-form-overlay';
    overlay.id = 'outdoor-form-overlay';

    const activityOptions = getOutdoorActivities().map(a =>
      `<option value="${a.id}" ${session && session.activity === a.id ? 'selected' : ''}>${a.icon} ${a.label}</option>`
    ).join('');

    const formatDateLocal = (ts) => {
      if (!ts) return new Date().toISOString().slice(0, 16);
      return new Date(ts).toISOString().slice(0, 16);
    };

    overlay.innerHTML = `
      <div class="modal modal-large">
        <div class="modal-header">
          <h3 class="modal-title">${session && session.id ? 'Modifier la seance' : 'Nouvelle seance exterieure'}</h3>
          <button class="btn-icon" id="outdoor-form-close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <form id="outdoor-form" class="form">
            <input type="hidden" id="outdoor-form-id" value="${session ? (session.id || '') : ''}">
            <div class="form-group">
              <label class="form-label" for="outdoor-activity">Activite *</label>
              <select id="outdoor-activity" class="form-select" required>${activityOptions}</select>
            </div>
            <div class="form-group">
              <label class="form-label" for="outdoor-datetime">Date et heure</label>
              <input type="datetime-local" id="outdoor-datetime" class="form-input" value="${formatDateLocal(session ? session.date : null)}">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="outdoor-duration">Duree (min) *</label>
                <input type="number" id="outdoor-duration" class="form-input" placeholder="45" min="1" max="600" value="${session ? session.durationMin : ''}">
              </div>
              <div class="form-group">
                <label class="form-label" for="outdoor-distance">Distance (km)</label>
                <input type="number" id="outdoor-distance" class="form-input" placeholder="5.2" min="0" max="500" step="0.1" value="${session && session.distanceKm ? session.distanceKm : ''}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="outdoor-elevation">Denivele + (m)</label>
                <input type="number" id="outdoor-elevation" class="form-input" placeholder="120" min="0" max="9000" value="${session && session.elevationM ? session.elevationM : ''}">
              </div>
              <div class="form-group">
                <label class="form-label" for="outdoor-pace">Allure (min/km)</label>
                <input type="text" id="outdoor-pace" class="form-input" placeholder="Auto" value="${session && session.pace ? session.pace : ''}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="outdoor-location">Lieu (optionnel)</label>
              <input type="text" id="outdoor-location" class="form-input" placeholder="Ex: Parc du Thabor, Rennes" value="${session && session.location ? session.location : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Ressenti</label>
              <div class="feeling-row" id="outdoor-feeling-row">
                ${[1,2,3,4,5].map(v => `
                  <button type="button" class="feeling-btn ${session && session.feeling === v ? 'active' : ''}" data-val="${v}">
                    ${v === 1 ? '😓' : v === 2 ? '😕' : v === 3 ? '😐' : v === 4 ? '😊' : '🔥'}
                  </button>
                `).join('')}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="outdoor-notes">Notes</label>
              <textarea id="outdoor-notes" class="form-input form-textarea" placeholder="Conditions meteo, sensations...">${session && session.notes ? session.notes : ''}</textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" id="outdoor-form-cancel">Annuler</button>
          <button class="btn-primary" id="outdoor-form-save">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" stroke-width="2"/><polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" stroke-width="2"/></svg>
            Sauvegarder
          </button>
        </div>
      </div>
    `;

    let selectedFeeling = session ? (session.feeling || 3) : 3;
    const feelingBtns = overlay.querySelectorAll('.feeling-btn');
    feelingBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        selectedFeeling = parseInt(btn.dataset.val);
        feelingBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.val) === selectedFeeling));
      });
    });

    const durInput = overlay.querySelector('#outdoor-duration');
    const distInput = overlay.querySelector('#outdoor-distance');
    const paceInput = overlay.querySelector('#outdoor-pace');
    const updatePace = () => {
      const dur = parseFloat(durInput.value);
      const dist = parseFloat(distInput.value);
      const p = this.calcPace(dist, dur);
      if (p) paceInput.placeholder = p;
    };
    durInput.addEventListener('input', updatePace);
    distInput.addEventListener('input', updatePace);

    overlay.querySelector('#outdoor-form-close').addEventListener('click', () => {
      overlay.remove();
      if (onCancel) onCancel();
    });
    overlay.querySelector('#outdoor-form-cancel').addEventListener('click', () => {
      overlay.remove();
      if (onCancel) onCancel();
    });

    overlay.querySelector('#outdoor-form-save').addEventListener('click', async () => {
      const activity = overlay.querySelector('#outdoor-activity').value;
      const durationMin = parseFloat(overlay.querySelector('#outdoor-duration').value);
      if (!activity || !durationMin) {
        App.showToast('Activite et duree requises', 'error');
        return;
      }

      const datetimeVal = overlay.querySelector('#outdoor-datetime').value;
      const dateTs = datetimeVal ? new Date(datetimeVal).getTime() : Date.now();
      const distKm = parseFloat(overlay.querySelector('#outdoor-distance').value) || null;
      const elevM = parseFloat(overlay.querySelector('#outdoor-elevation').value) || null;
      const paceVal = overlay.querySelector('#outdoor-pace').value.trim() || this.calcPace(distKm, durationMin);

      const data = {
        activity, date: dateTs, durationMin, distanceKm: distKm,
        elevationM: elevM, pace: paceVal || null,
        location: overlay.querySelector('#outdoor-location').value.trim() || null,
        feeling: selectedFeeling,
        notes: overlay.querySelector('#outdoor-notes').value.trim() || null,
        category: 'exterieur'
      };

      const id = overlay.querySelector('#outdoor-form-id').value;
      if (id) {
        await this.update({ ...data, id: parseInt(id) });
        App.showToast('Seance modifiee !', 'success');
      } else {
        await this.add(data);
        App.showToast('Seance enregistree !', 'success');
      }

      overlay.remove();
      if (onSave) onSave();
    });

    document.body.appendChild(overlay);
  }

  // ============================================================
  // Session list rendering
  // ============================================================

  renderSessionList(container, onEdit, onDelete) {
    container.innerHTML = '';
    if (this._sessions.length === 0) {
      container.innerHTML = '<p class="empty-state">Aucune seance exterieure enregistree</p>';
      return;
    }

    this._sessions.slice(0, 30).forEach(s => {
      const date = new Date(s.date);
      const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
      const item = document.createElement('div');
      item.className = 'outdoor-session-item';
      item.innerHTML = `
        <div class="osi-icon">${this.getActivityIcon(s.activity)}</div>
        <div class="osi-info">
          <div class="osi-name">
            ${this.getActivityLabel(s.activity)}
            ${s.gpsTracked ? '<span class="osi-gps-badge">GPS</span>' : ''}
          </div>
          <div class="osi-detail">
            ${s.durationMin} min
            ${s.distanceKm ? ` • ${s.distanceKm} km` : ''}
            ${s.pace ? ` • ${s.pace}/km` : ''}
            ${s.elevationM ? ` • +${s.elevationM}m` : ''}
          </div>
          ${s.location ? `<div class="osi-location">📍 ${s.location}</div>` : ''}
        </div>
        <div class="osi-right">
          <div class="osi-date">${dateStr}</div>
          <div class="osi-feeling">${s.feeling === 1 ? '😓' : s.feeling === 2 ? '😕' : s.feeling === 3 ? '😐' : s.feeling === 4 ? '😊' : '🔥'}</div>
          <div class="osi-actions">
            ${s.gpsTracked && s.trace && s.trace.length > 1 ? `
              <button class="btn-icon osi-replay" title="Voir la trace">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/><path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" stroke="currentColor" stroke-width="2"/></svg>
              </button>
            ` : ''}
            <button class="btn-icon osi-edit" title="Modifier">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
            <button class="btn-icon osi-delete" title="Supprimer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
      `;

      if (s.gpsTracked && s.trace && s.trace.length > 1) {
        item.querySelector('.osi-replay').addEventListener('click', (e) => {
          e.stopPropagation();
          this._showReplayModal(s);
        });
      }

      item.querySelector('.osi-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        if (onEdit) onEdit(s);
      });

      item.querySelector('.osi-delete').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Supprimer cette seance ?')) {
          await this.delete(s.id);
          if (onDelete) onDelete();
        }
      });

      container.appendChild(item);
    });
  }

  // ============================================================
  // Replay modal (GPS trace history)
  // ============================================================

  _showReplayModal(session) {
    const existing = document.getElementById('outdoor-replay-overlay');
    if (existing) existing.remove();

    const actLabel = this.getActivityLabel(session.activity);
    const actIcon = this.getActivityIcon(session.activity);
    const date = new Date(session.date);
    const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'outdoor-replay-overlay';
    overlay.innerHTML = `
      <div class="modal modal-large">
        <div class="modal-header">
          <h3 class="modal-title">${actIcon} ${actLabel} — ${dateStr}</h3>
          <button class="btn-icon" id="replay-close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="replay-stats-row">
            ${session.distanceKm ? `<div class="replay-stat"><div class="rs-val">${session.distanceKm}</div><div class="rs-lbl">km</div></div>` : ''}
            ${session.durationMin ? `<div class="replay-stat"><div class="rs-val">${session.durationMin}</div><div class="rs-lbl">min</div></div>` : ''}
            ${session.pace ? `<div class="replay-stat"><div class="rs-val">${session.pace}</div><div class="rs-lbl">/km</div></div>` : ''}
            ${session.elevationM ? `<div class="replay-stat"><div class="rs-val">+${session.elevationM}</div><div class="rs-lbl">m D+</div></div>` : ''}
          </div>
          <div id="replay-map" class="replay-map-large"></div>
          <div class="replay-trace-info">${session.trace.length} points GPS enregistres</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector('#replay-close').addEventListener('click', () => overlay.remove());

    setTimeout(() => {
      if (typeof L === 'undefined') return;
      const replayMap = L.map('replay-map', { zoomControl: true, attributionControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(replayMap);
      const latLngs = session.trace.map(p => [p.lat, p.lng]);
      const poly = L.polyline(latLngs, { color: '#ef4444', weight: 4, opacity: 0.85 }).addTo(replayMap);
      L.circleMarker(latLngs[0], { radius: 8, color: '#4ade80', fillColor: '#4ade80', fillOpacity: 1, weight: 2 })
        .bindPopup('Depart').addTo(replayMap);
      L.circleMarker(latLngs[latLngs.length - 1], { radius: 8, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1, weight: 2 })
        .bindPopup('Arrivee').addTo(replayMap);
      replayMap.fitBounds(poly.getBounds(), { padding: [20, 20] });
    }, 250);
  }
  // ============================================================
  // ACTIVITIES PAGE: custom catalogue (add / delete)
  // ============================================================

  /**
   * Renders the outdoor activities catalogue into `container`.
   * Shows a "+ Ajouter" button at the top and a 🗑️ delete button on each row.
   * @param {HTMLElement} container
   * @param {Function} onChanged - callback after add/delete to refresh the view
   */
  renderActivitiesPage(container, onChanged) {
    container.innerHTML = '';

    const activities = getOutdoorActivities();

    // Header row: "+ Ajouter une activité"
    const header = document.createElement('div');
    header.className = 'outdoor-act-header';
    header.innerHTML = `
      <button class="btn-primary-sm" id="btn-add-outdoor-activity">+ Ajouter une activite</button>
    `;
    container.appendChild(header);

    if (activities.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'Aucune activite configuree';
      container.appendChild(empty);
    } else {
      activities.forEach(a => {
        const item = document.createElement('div');
        item.className = 'exercise-item outdoor-activity-item';
        item.innerHTML = `
          <div class="exercise-item-color" style="background:var(--color-exterieur,#22c55e)"></div>
          <div class="exercise-item-info">
            <div class="exercise-item-name">${a.icon} ${a.label}</div>
            <div class="exercise-item-muscle" style="color:var(--text-muted)">Activite exterieure</div>
          </div>
          <button class="btn-icon outdoor-act-delete" title="Supprimer cette activite" data-id="${a.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        `;
        container.appendChild(item);
      });
    }

    // Add activity button
    container.querySelector('#btn-add-outdoor-activity').addEventListener('click', () => {
      this.showAddActivityModal(onChanged);
    });

    // Delete buttons
    container.querySelectorAll('.outdoor-act-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await this._confirmDeleteActivity(id, onChanged);
      });
    });
  }

  /**
   * Shows the "Add outdoor activity" modal.
   * @param {Function} onAdded
   */
  showAddActivityModal(onAdded) {
    const existing = document.getElementById('outdoor-add-act-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'outdoor-add-act-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Ajouter une activite</h3>
          <button class="btn-icon" id="oaa-close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label" for="oaa-name">Nom *</label>
            <input type="text" id="oaa-name" class="form-input" placeholder="Ex: Trail nocturne" maxlength="50" autocomplete="off">
          </div>
          <div class="form-group">
            <label class="form-label" for="oaa-icon">Icone (emoji)</label>
            <input type="text" id="oaa-icon" class="form-input outdoor-icon-input" placeholder="🏃" maxlength="4" value="🏃" autocomplete="off">
            <span class="form-hint">Un seul emoji</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" id="oaa-cancel">Annuler</button>
          <button class="btn-primary" id="oaa-save">Enregistrer</button>
        </div>
      </div>
    `;

    overlay.querySelector('#oaa-close').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#oaa-cancel').addEventListener('click', () => overlay.remove());

    overlay.querySelector('#oaa-save').addEventListener('click', () => {
      const name = overlay.querySelector('#oaa-name').value.trim();
      const iconRaw = overlay.querySelector('#oaa-icon').value.trim();
      const icon = iconRaw || '🏃';

      if (!name) {
        App.showToast('Le nom est requis', 'error');
        return;
      }

      // Build a safe id from the name
      const id = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
      addOutdoorActivity({ id, label: name, icon });
      overlay.remove();
      App.showToast('Activite ajoutee !', 'success');
      if (onAdded) onAdded();
    });

    document.body.appendChild(overlay);
    setTimeout(() => overlay.querySelector('#oaa-name').focus(), 100);
  }

  /**
   * Confirms and deletes an outdoor activity.
   * Checks if the activity is used in the current outdoor program week plan.
   * @param {string} id
   * @param {Function} onDeleted
   */
  async _confirmDeleteActivity(id, onDeleted) {
    const activities = getOutdoorActivities();
    const act = activities.find(a => a.id === id);
    const label = act ? act.label : id;

    // Check if used in current outdoor program plan
    let usedInProgram = false;
    let programDateStr = '';
    try {
      const prog = Program.getProgramForCategory('exterieur');
      if (prog) {
        for (const week of prog.weeks) {
          for (const session of week.sessions) {
            if (session.type === id && !session.completed) {
              usedInProgram = true;
              programDateStr = session.date;
              break;
            }
          }
          if (usedInProgram) break;
        }
      }
    } catch (e) {}

    let confirmMsg = `Supprimer "${label}" ?\n\nVos seances deja enregistrees seront conservees.`;
    if (usedInProgram) {
      confirmMsg = `"${label}" est utilisee dans votre programme actif (a partir du ${programDateStr}).\n\nSupprimer quand meme ? L'activite sera retiree du programme automatiquement.`;
    }

    if (!confirm(confirmMsg)) return;

    // Remove from program if used
    if (usedInProgram) {
      try {
        await this._removeActivityFromProgram(id);
      } catch (e) {}
    }

    deleteOutdoorActivity(id);
    App.showToast('Activite supprimee', 'success');
    if (onDeleted) onDeleted();
  }

  /**
   * Removes all occurrences of an activity type from the active outdoor program.
   * @param {string} activityId
   */
  async _removeActivityFromProgram(activityId) {
    const prog = Program.getProgramForCategory('exterieur');
    if (!prog) return;

    const updated = {
      ...prog,
      weeks: prog.weeks.map(w => ({
        ...w,
        sessions: w.sessions.filter(s => s.type !== activityId)
      }))
    };

    // Also update the weeklyPlan stored in the program
    if (updated.weeklyPlan) {
      updated.weeklyPlan = updated.weeklyPlan.filter(d => d.type !== activityId);
    }

    await DB.saveProgram(updated);
    // Refresh in memory
    Program._activePrograms['exterieur'] = updated;

    // Also update the custom weekly plan setting if set
    const rawExt = await DB.getSetting('weeklyPlanCustom_exterieur');
    if (rawExt) {
      const plan = JSON.parse(rawExt).filter(d => d.type !== activityId);
      await DB.setSetting('weeklyPlanCustom_exterieur', JSON.stringify(plan));
      Program._customWeeklyPlans['exterieur'] = plan;
    }
  }
}

const Outdoor = new OutdoorManager();
