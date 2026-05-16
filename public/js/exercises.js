/**
 * exercises.js - Pre-defined exercise library + management
 * Supports category: 'salle' | 'interieur' | 'exterieur'
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
  cardio: 'Cardio',
  full_body: 'Corps entier',
  mobility: 'Mobilite'
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
  cardio: '❤️‍🔥',
  full_body: '⚡',
  mobility: '🧘'
};

// ---- SALLE: exercices machines/bancs (existants) ----
const PREDEFINED_EXERCISES_SALLE = [
  {
    name: 'Developpe couche (barre)',
    muscle: 'chest', type: 'strength',
    defaultSets: 4, defaultReps: 10, defaultWeight: 30, restTime: 90,
    notes: 'Descendre la barre jusqu\'a la poitrine, prise largeur epaules',
    category: 'salle'
  },
  {
    name: 'Developpe couche halteres',
    muscle: 'chest', type: 'strength',
    defaultSets: 3, defaultReps: 12, defaultWeight: 12, restTime: 90,
    notes: 'Coudes a 45 degres du corps, amplitude maximale',
    category: 'salle'
  },
  {
    name: 'Developpe epaules (machine)',
    muscle: 'shoulders', type: 'strength',
    defaultSets: 3, defaultReps: 12, defaultWeight: 25, restTime: 90,
    notes: 'Ne pas verrouiller les coudes en haut',
    category: 'salle'
  },
  {
    name: 'Elevations laterales',
    muscle: 'shoulders', type: 'strength',
    defaultSets: 3, defaultReps: 15, defaultWeight: 5, restTime: 60,
    notes: 'Lever jusqu\'a hauteur des epaules, leger flechissement des coudes',
    category: 'salle'
  },
  {
    name: 'Tirage horizontal (machine)',
    muscle: 'back', type: 'strength',
    defaultSets: 4, defaultReps: 10, defaultWeight: 35, restTime: 90,
    notes: 'Tirer vers le nombril, serrer les omoplates en fin de mouvement',
    category: 'salle'
  },
  {
    name: 'Tirage vertical (poulie haute)',
    muscle: 'back', type: 'strength',
    defaultSets: 4, defaultReps: 10, defaultWeight: 40, restTime: 90,
    notes: 'Prise large, ramener la barre sous le menton en contractant le dos',
    category: 'salle'
  },
  {
    name: 'Rowing haltere',
    muscle: 'back', type: 'strength',
    defaultSets: 3, defaultReps: 12, defaultWeight: 15, restTime: 60,
    notes: 'Un bras a la fois, coude le long du corps, dos plat',
    category: 'salle'
  },
  {
    name: 'Curl biceps halteres',
    muscle: 'biceps', type: 'strength',
    defaultSets: 3, defaultReps: 12, defaultWeight: 8, restTime: 60,
    notes: 'Supination en haut, controler la descente',
    category: 'salle'
  },
  {
    name: 'Extension triceps poulie',
    muscle: 'triceps', type: 'strength',
    defaultSets: 3, defaultReps: 15, defaultWeight: 15, restTime: 60,
    notes: 'Coudes fixes, pousser jusqu\'a extension complete',
    category: 'salle'
  },
  {
    name: 'Dips (machine assistee)',
    muscle: 'triceps', type: 'strength',
    defaultSets: 3, defaultReps: 12, defaultWeight: 20, restTime: 90,
    notes: 'Plus le poids d\'assistance est faible, plus c\'est difficile',
    category: 'salle'
  },
  {
    name: 'Squat barre',
    muscle: 'quads', type: 'strength',
    defaultSets: 4, defaultReps: 8, defaultWeight: 40, restTime: 90,
    notes: 'Dos droit, genoux dans l\'axe des pieds, descendre a parallele',
    category: 'salle'
  },
  {
    name: 'Presse a cuisses',
    muscle: 'quads', type: 'strength',
    defaultSets: 4, defaultReps: 12, defaultWeight: 60, restTime: 90,
    notes: 'Pieds largeur epaules, ne pas verrouiller les genoux en haut',
    category: 'salle'
  },
  {
    name: 'Fentes avec halteres',
    muscle: 'quads', type: 'strength',
    defaultSets: 3, defaultReps: 12, defaultWeight: 10, restTime: 60,
    notes: 'Grand pas, genou arriere proche du sol, dos droit',
    category: 'salle'
  },
  {
    name: 'Leg extension (machine)',
    muscle: 'quads', type: 'strength',
    defaultSets: 3, defaultReps: 15, defaultWeight: 30, restTime: 60,
    notes: 'Contraction maximale en haut, descente controlee',
    category: 'salle'
  },
  {
    name: 'Leg curl (machine)',
    muscle: 'hamstrings', type: 'strength',
    defaultSets: 3, defaultReps: 15, defaultWeight: 25, restTime: 60,
    notes: 'Flexion complete, contracter les ischio en fin de mouvement',
    category: 'salle'
  },
  {
    name: 'Hip thrust (barre)',
    muscle: 'glutes', type: 'strength',
    defaultSets: 4, defaultReps: 12, defaultWeight: 40, restTime: 90,
    notes: 'Serrer les fessiers en haut, hanches dans l\'axe',
    category: 'salle'
  },
  {
    name: 'Mollets debout (machine)',
    muscle: 'calves', type: 'strength',
    defaultSets: 4, defaultReps: 20, defaultWeight: 40, restTime: 45,
    notes: 'Amplitude maximale, pause en haut et en bas',
    category: 'salle'
  },
  {
    name: 'Abducteurs (machine)',
    muscle: 'glutes', type: 'strength',
    defaultSets: 3, defaultReps: 20, defaultWeight: 35, restTime: 45,
    notes: 'Ecarter lentement, revenir en controlant',
    category: 'salle'
  },
  {
    name: 'Adducteurs (machine)',
    muscle: 'quads', type: 'strength',
    defaultSets: 3, defaultReps: 20, defaultWeight: 30, restTime: 45,
    notes: 'Rapprocher lentement, contraction inner thigh',
    category: 'salle'
  },
  {
    name: 'Crunch (machine ou sol)',
    muscle: 'core', type: 'core',
    defaultSets: 3, defaultReps: 20, defaultWeight: 0, restTime: 45,
    notes: 'Expirer en contractant les abdos, ne pas tirer sur la nuque',
    category: 'salle'
  },
  {
    name: 'Gainage planche',
    muscle: 'core', type: 'core',
    defaultSets: 3, defaultReps: 60, defaultWeight: 0, restTime: 45,
    notes: 'Reps = secondes. Corps droit de la tete aux talons',
    category: 'salle'
  },
  {
    name: 'Russian twist',
    muscle: 'core', type: 'core',
    defaultSets: 3, defaultReps: 20, defaultWeight: 5, restTime: 45,
    notes: 'Rotation de buste complete, pieds decollles pour plus de difficulte',
    category: 'salle'
  },
  {
    name: 'Velo elliptique',
    muscle: 'cardio', type: 'cardio',
    defaultSets: 1, defaultReps: 20, defaultWeight: 0, restTime: 0,
    notes: 'Reps = minutes. Frequence cardiaque cible: 130-150 bpm',
    category: 'salle'
  },
  {
    name: 'Rameur',
    muscle: 'cardio', type: 'cardio',
    defaultSets: 1, defaultReps: 15, defaultWeight: 0, restTime: 0,
    notes: 'Reps = minutes. Dos droit, pousser avec les jambes en premier',
    category: 'salle'
  }
];

// ---- INTERIEUR: exercices maison, poids du corps, elastiques, halteres legers ----
const PREDEFINED_EXERCISES_INTERIEUR = [
  // Poids du corps - Haut
  {
    name: 'Pompes classiques',
    muscle: 'chest', type: 'strength',
    defaultSets: 3, defaultReps: 15, defaultWeight: 0, restTime: 60,
    notes: 'Mains largeur epaules, corps gainé, descendre la poitrine pres du sol',
    category: 'interieur'
  },
  {
    name: 'Pompes surelevees (pieds hauts)',
    muscle: 'chest', type: 'strength',
    defaultSets: 3, defaultReps: 12, defaultWeight: 0, restTime: 60,
    notes: 'Pieds sur chaise ou canape, cible la partie haute des pectoraux',
    category: 'interieur'
  },
  {
    name: 'Pompes diamant (triceps)',
    muscle: 'triceps', type: 'strength',
    defaultSets: 3, defaultReps: 10, defaultWeight: 0, restTime: 60,
    notes: 'Mains en triangle sous la poitrine, coudes le long du corps',
    category: 'interieur'
  },
  {
    name: 'Pompes declinées (mains hautes)',
    muscle: 'chest', type: 'strength',
    defaultSets: 3, defaultReps: 15, defaultWeight: 0, restTime: 60,
    notes: 'Mains sur chaise/step, cible la partie basse des pectoraux',
    category: 'interieur'
  },
  {
    name: 'Tractions (barre de porte)',
    muscle: 'back', type: 'strength',
    defaultSets: 3, defaultReps: 6, defaultWeight: 0, restTime: 90,
    notes: 'Prise large pronation, tirer jusqu\'au menton. Prise serrée = biceps',
    category: 'interieur'
  },
  // Poids du corps - Bas
  {
    name: 'Squats poids du corps',
    muscle: 'quads', type: 'strength',
    defaultSets: 3, defaultReps: 20, defaultWeight: 0, restTime: 45,
    notes: 'Pieds largeur epaules, genoux dans l\'axe, descendre a parallele',
    category: 'interieur'
  },
  {
    name: 'Fentes sur place',
    muscle: 'quads', type: 'strength',
    defaultSets: 3, defaultReps: 12, defaultWeight: 0, restTime: 45,
    notes: 'Alterner les jambes, genou arriere proche du sol',
    category: 'interieur'
  },
  {
    name: 'Glute bridge (fessiers sol)',
    muscle: 'glutes', type: 'strength',
    defaultSets: 3, defaultReps: 20, defaultWeight: 0, restTime: 45,
    notes: 'Allonge au sol, pied a plat, pousser les hanches vers le haut',
    category: 'interieur'
  },
  {
    name: 'Mollets poids du corps',
    muscle: 'calves', type: 'strength',
    defaultSets: 3, defaultReps: 25, defaultWeight: 0, restTime: 30,
    notes: 'Sur une marche pour plus d\'amplitude, pause en haut',
    category: 'interieur'
  },
  // Core
  {
    name: 'Planche (gainage)',
    muscle: 'core', type: 'core',
    defaultSets: 3, defaultReps: 45, defaultWeight: 0, restTime: 45,
    notes: 'Reps = secondes. Coudes ou mains, dos plat, hanches stables',
    category: 'interieur'
  },
  {
    name: 'Planche laterale',
    muscle: 'core', type: 'core',
    defaultSets: 3, defaultReps: 30, defaultWeight: 0, restTime: 30,
    notes: 'Reps = secondes. Aligner epaule, hanche, cheville',
    category: 'interieur'
  },
  {
    name: 'Mountain climber',
    muscle: 'core', type: 'cardio',
    defaultSets: 3, defaultReps: 20, defaultWeight: 0, restTime: 45,
    notes: 'Reps = pas totaux. Position pompe, ramener genoux alternés au ventre',
    category: 'interieur'
  },
  {
    name: 'Crunchs abdominaux',
    muscle: 'core', type: 'core',
    defaultSets: 3, defaultReps: 20, defaultWeight: 0, restTime: 45,
    notes: 'Dos au sol, mains derriere la tete, ne pas tirer sur la nuque',
    category: 'interieur'
  },
  {
    name: 'Releves de jambes',
    muscle: 'core', type: 'core',
    defaultSets: 3, defaultReps: 15, defaultWeight: 0, restTime: 45,
    notes: 'Dos au sol, mains sous les fesses, relever jambes tendues a 90 degres',
    category: 'interieur'
  },
  // Cardio / HIIT
  {
    name: 'Burpees',
    muscle: 'full_body', type: 'cardio',
    defaultSets: 3, defaultReps: 10, defaultWeight: 0, restTime: 60,
    notes: 'Squat + pompe + saut. Intensite elevee, parfait pour bruler des calories',
    category: 'interieur'
  },
  {
    name: 'Jumping jacks',
    muscle: 'cardio', type: 'cardio',
    defaultSets: 3, defaultReps: 30, defaultWeight: 0, restTime: 30,
    notes: 'Echauffement ou cardio leger, rythme soutenu',
    category: 'interieur'
  },
  // Mobilite / Yoga
  {
    name: 'Etirements dos chat/vache',
    muscle: 'mobility', type: 'endurance',
    defaultSets: 2, defaultReps: 60, defaultWeight: 0, restTime: 0,
    notes: 'Reps = secondes. A 4 pattes, alterner dos creux et dos rond lentement',
    category: 'interieur'
  },
  {
    name: 'Pigeon (etirement hanche)',
    muscle: 'glutes', type: 'endurance',
    defaultSets: 2, defaultReps: 60, defaultWeight: 0, restTime: 0,
    notes: 'Reps = secondes. Maintenir 30-60s par cote, respiration ample',
    category: 'interieur'
  },
  // Elastiques
  {
    name: 'Rowing elastique',
    muscle: 'back', type: 'strength',
    defaultSets: 3, defaultReps: 15, defaultWeight: 0, restTime: 60,
    notes: 'Elastique fixe devant, tirer coudes en arriere en serrant les omoplates',
    category: 'interieur'
  },
  {
    name: 'Abductions fessiers elastique',
    muscle: 'glutes', type: 'strength',
    defaultSets: 3, defaultReps: 20, defaultWeight: 0, restTime: 45,
    notes: 'Elastique autour des genoux, ecarter les jambes sur le cote',
    category: 'interieur'
  },
  {
    name: 'Face pull elastique (epaules)',
    muscle: 'shoulders', type: 'strength',
    defaultSets: 3, defaultReps: 15, defaultWeight: 0, restTime: 60,
    notes: 'Elastique a hauteur visage, tirer les mains vers les oreilles',
    category: 'interieur'
  },
  // Halteres legers
  {
    name: 'Curl biceps halteres legers',
    muscle: 'biceps', type: 'strength',
    defaultSets: 3, defaultReps: 12, defaultWeight: 5, restTime: 60,
    notes: 'Supination complete en haut, descente controlee',
    category: 'interieur'
  },
  {
    name: 'Elevations laterales halteres',
    muscle: 'shoulders', type: 'strength',
    defaultSets: 3, defaultReps: 15, defaultWeight: 3, restTime: 60,
    notes: 'Bras tendus, monter jusqu\'a hauteur epaule',
    category: 'interieur'
  },
  {
    name: 'Presse epaules halteres',
    muscle: 'shoulders', type: 'strength',
    defaultSets: 3, defaultReps: 12, defaultWeight: 6, restTime: 60,
    notes: 'Assis ou debout, pousser les halteres au-dessus de la tete',
    category: 'interieur'
  }
];

// Workout type -> exercise names (salle only)
const WORKOUT_TEMPLATES = {
  upper: ['Developpe couche (barre)', 'Developpe couche halteres', 'Tirage horizontal (machine)', 'Tirage vertical (poulie haute)', 'Developpe epaules (machine)', 'Curl biceps halteres', 'Extension triceps poulie'],
  lower: ['Squat barre', 'Presse a cuisses', 'Leg extension (machine)', 'Leg curl (machine)', 'Hip thrust (barre)', 'Mollets debout (machine)', 'Abducteurs (machine)'],
  full: ['Developpe couche (barre)', 'Tirage vertical (poulie haute)', 'Squat barre', 'Hip thrust (barre)', 'Elevations laterales', 'Curl biceps halteres', 'Gainage planche'],
  cardio: ['Velo elliptique', 'Rameur', 'Gainage planche', 'Russian twist', 'Crunch (machine ou sol)']
};

// Workout type -> exercise names (interieur only)
const WORKOUT_TEMPLATES_INTERIEUR = {
  upper_int: ['Pompes classiques', 'Pompes diamant (triceps)', 'Tractions (barre de porte)', 'Rowing elastique', 'Curl biceps halteres legers', 'Elevations laterales halteres'],
  lower_int: ['Squats poids du corps', 'Fentes sur place', 'Glute bridge (fessiers sol)', 'Abductions fessiers elastique', 'Mollets poids du corps'],
  full_int: ['Burpees', 'Pompes classiques', 'Squats poids du corps', 'Mountain climber', 'Planche (gainage)', 'Crunchs abdominaux'],
  hiit_int: ['Jumping jacks', 'Burpees', 'Mountain climber', 'Pompes classiques', 'Squats poids du corps'],
  yoga_int: ['Etirements dos chat/vache', 'Pigeon (etirement hanche)', 'Planche (gainage)', 'Planche laterale', 'Releves de jambes']
};

const WORKOUT_TYPE_LABELS = {
  upper: 'Haut du corps',
  lower: 'Bas du corps',
  full: 'Full body',
  cardio: 'Cardio',
  rest: 'Repos',
  upper_int: 'Haut du corps',
  lower_int: 'Bas du corps',
  full_int: 'Full body',
  hiit_int: 'HIIT',
  yoga_int: 'Yoga / Mobilite'
};

const WORKOUT_TYPE_ICONS = {
  upper: '💪',
  lower: '🦵',
  full: '⚡',
  cardio: '🏃',
  rest: '😴',
  upper_int: '💪',
  lower_int: '🦵',
  full_int: '⚡',
  hiit_int: '🔥',
  yoga_int: '🧘'
};

const CATEGORY_LABELS = {
  salle: 'Sport en salle',
  interieur: 'Sport d\'interieur',
  exterieur: 'Sport d\'exterieur'
};

const CATEGORY_ICONS = {
  salle: '🏋️',
  interieur: '🏠',
  exterieur: '🏃'
};

const CATEGORY_COLORS = {
  salle: 'var(--color-primary)',
  interieur: 'var(--color-salle-int)',
  exterieur: 'var(--color-exterieur)'
};

class ExerciseManager {
  constructor() {
    this._allExercises = null;
    this._prefs = null; // { upper: [id,...], lower: [...], ... }
  }

  async init() {
    // Seed DB if empty
    const count = await DB.countExercises();
    if (count === 0) {
      for (const ex of PREDEFINED_EXERCISES_SALLE) {
        await DB.addExercise(ex);
      }
      for (const ex of PREDEFINED_EXERCISES_INTERIEUR) {
        await DB.addExercise(ex);
      }
    } else {
      // Migration: ensure all existing exercises without category get 'salle'
      const all = await DB.getAllExercises();
      for (const ex of all) {
        if (!ex.category) {
          await DB.updateExercise({ ...ex, category: 'salle' });
        }
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
    return filtered.length > 0 ? filtered : all;
  }

  async refresh() {
    this._allExercises = await DB.getAllExercises();
    return this._allExercises;
  }

  getAll() {
    return this._allExercises || [];
  }

  getAllByCategory(category) {
    return (this._allExercises || []).filter(e => (e.category || 'salle') === category);
  }

  getById(id) {
    return (this._allExercises || []).find(e => e.id === id) || null;
  }

  getByName(name) {
    return (this._allExercises || []).find(e => e.name === name) || null;
  }

  getByMuscle(muscle, category) {
    let list = this._allExercises || [];
    if (category) list = list.filter(e => (e.category || 'salle') === category);
    if (muscle === 'all') return list;
    return list.filter(e => e.muscle === muscle);
  }

  search(query, category) {
    const q = query.toLowerCase().trim();
    let list = this._allExercises || [];
    if (category) list = list.filter(e => (e.category || 'salle') === category);
    return list.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (MUSCLE_LABELS[e.muscle] || '').toLowerCase().includes(q)
    );
  }

  getForWorkoutType(type) {
    const templates = type.endsWith('_int') ? WORKOUT_TEMPLATES_INTERIEUR : WORKOUT_TEMPLATES;
    const names = templates[type] || [];
    const exercises = [];
    for (const name of names) {
      const ex = this.getByName(name);
      if (ex) exercises.push(ex);
    }
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
