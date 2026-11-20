const KEYS = { tareas: 'app_tareas_data', cats: 'app_categorias_data' };

const StorageService = {
  hoy() {
    return new Date().toISOString().split('T')[0];
  },
  leer(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  },
  guardar(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }
};
