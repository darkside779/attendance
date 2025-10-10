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
  
  getAttendanceRecords: async (params?: any) => {
    const response = await api.get('/attendance/records', { params });
    return response.data;
  },
  
  getTodayAttendance: async () => {
    const response = await api.get('/attendance/today');
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
  
  recognizeFace: async (formData: FormData) => {
    const response = await api.post('/face/recognize-face', formData, {
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
  
  getEmployeesWithFaces: async () => {
    const response = await api.get('/face/employees-with-faces');
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
