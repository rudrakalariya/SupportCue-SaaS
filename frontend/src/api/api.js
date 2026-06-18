import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
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

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/profile'),
  logout: () => api.post('/auth/logout'),
};

// Chat API
export const chatAPI = {
  createChat: (chatData) => api.post('/chat/create', chatData),
  getChat: (chatId) => api.get(`/chat/${chatId}`),
  getUserChats: (userId) => api.get(`/chat/user/${userId}`),
  takeOverChat: (chatId, agentId) => api.post('/chat/takeover', { chatId, agentId }),
  getActiveChats: () => api.get('/chat/active'),
  closeChat: (chatId) => api.put(`/chat/${chatId}/close`),
};

// Company API (superuser only)
export const companyAPI = {
  create: (data) => api.post('/company', data),
  list: () => api.get('/company'),
  get: (id) => api.get(`/company/${id}`),
  update: (id, data) => api.put(`/company/${id}`, data),
  remove: (id) => api.delete(`/company/${id}`),
  assignUser: (userId, companyId) => api.post('/company/assign-user', { userId, companyId }),
};

// Knowledge Base API (superuser only)
export const kbAPI = {
  upload: (companyId, file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('companyId', companyId);
    return api.post('/kb/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
  },
  listDocuments: (companyId) => api.get(`/kb/documents/${companyId}`),
  getDocument: (docId) => api.get(`/kb/document/${docId}`),
  deleteDocument: (docId) => api.delete(`/kb/document/${docId}`),
  search: (companyId, query) => api.get(`/kb/search?companyId=${companyId}&q=${encodeURIComponent(query)}`),
};

export default api;

