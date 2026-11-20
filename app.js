class TodoApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.tareas = StorageService.leer(KEYS.tareas);
    this.categorias = StorageService.leer(KEYS.cats);
    this.editId = null;
    this.editCatId = null;
    this.filtro = 'todas';
    this.busqueda = '';
  }

  $(id) { return this.shadowRoot.getElementById(id); }

  guardar(renderizar = true) {
    StorageService.guardar(KEYS.tareas, this.tareas);
    if (renderizar) this.render();
  }

  guardarCats() {
    StorageService.guardar(KEYS.cats, this.categorias);
    CategoriasController.sync(this);
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

  setup() {
    const on = (id, ev, fn) => this.$(id)?.addEventListener(ev, fn);

    CategoriasController.sync(this);
    CategoriasController.initEventos(this, on);

    on('nva', 'click', () => {
      this.editId = null;
      this.$('frm')?.reset();
      CategoriasController.sync(this);
      if (this.$('fch')) this.$('fch').value = StorageService.hoy();
      this.$('mdl-f')?.showModal();
    });

    on('imp', 'click', () => {
      CategoriasController.sync(this);
      this.cargarAPI();
    });

    on('mar', 'click', () => { this.tareas.forEach(t => t.completado = true); this.guardar(); });
    on('vac', 'click', () => { if (confirm('¿Vaciar lista?')) { this.tareas = []; this.guardar(); } });
    on('flt', 'change', e => { this.filtro = e.target.value; this.render(); });
    on('bus', 'input', e => { this.busqueda = e.target.value.toLowerCase().trim(); this.render(); });
    on('cnf', 'click', () => this.confirmarImportar());

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
        CategoriasController.sync(this);
        this.$('ttl').value = t.titulo;
        this.$('cmp').checked = t.completado;
        this.$('fch').value = t.fecha || StorageService.hoy();
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
      const datos = await ApiService.obtenerTareas();
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
    const fecha = StorageService.hoy();
    const categoriaId = this.$('cat-imp')?.value || '';
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
