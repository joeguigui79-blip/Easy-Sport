/**
 * app.js - Main application controller
 * Routing, navigation, dashboard, initialization
 */

const App = {
  currentPage: 'dashboard',
  energyLevel: 3,
  _toastTimer: null,

  async init() {
    await DB.ready();

    // Auth: must pass before app is shown
    await AuthManager.init();

    // Hide splash immediately after auth so user sees the app content
    this._hideSplash();

    await Exercises.init();
    await Program.init();
    await Stats.init();
    Workout.init();

    this._setupTheme();
    this._setupNavigation();
    this._setupExercisePage();
    this._setupProgramPage();
    this._setupEnergySelector();
    this._setupSettings();

    await this.loadDashboard();
    this._registerSW();
  },

  _hideSplash() {
    const splash = document.getElementById('splash');
    const app = document.getElementById('app');
    setTimeout(() => {
      splash.classList.add('hide');
      app.classList.remove('hidden');
      setTimeout(() => {
        splash.style.display = 'none';
      }, 500);
    }, 1200);
  },

  _setupTheme() {
    const btn = document.getElementById('btn-theme');
    const themeIcon = document.getElementById('theme-icon');
    let isDark = true;

    // Load saved theme
    DB.getSetting('theme').then(saved => {
      if (saved === 'light') {
        isDark = false;
        document.body.classList.remove('theme-dark');
        document.body.classList.add('theme-light');
        this._updateThemeIcon(themeIcon, false);
      }
    });

    if (btn) {
      btn.addEventListener('click', () => {
        isDark = !isDark;
        document.body.classList.toggle('theme-dark', isDark);
        document.body.classList.toggle('theme-light', !isDark);
        this._updateThemeIcon(themeIcon, isDark);
        DB.setSetting('theme', isDark ? 'dark' : 'light');
      });
    }
  },

  _updateThemeIcon(el, isDark) {
    if (!el) return;
    if (isDark) {
      el.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    } else {
      el.innerHTML = '<circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/><line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    }
  },

  _setupNavigation() {
    // Tab bar buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page) this.navigate(page);
      });
    });

    // Back button
    const backBtn = document.getElementById('btn-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (Workout.active) {
          this.navigate('workout');
        } else {
          this.navigate('dashboard');
          this.setHeader('Easy Sport', false);
        }
      });
    }

    // Dashboard start workout button
    const startBtn = document.getElementById('btn-start-next-workout');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const next = Program.getNextWorkout();
        this.navigate('workout');
        if (next && next.type !== 'rest') {
          setTimeout(() => Workout.startWorkoutOfType(next.type), 100);
        }
      });
    }

    // Fatigue alert
    const btnAcceptLight = document.getElementById('btn-accept-light');
    if (btnAcceptLight) {
      btnAcceptLight.addEventListener('click', () => {
        document.getElementById('fatigue-alert').classList.add('hidden');
        Workout.setEnergyLevel(this.energyLevel);
        this.showToast('Mode allegee active (-10% poids)');
      });
    }
  },

  navigate(page) {
    this.currentPage = page;

    // Update pages
    document.querySelectorAll('.page').forEach(p => {
      p.classList.toggle('active', p.dataset.page === page);
    });

    // Update tab bar
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });

    // Page-specific logic
    if (page === 'dashboard') {
      this.loadDashboard();
      this.setHeader('Easy Sport', false);
    } else if (page === 'workout') {
      this.setHeader('Seance', !Workout.active ? false : true);
    } else if (page === 'program') {
      this.setHeader('Programme', false);
      this.loadProgramPage();
    } else if (page === 'exercises') {
      this.setHeader('Exercices', false);
      this.loadExercisesPage();
    } else if (page === 'stats') {
      this.setHeader('Statistiques', false);
      Stats.renderAll();
    }
  },

  setHeader(title, showBack) {
    const titleEl = document.getElementById('header-title');
    const backBtn = document.getElementById('btn-back');
    if (titleEl) titleEl.textContent = title;
    if (backBtn) backBtn.classList.toggle('hidden', !showBack);
  },

  async loadDashboard() {
    // Greeting
    const greetingEl = document.getElementById('greeting-text');
    if (greetingEl) {
      const hour = new Date().getHours();
      let greeting = 'Bonsoir';
      if (hour < 12) greeting = 'Bonjour';
      else if (hour < 18) greeting = 'Bon apres-midi';
      greetingEl.textContent = greeting + ' ! 💪';
    }

    // Streak & stats
    const info = await Stats.getStreakInfo();
    this._setText('streak-value', info.streak);
    this._setText('week-sessions', info.weekSessions);
    this._setText('total-sessions', info.totalSessions);

    // Next workout
    const next = Program.getNextWorkout();
    const badge = document.getElementById('next-workout-type');
    const preview = document.getElementById('next-workout-preview');

    if (next) {
      if (badge) badge.textContent = WORKOUT_TYPE_LABELS[next.type] || next.type;
      if (preview) {
        const exercises = Exercises.getEnabledForWorkoutType(next.type);
        preview.innerHTML = `
          <ul class="workout-preview-list">
            ${exercises.slice(0, 5).map(ex => `
              <li class="workout-preview-item">
                <div class="workout-preview-dot muscle-${ex.muscle}"></div>
                <span>${ex.name}</span>
                <small style="color:var(--text-muted)">${ex.defaultSets}×${ex.defaultReps}</small>
              </li>
            `).join('')}
            ${exercises.length > 5 ? `<li class="workout-preview-item" style="color:var(--text-muted)">+${exercises.length - 5} autres...</li>` : ''}
          </ul>
        `;
      }
    } else {
      if (badge) badge.textContent = 'Libre';
      if (preview) preview.innerHTML = '<p class="empty-state">Programme termine !</p>';
    }

    // Week grid
    this._renderWeekGrid();

    // Recent progress
    const progress = await Stats.getRecentProgress();
    const progressContainer = document.getElementById('recent-progress');
    if (progressContainer) {
      if (progress.length > 0) {
        progressContainer.innerHTML = progress.map(p => `
          <div class="progress-item">
            <div>
              <div class="progress-item-name">${p.name}</div>
            </div>
            <div>
              <div class="progress-item-val">${p.weight > 0 ? p.weight + ' kg' : '-'}</div>
            </div>
          </div>
        `).join('');
      } else {
        progressContainer.innerHTML = '<p class="empty-state">Effectue des seances pour voir ta progression !</p>';
      }
    }

    // Energy / fatigue alert
    if (this.energyLevel < 3) {
      document.getElementById('fatigue-alert').classList.remove('hidden');
    }
  },

  _renderWeekGrid() {
    const container = document.getElementById('week-grid');
    if (!container) return;

    const days = ['D', 'L', 'M', 'Me', 'J', 'V', 'S'];
    const today = new Date().getDay();
    const plan = Program.currentProgram ? Program.currentProgram.weeklyPlan : DEFAULT_WEEKLY_PLAN;

    container.innerHTML = '';
    days.forEach((label, i) => {
      const dayPlan = plan.find(d => d.day === i);
      const isToday = i === today;
      const isRest = !dayPlan || dayPlan.type === 'rest';

      const div = document.createElement('div');
      div.className = 'week-day';
      div.innerHTML = `
        <div class="week-day-label">${label}</div>
        <div class="week-day-dot ${isToday ? 'today' : ''} ${isRest ? 'rest' : ''}">
          ${isRest ? '−' : (WORKOUT_TYPE_ICONS[dayPlan.type] || '?')}
        </div>
      `;
      container.appendChild(div);
    });
  },

  _setupEnergySelector() {
    const stars = document.querySelectorAll('.star-btn');
    stars.forEach(star => {
      star.addEventListener('click', () => {
        const val = parseInt(star.dataset.val);
        this.energyLevel = val;
        Workout.setEnergyLevel(val);

        // Update visual
        stars.forEach((s, i) => {
          s.classList.toggle('active', i < val);
        });

        // Fatigue alert
        const alert = document.getElementById('fatigue-alert');
        if (val < 3) {
          alert.classList.remove('hidden');
        } else {
          alert.classList.add('hidden');
        }

        DB.setSetting('lastEnergy', val);
        this.showToast(`Energie : ${val}/5`);
      });
    });

    // Restore saved energy
    DB.getSetting('lastEnergy').then(saved => {
      if (saved) {
        const val = parseInt(saved);
        stars.forEach((s, i) => s.classList.toggle('active', i < val));
      }
    });
  },

  _setupExercisePage() {
    const search = document.getElementById('exercise-search');
    const filters = document.getElementById('exercise-filters');
    const addBtn = document.getElementById('btn-add-exercise');

    let currentFilter = 'all';
    let currentSearch = '';

    const renderList = () => {
      const list = document.getElementById('exercise-list');
      if (!list) return;
      let exercises = Exercises.getByMuscle(currentFilter);
      if (currentSearch) {
        exercises = exercises.filter(ex =>
          ex.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
          Exercises.getMuscleLabel(ex.muscle).toLowerCase().includes(currentSearch.toLowerCase())
        );
      }
      exercises.sort((a, b) => a.name.localeCompare(b.name));
      Exercises.renderExerciseList(exercises, list, (ex) => this._showExerciseModal(ex));
    };

    if (filters) {
      filters.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          filters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentFilter = btn.dataset.filter;
          renderList();
        });
      });
    }

    if (search) {
      search.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        renderList();
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => this._showExerciseForm(null));
    }

    // Modal events
    document.getElementById('modal-close-btn')?.addEventListener('click', () =>
      document.getElementById('exercise-modal').classList.add('hidden'));
    document.getElementById('form-modal-close')?.addEventListener('click', () =>
      document.getElementById('exercise-form-modal').classList.add('hidden'));
    document.getElementById('form-cancel-btn')?.addEventListener('click', () =>
      document.getElementById('exercise-form-modal').classList.add('hidden'));

    document.getElementById('form-save-btn')?.addEventListener('click', async () => {
      await this._saveExerciseForm();
      renderList();
    });

    document.getElementById('modal-edit-btn')?.addEventListener('click', () => {
      const id = parseInt(document.getElementById('exercise-modal').dataset.exId);
      const ex = Exercises.getById(id);
      if (ex) {
        document.getElementById('exercise-modal').classList.add('hidden');
        this._showExerciseForm(ex);
      }
    });

    document.getElementById('modal-delete-btn')?.addEventListener('click', async () => {
      const id = parseInt(document.getElementById('exercise-modal').dataset.exId);
      if (confirm('Supprimer cet exercice ?')) {
        await Exercises.delete(id);
        document.getElementById('exercise-modal').classList.add('hidden');
        renderList();
        this.showToast('Exercice supprime');
      }
    });

    // Store renderList for later use
    this._renderExerciseList = renderList;
  },

  loadExercisesPage() {
    if (this._renderExerciseList) this._renderExerciseList();
  },

  _showExerciseModal(ex) {
    const modal = document.getElementById('exercise-modal');
    modal.dataset.exId = ex.id;

    document.getElementById('modal-ex-title').textContent = ex.name;
    document.getElementById('modal-ex-body').innerHTML = `
      <div class="muscle-badge muscle-${ex.muscle}" style="margin-bottom:12px">${Exercises.getMuscleEmoji(ex.muscle)} ${Exercises.getMuscleLabel(ex.muscle)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="background:var(--bg-input);padding:12px;border-radius:12px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:var(--color-primary)">${ex.defaultSets}</div>
          <div style="font-size:12px;color:var(--text-muted)">Series</div>
        </div>
        <div style="background:var(--bg-input);padding:12px;border-radius:12px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:var(--color-primary)">${ex.defaultReps}</div>
          <div style="font-size:12px;color:var(--text-muted)">Reps</div>
        </div>
        <div style="background:var(--bg-input);padding:12px;border-radius:12px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:var(--color-primary)">${ex.defaultWeight > 0 ? ex.defaultWeight + 'kg' : '-'}</div>
          <div style="font-size:12px;color:var(--text-muted)">Poids depart</div>
        </div>
        <div style="background:var(--bg-input);padding:12px;border-radius:12px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:var(--color-primary)">${ex.restTime || Exercises.getRestTime(ex)}s</div>
          <div style="font-size:12px;color:var(--text-muted)">Repos</div>
        </div>
      </div>
      ${ex.notes ? `<div style="padding:12px;background:var(--bg-input);border-radius:12px;font-size:14px;color:var(--text-secondary);line-height:1.5">${ex.notes}</div>` : ''}
    `;
    modal.classList.remove('hidden');
  },

  _showExerciseForm(ex) {
    const modal = document.getElementById('exercise-form-modal');
    document.getElementById('form-modal-title').textContent = ex ? 'Modifier l\'exercice' : 'Ajouter un exercice';
    document.getElementById('form-ex-id').value = ex ? ex.id : '';
    document.getElementById('form-ex-name').value = ex ? ex.name : '';
    document.getElementById('form-ex-muscle').value = ex ? ex.muscle : '';
    document.getElementById('form-ex-sets').value = ex ? ex.defaultSets : 3;
    document.getElementById('form-ex-reps').value = ex ? ex.defaultReps : 10;
    document.getElementById('form-ex-weight').value = ex ? ex.defaultWeight : 20;
    document.getElementById('form-ex-type').value = ex ? ex.type : 'strength';
    document.getElementById('form-ex-notes').value = ex ? (ex.notes || '') : '';
    modal.classList.remove('hidden');
  },

  async _saveExerciseForm() {
    const name = document.getElementById('form-ex-name').value.trim();
    const muscle = document.getElementById('form-ex-muscle').value;

    if (!name || !muscle) {
      this.showToast('Nom et groupe musculaire requis', 'error');
      return;
    }

    const data = {
      name,
      muscle,
      type: document.getElementById('form-ex-type').value,
      defaultSets: parseInt(document.getElementById('form-ex-sets').value) || 3,
      defaultReps: parseInt(document.getElementById('form-ex-reps').value) || 10,
      defaultWeight: parseFloat(document.getElementById('form-ex-weight').value) || 0,
      notes: document.getElementById('form-ex-notes').value.trim()
    };

    const id = document.getElementById('form-ex-id').value;
    if (id) {
      await Exercises.update({ ...data, id: parseInt(id) });
      this.showToast('Exercice modifie !', 'success');
    } else {
      await Exercises.add(data);
      this.showToast('Exercice ajoute !', 'success');
    }

    document.getElementById('exercise-form-modal').classList.add('hidden');
  },

  _setupProgramPage() {
    // Tabs Planning / Exercices
    document.querySelectorAll('.prog-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.prog-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.prog-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const target = document.getElementById('prog-tab-' + tab.dataset.tab);
        if (target) target.classList.add('active');
      });
    });

    // Sous-onglets exercices par type
    document.querySelectorAll('.extype-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.extype-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._renderExercisePrefList(tab.dataset.extype);
      });
    });

    // Bouton enregistrer programme hebdo
    const saveBtn = document.getElementById('btn-save-weekly-plan');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const dayTypeMap = {};
        document.querySelectorAll('.day-plan-select').forEach(sel => {
          dayTypeMap[sel.dataset.day] = sel.value;
        });
        await Program.saveCustomWeeklyPlan(dayTypeMap);
        this.loadProgramPage();
        this.showToast('Programme enregistre !', 'success');
      });
    }
  },

  _renderWeekPlanEditor() {
    const container = document.getElementById('week-plan-editor');
    if (!container) return;

    const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const plan = Program.getEffectiveWeeklyPlan();
    const planMap = {};
    plan.forEach(d => { planMap[d.day] = d.type; });

    // Afficher Lun → Dim (1 à 0)
    const order = [1, 2, 3, 4, 5, 6, 0];
    container.innerHTML = '';

    order.forEach(dayIdx => {
      const currentType = planMap[dayIdx] || 'rest';
      const row = document.createElement('div');
      row.className = 'day-plan-row';
      row.innerHTML = `
        <span class="day-plan-label">${DAY_NAMES[dayIdx]}</span>
        <select class="day-plan-select form-select" data-day="${dayIdx}">
          <option value="upper" ${currentType === 'upper' ? 'selected' : ''}>💪 Haut du corps</option>
          <option value="lower" ${currentType === 'lower' ? 'selected' : ''}>🦵 Bas du corps</option>
          <option value="full"  ${currentType === 'full'  ? 'selected' : ''}>⚡ Full body</option>
          <option value="cardio"${currentType === 'cardio'? 'selected' : ''}>🏃 Cardio</option>
          <option value="rest"  ${currentType === 'rest'  ? 'selected' : ''}>😴 Repos</option>
        </select>
      `;
      container.appendChild(row);
    });
  },

  _renderExercisePrefList(type) {
    const container = document.getElementById('extype-list');
    if (!container) return;

    const all = Exercises.getForWorkoutType(type);
    const enabled = Exercises.getEnabledForWorkoutType(type);
    const enabledIds = enabled.map(e => e.id);

    container.innerHTML = '';

    if (all.length === 0) {
      container.innerHTML = '<p class="empty-state">Aucun exercice pour ce type</p>';
      return;
    }

    all.forEach(ex => {
      const isOn = enabledIds.includes(ex.id);
      const item = document.createElement('div');
      item.className = 'exercise-pref-item';
      item.innerHTML = `
        <div class="exercise-pref-info">
          <div class="exercise-pref-color muscle-${ex.muscle}"></div>
          <div>
            <div class="exercise-pref-name">${ex.name}</div>
            <div class="exercise-pref-muscle">${Exercises.getMuscleEmoji(ex.muscle)} ${Exercises.getMuscleLabel(ex.muscle)}</div>
          </div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" class="extype-toggle" data-id="${ex.id}" data-type="${type}" ${isOn ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      `;
      container.appendChild(item);
    });

    // Bind toggles
    container.querySelectorAll('.extype-toggle').forEach(chk => {
      chk.addEventListener('change', async () => {
        const t = chk.dataset.type;
        const enabledNow = [...container.querySelectorAll(`.extype-toggle[data-type="${t}"]:checked`)]
          .map(c => parseInt(c.dataset.id));
        // Minimum 1
        if (enabledNow.length === 0) {
          chk.checked = true;
          this.showToast('Au moins 1 exercice requis', 'error');
          return;
        }
        await Exercises.savePreference(t, enabledNow);
        this.showToast('Preferences sauvegardees', 'success');
      });
    });
  },

  _setupSettings() {
    // Settings modal removed (no PIN management needed)
  },

  loadProgramPage() {
    const prog = Program.currentProgram;
    if (!prog) return;

    // Cycle info
    const pct = Program.getCycleProgress();
    const ringEl = document.getElementById('cycle-ring-fill');
    const circumference = 2 * Math.PI * 24; // r=24, circumference=150.79
    if (ringEl) ringEl.style.strokeDashoffset = circumference * (1 - pct / 100);

    const pctEl = document.getElementById('cycle-progress-pct');
    if (pctEl) pctEl.textContent = pct + '%';

    const titleEl = document.getElementById('cycle-title');
    if (titleEl) titleEl.textContent = prog.name;

    const subtitleEl = document.getElementById('cycle-subtitle');
    if (subtitleEl) {
      const start = new Date(prog.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
      const endDate = new Date(prog.startDate);
      endDate.setDate(endDate.getDate() + 27);
      const end = endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
      subtitleEl.textContent = `${start} → ${end}`;
    }

    // Weekly plan (apercu)
    Program.renderWeeklyPlan(document.getElementById('weekly-plan'));

    // Editeur plan personnalise
    this._renderWeekPlanEditor();

    // Program weeks
    Program.renderProgramWeeks(document.getElementById('program-weeks'));

    // Exercices prefs : charger l'onglet actif
    const activeExType = document.querySelector('.extype-tab.active');
    if (activeExType) {
      this._renderExercisePrefList(activeExType.dataset.extype);
    }
  },

  _registerSW() {
    if ('serviceWorker' in navigator) {
      const swUrl = new URL('sw.js', window.location.href).pathname;
      navigator.serviceWorker.register(swUrl).then(reg => {
        console.log('SW registered:', reg.scope);
      }).catch(err => {
        console.warn('SW registration failed:', err);
      });
    }
  },

  showToast(message, type = '') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    clearTimeout(this._toastTimer);
    toast.textContent = message;
    toast.className = 'toast' + (type ? ' ' + type : '');
    toast.classList.remove('hidden');

    this._toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  },

  _setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => {
  App.init().catch(e => {
    console.error('App init error:', e);
  });
});
