/**
 * exercises.js - Pre-defined exercise library + management
 */

const MUSCLE_LABELS = {
  chest: 'Pectoraux',
  back: 'Dos',
  shoulders: 'Epaules',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quadriceps',
  hamstrings: 'Ischio-jambiers',
  glutes: 'Fessiers',
  calves: 'Mollets',
  core: 'Core',
  cardio: 'Cardio'
};

const MUSCLE_EMOJIS = {
  chest: '💗',
  back: '💙',
  shoulders: '💜',
  biceps: '💚',
  triceps: '🧡',
  quads: '💛',
  hamstrings: '❤️',
  glutes: '💕',
  calves: '🩵',
  core: '⚪',
  cardio: '❤️‍🔥'
};

const PREDEFINED_EXERCISES = [
  // ---- Haut du corps ----
  {
    name: 'Developpe couche (barre)',
    muscle: 'chest',
    type: 'strength',
    defaultSets: 4,
    defaultReps: 10,
    defaultWeight: 30,
    restTime: 90,
    notes: 'Descendre la barre jusqu\'a la poitrine, prise largeur epaules'
  },
  {
    name: 'Developpe couche halteres',
    muscle: 'chest',
    type: 'strength',
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 12,
    restTime: 90,
    notes: 'Coudes a 45 degres du corps, amplitude maximale'
  },
  {
    name: 'Developpe epaules (machine)',
    muscle: 'shoulders',
    type: 'strength',
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 25,
    restTime: 90,
    notes: 'Ne pas verrouiller les coudes en haut'
  },
  {
    name: 'Elevations laterales',
    muscle: 'shoulders',
    type: 'strength',
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 5,
    restTime: 60,
    notes: 'Lever jusqu\'a hauteur des epaules, leger flechissement des coudes'
  },
  {
    name: 'Tirage horizontal (machine)',
    muscle: 'back',
    type: 'strength',
    defaultSets: 4,
    defaultReps: 10,
    defaultWeight: 35,
    restTime: 90,
    notes: 'Tirer vers le nombril, serrer les omoplates en fin de mouvement'
  },
  {
    name: 'Tirage vertical (poulie haute)',
    muscle: 'back',
    type: 'strength',
    defaultSets: 4,
    defaultReps: 10,
    defaultWeight: 40,
    restTime: 90,
    notes: 'Prise large, ramener la barre sous le menton en contractant le dos'
  },
  {
    name: 'Rowing haltere',
    muscle: 'back',
    type: 'strength',
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 15,
    restTime: 60,
    notes: 'Un bras a la fois, coude le long du corps, dos plat'
  },
  {
    name: 'Curl biceps halteres',
    muscle: 'biceps',
    type: 'strength',
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 8,
    restTime: 60,
    notes: 'Supination en haut, controler la descente'
  },
  {
    name: 'Extension triceps poulie',
    muscle: 'triceps',
    type: 'strength',
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 15,
    restTime: 60,
    notes: 'Coudes fixes, pousser jusqu\'a extension complete'
  },
  {
    name: 'Dips (machine assistee)',
    muscle: 'triceps',
    type: 'strength',
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 20,
    restTime: 90,
    notes: 'Plus le poids d\'assistance est faible, plus c\'est difficile'
  },
  // ---- Bas du corps ----
  {
    name: 'Squat barre',
    muscle: 'quads',
    type: 'strength',
    defaultSets: 4,
    defaultReps: 8,
    defaultWeight: 40,
    restTime: 90,
    notes: 'Dos droit, genoux dans l\'axe des pieds, descendre a parallele'
  },
  {
    name: 'Presse a cuisses',
    muscle: 'quads',
    type: 'strength',
    defaultSets: 4,
    defaultReps: 12,
    defaultWeight: 60,
    restTime: 90,
    notes: 'Pieds largeur epaules, ne pas verrouiller les genoux en haut'
  },
  {
    name: 'Fentes avec halteres',
    muscle: 'quads',
    type: 'strength',
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 10,
    restTime: 60,
    notes: 'Grand pas, genou arriere proche du sol, dos droit'
  },
  {
    name: 'Leg extension (machine)',
    muscle: 'quads',
    type: 'strength',
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 30,
    restTime: 60,
    notes: 'Contraction maximale en haut, descente controlee'
  },
  {
    name: 'Leg curl (machine)',
    muscle: 'hamstrings',
    type: 'strength',
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 25,
    restTime: 60,
    notes: 'Flexion complete, contracter les ischio en fin de mouvement'
  },
  {
    name: 'Hip thrust (barre)',
    muscle: 'glutes',
    type: 'strength',
    defaultSets: 4,
    defaultReps: 12,
    defaultWeight: 40,
    restTime: 90,
    notes: 'Serrer les fessiers en haut, hanches dans l\'axe'
  },
  {
    name: 'Mollets debout (machine)',
    muscle: 'calves',
    type: 'strength',
    defaultSets: 4,
    defaultReps: 20,
    defaultWeight: 40,
    restTime: 45,
    notes: 'Amplitude maximale, pause en haut et en bas'
  },
  {
    name: 'Abducteurs (machine)',
    muscle: 'glutes',
    type: 'strength',
    defaultSets: 3,
    defaultReps: 20,
    defaultWeight: 35,
    restTime: 45,
    notes: 'Ecarter lentement, revenir en controlant'
  },
  {
    name: 'Adducteurs (machine)',
    muscle: 'quads',
    type: 'strength',
    defaultSets: 3,
    defaultReps: 20,
    defaultWeight: 30,
    restTime: 45,
    notes: 'Rapprocher lentement, contraction inner thigh'
  },
  // ---- Core / Cardio ----
  {
    name: 'Crunch (machine ou sol)',
    muscle: 'core',
    type: 'core',
    defaultSets: 3,
    defaultReps: 20,
    defaultWeight: 0,
    restTime: 45,
    notes: 'Expirer en contractant les abdos, ne pas tirer sur la nuque'
  },
  {
    name: 'Gainage planche',
    muscle: 'core',
    type: 'core',
    defaultSets: 3,
    defaultReps: 60,
    defaultWeight: 0,
    restTime: 45,
    notes: 'Reps = secondes. Corps droit de la tete aux talons'
  },
  {
    name: 'Russian twist',
    muscle: 'core',
    type: 'core',
    defaultSets: 3,
    defaultReps: 20,
    defaultWeight: 5,
    restTime: 45,
    notes: 'Rotation de buste complete, pieds decollles pour plus de difficulte'
  },
  {
    name: 'Velo elliptique',
    muscle: 'cardio',
    type: 'cardio',
    defaultSets: 1,
    defaultReps: 20,
    defaultWeight: 0,
    restTime: 0,
    notes: 'Reps = minutes. Frequence cardiaque cible: 130-150 bpm'
  },
  {
    name: 'Rameur',
    muscle: 'cardio',
    type: 'cardio',
    defaultSets: 1,
    defaultReps: 15,
    defaultWeight: 0,
    restTime: 0,
    notes: 'Reps = minutes. Dos droit, pousser avec les jambes en premier'
  }
];

