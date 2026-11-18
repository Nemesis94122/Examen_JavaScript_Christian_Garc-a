const API_URL = 'https://typicode.com';
const KEYS = { tareas: 'app_tareas_data', cats: 'app_categorias_data' };

class TodoApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.tareas = this.leer(KEYS.tareas);
    this.categorias = this.leer(KEYS.cats);
    this.editId = null;
    this.editCatId = null;
    this.filtro = 'todas';
    this.busqueda = '';
  }

  $(id) { return this.shadowRoot.getElementById(id); }
  hoy() { return new Date().toISOString().split('T')[0]; }
  leer(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } }

  guardar(renderizar = true) {
    localStorage.setItem(KEYS.tareas, JSON.stringify(this.tareas));
    if (renderizar) this.render();
  }

  guardarCats() {
    localStorage.setItem(KEYS.cats, JSON.stringify(this.categorias));
    this.syncCats();
    this.render();
  }

  connectedCallback() {
    const tpl = document.getElementById('todo-app-template');
    if (!tpl) {
      this.shadowRoot.innerHTML = `<div style="padding:20px;color:red">Falta &lt;template id="todo-app-template"&gt;</div>`;
      return;
    }
    const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'style.css' });
    this.shadowRoot.append(link, tpl.content.cloneNode(true));
    this.setup();
  }

  syncCats() {
    const opts = `<option value="">Sin categoría</option>` + 
      this.categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    ['cat', 'cat-imp'].forEach(id => this.$(id) && (this.$(id).innerHTML = opts));

    const ul = this.$('cat-lst');
    if (!ul) return;
    ul.innerHTML = this.categorias.length ? this.categorias.map(c => `
      <li style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid #ececec;list-style:none;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="width:12px;height:12px;border-radius:50%;background:${c.color};display:inline-block;"></span>
          <strong>${c.nombre}</strong>
        </div>
        <div style="display:flex;gap:8px;">
          <button type="button" class="edi-cat btn-import" data-id="${c.id}" style="padding:5px 12px;border-radius:6px;">Editar</button>
          <button type="button" class="del-cat btn-import" data-id="${c.id}" style="padding:5px 12px;border-radius:6px;color:#cf6d4d;border-color:#cf6d4d;">Eliminar</button>
        </div>
      </li>`).join('') : `<li style="padding:15px;color:#777;text-align:center;list-style:none;">No hay categorías creadas.</li>`;
  }

  setup() {
    this.syncCats();

    const resetCat = () => {
      this.editCatId = null;
      this.$('frm-cat')?.reset();
      if (this.$('cat-col')) this.$('cat-col').value = '#0d4b36';
      if (this.$('btn-guardar-cat')) this.$('btn-guardar-cat').textContent = 'Agregar';
    };

    const on = (id, ev, fn) => this.$(id)?.addEventListener(ev, fn);

    on('btn-cat', 'click', () => { resetCat(); this.syncCats(); this.$('mdl-c')?.showModal(); });
    on('nva', 'click', () => {
      this.editId = null;
      this.$('frm')?.reset();
      this.syncCats();
      if (this.$('fch')) this.$('fch').value = this.hoy();
      this.$('mdl-f')?.showModal();
    });
    on('imp', 'click', () => { this.syncCats(); this.cargarAPI(); });
    on('mar', 'click', () => { this.tareas.forEach(t => t.completado = true); this.guardar(); });
    on('vac', 'click', () => { if (confirm('¿Vaciar lista?')) { this.tareas = []; this.guardar(); } });
    on('flt', 'change', e => { this.filtro = e.target.value; this.render(); });
    on('bus', 'input', e => { this.busqueda = e.target.value.toLowerCase().trim(); this.render(); });
    on('cnf', 'click', () => this.confirmarImportar());

    on('frm-cat', 'submit', e => {
      e.preventDefault();
      const nombre = this.$('cat-nom').value.trim(), color = this.$('cat-col').value;
      if (!nombre) return;
      this.categorias = this.editCatId
        ? this.categorias.map(c => c.id === this.editCatId ? { ...c, nombre, color } : c)
        : [...this.categorias, { id: 'c_' + Date.now(), nombre, color }];
      resetCat();
      this.guardarCats();
    });

    on('cat-lst', 'click', e => {
      const id = e.target.dataset.id;
      if (!id) return;
      if (e.target.classList.contains('del-cat')) {
        this.categorias = this.categorias.filter(c => c.id !== id);
        this.tareas = this.tareas.map(t => t.categoriaId === id ? { ...t, categoriaId: '' } : t);
        this.guardarCats();
        this.guardar();
      } else if (e.target.classList.contains('edi-cat')) {
        const cat = this.categorias.find(c => c.id === id);
        if (!cat) return;
        this.editCatId = id;
        this.$('cat-nom').value = cat.nombre;
        this.$('cat-col').value = cat.color;
        this.$('btn-guardar-cat').textContent = 'Actualizar';
      }
    });

    on('frm', 'submit', e => {
      e.preventDefault();
      const datos = {
        titulo: this.$('ttl').value.trim(),
        completado: this.$('cmp').checked,
        fecha: this.$('fch').value,
        categoriaId: this.$('cat').value
      };
      if (!datos.titulo) return;
      this.tareas = this.editId
        ? this.tareas.map(t => t.id === this.editId ? { ...t, ...datos } : t)
        : [...this.tareas, { id: 'm_' + Date.now(), ...datos, importada: false }];
      this.$('mdl-f')?.close();
      this.guardar();
    });

    on('lst', 'click', e => {
      const id = e.target.dataset.id;
      if (!id) return;
      if (e.target.classList.contains('del')) {
        this.tareas = this.tareas.filter(t => t.id !== id);
        this.guardar();
      } else if (e.target.classList.contains('edi')) {
        const t = this.tareas.find(x => x.id === id);
        if (!t) return;
        this.editId = id;
        this.syncCats();
        this.$('ttl').value = t.titulo;
        this.$('cmp').checked = t.completado;
        this.$('fch').value = t.fecha || this.hoy();
        this.$('cat').value = t.categoriaId || '';
        this.$('mdl-f')?.showModal();
      }
    });

    on('lst', 'change', e => {
      if (e.target.classList.contains('chk')) {
        this.tareas = this.tareas.map(t => t.id === e.target.dataset.id ? { ...t, completado: e.target.checked } : t);
        this.guardar();
      }
    });

    this.render();
  }

  async cargarAPI() {
    const ul = this.$('api-lst');
    if (!ul) return;
    ul.innerHTML = '<li style="padding:10px;list-style:none;">Cargando...</li>';
    this.$('mdl-i')?.showModal();
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error();
      const datos = await res.json();
      ul.innerHTML = datos.map(t => `
        <li style="padding:10px;border-bottom:1px solid #ececec;list-style:none;">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
            <input type="checkbox" class="api-chk" data-ttl="${t.title}" ${t.completed ? 'data-cmp="1"' : ''}>
            <span>${t.title}</span>
          </label>
        </li>`).join('');
    } catch {
      ul.innerHTML = '<li style="padding:10px;color:red;list-style:none;">Error al cargar datos de la API</li>';
    }
  }

  confirmarImportar() {
    const fecha = this.hoy(), categoriaId = this.$('cat-imp')?.value || '';
    this.shadowRoot.querySelectorAll('.api-chk:checked').forEach(c => {
      this.tareas.push({
        id: 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        titulo: c.dataset.ttl,
        completado: !!c.dataset.cmp,
        fecha,
        categoriaId,
        importada: true
      });
    });
    this.$('mdl-i')?.close();
    this.guardar();
  }

  render() {
    const ul = this.$('lst'), tpl = document.getElementById('tarea-item-template');
    if (!ul || !tpl) return;

    const filtradas = this.tareas.filter(t =>
      (this.filtro === 'todas' || (this.filtro === 'completadas' && t.completado) || (this.filtro === 'pendientes' && !t.completado)) &&
      t.titulo.toLowerCase().includes(this.busqueda)
    );

    ul.innerHTML = filtradas.length ? '' : `<li style="padding:25px;color:#777;text-align:center;list-style:none;">No hay tareas en esta sección.</li>`;

    filtradas.forEach(t => {
      const clon = tpl.content.cloneNode(true);
      const cat = this.categorias.find(c => c.id === t.categoriaId);
      const set = (sel, fn) => { const el = clon.querySelector(sel); if (el) fn(el); };

      if (t.completado) clon.firstElementChild?.classList.add('completada');
      set('.cat-dot', el => el.style.background = cat ? cat.color : '#ccc');
      set('.cat-txt', el => el.textContent = cat ? cat.nombre : 'Sin categoría');
      set('.chk', el => { el.dataset.id = t.id; el.checked = t.completado; });
      set('.edi', el => el.dataset.id = t.id);
      set('.del', el => el.dataset.id = t.id);
      set('.titulo', el => el.textContent = t.titulo);
      set('.fecha-txt', el => { if (t.fecha) el.textContent = t.fecha.split('-').reverse().join('/'); });

      ul.appendChild(clon);
    });
  }
}

customElements.define('todo-app', TodoApp);
