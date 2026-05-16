/**
 * db.js - IndexedDB wrapper for Easy Sport
 * Stores: exercises, workouts, programs, settings, outdoorSessions
 */

const DB_NAME = 'EasySportDB';
const DB_VERSION = 2;

const STORES = {
  EXERCISES: 'exercises',
  WORKOUTS: 'workouts',
  PROGRAMS: 'programs',
  SETTINGS: 'settings',
  OUTDOOR_SESSIONS: 'outdoorSessions'
};

class EasySportDB {
  constructor() {
    this.db = null;
    this._ready = this._init();
  }

  _init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Exercises store
        if (!db.objectStoreNames.contains(STORES.EXERCISES)) {
          const exStore = db.createObjectStore(STORES.EXERCISES, { keyPath: 'id', autoIncrement: true });
          exStore.createIndex('muscle', 'muscle', { unique: false });
          exStore.createIndex('type', 'type', { unique: false });
          exStore.createIndex('name', 'name', { unique: false });
        }

        // Workouts store (completed sessions)
        if (!db.objectStoreNames.contains(STORES.WORKOUTS)) {
          const wStore = db.createObjectStore(STORES.WORKOUTS, { keyPath: 'id', autoIncrement: true });
          wStore.createIndex('date', 'date', { unique: false });
          wStore.createIndex('type', 'type', { unique: false });
        }

        // Programs store
        if (!db.objectStoreNames.contains(STORES.PROGRAMS)) {
          db.createObjectStore(STORES.PROGRAMS, { keyPath: 'id', autoIncrement: true });
        }

        // Settings store (key-value)
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }

        // Outdoor sessions store (Phase A: manual entry)
        if (!db.objectStoreNames.contains(STORES.OUTDOOR_SESSIONS)) {
          const oStore = db.createObjectStore(STORES.OUTDOOR_SESSIONS, { keyPath: 'id', autoIncrement: true });
          oStore.createIndex('date', 'date', { unique: false });
          oStore.createIndex('activity', 'activity', { unique: false });
        }
      };

      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      req.onerror = (e) => {
        console.error('IndexedDB error:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  async ready() {
    return this._ready;
  }

  // Generic helpers
  _tx(store, mode = 'readonly') {
    return this.db.transaction(store, mode).objectStore(store);
  }

  _promisify(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // ---- EXERCISES ----

  async getAllExercises() {
    await this.ready();
    return this._promisify(this._tx(STORES.EXERCISES).getAll());
  }

  async getExercisesByMuscle(muscle) {
    await this.ready();
    const idx = this._tx(STORES.EXERCISES).index('muscle');
    return this._promisify(idx.getAll(muscle));
  }

  async getExerciseById(id) {
    await this.ready();
    return this._promisify(this._tx(STORES.EXERCISES).get(id));
  }

  async addExercise(exercise) {
    await this.ready();
    const store = this._tx(STORES.EXERCISES, 'readwrite');
    return this._promisify(store.add({ ...exercise, createdAt: Date.now() }));
  }

  async updateExercise(exercise) {
    await this.ready();
    const store = this._tx(STORES.EXERCISES, 'readwrite');
    return this._promisify(store.put(exercise));
  }

  async deleteExercise(id) {
    await this.ready();
    const store = this._tx(STORES.EXERCISES, 'readwrite');
    return this._promisify(store.delete(id));
  }

  async countExercises() {
    await this.ready();
    return this._promisify(this._tx(STORES.EXERCISES).count());
  }

  // ---- WORKOUTS ----

  async addWorkout(workout) {
    await this.ready();
    const store = this._tx(STORES.WORKOUTS, 'readwrite');
    return this._promisify(store.add({ ...workout, savedAt: Date.now() }));
  }

  async getAllWorkouts() {
    await this.ready();
    return this._promisify(this._tx(STORES.WORKOUTS).getAll());
  }

  async getWorkoutById(id) {
    await this.ready();
    return this._promisify(this._tx(STORES.WORKOUTS).get(id));
  }

  async deleteWorkout(id) {
    await this.ready();
    const store = this._tx(STORES.WORKOUTS, 'readwrite');
    return this._promisify(store.delete(id));
  }

  async getWorkoutsByDateRange(startTs, endTs) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const store = this._tx(STORES.WORKOUTS);
      const idx = store.index('date');
      const range = IDBKeyRange.bound(startTs, endTs);
      const req = idx.getAll(range);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // ---- PROGRAMS ----

  async saveProgram(program) {
    await this.ready();
    const store = this._tx(STORES.PROGRAMS, 'readwrite');
    if (program.id) {
      return this._promisify(store.put(program));
    }
    return this._promisify(store.add({ ...program, createdAt: Date.now() }));
  }

  async getActiveProgram() {
    await this.ready();
    const all = await this._promisify(this._tx(STORES.PROGRAMS).getAll());
    return all.find(p => p.active) || all[all.length - 1] || null;
  }

  async getAllPrograms() {
    await this.ready();
    return this._promisify(this._tx(STORES.PROGRAMS).getAll());
  }

  // ---- SETTINGS ----

  async getSetting(key) {
    await this.ready();
    const result = await this._promisify(this._tx(STORES.SETTINGS).get(key));
    return result ? result.value : null;
  }

  async setSetting(key, value) {
    await this.ready();
    const store = this._tx(STORES.SETTINGS, 'readwrite');
    return this._promisify(store.put({ key, value }));
  }

  async getAllSettings() {
    await this.ready();
    const all = await this._promisify(this._tx(STORES.SETTINGS).getAll());
    const map = {};
    all.forEach(s => { map[s.key] = s.value; });
    return map;
  }

  // ---- OUTDOOR SESSIONS ----

  async addOutdoorSession(session) {
    await this.ready();
    const store = this._tx(STORES.OUTDOOR_SESSIONS, 'readwrite');
    return this._promisify(store.add({ ...session, savedAt: Date.now() }));
  }

  async getAllOutdoorSessions() {
    await this.ready();
    return this._promisify(this._tx(STORES.OUTDOOR_SESSIONS).getAll());
  }

  async updateOutdoorSession(session) {
    await this.ready();
    const store = this._tx(STORES.OUTDOOR_SESSIONS, 'readwrite');
    return this._promisify(store.put(session));
  }

  async deleteOutdoorSession(id) {
    await this.ready();
    const store = this._tx(STORES.OUTDOOR_SESSIONS, 'readwrite');
    return this._promisify(store.delete(id));
  }
}

// Singleton
const DB = new EasySportDB();
