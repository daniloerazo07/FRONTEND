import './styles.css';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5050/api/v1';
const state = { page: 1, limit: 10, totalPages: 0, editingId: null };

document.querySelector('#app').innerHTML = `
  <header class="hero">
    <div>
      <p class="eyebrow">CATÁLOGO</p>
      <h1>Productos</h1>
      <p class="muted">Administra el inventario conectado a tu API.</p>
    </div>
    <button class="button primary" id="new-product">Nuevo producto</button>
  </header>
  <main>
    <section class="toolbar card">
      <label>Productos por página
        <select id="limit">
          <option value="10">10</option>
          <option value="20" selected>20</option>
          <option value="50">50</option>
        </select>
      </label>
      <p class="muted" id="summary">Cargando...</p>
    </section>
    <section class="card table-card">
      <div id="status" role="status" aria-live="polite"></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Producto</th><th>Precio</th><th>Stock</th><th>Acciones</th></tr></thead>
          <tbody id="products"></tbody>
        </table>
      </div>
      <nav class="pagination" aria-label="Paginación">
        <button class="button secondary" id="previous">Anterior</button>
        <span id="page"></span>
        <button class="button secondary" id="next">Siguiente</button>
      </nav>
    </section>
  </main>
  <dialog id="product-dialog">
    <form method="dialog" id="product-form" class="form">
      <div class="form-heading">
        <h2 id="form-title">Nuevo producto</h2>
        <button type="button" class="icon-button" id="close-dialog" aria-label="Cerrar">×</button>
      </div>
      <label>Nombre<input name="nombre" maxlength="250" required /></label>
      <label>Descripción<textarea name="descripcion" required></textarea></label>
      <label>URL de imagen<input name="URLImagen" type="url" required /></label>
      <div class="form-grid">
        <label>Precio<input name="pvp" inputmode="decimal" pattern="\\d+(\\.\\d{1,2})?" required /></label>
        <label>Stock<input name="stock" type="number" min="0" step="1" required /></label>
      </div>
      <p class="error" id="form-error"></p>
      <button class="button primary" type="submit">Guardar producto</button>
    </form>
  </dialog>
`;

const elements = {
  products: document.querySelector('#products'),
  status: document.querySelector('#status'),
  summary: document.querySelector('#summary'),
  page: document.querySelector('#page'),
  previous: document.querySelector('#previous'),
  next: document.querySelector('#next'),
  limit: document.querySelector('#limit'),
  dialog: document.querySelector('#product-dialog'),
  form: document.querySelector('#product-form'),
  formTitle: document.querySelector('#form-title'),
  formError: document.querySelector('#form-error'),
};

function showStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.className = isError ? 'error status' : 'status';
}

async function request(path = '', options) {
  const response = await fetch(`${API_URL}/productos${path}`, {
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message ?? 'No se pudo completar la solicitud');
  }
  return body;
}

function renderProducts(products) {
  if (!products.length) {
    elements.products.innerHTML = '<tr><td class="empty" colspan="4">No hay productos.</td></tr>';
    return;
  }
  elements.products.innerHTML = products.map(product => `
    <tr>
      <td><strong>${escapeHtml(product.nombre)}</strong><small>${escapeHtml(product.descripcion)}</small></td>
      <td>$${escapeHtml(product.pvp)}</td>
      <td>${product.stock}</td>
      <td class="actions">
        <button class="button small secondary" data-edit="${product.ID}">Editar</button>
        <button class="button small danger" data-delete="${product.ID}">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

async function loadProducts() {
  showStatus('Cargando productos...');
  try {
    const result = await request(`?page=${state.page}&limit=${state.limit}`);
    state.totalPages = result.pagination.totalPages;
    renderProducts(result.data);
    elements.summary.textContent = `${result.pagination.total} productos`;
    elements.page.textContent = `Página ${state.page} de ${state.totalPages || 1}`;
    elements.previous.disabled = state.page <= 1;
    elements.next.disabled = state.page >= state.totalPages;
    showStatus('');
  } catch (error) {
    showStatus(error.message, true);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
}

function openForm(product = null) {
  state.editingId = product?.ID ?? null;
  elements.form.reset();
  elements.formTitle.textContent = product ? 'Editar producto' : 'Nuevo producto';
  elements.formError.textContent = '';
  if (product) {
    for (const [name, value] of Object.entries(product)) {
      if (elements.form.elements[name]) elements.form.elements[name].value = value;
    }
  }
  elements.dialog.showModal();
}

document.querySelector('#new-product').addEventListener('click', () => openForm());
document.querySelector('#close-dialog').addEventListener('click', () => elements.dialog.close());
elements.limit.addEventListener('change', () => {
  state.limit = Number(elements.limit.value);
  state.page = 1;
  loadProducts();
});
elements.previous.addEventListener('click', () => {
  if (state.page > 1) { state.page -= 1; loadProducts(); }
});
elements.next.addEventListener('click', () => {
  if (state.page < state.totalPages) { state.page += 1; loadProducts(); }
});
elements.products.addEventListener('click', async event => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  try {
    if (editId) {
      const { data } = await request(`/${editId}`);
      openForm(data);
    }
    if (deleteId && window.confirm('¿Eliminar este producto?')) {
      await request(`/${deleteId}`, { method: 'DELETE' });
      await loadProducts();
    }
  } catch (error) {
    showStatus(error.message, true);
  }
});
elements.form.addEventListener('submit', async event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(elements.form));
  data.stock = Number(data.stock);
  try {
    const method = state.editingId ? 'PUT' : 'POST';
    const path = state.editingId ? `/${state.editingId}` : '';
    await request(path, { method, body: JSON.stringify(data) });
    elements.dialog.close();
    await loadProducts();
  } catch (error) {
    elements.formError.textContent = error.message;
  }
});

loadProducts();
