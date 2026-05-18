/**
 * workout.js - Active session logic, rest timer, sets tracking
 */

class WorkoutSession {
  constructor() {
    this.active = false;
    this.exercises = [];       // Array of exercise objects with sets data
    this.currentIndex = 0;
    this.startTime = null;
    this.workoutType = null;
    this.energyLevel = 3;
    this.lightMode = false;   // -10% if low energy

    // Rest timer
    this.restTimer = null;
    this.restDuration = 90;
    this.restRemaining = 0;

    // Elapsed timer
    this.elapsedTimer = null;
    this.elapsed = 0;

    // DOM refs cached
    this._dom = {};
  }

  init() {
    this._dom = {
      workoutSelect: document.getElementById('workout-select'),
      workoutActive: document.getElementById('workout-active'),
      workoutSummary: document.getElementById('workout-summary'),
      exCounter: document.getElementById('workout-ex-counter'),
      progressFill: document.getElementById('workout-progress-fill'),
      elapsedEl: document.getElementById('workout-elapsed'),
      exName: document.getElementById('ex-name'),
      exMuscleBadge: document.getElementById('ex-muscle-badge'),
      setsContainer: document.getElementById('sets-container'),
      exDots: document.getElementById('ex-dots'),
      restOverlay: document.getElementById('rest-timer-overlay'),
      restCount: document.getElementById('rest-timer-count'),
      timerCircle: document.getElementById('timer-progress-circle'),
      btnPrev: document.getElementById('btn-prev-ex'),
      btnNext: document.getElementById('btn-next-ex'),
      btnAddSet: document.getElementById('btn-add-set'),
      btnFinish: document.getElementById('btn-finish-workout'),
      btnSkipRest: document.getElementById('btn-skip-rest'),
      btnSaveWorkout: document.getElementById('btn-save-workout'),
      btnDiscardWorkout: document.getElementById('btn-discard-workout'),
      summarySubtitle: document.getElementById('summary-subtitle'),
      summaryStats: document.getElementById('summary-stats'),
      summarySets: document.getElementById('summary-sets'),
      workoutTypeGrid: document.getElementById('workout-type-grid'),
      preWorkoutExercises: document.getElementById('pre-workout-exercises'),
      preWorkoutList: document.getElementById('pre-workout-list'),
      btnLaunch: document.getElementById('btn-launch-workout'),
      dayInfo: document.getElementById('workout-day-info')
    };

    this._bindEvents();
    this._renderDayInfo();
  }

