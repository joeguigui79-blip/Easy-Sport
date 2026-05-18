/**
 * stats.js - Statistics, charts and progress tracking
 * Supports category filter: salle, interieur, exterieur
 */

class StatsManager {
  constructor() {
    this._workouts = [];
    this._outdoorSessions = [];
    this._progressChart = null;
    this._currentCat = 'salle';
  }

  async init() {
    await this.refresh();
    this._bindEvents();
  }

  async refresh() {
    this._workouts = await DB.getAllWorkouts();
    this._workouts.sort((a, b) => b.date - a.date);
    this._outdoorSessions = await DB.getAllOutdoorSessions();
    this._outdoorSessions.sort((a, b) => b.date - a.date);
    return this._workouts;
  }

  _bindEvents() {
    const sel = document.getElementById('stats-exercise-select');
    if (sel) {
      sel.addEventListener('change', () => {
        this.renderProgressChart(sel.value ? parseInt(sel.value) : null);
      });
    }

    // Category toggle tabs
    document.querySelectorAll('.stats-cat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.stats-cat-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._currentCat = tab.dataset.cat;
        this.renderAll(this._currentCat);
      });
    });
  }

  async renderAll(category) {
    await this.refresh();
    this._currentCat = category || this._currentCat;

    // Sync tabs
    document.querySelectorAll('.stats-cat-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.cat === this._currentCat);
    });

    if (this._currentCat === 'exterieur') {
      this._renderOutdoorStats();
      document.getElementById('stats-training-section')?.classList.add('hidden');
      document.getElementById('stats-outdoor-section')?.classList.remove('hidden');
    } else {
      document.getElementById('stats-training-section')?.classList.remove('hidden');
      document.getElementById('stats-outdoor-section')?.classList.add('hidden');
      this._renderGlobalStats(this._currentCat);
      this._renderMuscleChart(this._currentCat);
      this._renderExerciseSelect(this._currentCat);
      this._renderHistory(this._currentCat);
    }
  }

  _filterWorkoutsByCat(cat) {
    if (!cat || cat === 'all') return this._workouts;
    return this._workouts.filter(w => (w.category || 'salle') === cat);
  }

  _renderGlobalStats(cat) {
    const workouts = this._filterWorkoutsByCat(cat);

    const totalVol = workouts.reduce((acc, w) =>
      acc + (w.exercises || []).reduce((a, ex) =>
        a + (ex.sets || []).reduce((s, set) => s + (set.weight * set.reps), 0), 0), 0);

    const totalSessions = workouts.length;
    const streak = this._getBestStreak(workouts);

    const el = (id, val) => {
      const e = document.getElementById(id);
      if (e) e.textContent = val;
    };

    el('stat-total-vol', Math.round(totalVol).toLocaleString('fr-FR'));
    el('stat-total-sessions-num', totalSessions);
    el('stat-best-streak', streak);

    const badge = document.getElementById('history-count');
    if (badge) badge.textContent = `${totalSessions} seance${totalSessions > 1 ? 's' : ''}`;
  }

  _getBestStreak(workouts) {
    if (!workouts || workouts.length === 0) return 0;
    const dates = [...new Set(workouts.map(w => {
      const d = new Date(w.date);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }))].sort();

    let best = 1, current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1].split('-').map(Number));
      const curr = new Date(dates[i].split('-').map(Number));
      const diff = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diff <= 1) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 1;
      }
    }
    return best;
  }

  _renderMuscleChart(cat) {
    const container = document.getElementById('muscle-chart');
    if (!container) return;

    const workouts = this._filterWorkoutsByCat(cat);
    const volumeByMuscle = {};
    workouts.forEach(w => {
      (w.exercises || []).forEach(ex => {
        const vol = (ex.sets || []).reduce((acc, s) => acc + (s.weight * s.reps), 0);
        volumeByMuscle[ex.muscle] = (volumeByMuscle[ex.muscle] || 0) + vol;
      });
    });

    const entries = Object.entries(volumeByMuscle).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      container.innerHTML = '<p class="empty-state">Aucune donnee disponible</p>';
      return;
    }

    const max = Math.max(...entries.map(e => e[1]));
    container.innerHTML = '';

    entries.forEach(([muscle, vol]) => {
      const pct = max > 0 ? (vol / max) * 100 : 0;
      const label = Exercises.getMuscleLabel(muscle);
      const row = document.createElement('div');
      row.className = 'muscle-bar-row';
      row.innerHTML = `
        <div class="muscle-bar-label">${label}</div>
        <div class="muscle-bar-track">
          <div class="muscle-bar-fill muscle-${muscle}" style="width: ${pct}%"></div>
        </div>
        <div class="muscle-bar-val">${Math.round(vol).toLocaleString('fr-FR')} kg</div>
      `;
      container.appendChild(row);
    });
  }

  _renderExerciseSelect(cat) {
    const sel = document.getElementById('stats-exercise-select');
    if (!sel) return;

    const workouts = this._filterWorkoutsByCat(cat);
    const exerciseMap = {};
    workouts.forEach(w => {
      (w.exercises || []).forEach(ex => {
        exerciseMap[ex.exerciseId] = ex.exerciseName;
      });
    });

    sel.innerHTML = '<option value="">Choisir un exercice...</option>';
    Object.entries(exerciseMap).sort((a, b) => a[1].localeCompare(b[1])).forEach(([id, name]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = name;
      sel.appendChild(opt);
    });
  }

  renderProgressChart(exerciseId) {
    const container = document.getElementById('progress-chart');
    if (!container) return;

    if (!exerciseId) {
      container.innerHTML = '<p class="empty-state">Selectionnez un exercice</p>';
      return;
    }

    const workouts = this._filterWorkoutsByCat(this._currentCat);
    const dataPoints = [];
    workouts.slice().reverse().forEach(w => {
      const ex = (w.exercises || []).find(e => e.exerciseId === exerciseId);
      if (!ex || !ex.sets || ex.sets.length === 0) return;

      const maxWeight = Math.max(...ex.sets.map(s => s.weight || 0));
      const maxReps = Math.max(...ex.sets.map(s => s.reps || 0));
      const date = new Date(w.date);
      const label = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      dataPoints.push({ label, weight: maxWeight, reps: maxReps, volume: ex.sets.reduce((a, s) => a + s.weight * s.reps, 0) });
    });

    if (dataPoints.length === 0) {
      container.innerHTML = '<p class="empty-state">Pas de donnees pour cet exercice</p>';
      return;
    }

    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'chart-canvas-wrap';
    const canvas = document.createElement('canvas');
    canvas.className = 'chart-canvas';
    canvas.width = 800;
    canvas.height = 360;
    wrap.appendChild(canvas);
    container.appendChild(wrap);

    this._drawLineChart(canvas, dataPoints);
  }

  _drawLineChart(canvas, data) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    const isDark = document.body.classList.contains('theme-dark');
    const textColor = isDark ? 'rgba(240,240,255,0.6)' : 'rgba(30,0,51,0.5)';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    const values = data.map(d => d.weight);
    const minVal = Math.max(0, Math.min(...values) - 5);
    const maxVal = Math.max(...values) + 5;
    const range = maxVal - minVal || 1;
    const xStep = data.length > 1 ? chartW / (data.length - 1) : chartW;

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();

      const val = maxVal - ((maxVal - minVal) / 4) * i;
      ctx.fillStyle = textColor;
      ctx.font = '18px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(0) + 'kg', pad.left - 6, y + 5);
    }

    ctx.fillStyle = textColor;
    ctx.font = '16px system-ui';
    ctx.textAlign = 'center';
    data.forEach((d, i) => {
      const x = pad.left + i * xStep;
      ctx.fillText(d.label, x, H - 8);
    });

    const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    gradient.addColorStop(0, 'rgba(224,64,251,0.35)');
    gradient.addColorStop(1, 'rgba(124,58,237,0.0)');

    ctx.beginPath();
    data.forEach((d, i) => {
      const x = pad.left + i * xStep;
      const y = pad.top + chartH - ((d.weight - minVal) / range) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + (data.length - 1) * xStep, pad.top + chartH);
    ctx.lineTo(pad.left, pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = '#e040fb';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    data.forEach((d, i) => {
      const x = pad.left + i * xStep;
      const y = pad.top + chartH - ((d.weight - minVal) / range) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    data.forEach((d, i) => {
      const x = pad.left + i * xStep;
      const y = pad.top + chartH - ((d.weight - minVal) / range) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#e040fb';
      ctx.fill();
      ctx.strokeStyle = isDark ? '#0f0f1a' : '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  _renderOutdoorStats() {
    const sessions = this._outdoorSessions;
    const periods = ['7d', '30d', 'month'];

    // By activity type
    const actContainer = document.getElementById('outdoor-stats-by-activity');
    if (actContainer) {
      const byAct = {};
      sessions.forEach(s => {
        if (!byAct[s.activity]) byAct[s.activity] = { count: 0, totalMin: 0, totalKm: 0 };
        byAct[s.activity].count++;
        byAct[s.activity].totalMin += s.durationMin || 0;
        byAct[s.activity].totalKm += s.distanceKm || 0;
      });

      const entries = Object.entries(byAct);
      if (entries.length === 0) {
        actContainer.innerHTML = '<p class="empty-state">Aucune donnee</p>';
      } else {
        actContainer.innerHTML = entries.map(([act, d]) => `
          <div class="outdoor-act-stat">
            <span class="oas-icon">${Outdoor.getActivityIcon(act)}</span>
            <span class="oas-name">${Outdoor.getActivityLabel(act)}</span>
            <span class="oas-count">${d.count} seances</span>
            <span class="oas-km">${d.totalKm > 0 ? d.totalKm.toFixed(1) + ' km' : d.totalMin + ' min'}</span>
          </div>
        `).join('');
      }
    }

    // Period stats
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    const s7 = Outdoor.getStats(sessions, '7d');
    const s30 = Outdoor.getStats(sessions, '30d');
    el('outdoor-stats-km-7d', s7.totalKm.toFixed(1));
    el('outdoor-stats-min-7d', s7.totalMin);
    el('outdoor-stats-count-7d', s7.count);
    el('outdoor-stats-km-30d', s30.totalKm.toFixed(1));
    el('outdoor-stats-min-30d', s30.totalMin);
    el('outdoor-stats-count-30d', s30.count);
  }

  _renderHistory(cat) {
    const container = document.getElementById('session-history');
    if (!container) return;

    const workouts = this._filterWorkoutsByCat(cat);

    if (workouts.length === 0) {
      container.innerHTML = '<p class="empty-state">Aucune seance enregistree</p>';
      return;
    }

    container.innerHTML = '';
    workouts.slice(0, 20).forEach(w => {
      const date = new Date(w.date);
      const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const duration = Math.round((w.duration || 0) / 60);
      const totalVol = (w.exercises || []).reduce((acc, ex) =>
        acc + (ex.sets || []).reduce((a, s) => a + s.weight * s.reps, 0), 0);
      const type = w.type || 'full';

      const item = document.createElement('div');
      item.className = 'session-history-item';
      item.innerHTML = `
        <div class="shi-date">${dateStr}<br><small>${timeStr}</small></div>
        <div class="shi-icon">${WORKOUT_TYPE_ICONS[type] || '💪'}</div>
        <div class="shi-info">
          <div class="shi-type">${WORKOUT_TYPE_LABELS[type] || type}</div>
          <div class="shi-detail">${duration} min • ${(w.exercises || []).length} exercices</div>
        </div>
        <div class="shi-vol">${Math.round(totalVol)} kg</div>
      `;
      container.appendChild(item);
    });
  }

  // Called from dashboard
  async getStreakInfo(cat) {
    await this.refresh();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // For exterieur, count outdoor sessions; for others, count workouts
    let allSessions;
    if (cat === 'exterieur') {
      allSessions = this._outdoorSessions;
    } else {
      allSessions = this._filterWorkoutsByCat(cat);
    }

    // Helper: local date string (YYYY-MM-DD) to avoid UTC timezone offset issues
    const localDateStr = (ts) => {
      const d = new Date(ts);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    let streak = 0;
    const checkDate = new Date(today);
    while (true) {
      const dayStr = localDateStr(checkDate.getTime());
      const has = allSessions.some(w => localDateStr(w.date) === dayStr);
      if (!has) break;
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));

    const weekSessions = allSessions.filter(w => {
      const d = new Date(w.date);
      return d >= weekStart && d <= today;
    }).length;

    return {
      streak,
      weekSessions,
      totalSessions: allSessions.length
    };
  }

  async getRecentProgress(cat) {
    await this.refresh();
    const workouts = this._filterWorkoutsByCat(cat);
    const exerciseProgress = {};

    workouts.slice(0, 10).forEach(w => {
      (w.exercises || []).forEach(ex => {
        if (!ex.sets || ex.sets.length === 0) return;
        const maxW = Math.max(...ex.sets.map(s => s.weight || 0));
        if (!exerciseProgress[ex.exerciseName] || maxW > exerciseProgress[ex.exerciseName]) {
          exerciseProgress[ex.exerciseName] = maxW;
        }
      });
    });

    return Object.entries(exerciseProgress).slice(0, 5).map(([name, weight]) => ({
      name,
      weight
    }));
  }
}

const Stats = new StatsManager();
