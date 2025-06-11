import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    const message = error.response?.data?.error || 'An error occurred';
    toast.error(message);
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getPermissions: () => api.get('/auth/me/permissions'),
  simulateAction: (data) => api.post('/auth/simulate-action', data),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (userData) => api.post('/users', userData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
};

// Groups API
export const groupsAPI = {
  getAll: () => api.get('/groups'),
  getById: (id) => api.get(`/groups/${id}`),
  create: (groupData) => api.post('/groups', groupData),
  update: (id, groupData) => api.put(`/groups/${id}`, groupData),
  delete: (id) => api.delete(`/groups/${id}`),
  assignUsers: (id, userIds) => api.post(`/groups/${id}/users`, { userIds }),
  removeUsers: (id, userIds) => api.delete(`/groups/${id}/users`, { data: { userIds } }),
  assignRoles: (id, roleIds) => api.post(`/groups/${id}/roles`, { roleIds }),
  removeRoles: (id, roleIds) => api.delete(`/groups/${id}/roles`, { data: { roleIds } }),
};

// Roles API
export const rolesAPI = {
  getAll: () => api.get('/roles'),
  getById: (id) => api.get(`/roles/${id}`),
  create: (roleData) => api.post('/roles', roleData),
  update: (id, roleData) => api.put(`/roles/${id}`, roleData),
  delete: (id) => api.delete(`/roles/${id}`),
  assignPermissions: (id, permissionIds) => api.post(`/roles/${id}/permissions`, { permissionIds }),
  removePermissions: (id, permissionIds) => api.delete(`/roles/${id}/permissions`, { data: { permissionIds } }),
};

// Modules API
export const modulesAPI = {
  getAll: () => api.get('/modules'),
  getById: (id) => api.get(`/modules/${id}`),
  create: (moduleData) => api.post('/modules', moduleData),
  update: (id, moduleData) => api.put(`/modules/${id}`, moduleData),
  delete: (id) => api.delete(`/modules/${id}`),
};

// Permissions API
export const permissionsAPI = {
  getAll: () => api.get('/permissions'),
  getById: (id) => api.get(`/permissions/${id}`),
  create: (permissionData) => api.post('/permissions', permissionData),
  update: (id, permissionData) => api.put(`/permissions/${id}`, permissionData),
  delete: (id) => api.delete(`/permissions/${id}`),
  getGrouped: () => api.get('/permissions/by-module/grouped'),
};

export default api; 