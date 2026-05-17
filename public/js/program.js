/**
 * program.js - Programme generator and manager
 * Supports multi-category sessions: salle, interieur, exterieur
 */

const DEFAULT_WEEKLY_PLAN = [
  { day: 0, label: 'Dim', type: 'rest', category: 'salle' },
  { day: 1, label: 'Lun', type: 'upper', category: 'salle' },
  { day: 2, label: 'Mar', type: 'lower', category: 'salle' },
  { day: 3, label: 'Mer', type: 'rest', category: 'salle' },
  { day: 4, label: 'Jeu', type: 'full', category: 'salle' },
  { day: 5, label: 'Ven', type: 'rest', category: 'salle' },
  { day: 6, label: 'Sam', type: 'upper', category: 'salle' }
];

const DEFAULT_WEEKLY_PLAN_INTERIEUR = [
  { day: 0, label: 'Dim', type: 'rest', category: 'interieur' },
  { day: 1, label: 'Lun', type: 'upper_int', category: 'interieur' },
  { day: 2, label: 'Mar', type: 'lower_int', category: 'interieur' },
  { day: 3, label: 'Mer', type: 'rest', category: 'interieur' },
  { day: 4, label: 'Jeu', type: 'full_int', category: 'interieur' },
  { day: 5, label: 'Ven', type: 'hiit_int', category: 'interieur' },
  { day: 6, label: 'Sam', type: 'yoga_int', category: 'interieur' }
];

const DEFAULT_WEEKLY_PLAN_EXTERIEUR = [
  { day: 0, label: 'Dim', type: 'running_long', category: 'exterieur' },
  { day: 1, label: 'Lun', type: 'rest', category: 'exterieur' },
  { day: 2, label: 'Mar', type: 'running', category: 'exterieur' },
  { day: 3, label: 'Mer', type: 'rest', category: 'exterieur' },
  { day: 4, label: 'Jeu', type: 'cycling_road', category: 'exterieur' },
  { day: 5, label: 'Ven', type: 'rest', category: 'exterieur' },
  { day: 6, label: 'Sam', type: 'trail', category: 'exterieur' }
];

const PROGRESSION_THRESHOLD = 3;
const PROGRESSION_STEP = 2.5;

class ProgramManager {
  constructor() {
    this.currentProgram = null;
    // Per-category custom weekly plans and active programs
    this._customWeeklyPlans = {}; // { salle: [...], interieur: [...] }
    this._activePrograms = {};    // { salle: program, interieur: program }
    // Legacy support
    this._customWeeklyPlan = null;
  }

  async init() {
    // Load per-category plans
    const rawSalle = await DB.getSetting('weeklyPlanCustom_salle');
    const rawInt = await DB.getSetting('weeklyPlanCustom_interieur');
    const rawExt = await DB.getSetting('weeklyPlanCustom_exterieur');
    const rawLegacy = await DB.getSetting('weeklyPlanCustom');

    if (rawSalle) {
      this._customWeeklyPlans['salle'] = JSON.parse(rawSalle).map(d => ({ ...d, category: 'salle' }));
    } else if (rawLegacy) {
      // Migrate legacy plan -> salle
      const legacy = JSON.parse(rawLegacy).map(d => ({ ...d, category: d.category || 'salle' }));
      this._customWeeklyPlans['salle'] = legacy.filter(d => (d.category || 'salle') === 'salle');
      await DB.setSetting('weeklyPlanCustom_salle', JSON.stringify(this._customWeeklyPlans['salle']));
    }

    if (rawInt) {
      this._customWeeklyPlans['interieur'] = JSON.parse(rawInt).map(d => ({ ...d, category: 'interieur' }));
    }

    if (rawExt) {
      this._customWeeklyPlans['exterieur'] = JSON.parse(rawExt).map(d => ({ ...d, category: 'exterieur' }));
    }

    // Load active programs per category
    const allPrograms = await DB.getAllPrograms();
    for (const p of allPrograms) {
      // Migration: programs without category get 'salle'
      if (!p.category) {
        p.category = 'salle';
        await DB.saveProgram(p);
      }
      if (p.active) {
        this._activePrograms[p.category] = p;
      }
    }

    // Ensure a salle program exists
    if (!this._activePrograms['salle']) {
      await this.generateProgram(this._customWeeklyPlans['salle'] || DEFAULT_WEEKLY_PLAN, 'salle');
    }

    // currentProgram kept for backward compat (salle)
    this.currentProgram = this._activePrograms['salle'] || null;
    return this.currentProgram;
  }

