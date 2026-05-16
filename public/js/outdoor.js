/**
 * outdoor.js - Gestion des seances de sport exterieur (saisie manuelle - Phase A)
 */

const OUTDOOR_ACTIVITIES = [
  { id: 'running', label: 'Course a pied', icon: '🏃' },
  { id: 'walk', label: 'Marche rapide / nordique', icon: '🚶' },
  { id: 'trail', label: 'Trail', icon: '⛰️' },
  { id: 'cycling_road', label: 'Velo de route', icon: '🚴' },
  { id: 'cycling_mtb', label: 'VTT', icon: '🏔️' },
  { id: 'swimming', label: 'Natation', icon: '🏊' },
  { id: 'hiking', label: 'Randonnee', icon: '🥾' },
  { id: 'sprint', label: 'Sprint / fractionne', icon: '⚡' }
];

class OutdoorManager {
  constructor() {
    this._sessions = [];
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

  // Calculate pace from distance (km) + duration (min) -> min/km string
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
    // Auto-calculate pace if not provided
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

  // Stats helpers
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

  // Render the outdoor session form (modal content)
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
          <h3 class="modal-title">${session ? 'Modifier la seance' : 'Nouvelle seance exterieure'}</h3>
          <button class="btn-icon" id="outdoor-form-close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <form id="outdoor-form" class="form">
            <input type="hidden" id="outdoor-form-id" value="${session ? session.id : ''}">
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

    // Feeling buttons
    let selectedFeeling = session ? session.feeling : 3;
    const feelingBtns = overlay.querySelectorAll('.feeling-btn');
    feelingBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        selectedFeeling = parseInt(btn.dataset.val);
        feelingBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.val) === selectedFeeling));
      });
    });

    // Auto-pace on input
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

  // Render outdoor sessions list in a container
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
          <div class="osi-name">${this.getActivityLabel(s.activity)}</div>
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
            <button class="btn-icon osi-edit" title="Modifier">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
            <button class="btn-icon osi-delete" title="Supprimer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
      `;

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
}

const Outdoor = new OutdoorManager();
