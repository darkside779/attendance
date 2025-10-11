import { deleteEmployee, updateEmployee } from '../store/employeeSlice';
import api from './api';

// Attendance API
export const attendanceAPI = {
  checkIn: async (formData: FormData) => {
    const response = await api.post('/attendance/check-in', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  checkOut: async (formData: FormData) => {
    const response = await api.post('/attendance/check-out', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  getTodayAttendance: async (date?: string) => {
    const response = await api.get(`/attendance/today${date ? `?date=${date}` : ''}`);
    return response.data;
  },
  
  getAttendanceHistory: async (params?: any) => {
    const response = await api.get('/attendance/history', { params });
    return response.data;
  },
};

// Face Recognition API
export const faceAPI = {
  uploadFace: async (employeeId: number, formData: FormData) => {
    const response = await api.post(`/face/upload-face/${employeeId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  validateImage: async (formData: FormData) => {
    const response = await api.post('/face/validate-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  detectFacesRealtime: async (formData: FormData) => {
    const response = await api.post('/face/detect-realtime', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Reports API
export const reportsAPI = {
  downloadPDF: async (params?: any) => {
    const response = await api.get('/reports/pdf', { params, responseType: 'blob' });
    return response.data;
  },
  
  downloadExcel: async (params?: any) => {
    const response = await api.get('/reports/excel', { params, responseType: 'blob' });
    return response.data;
  },
  
  getEmployeeSummary: async (employeeId: number, params?: any) => {
    const response = await api.get(`/reports/employee-summary/${employeeId}`, { params });
    return response.data;
  },
  
  modifyAttendance: async (data: any) => {
    const response = await api.post('/reports/modify-attendance', data);
    return response.data;
  },
  
  getModificationHistory: async (attendanceId: number) => {
    const response = await api.get(`/reports/modification-history/${attendanceId}`);
    return response.data;
  },
};

// Employee API
export const employeeAPI = {
  getEmployees: async (params?: any) => {
    const response = await api.get('/employees/', { params });
    return response.data;
  },
  
  createEmployee: async (data: any) => {
    const response = await api.post('/employees/', data);
    return response.data;
  },
  
  updateEmployee: async (id: number, data: any) => {
    const response = await api.put(`/employees/${id}`, data);
    return response.data;
  },
  
  deleteEmployee: async (id: number) => {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
  },
};