  _bindEvents() {
    const d = this._dom;

    // Type selection
    if (d.workoutTypeGrid) {
      d.workoutTypeGrid.querySelectorAll('.workout-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          d.workoutTypeGrid.querySelectorAll('.workout-type-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          this._selectType(btn.dataset.type);
        });
      });
    }

    if (d.btnLaunch) d.btnLaunch.addEventListener('click', () => this._launch());
    if (d.btnPrev) d.btnPrev.addEventListener('click', () => this.goTo(this.currentIndex - 1));
    if (d.btnNext) d.btnNext.addEventListener('click', () => this.goTo(this.currentIndex + 1));
    if (d.btnAddSet) d.btnAddSet.addEventListener('click', () => this._addSet());
    if (d.btnFinish) d.btnFinish.addEventListener('click', () => this._showSummary());
    if (d.btnSkipRest) d.btnSkipRest.addEventListener('click', () => this._stopRestTimer());
    if (d.btnSaveWorkout) d.btnSaveWorkout.addEventListener('click', () => this._saveWorkout());
    if (d.btnDiscardWorkout) d.btnDiscardWorkout.addEventListener('click', () => this._discard());

    // Swipe support
    let startX = 0;
    const container = document.getElementById('exercise-card-container');
    if (container) {
      container.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
      container.addEventListener('touchend', e => {
        const diff = e.changedTouches[0].clientX - startX;
        if (Math.abs(diff) > 60) {
          if (diff < 0) this.goTo(this.currentIndex + 1);
          else this.goTo(this.currentIndex - 1);
        }
      }, { passive: true });
    }
  }

  _renderDayInfo() {
    const d = this._dom;
    if (!d.dayInfo) return;
    // Always read the current activeCategory at render time, never cache from init()
    const cat = (typeof App !== 'undefined' && App.activeCategory) ? App.activeCategory : 'salle';
    const todayType = Program.getTodayType(cat);
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const today = new Date();
    d.dayInfo.innerHTML = `
      <strong>${days[today.getDay()]} ${today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</strong><br>
      ${todayType === 'rest'
        ? '😴 Jour de repos programme - tu peux quand meme t\'entrainer !'
        : `Programme du jour : ${WORKOUT_TYPE_ICONS[todayType]} ${WORKOUT_TYPE_LABELS[todayType]}`
      }
    `;
  }

  _selectType(type) {
    this.workoutType = type;
    const exercises = Exercises.getEnabledForWorkoutType(type);
    this._pendingExercises = exercises;

    const d = this._dom;
    if (!d.preWorkoutExercises) return;
    d.preWorkoutExercises.classList.remove('hidden');
    d.preWorkoutList.innerHTML = '';

    exercises.forEach(ex => {
      const weight = this.lightMode ? ex.defaultWeight * 0.9 : ex.defaultWeight;
      const item = document.createElement('div');
      item.className = 'pre-workout-item';
      item.innerHTML = `
        <div>
          <div class="pre-workout-item-name">${ex.name}</div>
          <div class="pre-workout-item-detail">${ex.defaultSets} series × ${ex.defaultReps} reps${weight > 0 ? ' • ' + weight.toFixed(1) + 'kg' : ''}</div>
        </div>
        <div class="muscle-badge muscle-${ex.muscle}">${Exercises.getMuscleLabel(ex.muscle)}</div>
      `;
      d.preWorkoutList.appendChild(item);
    });
  }

  setEnergyLevel(level) {
    this.energyLevel = level;
    this.lightMode = level < 3;
    if (this._pendingExercises) {
      this._selectType(this.workoutType); // re-render with updated weights
    }
  }

  _launch() {
    if (!this._pendingExercises || this._pendingExercises.length === 0) {
      App.showToast('Selectionnez un type de seance', 'error');
      return;
    }

    // Build session exercises with sets
    this.exercises = this._pendingExercises.map(ex => {
      const sets = [];
      const weight = this.lightMode ? Math.max(0, ex.defaultWeight * 0.9) : ex.defaultWeight;
      for (let i = 0; i < ex.defaultSets; i++) {
        sets.push({
          setNum: i + 1,
          weight: weight,
          reps: ex.defaultReps,
          targetReps: ex.defaultReps,
          completed: false
        });
      }
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        muscle: ex.muscle,
        type: ex.type,
        restTime: Exercises.getRestTime(ex),
        targetReps: ex.defaultReps,
        sets
      };
    });

    this.currentIndex = 0;
    this.active = true;
    this.startTime = Date.now();
    console.log('[DEBUG TEMP][WORKOUT] _launch: type=', this.workoutType, 'exercises=', this.exercises.length, 'startTime=', this.startTime, 'sets[0]=', this.exercises[0] ? JSON.stringify(this.exercises[0].sets) : 'none');

    // Show active workout UI
    this._dom.workoutSelect.classList.add('hidden');
    this._dom.workoutActive.classList.remove('hidden');
    this._dom.workoutSummary.classList.add('hidden');

    this._renderCurrentExercise();
    this._startElapsedTimer();
    App.setHeader('Seance en cours', true);
  }

  _startElapsedTimer() {
    this.elapsed = 0;
    clearInterval(this.elapsedTimer);
    this.elapsedTimer = setInterval(() => {
      this.elapsed++;
      const m = Math.floor(this.elapsed / 60);
      const s = this.elapsed % 60;
      if (this._dom.elapsedEl) {
        this._dom.elapsedEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }

  _renderCurrentExercise() {
    const ex = this.exercises[this.currentIndex];
    if (!ex) return;

    const d = this._dom;

    // Header
    if (d.exMuscleBadge) {
      d.exMuscleBadge.textContent = Exercises.getMuscleLabel(ex.muscle);
      d.exMuscleBadge.className = `muscle-badge muscle-${ex.muscle}`;
    }
    if (d.exName) d.exName.textContent = ex.exerciseName;

    // Progress
    const pct = Math.round(((this.currentIndex) / this.exercises.length) * 100);
    if (d.progressFill) d.progressFill.style.width = pct + '%';
    if (d.exCounter) d.exCounter.textContent = `${this.currentIndex + 1}/${this.exercises.length}`;

    // Nav buttons
    if (d.btnPrev) d.btnPrev.disabled = this.currentIndex === 0;
    if (d.btnNext) d.btnNext.disabled = this.currentIndex === this.exercises.length - 1;

    // Dots
    this._renderDots();

    // Sets
    this._renderSets();
  }

  _renderDots() {
    const d = this._dom;
    if (!d.exDots) return;
    d.exDots.innerHTML = '';
    this.exercises.forEach((ex, i) => {
      const dot = document.createElement('div');
      dot.className = 'ex-dot' +
        (i === this.currentIndex ? ' current' : '') +
        (ex.sets.every(s => s.completed) && i !== this.currentIndex ? ' done' : '');
      d.exDots.appendChild(dot);
    });
  }

  _renderSets() {
    const d = this._dom;
    const ex = this.exercises[this.currentIndex];
    if (!d.setsContainer || !ex) return;

    d.setsContainer.innerHTML = '';

    ex.sets.forEach((set, si) => {
      const row = document.createElement('div');
      row.className = 'set-row' + (set.completed ? ' completed' : '');
      row.dataset.si = si;

      const showWeight = ex.type !== 'cardio' && ex.type !== 'core';
      const unitLabel = ex.type === 'core' ? 'sec' : (ex.type === 'cardio' ? 'min' : 'reps');

      row.innerHTML = `
        <div class="set-num">${set.setNum}</div>
        ${showWeight ? `
        <div class="set-field">
          <div class="set-field-label">Poids (kg)</div>
          <div class="set-field-controls">
            <button class="set-adjust-btn" data-action="weight-down" data-si="${si}">−</button>
            <input class="set-field-value" type="number" value="${set.weight}" min="0" max="300" step="0.5" data-field="weight" data-si="${si}">
            <button class="set-adjust-btn" data-action="weight-up" data-si="${si}">+</button>
          </div>
        </div>
        ` : '<div></div>'}
        <div class="set-field">
          <div class="set-field-label">${unitLabel}</div>
          <div class="set-field-controls">
            <button class="set-adjust-btn" data-action="reps-down" data-si="${si}">−</button>
            <input class="set-field-value" type="number" value="${set.reps}" min="1" max="300" data-field="reps" data-si="${si}">
            <button class="set-adjust-btn" data-action="reps-up" data-si="${si}">+</button>
          </div>
        </div>
        <button class="set-done-btn ${set.completed ? 'checked' : ''}" data-si="${si}" aria-label="Serie validee">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        </button>
      `;

      // Bind set events
      row.querySelectorAll('.set-adjust-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          const idx = parseInt(btn.dataset.si);
          this._adjustSet(idx, action);
        });
      });

      row.querySelectorAll('input[data-field]').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const idx = parseInt(inp.dataset.si);
          const field = inp.dataset.field;
          const val = parseFloat(e.target.value) || 0;
          ex.sets[idx][field] = val;
        });
        inp.addEventListener('change', (e) => {
          const idx = parseInt(inp.dataset.si);
          const field = inp.dataset.field;
          const val = parseFloat(e.target.value) || 0;
          ex.sets[idx][field] = val;
        });
      });

      const doneBtn = row.querySelector('.set-done-btn');
      doneBtn.addEventListener('click', () => {
        const idx = parseInt(doneBtn.dataset.si);
        this._toggleSetDone(idx);
      });

      d.setsContainer.appendChild(row);
    });
  }

  _syncInputValues() {
    const d = this._dom;
    if (!d.setsContainer) return;
    const ex = this.exercises[this.currentIndex];
    if (!ex) return;
    d.setsContainer.querySelectorAll('input[data-field]').forEach(inp => {
      const idx = parseInt(inp.dataset.si);
      const field = inp.dataset.field;
      if (!isNaN(idx) && ex.sets[idx]) {
        const val = parseFloat(inp.value) || 0;
        ex.sets[idx][field] = val;
      }
    });
    console.log('[DEBUG TEMP][WORKOUT] _syncInputValues exIdx=', this.currentIndex, 'sets=', JSON.stringify(ex.sets));
  }

  _adjustSet(si, action) {
    this._syncInputValues();
    const ex = this.exercises[this.currentIndex];
    if (!ex || !ex.sets[si]) return;
    const set = ex.sets[si];

    switch (action) {
      case 'weight-up': set.weight = Math.min(300, +(set.weight + 2.5).toFixed(1)); break;
      case 'weight-down': set.weight = Math.max(0, +(set.weight - 2.5).toFixed(1)); break;
      case 'reps-up': set.reps = Math.min(300, set.reps + 1); break;
      case 'reps-down': set.reps = Math.max(1, set.reps - 1); break;
    }
    this._renderSets();
  }

  _toggleSetDone(si) {
    this._syncInputValues();
    const ex = this.exercises[this.currentIndex];
    if (!ex || !ex.sets[si]) return;
    const wasCompleted = ex.sets[si].completed;
    ex.sets[si].completed = !wasCompleted;
    console.log('[DEBUG TEMP][WORKOUT] _toggleSetDone exIdx=', this.currentIndex, 'setIdx=', si, 'completed=', ex.sets[si].completed, 'weight=', ex.sets[si].weight, 'reps=', ex.sets[si].reps);

    if (!wasCompleted) {
      // Start rest timer if not last set
      const allDone = ex.sets.every(s => s.completed);
      if (!allDone) {
        this._startRestTimer(ex.restTime);
      } else {
        // All sets done, suggest next exercise
        App.showToast('✅ Exercice termine !', 'success');
      }
    }

    this._renderSets();
    this._renderDots();
  }

  _addSet() {
    this._syncInputValues();
    const ex = this.exercises[this.currentIndex];
    if (!ex) return;
    const lastSet = ex.sets[ex.sets.length - 1];
    ex.sets.push({
      setNum: ex.sets.length + 1,
      weight: lastSet ? lastSet.weight : 0,
      reps: lastSet ? lastSet.reps : 10,
      targetReps: lastSet ? lastSet.reps : 10,
      completed: false
    });
    this._renderSets();
  }

  goTo(index) {
    this._syncInputValues();
    if (index < 0 || index >= this.exercises.length) return;
    this._stopRestTimer();
    this.currentIndex = index;
    this._renderCurrentExercise();
  }

  _startRestTimer(seconds) {
    if (seconds <= 0) return;
    this.restDuration = seconds;
    this.restRemaining = seconds;
    this._dom.restOverlay.classList.remove('hidden');
    this._updateRestTimer();

    clearInterval(this.restTimer);
    this.restTimer = setInterval(() => {
      this.restRemaining--;
      this._updateRestTimer();
      if (this.restRemaining <= 0) {
        this._stopRestTimer();
        this._vibrate();
      }
    }, 1000);
  }

  _updateRestTimer() {
    if (this._dom.restCount) this._dom.restCount.textContent = this.restRemaining;

    // Update SVG circle
    const circle = this._dom.timerCircle;
    if (circle) {
      const circumference = 2 * Math.PI * 44; // r=44 => 276.46
      const offset = circumference * (this.restRemaining / this.restDuration);
      circle.style.strokeDashoffset = offset;
    }
  }

  _stopRestTimer() {
    clearInterval(this.restTimer);
    this.restTimer = null;
    if (this._dom.restOverlay) this._dom.restOverlay.classList.add('hidden');
  }

  _vibrate() {
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    App.showToast('Repos termine !', 'success');
  }

  _showSummary() {
    this._syncInputValues();
    clearInterval(this.elapsedTimer);
    this._stopRestTimer();
    this.active = false;

    const d = this._dom;
    d.workoutActive.classList.add('hidden');
    d.workoutSummary.classList.remove('hidden');
    App.setHeader('Resume seance', true);

    // Compute stats
    const totalSets = this.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0);
    const totalVolume = this.exercises.reduce((acc, ex) =>
      acc + ex.sets.filter(s => s.completed).reduce((a, s) => {
        // For bodyweight exercises (weight=0), count reps as volume unit
        return a + (s.weight > 0 ? s.weight * s.reps : s.reps);
      }, 0), 0);
    const hasWeight = this.exercises.some(ex => ex.sets.some(s => s.completed && s.weight > 0));
    const volumeLabel = hasWeight ? 'kg volume' : 'reps total';
    // FIX: pour les seances < 60s, afficher au moins 1 min ou les secondes brutes
    const duration = this.elapsed >= 60 ? Math.floor(this.elapsed / 60) : (this.elapsed > 0 ? 1 : 0);
    const durationLabel = this.elapsed > 0 && this.elapsed < 60 ? '< 1' : String(duration);

    console.log('[DEBUG TEMP][WORKOUT] _showSummary', {
      elapsed: this.elapsed,
      duration,
      totalSets,
      totalVolume,
      exercises: this.exercises.map(e => ({ name: e.exerciseName, sets: e.sets.map(s => ({ completed: s.completed, weight: s.weight, reps: s.reps })) }))
    });

    if (d.summarySubtitle) {
      d.summarySubtitle.textContent = `${durationLabel} min • ${totalSets} series • ${Math.round(totalVolume).toLocaleString('fr-FR')} ${hasWeight ? 'kg' : 'reps'}`;
    }

    if (d.summaryStats) {
      d.summaryStats.innerHTML = `
        <div class="stat-card"><div class="stat-icon">⏱️</div><div class="stat-value">${durationLabel}</div><div class="stat-label">minutes</div></div>
        <div class="stat-card"><div class="stat-icon">🔢</div><div class="stat-value">${totalSets}</div><div class="stat-label">series</div></div>
        <div class="stat-card"><div class="stat-icon">🏋️</div><div class="stat-value">${Math.round(totalVolume)}</div><div class="stat-label">${volumeLabel}</div></div>
      `;
    }

    if (d.summarySets) {
      d.summarySets.innerHTML = '';
      this.exercises.forEach(ex => {
        const completedSets = ex.sets.filter(s => s.completed);
        if (completedSets.length === 0) return;
        const row = document.createElement('div');
        row.className = 'summary-set-row';
        row.innerHTML = `
          <span class="summary-set-name">${ex.exerciseName}</span>
          <span class="summary-set-val">${completedSets.length} × ${completedSets.map(s => `${s.reps}${s.weight > 0 ? '@' + s.weight + 'kg' : ''}`).join(' | ')}</span>
        `;
        d.summarySets.appendChild(row);
      });
    }
  }

  async _saveWorkout() {
    const cat = (typeof App !== 'undefined' && App.activeCategory) ? App.activeCategory : 'salle';
    const workout = {
      date: Date.now(),
      type: this.workoutType,
      category: cat,
      duration: this.elapsed,
      energyLevel: this.energyLevel,
      lightMode: this.lightMode,
      exercises: this.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        muscle: ex.muscle,
        targetReps: ex.targetReps,
        sets: ex.sets.filter(s => s.completed)
      }))
    };
    console.log('[DEBUG TEMP][WORKOUT] _saveWorkout', JSON.stringify(workout));

    try {
      await DB.addWorkout(workout);
      await Program.markSessionCompleted(
        new Date().toISOString().split('T')[0],
        this.workoutType,
        cat
      );
      App.showToast('Seance sauvegardee ! 🎉', 'success');
      this._resetUI();
      App.navigate('dashboard');
      // Refresh dashboard
      setTimeout(() => App.loadDashboard(), 300);
    } catch (e) {
      console.error('Save error:', e);
      App.showToast('Erreur lors de la sauvegarde', 'error');
    }
  }

  _discard() {
    if (!confirm('Abandonner la seance ? Les donnees seront perdues.')) return;
    this._resetUI();
    const cat = (typeof App !== 'undefined' && App.activeCategory) ? App.activeCategory : null;
    const label = cat ? `${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}` : 'Easy Sport';
    App.setHeader(label, false);
  }

  _resetUI() {
    clearInterval(this.elapsedTimer);
    this._stopRestTimer();
    this.active = false;
    this.exercises = [];
    this.currentIndex = 0;
    this._pendingExercises = null;
    this.workoutType = null;

    const d = this._dom;
    d.workoutSelect.classList.remove('hidden');
    d.workoutActive.classList.add('hidden');
    d.workoutSummary.classList.add('hidden');
    if (d.preWorkoutExercises) d.preWorkoutExercises.classList.add('hidden');
    if (d.workoutTypeGrid) {
      d.workoutTypeGrid.querySelectorAll('.workout-type-btn').forEach(b => b.classList.remove('selected'));
    }
    const cat = (typeof App !== 'undefined' && App.activeCategory) ? App.activeCategory : null;
    const label = cat ? `${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}` : 'Easy Sport';
    App.setHeader(label, false);
  }

  startWorkoutOfType(type) {
    // Called from dashboard "start next workout"
    const btn = document.querySelector(`.workout-type-btn[data-type="${type}"]`);
    if (btn) {
      btn.classList.add('selected');
      this._selectType(type);
    }
  }
}

const Workout = new WorkoutSession();
