import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('uitp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('uitp_token');
      localStorage.removeItem('uitp_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
  register: (data: any) => api.post('/auth/register', data),
};

// Dashboard
export const dashboardApi = {
  getStats: () => api.get('/dashboard'),
};

// Clusters
export const clustersApi = {
  list: () => api.get('/clusters'),
  get: (id: string) => api.get(`/clusters/${id}`),
  create: (data: any) => api.post('/clusters', data),
  update: (id: string, data: any) => api.put(`/clusters/${id}`, data),
  delete: (id: string) => api.delete(`/clusters/${id}`),
};

// Nodes
export const nodesApi = {
  list: (clusterId?: string) => api.get('/nodes', { params: { cluster_id: clusterId } }),
  get: (id: string) => api.get(`/nodes/${id}`),
  create: (data: any) => api.post('/nodes', data),
  update: (id: string, data: any) => api.put(`/nodes/${id}`, data),
  delete: (id: string) => api.delete(`/nodes/${id}`),
  testConnection: (id: string) => api.post(`/nodes/${id}/test-connection`),
  sync: (id: string) => api.post(`/nodes/${id}/sync`),
};

// Images
export const imagesApi = {
  list: (search?: string, clusterId?: string) =>
    api.get('/images', { params: { search, cluster_id: clusterId } }),
  getInventory: () => api.get('/images/inventory'),
  getLocations: (id: string) => api.get(`/images/${id}/locations`),
};

// Transfers
export const transfersApi = {
  list: (params?: { limit?: number; offset?: number; status?: string }) =>
    api.get('/transfers', { params }),
  get: (id: string) => api.get(`/transfers/${id}`),
  initiate: (data: { image_id: string; source_node_id: string; destination_node_ids: string[] }) =>
    api.post('/transfers', data),
  cancel: (id: string) => api.post(`/transfers/${id}/cancel`),
};
