import axios from 'axios';

const API_BASE_URL = 'https://attendance-eo6b.onrender.com/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
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
  login: async (username: string, password: string) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await api.post('/auth/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  register: async (userData: any) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
};

// Employee API
export const employeeAPI = {
  getEmployees: async (params?: any) => {
    const response = await api.get('/employees/', { params });
    return response.data;
  },
  
  getEmployee: async (id: number) => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  },
  
  createEmployee: async (employeeData: any) => {
    const response = await api.post('/employees/', employeeData);
    return response.data;
  },
  
  updateEmployee: async (id: number, employeeData: any) => {
    const response = await api.put(`/employees/${id}`, employeeData);
    return response.data;
  },
  
  deleteEmployee: async (id: number) => {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
  },
  
  searchEmployee: async (searchTerm: string) => {
    const response = await api.get(`/employees/search/${searchTerm}`);
    return response.data;
  },
};

export default api;