// Workout type -> exercise IDs (by name subset)
const WORKOUT_TEMPLATES = {
  upper: ['Developpe couche (barre)', 'Developpe couche halteres', 'Tirage horizontal (machine)', 'Tirage vertical (poulie haute)', 'Developpe epaules (machine)', 'Curl biceps halteres', 'Extension triceps poulie'],
  lower: ['Squat barre', 'Presse a cuisses', 'Leg extension (machine)', 'Leg curl (machine)', 'Hip thrust (barre)', 'Mollets debout (machine)', 'Abducteurs (machine)'],
  full: ['Developpe couche (barre)', 'Tirage vertical (poulie haute)', 'Squat barre', 'Hip thrust (barre)', 'Elevations laterales', 'Curl biceps halteres', 'Gainage planche'],
  cardio: ['Velo elliptique', 'Rameur', 'Gainage planche', 'Russian twist', 'Crunch (machine ou sol)']
};

const WORKOUT_TYPE_LABELS = {
  upper: 'Haut du corps',
  lower: 'Bas du corps',
  full: 'Full body',
  cardio: 'Cardio',
  rest: 'Repos'
};

const WORKOUT_TYPE_ICONS = {
  upper: '💪',
  lower: '🦵',
  full: '⚡',
  cardio: '🏃',
  rest: '😴'
};

