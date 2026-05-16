/**
 * outdoor.js - Gestion des seances de sport exterieur (Phase A: saisie manuelle + Phase B: GPS)
 */

const OUTDOOR_ACTIVITIES = [
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

class OutdoorManager {
  constructor() {
    this._sessions = [];
    this._activeTrackingActivity = null;
    this._mapFullscreen = false;
    this._statsTimer = null;
  }

  async init() {
    await this.refresh();
  }

  async refresh() {
    this._sessions = await DB.getAllOutdoorSessions();
    this._sessions.sort((a, b) => b.date - a.date);
    return this._sessions;
  }

  getAll() {
    return this._sessions;
  }

  getActivityLabel(id) {
    const a = OUTDOOR_ACTIVITIES.find(x => x.id === id);
    return a ? a.label : id;
  }

  getActivityIcon(id) {
    const a = OUTDOOR_ACTIVITIES.find(x => x.id === id);
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
  // PHASE B: GPS mode selection modal
  // ============================================================

  showStartModal(onManual, onGPS) {
    // Remove existing
    const existing = document.getElementById('outdoor-start-overlay');
    if (existing) existing.remove();

    const actOptions = OUTDOOR_ACTIVITIES.map(a =>
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
        <div class="modal-body">
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
      </div>
    `;

    overlay.querySelector('#ostart-close').addEventListener('click', () => overlay.remove());

    overlay.querySelector('#ostart-manual').addEventListener('click', () => {
      const activity = overlay.querySelector('#ostart-activity').value;
      overlay.remove();
      if (onManual) onManual(activity);
    });

    overlay.querySelector('#ostart-gps').addEventListener('click', () => {
      const activity = overlay.querySelector('#ostart-activity').value;
      overlay.remove();
      if (onGPS) onGPS(activity);
    });

    document.body.appendChild(overlay);
  }

  // ============================================================
  // PHASE B: GPS tracking screen
  // ============================================================

  showTrackingScreen(activity) {
    const existing = document.getElementById('outdoor-tracking-overlay');
    if (existing) existing.remove();

    const actLabel = this.getActivityLabel(activity);
    const actIcon = this.getActivityIcon(activity);

    const overlay = document.createElement('div');
    overlay.id = 'outdoor-tracking-overlay';
    overlay.className = 'tracking-overlay';
    overlay.innerHTML = `
      <div class="tracking-header">
        <button class="btn-icon tracking-back-btn" id="tracking-cancel-btn" title="Annuler la seance">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <span class="tracking-title">${actIcon} ${actLabel}</span>
        <div class="tracking-gps-badge" id="tracking-gps-badge">
          <span class="gps-dot"></span> GPS
        </div>
      </div>

      <!-- Carte Leaflet -->
      <div class="tracking-map-wrapper" id="tracking-map-wrapper">
        <div id="tracking-map" class="tracking-map"></div>
        <button class="btn-map-fullscreen" id="btn-map-fullscreen" title="Plein ecran">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="btn-map-exit-fullscreen hidden" id="btn-map-exit-fullscreen" title="Quitter plein ecran">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 0 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
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

      <!-- Initialisation GPS -->
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

    // Init map — use rAF to ensure overlay is rendered before Leaflet measures container
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        GPS.initMap('tracking-map');
      });
    });

    // Fullscreen map toggle
    overlay.querySelector('#btn-map-fullscreen').addEventListener('click', () => {
      this._setMapFullscreen(true);
    });
    overlay.querySelector('#btn-map-exit-fullscreen').addEventListener('click', () => {
      this._setMapFullscreen(false);
    });

    // Cancel
    overlay.querySelector('#tracking-cancel-btn').addEventListener('click', () => {
      if (GPS.isRunning() || GPS.isPaused()) {
        if (!confirm('Annuler la seance en cours ? La trace ne sera pas sauvegardee.')) return;
      }
      GPS.stop();
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
      overlay.remove();
      this._showGPSSaveModal(activity, stats);
    };
    overlay.querySelector('#btn-tracking-finish').addEventListener('click', finishHandler);
    overlay.querySelector('#btn-tracking-finish-paused').addEventListener('click', finishHandler);

    // Start GPS
    GPS.start(
      (stats) => this._updateTrackingUI(stats),
      (errCode) => this._handleGPSError(errCode, activity)
    );
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

    // Hide init msg once we have a point
    if (stats.pointCount > 0) {
      const initMsg = document.getElementById('tracking-init-msg');
      if (initMsg) initMsg.style.display = 'none';
    }

    setEl('tsc-distance', stats.distanceKm.toFixed(2));
    setEl('tsc-avg-pace', stats.avgPace || '--\'--"');
    setEl('tsc-instant-pace', stats.instantPace || '--\'--"');

    // Duration format mm:ss or hh:mm:ss
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
    if (errCode === 'GPS_DENIED') {
      msg = 'Acces GPS refuse. Vous pouvez saisir votre seance manuellement.';
    } else if (errCode === 'GPS_UNAVAILABLE') {
      msg = 'GPS non disponible sur cet appareil. Saisie manuelle activee.';
    } else if (errCode === 'GPS_TIMEOUT') {
      msg = 'Delai GPS depasse. Saisie manuelle activee.';
    }

    App.showToast(msg, 'error');
    // Fallback to manual entry
    setTimeout(() => {
      this.renderFormModal({ activity }, null, null);
    }, 800);
  }

  // ============================================================
  // PHASE B: Save GPS session modal
  // ============================================================

  _showGPSSaveModal(activity, stats) {
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

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'outdoor-gps-save-overlay';
    overlay.innerHTML = `
      <div class="modal modal-large">
        <div class="modal-header">
          <h3 class="modal-title">${actIcon} Seance terminee</h3>
        </div>
        <div class="modal-body">
          <!-- Summary stats -->
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

          <!-- Mini replay map -->
          ${trace.length > 1 ? `
            <div class="gps-replay-map-wrap">
              <div id="gps-replay-map" class="gps-replay-map"></div>
              <div class="gps-replay-label">${trace.length} points GPS</div>
            </div>
          ` : '<p class="hint-text" style="text-align:center;margin-bottom:16px">Peu de points GPS enregistres</p>'}

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
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(replayMap);
        const latLngs = trace.map(p => [p.lat, p.lng]);
        const poly = L.polyline(latLngs, { color: '#ef4444', weight: 3 }).addTo(replayMap);
        replayMap.fitBounds(poly.getBounds(), { padding: [12, 12] });
        // Start marker
        L.circleMarker(latLngs[0], { radius: 6, color: '#4ade80', fillColor: '#4ade80', fillOpacity: 1 }).addTo(replayMap);
        // End marker
        L.circleMarker(latLngs[latLngs.length - 1], { radius: 6, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }).addTo(replayMap);
      }, 200);
    }

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
        distance_gps: distKm, // flag as GPS
        elevationM: elevM > 0 ? elevM : null,
        pace: avgPace && avgPace !== '--\'--"' ? avgPace : this.calcPace(distKm, durationMin),
        location: overlay.querySelector('#gps-save-location').value.trim() || null,
        feeling: selectedFeeling,
        notes: overlay.querySelector('#gps-save-notes').value.trim() || null,
        trace: trace,
        category: 'exterieur',
        gpsTracked: true
      };

      await this.add(data);
      overlay.remove();
      App.showToast('Seance GPS sauvegardee !', 'success');
      // Refresh outdoor page if visible
      if (typeof App !== 'undefined' && App._currentPage === 'outdoor') {
        App._renderOutdoorPage();
      }
    });
  }

  // ============================================================
  // PHASE A: Manual form modal (unchanged)
  // ============================================================

  renderFormModal(session, onSave, onCancel) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay outdoor-form-overlay';
    overlay.id = 'outdoor-form-overlay';

    const activityOptions = OUTDOOR_ACTIVITIES.map(a =>
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
              <select id="outdoor-activity" class="form-select" required>
                ${activityOptions}
              </select>
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
        activity,
        date: dateTs,
        durationMin,
        distanceKm: distKm,
        elevationM: elevM,
        pace: paceVal || null,
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
  // Session list rendering with GPS badge + replay
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

    // Init replay map
    setTimeout(() => {
      if (typeof L === 'undefined') return;
      const replayMap = L.map('replay-map', {
        zoomControl: true,
        attributionControl: false
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(replayMap);
      const latLngs = session.trace.map(p => [p.lat, p.lng]);
      const poly = L.polyline(latLngs, { color: '#ef4444', weight: 4, opacity: 0.85 }).addTo(replayMap);
      // Start / end markers
      L.circleMarker(latLngs[0], { radius: 8, color: '#4ade80', fillColor: '#4ade80', fillOpacity: 1, weight: 2 })
        .bindPopup('Depart').addTo(replayMap);
      L.circleMarker(latLngs[latLngs.length - 1], { radius: 8, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1, weight: 2 })
        .bindPopup('Arrivee').addTo(replayMap);
      replayMap.fitBounds(poly.getBounds(), { padding: [20, 20] });
    }, 250);
  }
}

const Outdoor = new OutdoorManager();
