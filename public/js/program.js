/**
 * program.js - Programme generator and manager
 * 4-week cycle: Lun=Haut, Mar=Bas, Mer=Repos, Jeu=Full, Ven=Repos, Sam=Haut, Dim=Repos
 */

const DEFAULT_WEEKLY_PLAN = [
  { day: 0, label: 'Dim', type: 'rest' },
  { day: 1, label: 'Lun', type: 'upper' },
  { day: 2, label: 'Mar', type: 'lower' },
  { day: 3, label: 'Mer', type: 'rest' },
  { day: 4, label: 'Jeu', type: 'full' },
  { day: 5, label: 'Ven', type: 'rest' },
  { day: 6, label: 'Sam', type: 'upper' }
];

const PROGRESSION_THRESHOLD = 3; // seances consecutives reussies pour +2.5kg
const PROGRESSION_STEP = 2.5; // kg

class ProgramManager {
  constructor() {
    this.currentProgram = null;
  }

  async init() {
    this.currentProgram = await DB.getActiveProgram();
    if (!this.currentProgram) {
      await this.generateProgram();
    }
    return this.currentProgram;
  }

  async generateProgram(weeklyPlan = DEFAULT_WEEKLY_PLAN) {
    const startDate = this._getMonday(new Date());
    const weeks = [];

    for (let w = 0; w < 4; w++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + w * 7);
      const weekSessions = [];

      for (const dayPlan of weeklyPlan) {
        if (dayPlan.type === 'rest') continue;
        const sessionDate = new Date(weekStart);
        // Calculate actual date for this weekday
        const dayOffset = dayPlan.day - weekStart.getDay();
        sessionDate.setDate(weekStart.getDate() + (dayOffset >= 0 ? dayOffset : dayOffset + 7) + (w * 7));
        // Correct: just use week offset
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + w * 7 + (dayPlan.day === 0 ? 6 : dayPlan.day - 1));

        weekSessions.push({
          dayOfWeek: dayPlan.day,
          dayLabel: dayPlan.label,
          type: dayPlan.type,
          date: targetDate.toISOString().split('T')[0],
          completed: false
        });
      }
      weeks.push({ week: w + 1, sessions: weekSessions, completed: false });
    }

    const program = {
      name: 'Programme 4 semaines',
      startDate: startDate.toISOString().split('T')[0],
      weeklyPlan,
      weeks,
      active: true,
      createdAt: Date.now()
    };

    // Deactivate old programs
    const old = await DB.getAllPrograms();
    for (const p of old) {
      await DB.saveProgram({ ...p, active: false });
    }

    const id = await DB.saveProgram(program);
    this.currentProgram = { ...program, id };
    return this.currentProgram;
  }

  async getProgram() {
    if (!this.currentProgram) {
      this.currentProgram = await DB.getActiveProgram();
    }
    return this.currentProgram;
  }

  getTodayType() {
    const today = new Date().getDay();
    const plan = this.currentProgram ? this.currentProgram.weeklyPlan : DEFAULT_WEEKLY_PLAN;
    const dayPlan = plan.find(d => d.day === today);
    return dayPlan ? dayPlan.type : 'rest';
  }

  getNextWorkout() {
    if (!this.currentProgram) return null;
    const today = new Date().toISOString().split('T')[0];

    for (const week of this.currentProgram.weeks) {
      for (const session of week.sessions) {
        if (!session.completed && session.date >= today) {
          return { ...session, week: week.week };
        }
      }
    }
    return null;
  }

  async markSessionCompleted(date, type) {
    if (!this.currentProgram) return;
    let found = false;
    const updated = { ...this.currentProgram };

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
      this.currentProgram = updated;
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

  getCycleProgress() {
    if (!this.currentProgram) return 0;
    let total = 0, done = 0;
    for (const week of this.currentProgram.weeks) {
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

  renderWeeklyPlan(container) {
    container.innerHTML = '';
    const today = new Date().getDay();
    const plan = this.currentProgram ? this.currentProgram.weeklyPlan : DEFAULT_WEEKLY_PLAN;

    plan.forEach(dayPlan => {
      const div = document.createElement('div');
      div.className = 'plan-day' + (dayPlan.day === today ? ' today' : '');
      div.innerHTML = `
        <div class="plan-day-label">${dayPlan.label}</div>
        <div class="plan-day-type">${WORKOUT_TYPE_ICONS[dayPlan.type] || '😴'}</div>
        <div class="plan-day-name">${WORKOUT_TYPE_LABELS[dayPlan.type] || 'Repos'}</div>
      `;
      container.appendChild(div);
    });
  }

  renderProgramWeeks(container) {
    container.innerHTML = '';
    if (!this.currentProgram) {
      container.innerHTML = '<p class="empty-state">Aucun programme actif</p>';
      return;
    }

    this.currentProgram.weeks.forEach((week, wi) => {
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
            ${week.sessions.map(s => `
              <div class="week-session-item">
                <span class="wsi-day">${s.dayLabel}</span>
                <span class="wsi-type">${WORKOUT_TYPE_ICONS[s.type] || '?'}</span>
                <span class="wsi-name">${WORKOUT_TYPE_LABELS[s.type] || s.type}</span>
                <span class="wsi-status">${s.completed ? '✅' : ''}</span>
              </div>
            `).join('')}
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
