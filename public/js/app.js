/**
 * app.js - Main application controller
 * Routing, navigation, dashboard, initialization
 * Phase A: 3 categories (salle, interieur, exterieur)
 */

const App = {
  currentPage: 'dashboard',
  energyLevel: 3,
  activeCategory: null,  // 'salle' | 'interieur' | 'exterieur' | null (home)
  _toastTimer: null,

  async init() {
    await DB.ready();

    // Auth: must pass before app is shown
    await AuthManager.init();

    // Hide splash immediately after auth so user sees the app content
    this._hideSplash();

    await Exercises.init();
    await Program.init();
    await Outdoor.init();
    await Stats.init();
    Workout.init();

    this._setupTheme();
    this._setupNavigation();
    this._setupCategoryHome();
    this._setupExercisePage();
    this._setupProgramPage();
    this._setupEnergySelector();
    this._setupOutdoorPage();

    await this.loadDashboard();
    this._registerSW();
  },

  _hideSplash() {
    const splash = document.getElementById('splash');
    const app = document.getElementById('app');
    setTimeout(() => {
      splash.classList.add('hide');
      app.classList.remove('hidden');
      setTimeout(() => { splash.style.display = 'none'; }, 500);
    }, 1200);
  },

  _setupTheme() {
    const btn = document.getElementById('btn-theme');
    const themeIcon = document.getElementById('theme-icon');
    let isDark = true;

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

  // ---- CATEGORY HOME SCREEN ----

  _setupCategoryHome() {
    document.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        this._enterCategory(card.dataset.category);
      });
    });
  },

  _enterCategory(category) {
    this.activeCategory = category;
    const homeEl = document.getElementById('category-home');
    const appContent = document.getElementById('category-content');
    if (homeEl) homeEl.classList.add('hidden');
    if (appContent) appContent.classList.remove('hidden');

    // Update tab bar + header title
    const label = CATEGORY_LABELS[category] || 'Sport';
    const icon = CATEGORY_ICONS[category] || '';
    this.setHeader(`${icon} ${label}`, false);

    // Update body class for category colors
    document.body.className = document.body.className.replace(/\bcat-\S+/g, '');
    document.body.classList.add(`cat-${category}`);

    // Show back-to-home button
    const btnHome = document.getElementById('btn-category-home');
    if (btnHome) btnHome.classList.remove('hidden');

    // Adapt tab-bar for category
    const tabWorkout = document.getElementById('tab-btn-workout');
    const tabOutdoor = document.getElementById('tab-btn-outdoor');
    if (category === 'exterieur') {
      if (tabWorkout) tabWorkout.classList.add('hidden');
      if (tabOutdoor) tabOutdoor.classList.remove('hidden');
    } else {
      if (tabWorkout) tabWorkout.classList.remove('hidden');
      if (tabOutdoor) tabOutdoor.classList.add('hidden');
    }

    // Navigate to dashboard of this category
    this.navigate('dashboard');
  },

  _exitToHome() {
    this.activeCategory = null;
    const homeEl = document.getElementById('category-home');
    const appContent = document.getElementById('category-content');
    if (homeEl) homeEl.classList.remove('hidden');
    if (appContent) appContent.classList.add('hidden');

    this.setHeader('Easy Sport', false);
    document.body.className = document.body.className.replace(/\bcat-\S+/g, '');

    const btnHome = document.getElementById('btn-category-home');
    if (btnHome) btnHome.classList.add('hidden');
  },

  _setupNavigation() {
    // Tab bar buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page) this.navigate(page);
      });
    });

    // Back button (within active section)
    const backBtn = document.getElementById('btn-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (Workout.active) {
          this.navigate('workout');
        } else {
          this.navigate('dashboard');
          this.setHeader(
            this.activeCategory ? `${CATEGORY_ICONS[this.activeCategory]} ${CATEGORY_LABELS[this.activeCategory]}` : 'Easy Sport',
            false
          );
        }
      });
    }

    // Return to category home
    const btnHome = document.getElementById('btn-category-home');
    if (btnHome) {
      btnHome.addEventListener('click', () => this._exitToHome());
    }

    // Dashboard start workout button
    const startBtn = document.getElementById('btn-start-next-workout');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const cat = this.activeCategory || 'salle';
        if (cat === 'exterieur') {
          this.navigate('outdoor');
        } else {
          const next = Program.getNextWorkout(cat);
          this.navigate('workout');
          if (next && next.type !== 'rest') {
            setTimeout(() => Workout.startWorkoutOfType(next.type), 100);
          }
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
    this._currentPage = page; // alias for submodules

    // Update pages
    document.querySelectorAll('.page').forEach(p => {
      p.classList.toggle('active', p.dataset.page === page);
    });

    // Update tab bar
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });

    const cat = this.activeCategory || 'salle';
    const catLabel = CATEGORY_LABELS[cat] || 'Sport';
    const catIcon = CATEGORY_ICONS[cat] || '';

    // Page-specific logic
    if (page === 'dashboard') {
      this.loadDashboard();
      this.setHeader(`${catIcon} ${catLabel}`, false);
    } else if (page === 'workout') {
      if (cat === 'interieur') {
        this.setHeader('Seance interieure', !Workout.active);
        this._renderWorkoutTypesForCategory('interieur');
      } else {
        this.setHeader('Seance', !Workout.active);
        this._renderWorkoutTypesForCategory('salle');
      }
    } else if (page === 'outdoor') {
      this.setHeader('🏃 Sport exterieur', false);
      this.loadOutdoorPage();
    } else if (page === 'program') {
      this.setHeader('Programme', false);
      this.loadProgramPage();
    } else if (page === 'exercises') {
      this.setHeader('Exercices', false);
      this.loadExercisesPage();
    } else if (page === 'stats') {
      this.setHeader('Statistiques', false);
      Stats.renderAll(cat);
    }
  },

  _renderWorkoutTypesForCategory(cat) {
    const grid = document.getElementById('workout-type-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const types = cat === 'interieur'
      ? [
          { type: 'upper_int', icon: '💪', label: 'Haut du corps' },
          { type: 'lower_int', icon: '🦵', label: 'Bas du corps' },
          { type: 'full_int', icon: '⚡', label: 'Full body' },
          { type: 'hiit_int', icon: '🔥', label: 'HIIT' },
          { type: 'yoga_int', icon: '🧘', label: 'Yoga / Mobilite' }
        ]
      : [
          { type: 'upper', icon: '💪', label: 'Haut du corps' },
          { type: 'lower', icon: '🦵', label: 'Bas du corps' },
          { type: 'full', icon: '⚡', label: 'Full body' },
          { type: 'cardio', icon: '🏃', label: 'Cardio' }
        ];

    types.forEach(t => {
      const btn = document.createElement('button');
      btn.className = `workout-type-btn workout-type-btn--${cat}`;
      btn.dataset.type = t.type;
      btn.innerHTML = `<span class="wt-icon">${t.icon}</span><span class="wt-label">${t.label}</span>`;
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.workout-type-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        Workout._selectType(t.type);
      });
      grid.appendChild(btn);
    });
  },

  setHeader(title, showBack) {
    const titleEl = document.getElementById('header-title');
    const backBtn = document.getElementById('btn-back');
    if (titleEl) titleEl.textContent = title;
    if (backBtn) backBtn.classList.toggle('hidden', !showBack);
  },

  async loadDashboard() {
    const cat = this.activeCategory || 'salle';

    // Greeting
    const greetingEl = document.getElementById('greeting-text');
    if (greetingEl) {
      const hour = new Date().getHours();
      let greeting = 'Bonsoir';
      if (hour < 12) greeting = 'Bonjour';
      else if (hour < 18) greeting = 'Bon apres-midi';
      greetingEl.textContent = greeting + ' ! 💪';
    }

    // Category badge in hero
    const catBadgeEl = document.getElementById('dashboard-cat-badge');
    if (catBadgeEl) {
      catBadgeEl.textContent = `${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}`;
      catBadgeEl.className = `dashboard-cat-badge cat-badge--${cat}`;
    }

    // Streak & stats
    const info = await Stats.getStreakInfo(cat);
    this._setText('streak-value', info.streak);
    this._setText('week-sessions', info.weekSessions);
    this._setText('total-sessions', info.totalSessions);

    if (cat === 'exterieur') {
      this._renderDashboardOutdoor();
    } else {
      this._renderDashboardTraining(cat);
    }

    // Energy / fatigue alert (salle + interieur only)
    const fatigueAlert = document.getElementById('fatigue-alert');
    if (fatigueAlert) {
      fatigueAlert.classList.toggle('hidden', cat === 'exterieur' || this.energyLevel >= 3);
    }
  },

  async _renderDashboardTraining(cat) {
    // Ensure program exists for this category
    await Program.ensureProgramForCategory(cat);
    // Next workout
    const next = Program.getNextWorkout(cat);
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
                <small style="color:var(--text-muted)">${ex.defaultSets}x${ex.defaultReps}</small>
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
    const progress = await Stats.getRecentProgress(cat);
    const progressContainer = document.getElementById('recent-progress');
    if (progressContainer) {
      if (progress.length > 0) {
        progressContainer.innerHTML = progress.map(p => `
          <div class="progress-item">
            <div><div class="progress-item-name">${p.name}</div></div>
            <div><div class="progress-item-val">${p.weight > 0 ? p.weight + ' kg' : '-'}</div></div>
          </div>
        `).join('');
      } else {
        progressContainer.innerHTML = '<p class="empty-state">Effectue des seances pour voir ta progression !</p>';
      }
    }

    // Show training section, hide outdoor section
    const trainSec = document.getElementById('dashboard-training-section');
    const outdoorSec = document.getElementById('dashboard-outdoor-section');
    if (trainSec) trainSec.classList.remove('hidden');
    if (outdoorSec) outdoorSec.classList.add('hidden');
  },

  async _renderDashboardOutdoor() {
    // Hide training section, show outdoor section
    const trainSec = document.getElementById('dashboard-training-section');
    const outdoorSec = document.getElementById('dashboard-outdoor-section');
    if (trainSec) trainSec.classList.add('hidden');
    if (outdoorSec) outdoorSec.classList.remove('hidden');

    const sessions = Outdoor.getAll();
    const stats7d = Outdoor.getStats(sessions, '7d');
    const stats30d = Outdoor.getStats(sessions, '30d');

    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('outdoor-stat-km-7d', stats7d.totalKm.toFixed(1));
    el('outdoor-stat-min-7d', stats7d.totalMin);
    el('outdoor-stat-count-7d', stats7d.count);

    el('outdoor-stat-km-30d', stats30d.totalKm.toFixed(1));
    el('outdoor-stat-min-30d', stats30d.totalMin);
    el('outdoor-stat-count-30d', stats30d.count);

    // Last 3 sessions
    const recentEl = document.getElementById('outdoor-recent-list');
    if (recentEl) {
      if (sessions.length === 0) {
        recentEl.innerHTML = '<p class="empty-state">Aucune seance enregistree</p>';
      } else {
        recentEl.innerHTML = '';
        sessions.slice(0, 3).forEach(s => {
          const d = new Date(s.date);
          const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
          const item = document.createElement('div');
          item.className = 'outdoor-mini-item';
          item.innerHTML = `
            <span class="omi-icon">${Outdoor.getActivityIcon(s.activity)}</span>
            <span class="omi-name">${Outdoor.getActivityLabel(s.activity)}</span>
            <span class="omi-val">${s.durationMin}min${s.distanceKm ? ' • ' + s.distanceKm + 'km' : ''}</span>
            <span class="omi-date">${dateStr}</span>
          `;
          recentEl.appendChild(item);
        });
      }
    }
  },

  _renderWeekGrid() {
    const container = document.getElementById('week-grid');
    if (!container) return;

    const cat = this.activeCategory || 'salle';
    const days = ['D', 'L', 'M', 'Me', 'J', 'V', 'S'];
    const today = new Date().getDay();
    const prog = Program.getProgramForCategory(cat);
    const plan = prog ? prog.weeklyPlan : Program.getEffectiveWeeklyPlan(cat);

    container.innerHTML = '';
    days.forEach((label, i) => {
      const dayPlan = plan.find(d => d.day === i);
      const isToday = i === today;
      const isRest = !dayPlan || dayPlan.type === 'rest';

      const div = document.createElement('div');
      div.className = 'week-day';
      div.innerHTML = `
        <div class="week-day-label">${label}</div>
        <div class="week-day-dot ${isToday ? 'today' : ''} ${isRest ? 'rest' : ''} wdd--${cat}">
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

        stars.forEach((s, i) => { s.classList.toggle('active', i < val); });

        const alert = document.getElementById('fatigue-alert');
        if (alert) alert.classList.toggle('hidden', val >= 3);

        DB.setSetting('lastEnergy', val);
        this.showToast(`Energie : ${val}/5`);
      });
    });

    DB.getSetting('lastEnergy').then(saved => {
      if (saved) {
        const val = parseInt(saved);
        stars.forEach((s, i) => s.classList.toggle('active', i < val));
      }
    });
  },

  // ---- OUTDOOR PAGE ----

  _setupOutdoorPage() {
    const addBtn = document.getElementById('btn-add-outdoor-session');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        Outdoor.showStartModal(
          // Manual mode
          (activity) => {
            Outdoor.renderFormModal({ activity }, () => {
              this.loadOutdoorPage();
            }, null);
          },
          // GPS mode
          (activity) => {
            Outdoor.showTrackingScreen(activity);
          }
        );
      });
    }
  },

  _renderOutdoorPage() {
    this.loadOutdoorPage();
  },

  loadOutdoorPage() {
    const container = document.getElementById('outdoor-session-list');
    if (container) {
      Outdoor.renderSessionList(container,
        (session) => {
          Outdoor.renderFormModal(session, () => this.loadOutdoorPage(), null);
        },
        () => this.loadOutdoorPage()
      );
    }

    // Stats
    const sessions = Outdoor.getAll();
    const stats7d = Outdoor.getStats(sessions, '7d');
    const stats30d = Outdoor.getStats(sessions, '30d');
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('outdoor-page-km-7d', stats7d.totalKm.toFixed(1));
    el('outdoor-page-min-7d', stats7d.totalMin);
    el('outdoor-page-count-7d', stats7d.count);
    el('outdoor-page-km-30d', stats30d.totalKm.toFixed(1));
    el('outdoor-page-min-30d', stats30d.totalMin);
    el('outdoor-page-count-30d', stats30d.count);
  },

  // ---- EXERCISES PAGE ----

  _setupExercisePage() {
    const search = document.getElementById('exercise-search');
    const filters = document.getElementById('exercise-filters');
    const addBtn = document.getElementById('btn-add-exercise');

    let currentFilter = 'all';
    let currentSearch = '';

    const renderList = () => {
      const list = document.getElementById('exercise-list');
      if (!list) return;
      const cat = this.activeCategory || 'salle';
      let exercises = Exercises.getByMuscle(currentFilter, cat);
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

    this._renderExerciseList = renderList;
  },

  loadExercisesPage() {
    const cat = this.activeCategory || 'salle';
    const filtersEl = document.getElementById('exercise-filters');
    const searchEl = document.getElementById('exercise-search');
    const addBtn = document.getElementById('btn-add-exercise');
    const list = document.getElementById('exercise-list');

    if (cat === 'exterieur') {
      // Hide filters/search/add for outdoor catalogue, show activities list
      if (filtersEl) filtersEl.style.display = 'none';
      if (searchEl) searchEl.parentElement && (searchEl.closest('.search-bar') || searchEl.parentElement).style && (searchEl.closest('.search-bar') || searchEl.parentElement).setAttribute('style', 'display:none');
      if (addBtn) addBtn.style.display = 'none';
      if (list) {
        list.innerHTML = '';
        OUTDOOR_ACTIVITIES.forEach(a => {
          const item = document.createElement('div');
          item.className = 'exercise-item';
          item.innerHTML = `
            <div class="exercise-item-color" style="background:var(--color-exterieur,#22c55e)"></div>
            <div class="exercise-item-info">
              <div class="exercise-item-name">${a.icon} ${a.label}</div>
              <div class="exercise-item-muscle" style="color:var(--text-muted)">Activite exterieure</div>
            </div>
          `;
          list.appendChild(item);
        });
      }
    } else {
      // Restore for salle/interieur
      if (filtersEl) filtersEl.style.display = '';
      const searchBar = document.querySelector('.search-bar');
      if (searchBar) searchBar.style.display = '';
      if (addBtn) addBtn.style.display = '';
      if (this._renderExerciseList) this._renderExerciseList();
    }
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
    const cat = this.activeCategory || 'salle';
    document.getElementById('form-modal-title').textContent = ex ? 'Modifier l\'exercice' : 'Ajouter un exercice';
    document.getElementById('form-ex-id').value = ex ? ex.id : '';
    document.getElementById('form-ex-name').value = ex ? ex.name : '';
    document.getElementById('form-ex-muscle').value = ex ? ex.muscle : '';
    document.getElementById('form-ex-sets').value = ex ? ex.defaultSets : 3;
    document.getElementById('form-ex-reps').value = ex ? ex.defaultReps : 10;
    document.getElementById('form-ex-weight').value = ex ? ex.defaultWeight : 0;
    document.getElementById('form-ex-type').value = ex ? ex.type : 'strength';
    document.getElementById('form-ex-notes').value = ex ? (ex.notes || '') : '';
    // Store category in hidden field
    const catField = document.getElementById('form-ex-category');
    if (catField) catField.value = ex ? (ex.category || cat) : cat;
    modal.classList.remove('hidden');
  },

  async _saveExerciseForm() {
    const name = document.getElementById('form-ex-name').value.trim();
    const muscle = document.getElementById('form-ex-muscle').value;

    if (!name || !muscle) {
      this.showToast('Nom et groupe musculaire requis', 'error');
      return;
    }

    const catField = document.getElementById('form-ex-category');
    const cat = catField ? catField.value : (this.activeCategory || 'salle');

    const data = {
      name,
      muscle,
      type: document.getElementById('form-ex-type').value,
      defaultSets: parseInt(document.getElementById('form-ex-sets').value) || 3,
      defaultReps: parseInt(document.getElementById('form-ex-reps').value) || 10,
      defaultWeight: parseFloat(document.getElementById('form-ex-weight').value) || 0,
      notes: document.getElementById('form-ex-notes').value.trim(),
      category: cat
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

  // ---- PROGRAM PAGE ----

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
        const cat = this.activeCategory || 'salle';
        const dayInfoMap = {};
        document.querySelectorAll('.day-plan-select').forEach(sel => {
          dayInfoMap[sel.dataset.day] = { type: sel.value };
        });
        await Program.saveCustomWeeklyPlan(dayInfoMap, cat);
        this.loadProgramPage();
        this.showToast('Programme enregistre !', 'success');
      });
    }
  },

  _renderWeekPlanEditor() {
    const container = document.getElementById('week-plan-editor');
    if (!container) return;

    const cat = this.activeCategory || 'salle';
    const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const plan = Program.getEffectiveWeeklyPlan(cat);
    const planMap = {};
    plan.forEach(d => { planMap[d.day] = { type: d.type }; });

    // Session types available per category
    const typeOptions = cat === 'interieur'
      ? [
          { v: 'upper_int', l: '💪 Haut du corps' },
          { v: 'lower_int', l: '🦵 Bas du corps' },
          { v: 'full_int', l: '⚡ Full body' },
          { v: 'hiit_int', l: '🔥 HIIT' },
          { v: 'yoga_int', l: '🧘 Yoga / Mobilite' },
          { v: 'rest', l: '😴 Repos' }
        ]
      : cat === 'exterieur'
      ? [
          { v: 'rest', l: '😴 Repos' },
          { v: 'running', l: '🏃 Course a pied' },
          { v: 'running_long', l: '🏃 Course longue distance' },
          { v: 'walk_fast', l: '🚶 Marche rapide' },
          { v: 'nordic_walk', l: '🥾 Marche nordique' },
          { v: 'trail', l: '⛰️ Trail' },
          { v: 'cycling_road', l: '🚴 Velo de route' },
          { v: 'cycling_mtb', l: '🏔️ VTT' },
          { v: 'swimming_open', l: '🏊 Natation eau libre' },
          { v: 'swimming_outdoor', l: '🏊‍♀️ Natation piscine ext.' },
          { v: 'hiking', l: '🥾 Randonnee' },
          { v: 'sprint', l: '⚡ Sprint / fractionne' },
          { v: 'roller', l: '⛸️ Roller' },
          { v: 'rowing', l: '🚣 Aviron / kayak / canoe' },
          { v: 'sup', l: '🏄 SUP' },
          { v: 'climbing_outdoor', l: '🧗 Escalade exterieure' },
          { v: 'orienteering', l: '🧭 Course d\'orientation' },
          { v: 'street_workout', l: '🤸 Street workout' },
          { v: 'boxing_outdoor', l: '🥊 Boxe exterieure' },
          { v: 'crossfit_outdoor', l: '🔥 Crossfit outdoor' }
        ]
      : [
          { v: 'upper', l: '💪 Haut du corps' },
          { v: 'lower', l: '🦵 Bas du corps' },
          { v: 'full', l: '⚡ Full body' },
          { v: 'cardio', l: '🏃 Cardio' },
          { v: 'rest', l: '😴 Repos' }
        ];

    const optHtml = typeOptions.map(o => `<option value="${o.v}">${o.l}</option>`).join('');

    const order = [1, 2, 3, 4, 5, 6, 0];
    container.innerHTML = '';

    order.forEach(dayIdx => {
      const current = planMap[dayIdx] || { type: 'rest' };
      const row = document.createElement('div');
      row.className = 'day-plan-row';
      // Build options with selected state
      const optHtmlSelected = typeOptions.map(o =>
        `<option value="${o.v}" ${current.type === o.v ? 'selected' : ''}>${o.l}</option>`
      ).join('');
      row.innerHTML = `
        <span class="day-plan-label">${DAY_NAMES[dayIdx]}</span>
        <select class="day-plan-select form-select" data-day="${dayIdx}">
          ${optHtmlSelected}
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

    container.querySelectorAll('.extype-toggle').forEach(chk => {
      chk.addEventListener('change', async () => {
        const t = chk.dataset.type;
        const enabledNow = [...container.querySelectorAll(`.extype-toggle[data-type="${t}"]:checked`)]
          .map(c => parseInt(c.dataset.id));
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

  loadProgramPage() {
    const cat = this.activeCategory || 'salle';
    const prog = Program.getProgramForCategory(cat);
    if (!prog) {
      // Trigger generation then reload
      Program.ensureProgramForCategory(cat).then(() => this.loadProgramPage());
      return;
    }

    // Update extype tabs visibility based on category
    const extypeTabs = document.querySelectorAll('.extype-tab');
    const salleTypes = ['upper', 'lower', 'full', 'cardio'];
    const intTypes = ['upper_int', 'lower_int', 'full_int', 'hiit_int', 'yoga_int'];
    const activeTypes = cat === 'interieur' ? intTypes : (cat === 'exterieur' ? [] : salleTypes);
    let firstVisible = null;
    extypeTabs.forEach(tab => {
      const isVisible = cat !== 'exterieur' && activeTypes.includes(tab.dataset.extype);
      tab.style.display = isVisible ? '' : 'none';
      if (isVisible && !firstVisible) firstVisible = tab;
    });
    // Activate first visible tab
    if (firstVisible) {
      extypeTabs.forEach(t => t.classList.remove('active'));
      firstVisible.classList.add('active');
      this._renderExercisePrefList(firstVisible.dataset.extype);
    }

    const pct = Program.getCycleProgress(cat);
    const ringEl = document.getElementById('cycle-ring-fill');
    const circumference = 2 * Math.PI * 24;
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

    Program.renderWeeklyPlan(document.getElementById('weekly-plan'), cat);
    this._renderWeekPlanEditor();
    Program.renderProgramWeeks(document.getElementById('program-weeks'), cat);

    // For exterieur: replace "Exercices" tab content with outdoor activities info
    const extypeList = document.getElementById('extype-list');
    if (cat === 'exterieur' && extypeList) {
      extypeList.innerHTML = '<p class="empty-state" style="padding:16px">Les activites exterieures se configurent depuis le tab Seances.</p>';
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