  getEffectiveWeeklyPlan(category) {
    const cat = category || 'salle';
    if (this._customWeeklyPlans[cat]) return this._customWeeklyPlans[cat];
    if (cat === 'interieur') return DEFAULT_WEEKLY_PLAN_INTERIEUR;
    if (cat === 'exterieur') return DEFAULT_WEEKLY_PLAN_EXTERIEUR;
    return DEFAULT_WEEKLY_PLAN;
  }

  getProgramForCategory(category) {
    const cat = category || 'salle';
    return this._activePrograms[cat] || null;
  }

  async ensureProgramForCategory(category) {
    const cat = category || 'salle';
    if (!this._activePrograms[cat]) {
      await this.generateProgram(this.getEffectiveWeeklyPlan(cat), cat);
    }
    return this._activePrograms[cat];
  }

  async saveCustomWeeklyPlan(daySessionMap, category) {
    const cat = category || 'salle';
    const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    // Force all days to have the programme's locked category
    const weeklyPlan = Object.entries(daySessionMap).map(([day, info]) => ({
      day: parseInt(day),
      label: DAY_LABELS[parseInt(day)],
      type: info.type,
      category: cat
    }));
    this._customWeeklyPlans[cat] = weeklyPlan;
    await DB.setSetting(`weeklyPlanCustom_${cat}`, JSON.stringify(weeklyPlan));
    await this.generateProgram(weeklyPlan, cat);
    // Update legacy key for backward compat if salle
    if (cat === 'salle') {
      this._customWeeklyPlan = weeklyPlan;
      await DB.setSetting('weeklyPlanCustom', JSON.stringify(weeklyPlan));
    }
  }

