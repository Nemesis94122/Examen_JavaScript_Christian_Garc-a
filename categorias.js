const CategoriasController = {
  sync(app) {
    const opts = `<option value="">Sin categoría</option>` +
      app.categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    ['cat', 'cat-imp'].forEach(id => app.$(id) && (app.$(id).innerHTML = opts));

    const ul = app.$('cat-lst');
    if (!ul) return;
    ul.innerHTML = app.categorias.length ? app.categorias.map(c => `
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
  },

  initEventos(app, on) {
    const resetCat = () => {
      app.editCatId = null;
      app.$('frm-cat')?.reset();
      if (app.$('cat-col')) app.$('cat-col').value = '#0d4b36';
      if (app.$('btn-guardar-cat')) app.$('btn-guardar-cat').textContent = 'Agregar';
    };

    on('btn-cat', 'click', () => {
      resetCat();
      this.sync(app);
      app.$('mdl-c')?.showModal();
    });

    on('frm-cat', 'submit', e => {
      e.preventDefault();
      const nombre = app.$('cat-nom').value.trim();
      const color = app.$('cat-col').value;
      if (!nombre) return;
      app.categorias = app.editCatId
        ? app.categorias.map(c => c.id === app.editCatId ? { ...c, nombre, color } : c)
        : [...app.categorias, { id: 'c_' + Date.now(), nombre, color }];
      resetCat();
      app.guardarCats();
    });

    on('cat-lst', 'click', e => {
      const id = e.target.dataset.id;
      if (!id) return;
      if (e.target.classList.contains('del-cat')) {
        app.categorias = app.categorias.filter(c => c.id !== id);
        app.tareas = app.tareas.map(t => t.categoriaId === id ? { ...t, categoriaId: '' } : t);
        app.guardarCats();
        app.guardar();
      } else if (e.target.classList.contains('edi-cat')) {
        const cat = app.categorias.find(c => c.id === id);
        if (!cat) return;
        app.editCatId = id;
        app.$('cat-nom').value = cat.nombre;
        app.$('cat-col').value = cat.color;
        app.$('btn-guardar-cat').textContent = 'Actualizar';
      }
    });
  }
};
