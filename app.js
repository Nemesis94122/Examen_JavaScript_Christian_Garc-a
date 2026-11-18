const API_URL = 'https://typicode.com';
const STORAGE_KEY = 'app_tareas_data';
const CAT_STORAGE_KEY = 'app_categorias_data';

class TodoApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.tareas = this.cargar(STORAGE_KEY);
    this.categorias = this.cargar(CAT_STORAGE_KEY);
    this.editandoCatId = null;
    this.filtro = 'todas';
    this.busqueda = '';
    this.editandoId = null;
  }

  connectedCallback() {
    try {
      const plantilla = document.getElementById('todo-app-template');
      if (!plantilla) throw new Error("No se encontró la plantilla <template id='todo-app-template'>");
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'style.css';
      this.shadowRoot.append(link, plantilla.content.cloneNode(true));
      this.setup();
    } catch (error) {
      this.shadowRoot.innerHTML = `<div style="padding: 20px; color: red;">Error crítico de interfaz: ${error.message}</div>`;
    }
  }

  cargar(key = STORAGE_KEY) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  }

  guardar() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tareas)); } catch (e) { console.error(e); }
    this.render();
  }

  guardarCategorias() {
    try { localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(this.categorias)); } catch (e) { console.error(e); }
    this.syncCategorias();
    this.render();
  }

  syncCategorias() {
    const s = this.shadowRoot;
    const opts = `<option value="">Sin categoría</option>` + this.categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    ['cat', 'cat-imp'].forEach(id => {
      if (s.getElementById(id)) s.getElementById(id).innerHTML = opts;
    });

    const ul = s.getElementById('cat-lst');
    if (ul) ul.innerHTML = this.categorias.length ? this.categorias.map(c => `
      <li style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #ececec;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="width:12px; height:12px; border-radius:50%; background:${c.color}; display:inline-block;"></span>
          <strong>${c.nombre}</strong>
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" class="edi-cat btn-import" data-id="${c.id}" style="padding:5px 12px; border-radius:6px;">Editar</button>
          <button type="button" class="del-cat btn-import" data-id="${c.id}" style="padding:5px 12px; border-radius:6px; color:#cf6d4d; border-color:#cf6d4d;">Eliminar</button>
        </div>
      </li>`).join('') : `<li style="padding:15px; color:#777; text-align:center;">No hay categorías creadas.</li>`;
  }

  setup() {
    const s = this.shadowRoot;

    this.syncCategorias();
    const resetCatForm = () => {
      this.editandoCatId = null;
      s.getElementById('frm-cat').reset();
      s.getElementById('cat-col').value = '#0d4b36';
      s.getElementById('btn-guardar-cat').textContent = 'Agregar';
    };

    s.getElementById('btn-cat').onclick = () => {
      resetCatForm();
      this.syncCategorias();
      s.getElementById('mdl-c').showModal();
    };

    s.getElementById('frm-cat').onsubmit = (e) => {
      e.preventDefault();
      const nombre = s.getElementById('cat-nom').value.trim();
      const color = s.getElementById('cat-col').value;
      if (!nombre) return;
      this.categorias = this.editandoCatId
        ? this.categorias.map(c => c.id === this.editandoCatId ? { ...c, nombre, color } : c)
        : [...this.categorias, { id: 'c_' + Date.now(), nombre, color }];
      resetCatForm();
      this.guardarCategorias();
    };

    s.getElementById('cat-lst').onclick = (e) => {
      const id = e.target.dataset.id;
      if (!id) return;
      if (e.target.classList.contains('del-cat')) {
        this.categorias = this.categorias.filter(c => c.id !== id);
        this.tareas = this.tareas.map(t => t.categoriaId === id ? { ...t, categoriaId: '' } : t);
        this.guardarCategorias();
        this.guardar();
      } else if (e.target.classList.contains('edi-cat')) {
        const cat = this.categorias.find(c => c.id === id);
        this.editandoCatId = id;
        s.getElementById('cat-nom').value = cat.nombre;
        s.getElementById('cat-col').value = cat.color;
        s.getElementById('btn-guardar-cat').textContent = 'Actualizar';
      }
    };

    s.getElementById('nva').onclick = () => {
      this.editandoId = null;
      s.getElementById('frm').reset();
      this.syncCategorias();
      s.getElementById('fch').value = new Date().toISOString().split('T')[0];
      s.getElementById('mdl-f').showModal();
    };
    s.getElementById('imp').onclick = () => {
      this.syncCategorias();
      this.cargarAPI();
    };
    s.getElementById('mar').onclick = () => {
      this.tareas.forEach(t => t.completado = true);
      this.guardar();
    };
    s.getElementById('vac').onclick = () => {
      if (confirm('¿Vaciar?')) {
        this.tareas = [];
        this.guardar();
      }
    };
    s.getElementById('flt').onchange = (e) => {
      this.filtro = e.target.value;
      this.render();
    };
    s.getElementById('bus').oninput = (e) => {
      this.busqueda = e.target.value.toLowerCase().trim();
      this.render();
    };
    s.getElementById('cnf').onclick = () => this.confirmarImportar();

    s.getElementById('frm').onsubmit = (e) => {
      e.preventDefault();
      const datos = {
        titulo: s.getElementById('ttl').value,
        completado: s.getElementById('cmp').checked,
        fecha: s.getElementById('fch').value,
        categoriaId: s.getElementById('cat').value
      };
      this.tareas = this.editandoId
        ? this.tareas.map(t => t.id === this.editandoId ? { ...t, ...datos } : t)
        : [...this.tareas, { id: 'm_' + Date.now(), ...datos, importada: false }];
      s.getElementById('mdl-f').close();
      this.guardar();
    };

    s.getElementById('lst').onclick = (e) => {
      const id = e.target.dataset.id;
      if (!id) return;
      if (e.target.classList.contains('del')) {
        this.tareas = this.tareas.filter(t => t.id !== id);
        this.guardar();
      }
      if (e.target.classList.contains('edi')) {
        const t = this.tareas.find(x => x.id === id);
        this.editandoId = id;
        this.syncCategorias();
        s.getElementById('ttl').value = t.titulo;
        s.getElementById('cmp').checked = t.completado;
        s.getElementById('fch').value = t.fecha || new Date().toISOString().split('T')[0];
        s.getElementById('cat').value = t.categoriaId || '';
        s.getElementById('mdl-f').showModal();
      }
    };

    s.getElementById('lst').onchange = (e) => {
      if (e.target.classList.contains('chk')) {
        this.tareas = this.tareas.map(t => t.id === e.target.dataset.id ? { ...t, completado: e.target.checked } : t);
        this.guardar();
      }
    };

    this.render();
  }

  async cargarAPI() {
    const s = this.shadowRoot, ul = s.getElementById('api-lst');
    ul.innerHTML = 'Cargando...';
    s.getElementById('mdl-i').showModal();
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error();
      const datos = await res.json();
      ul.innerHTML = datos.map(t => `
        <li style="padding:10px; border-bottom:1px solid #ececec; list-style:none;">
          <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
            <input type="checkbox" class="api-chk" data-ttl="${t.title}" ${t.completed ? 'data-cmp="1"' : ''}> <span>${t.title}</span>
          </label>
        </li>`).join('');
    } catch {
      ul.innerHTML = '<span style="color:red">Error al cargar datos de la API</span>';
    }
  }

  confirmarImportar() {
    const fecha = new Date().toISOString().split('T')[0];
    const categoriaId = this.shadowRoot.getElementById('cat-imp').value;
    this.shadowRoot.querySelectorAll('.api-chk:checked').forEach(c => {
      this.tareas.push({
        id: 'a_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        titulo: c.dataset.ttl,
        completado: !!c.dataset.cmp,
        fecha,
        categoriaId,
        importada: true
      });
    });
    this.shadowRoot.getElementById('mdl-i').close();
    this.guardar();
  }

  render() {
    const ul = this.shadowRoot.getElementById('lst');
    ul.innerHTML = '';
    const plantillaItem = document.getElementById('tarea-item-template');
    if (!plantillaItem) return;

    const filtradas = this.tareas.filter(t =>
      (this.filtro === 'todas' || (this.filtro === 'completadas' && t.completado) || (this.filtro === 'pendientes' && !t.completado)) &&
      t.titulo.toLowerCase().includes(this.busqueda)
    );

    if (!filtradas.length) {
      ul.innerHTML = `<li style="padding:25px; color:#777; text-align:center; list-style:none;">No hay tareas en esta sección.</li>`;
      return;
    }

    filtradas.forEach(t => {
      const clon = plantillaItem.content.cloneNode(true);
      const chk = clon.querySelector('.chk'), tituloDiv = clon.querySelector('.titulo');
      const cat = this.categorias.find(c => c.id === t.categoriaId);
      if (clon.querySelector('.cat-dot')) clon.querySelector('.cat-dot').style.background = cat ? cat.color : '#ccc';
      if (clon.querySelector('.cat-txt')) clon.querySelector('.cat-txt').textContent = cat ? cat.nombre : 'Sin categoría';

      chk.dataset.id = t.id;
      chk.checked = t.completado;
      if (clon.querySelector('.edi')) clon.querySelector('.edi').dataset.id = t.id;
      if (clon.querySelector('.del')) clon.querySelector('.del').dataset.id = t.id;
      if (tituloDiv) tituloDiv.textContent = t.titulo;
      if (clon.querySelector('.fecha-txt') && t.fecha) clon.querySelector('.fecha-txt').textContent = t.fecha.split('-').reverse().join('/');
