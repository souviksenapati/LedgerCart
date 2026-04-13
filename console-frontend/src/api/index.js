import axios from 'axios'

const api = axios.create({
  baseURL: '/api/console',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('console_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('console_token')
      sessionStorage.removeItem('console_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  me: () => api.get('/auth/me'),
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
export const dashboardAPI = {
  get: () => api.get('/dashboard'),
}

// ─── Plans ─────────────────────────────────────────────────────────────────
export const plansAPI = {
  list: () => api.get('/plans'),
  create: (data) => api.post('/plans', data),
  update: (id, data) => api.put(`/plans/${id}`, data),
  delete: (id) => api.delete(`/plans/${id}`),
  featureKeys: () => api.get('/feature-keys'),
}

// ─── Tenants ───────────────────────────────────────────────────────────────
export const tenantsAPI = {
  list: (params) => api.get('/tenants', { params }),
  update: (id, data) => api.put(`/tenants/${id}`, data),
}
