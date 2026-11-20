const API_URL = 'https://jsonplaceholder.typicode.com/todos';

const ApiService = {
  async obtenerTareas() {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Error al consultar la API');
    return await res.json();
  }
};