  async generateProgram(weeklyPlan, category) {
    const cat = category || 'salle';
    // Default plan if none provided
    if (!weeklyPlan) {
      weeklyPlan = this.getEffectiveWeeklyPlan(cat);
    }
    const startDate = this._getMonday(new Date());
    const weeks = [];

    for (let w = 0; w < 4; w++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + w * 7);
      const weekSessions = [];

      for (const dayPlan of weeklyPlan) {
        if (dayPlan.type === 'rest') continue;
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + w * 7 + (dayPlan.day === 0 ? 6 : dayPlan.day - 1));

        weekSessions.push({
          dayOfWeek: dayPlan.day,
          dayLabel: dayPlan.label,
          type: dayPlan.type,
          category: cat,
          date: targetDate.toISOString().split('T')[0],
          completed: false
        });
      }
      weeks.push({ week: w + 1, sessions: weekSessions, completed: false });
    }

    const catLabel = cat === 'salle' ? 'Sport en salle' : cat === 'interieur' ? 'Sport d\'interieur' : 'Sport d\'exterieur';
    const program = {
      name: `Programme ${catLabel} - 4 semaines`,
      category: cat,
      startDate: startDate.toISOString().split('T')[0],
      weeklyPlan,
      weeks,
      active: true,
      createdAt: Date.now()
    };

    // Deactivate old programs of same category
    const allPrograms = await DB.getAllPrograms();
    for (const p of allPrograms) {
      const pCat = p.category || 'salle';
      if (pCat === cat && p.active) {
        await DB.saveProgram({ ...p, active: false });
      }
    }

    const id = await DB.saveProgram(program);
    const saved = { ...program, id };
    this._activePrograms[cat] = saved;
    if (cat === 'salle') {
      this.currentProgram = saved;
    }
    return saved;
  }



  async getProgram(category) {
    const cat = category || 'salle';
    if (!this._activePrograms[cat]) {
      const all = await DB.getAllPrograms();
      for (const p of all) {
        if (p.active && (p.category || 'salle') === cat) {
          this._activePrograms[cat] = p;
        }
      }
    }
    return this._activePrograms[cat] || null;
  }

  getTodayType(category) {
    const cat = category || 'salle';
    const today = new Date().getDay();
    const plan = this.getEffectiveWeeklyPlan(cat);
    const dayPlan = plan.find(d => d.day === today);
    return dayPlan ? dayPlan.type : 'rest';
  }

  getTodayCategory(category) {
    return category || 'salle';
  }

  getNextWorkout(category) {
    const cat = category || 'salle';
    const prog = this._activePrograms[cat];
    if (!prog) return null;
    const today = new Date().toISOString().split('T')[0];

    for (const week of prog.weeks) {
      for (const session of week.sessions) {
        if (!session.completed && session.date >= today) {
          return { ...session, week: week.week };
        }
      }
    }
    return null;
  }

  async markSessionCompleted(date, type, category) {
    const cat = category || 'salle';
    const prog = this._activePrograms[cat];
    if (!prog) return;
    let found = false;
    const updated = { ...prog, weeks: prog.weeks.map(w => ({ ...w, sessions: w.sessions.map(s => ({ ...s })) })) };

    for (const week of updated.weeks) {
      for (const session of week.sessions) {
        if (session.date === date && session.type === type && !session.completed) {
          session.completed = true;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (found) {
      await DB.saveProgram(updated);
      this._activePrograms[cat] = updated;
      if (cat === 'salle') this.currentProgram = updated;
    }
  }

  async checkAndSuggestProgression(exerciseId, exerciseName) {
    const workouts = await DB.getAllWorkouts();
    workouts.sort((a, b) => b.date - a.date);

    let consecutiveSuccess = 0;
    let lastWeight = null;

    for (const workout of workouts) {
      const exData = workout.exercises && workout.exercises.find(e => e.exerciseId === exerciseId || e.exerciseName === exerciseName);
      if (!exData) continue;

      const success = exData.sets && exData.sets.every(s => s.completed && s.reps >= (exData.targetReps || 0));
      if (success) {
        consecutiveSuccess++;
        lastWeight = exData.sets[0] ? exData.sets[0].weight : null;
      } else {
        break;
      }

      if (consecutiveSuccess >= PROGRESSION_THRESHOLD) break;
    }

    if (consecutiveSuccess >= PROGRESSION_THRESHOLD && lastWeight !== null) {
      return { suggest: true, newWeight: lastWeight + PROGRESSION_STEP };
    }
    return { suggest: false };
  }

  getCycleProgress(category) {
    const cat = category || 'salle';
    const prog = this._activePrograms[cat];
    if (!prog) return 0;
    let total = 0, done = 0;
    for (const week of prog.weeks) {
      for (const s of week.sessions) {
        total++;
        if (s.completed) done++;
      }
    }
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }

  _getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  renderWeeklyPlan(container, category) {
    container.innerHTML = '';
    const cat = category || 'salle';
    const today = new Date().getDay();
    const plan = this.getEffectiveWeeklyPlan(cat);

    plan.forEach(dayPlan => {
      const icon = WORKOUT_TYPE_ICONS[dayPlan.type]
        || (cat === 'exterieur' ? Outdoor.getActivityIcon(dayPlan.type) : null)
        || '😴';
      const label = WORKOUT_TYPE_LABELS[dayPlan.type]
        || (cat === 'exterieur' ? Outdoor.getActivityLabel(dayPlan.type) : null)
        || 'Repos';
      const div = document.createElement('div');
      div.className = 'plan-day plan-day--' + cat + (dayPlan.day === today ? ' today' : '');
      div.innerHTML = `
        <div class="plan-day-label">${dayPlan.label}</div>
        <div class="plan-day-type">${icon}</div>
        <div class="plan-day-name">${label}</div>
      `;
      container.appendChild(div);
    });
  }

  renderProgramWeeks(container, category) {
    container.innerHTML = '';
    const cat = category || 'salle';
    const prog = this._activePrograms[cat];
    if (!prog) {
      container.innerHTML = '<p class="empty-state">Aucun programme actif</p>';
      return;
    }

    prog.weeks.forEach((week, wi) => {
      const card = document.createElement('div');
      card.className = 'program-week-card';
      const doneSessions = week.sessions.filter(s => s.completed).length;
      const isOpen = wi === 0;

      card.innerHTML = `
        <div class="week-card-header">
          <div>
            <div class="week-card-title">Semaine ${week.week}</div>
            <div class="week-card-status">${doneSessions}/${week.sessions.length} seances</div>
          </div>
          <span class="week-card-chevron ${isOpen ? 'open' : ''}">▼</span>
        </div>
        <div class="week-card-body ${isOpen ? 'open' : ''}">
          <div class="week-session-list">
            ${week.sessions.map(s => {
              const sIcon = WORKOUT_TYPE_ICONS[s.type]
                || (cat === 'exterieur' ? Outdoor.getActivityIcon(s.type) : '?');
              const sLabel = WORKOUT_TYPE_LABELS[s.type]
                || (cat === 'exterieur' ? Outdoor.getActivityLabel(s.type) : s.type);
              return `
              <div class="week-session-item week-session-item--${cat}">
                <span class="wsi-day">${s.dayLabel}</span>
                <span class="wsi-type">${sIcon}</span>
                <span class="wsi-name">${sLabel}</span>
                <span class="wsi-status">${s.completed ? '✅' : ''}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      `;

      const header = card.querySelector('.week-card-header');
      const body = card.querySelector('.week-card-body');
      const chevron = card.querySelector('.week-card-chevron');

      header.addEventListener('click', () => {
        const open = body.classList.toggle('open');
        chevron.classList.toggle('open', open);
      });

      container.appendChild(card);
    });
  }
}

const Program = new ProgramManager();
