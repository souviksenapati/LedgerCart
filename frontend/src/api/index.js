import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');

      const isStorePage = !window.location.pathname.startsWith('/admin');
      const loginPath = isStorePage ? '/login' : '/admin/login';

      if (!window.location.pathname.includes('/login')) {
        window.location.href = loginPath;
      }
    }
    return Promise.reject(err);
  }
);

// ─── Auth ───────────────────
export const authAPI = {
  register: data => api.post('/auth/register', data),
  login: data => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateMe: data => api.put('/auth/me', data),
  changePassword: data => api.post('/auth/change-password', data),
};

// ─── Products ───────────────
export const productsAPI = {
  list: params => api.get('/products', { params }),
  get: slug => api.get(`/products/${slug}`),
  create: data => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: id => api.delete(`/products/${id}`),
  addImage: (productId, imageUrl, isPrimary = false) =>
    api.post(`/products/${productId}/images`, null, { params: { image_url: imageUrl, is_primary: isPrimary } }),
  removeImage: (productId, imageId) => api.delete(`/products/${productId}/images/${imageId}`),
};

// ─── Categories ─────────────
export const categoriesAPI = {
  list: () => api.get('/categories'),
  listAll: () => api.get('/categories/all'),
  create: data => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: id => api.delete(`/categories/${id}`),
};

// ─── Cart ───────────────────
export const cartAPI = {
  get: () => api.get('/cart'),
  addItem: data => api.post('/cart/items', data),
  updateItem: (id, quantity) => api.put(`/cart/items/${id}?quantity=${quantity}`),
  removeItem: id => api.delete(`/cart/items/${id}`),
  clear: () => api.delete('/cart'),
};

// ─── Orders ─────────────────
export const ordersAPI = {
  create: data => api.post('/orders', data),
  myOrders: params => api.get('/orders', { params }),
  get: id => api.get(`/orders/${id}`),
  allOrders: params => api.get('/orders/all', { params }),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  cancel: id => api.post(`/orders/${id}/cancel`),
  // ── Payment gateway endpoints (mock now, replace internals with Razorpay) ──
  initiatePayment: id => api.post(`/orders/${id}/payment/initiate`),
  verifyPayment:  (id, data) => api.post(`/orders/${id}/payment/verify`, data),
};

// ─── Coupons ────────────────
export const couponsAPI = {
  list: () => api.get('/coupons'),
  create: data => api.post('/coupons', data),
  update: (id, data) => api.put(`/coupons/${id}`, data),
  delete: id => api.delete(`/coupons/${id}`),
  validate: data => api.post('/coupons/validate', data),
};

// ─── Reviews ────────────────
export const reviewsAPI = {
  getForProduct: productId => api.get(`/reviews/product/${productId}`),
  add: (productId, data) => api.post(`/reviews/product/${productId}`, data),
  pending: () => api.get('/reviews/pending'),
  approve: id => api.put(`/reviews/${id}/approve`),
  delete: id => api.delete(`/reviews/${id}`),
};

// ─── Wishlist ───────────────
export const wishlistAPI = {
  list: () => api.get('/wishlist'),
  add: productId => api.post(`/wishlist/${productId}`),
  remove: productId => api.delete(`/wishlist/${productId}`),
};

// ─── Addresses ──────────────
export const addressesAPI = {
  list: () => api.get('/addresses'),
  create: data => api.post('/addresses', data),
  update: (id, data) => api.put(`/addresses/${id}`, data),
  delete: id => api.delete(`/addresses/${id}`),
};

// ─── Banners ────────────────
export const bannersAPI = {
  list: () => api.get('/banners'),
  listAll: () => api.get('/banners/all'),
  create: data => api.post('/banners', data),
  update: (id, data) => api.put(`/banners/${id}`, data),
  delete: id => api.delete(`/banners/${id}`),
};

// ─── Admin ──────────────────
export const adminAPI = {
  dashboard: () => api.get('/admin/dashboard'),
  customers: params => api.get('/admin/customers', { params }),
  toggleCustomer: id => api.put(`/admin/customers/${id}/toggle-active`),
  staff: () => api.get('/admin/staff'),
  createStaff: data => api.post('/admin/staff', data),
  updateStaff: (id, data) => api.put(`/admin/staff/${id}`, data),
  updateStaffPermissions: (id, permissions) => api.put(`/admin/staff/${id}/permissions`, permissions),
  removeStaff: id => api.delete(`/admin/staff/${id}`),
  permissionTemplates: () => api.get('/admin/permissions/templates'),
  lowStock: () => api.get('/admin/inventory/low-stock'),
  updateInventory: (id, data) => api.put(`/admin/inventory/${id}`, data),
  inventoryLogs: id => api.get(`/admin/inventory/${id}/logs`),
  inventoryTransactions: params => api.get('/admin/inventory/transactions/all', { params }),
  createInventoryTransaction: data => api.post('/admin/inventory/transactions', data),
  settings: () => api.get('/admin/settings'),
  updateSetting: data => api.put('/admin/settings', data),
  salesReport: params => api.get('/admin/reports/sales', { params }),
};

// ─── Public ─────────────────
export const publicAPI = {
  settings: () => api.get('/admin/public/settings'),
};

// ─── Upload ─────────────────
export const uploadAPI = {
  upload: file => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export default api;