class ExerciseManager {
  constructor() {
    this._allExercises = null;
    this._prefs = null; // { upper: [id,...], lower: [...], full: [...], cardio: [...] }
  }

  async init() {
    // Seed DB if empty
    const count = await DB.countExercises();
    if (count === 0) {
      for (const ex of PREDEFINED_EXERCISES) {
        await DB.addExercise(ex);
      }
    }
    await this.refresh();
    await this.loadPreferences();
  }

  async loadPreferences() {
    const raw = await DB.getSetting('workoutExercisePrefs');
    this._prefs = raw ? JSON.parse(raw) : null;
  }

  async savePreference(type, enabledIds) {
    if (!this._prefs) this._prefs = {};
    this._prefs[type] = enabledIds;
    await DB.setSetting('workoutExercisePrefs', JSON.stringify(this._prefs));
  }

  getEnabledForWorkoutType(type) {
    const all = this.getForWorkoutType(type);
    if (!this._prefs || !this._prefs[type]) return all;
    const enabled = this._prefs[type];
    const filtered = all.filter(ex => enabled.includes(ex.id));
    // Garantit au moins 1 exercice
    return filtered.length > 0 ? filtered : all;
  }

  async refresh() {
    this._allExercises = await DB.getAllExercises();
    return this._allExercises;
  }

  getAll() {
    return this._allExercises || [];
  }

  getById(id) {
    return (this._allExercises || []).find(e => e.id === id) || null;
  }

  getByName(name) {
    return (this._allExercises || []).find(e => e.name === name) || null;
  }

  getByMuscle(muscle) {
    if (muscle === 'all') return this.getAll();
    return (this._allExercises || []).filter(e => e.muscle === muscle);
  }

  search(query) {
    const q = query.toLowerCase().trim();
    return (this._allExercises || []).filter(e =>
      e.name.toLowerCase().includes(q) ||
      (MUSCLE_LABELS[e.muscle] || '').toLowerCase().includes(q)
    );
  }

  getForWorkoutType(type) {
    const names = WORKOUT_TEMPLATES[type] || [];
    const exercises = [];
    for (const name of names) {
      const ex = this.getByName(name);
      if (ex) exercises.push(ex);
    }
    // Fallback: get by muscle type if custom exercises exist
    return exercises;
  }

  getMuscleLabel(muscle) {
    return MUSCLE_LABELS[muscle] || muscle;
  }

  getMuscleEmoji(muscle) {
    return MUSCLE_EMOJIS[muscle] || '💪';
  }

  getRestTime(exercise) {
    if (exercise.restTime !== undefined) return exercise.restTime;
    switch (exercise.type) {
      case 'strength': return 90;
      case 'endurance': return 60;
      case 'core': return 45;
      case 'cardio': return 0;
      default: return 60;
    }
  }

  async add(data) {
    const id = await DB.addExercise(data);
    await this.refresh();
    return id;
  }

  async update(exercise) {
    await DB.updateExercise(exercise);
    await this.refresh();
  }

  async delete(id) {
    await DB.deleteExercise(id);
    await this.refresh();
  }

  renderExerciseList(exercises, container, onTap) {
    container.innerHTML = '';
    if (exercises.length === 0) {
      container.innerHTML = '<p class="empty-state">Aucun exercice trouve</p>';
      return;
    }
    exercises.forEach(ex => {
      const item = document.createElement('div');
      item.className = 'exercise-item';
      item.dataset.id = ex.id;
      item.innerHTML = `
        <div class="exercise-item-color muscle-${ex.muscle}"></div>
        <div class="exercise-item-info">
          <div class="exercise-item-name">${ex.name}</div>
          <div class="exercise-item-muscle">${this.getMuscleEmoji(ex.muscle)} ${this.getMuscleLabel(ex.muscle)}</div>
          <div class="exercise-item-detail">${ex.defaultSets} x ${ex.defaultReps} reps${ex.defaultWeight > 0 ? ' • ' + ex.defaultWeight + 'kg' : ''}</div>
        </div>
        <svg class="exercise-item-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      `;
      item.addEventListener('click', () => onTap(ex));
      container.appendChild(item);
    });
  }
}

const Exercises = new ExerciseManager();
