import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { employeeAPI } from '../services/api';

interface Employee {
  id: number;
  employee_id: string;
  name: string;
  phone?: string;
  email?: string;
  department?: string;
  position?: string;
  salary_rate: number;
  is_active: string;
  created_at: string;
}

interface EmployeeState {
  employees: Employee[];
  currentEmployee: Employee | null;
  total: number;
  page: number;
  per_page: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: EmployeeState = {
  employees: [],
  currentEmployee: null,
  total: 0,
  page: 1,
  per_page: 10,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchEmployees = createAsyncThunk(
  'employees/fetchEmployees',
  async (params?: any) => {
    const response = await employeeAPI.getEmployees(params);
    return response;
  }
);

export const fetchEmployee = createAsyncThunk(
  'employees/fetchEmployee',
  async (id: number) => {
    const response = await employeeAPI.getEmployee(id);
    return response;
  }
);

export const createEmployee = createAsyncThunk(
  'employees/createEmployee',
  async (employeeData: any) => {
    const response = await employeeAPI.createEmployee(employeeData);
    return response;
  }
);

export const updateEmployee = createAsyncThunk(
  'employees/updateEmployee',
  async ({ id, data }: { id: number; data: any }) => {
    const response = await employeeAPI.updateEmployee(id, data);
    return response;
  }
);

export const deleteEmployee = createAsyncThunk(
  'employees/deleteEmployee',
  async (id: number) => {
    await employeeAPI.deleteEmployee(id);
    return id;
  }
);

export const searchEmployees = createAsyncThunk(
  'employees/searchEmployees',
  async (searchTerm: string) => {
    const response = await employeeAPI.searchEmployee(searchTerm);
    return response;
  }
);

const employeeSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentEmployee: (state) => {
      state.currentEmployee = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch employees
      .addCase(fetchEmployees.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.isLoading = false;
        state.employees = action.payload.employees;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.per_page = action.payload.per_page;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch employees';
      })
      // Fetch single employee
      .addCase(fetchEmployee.fulfilled, (state, action) => {
        state.currentEmployee = action.payload;
      })
      // Create employee
      .addCase(createEmployee.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createEmployee.fulfilled, (state, action) => {
        state.isLoading = false;
        state.employees.push(action.payload);
        state.total += 1;
      })
      .addCase(createEmployee.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create employee';
      })
      // Update employee
      .addCase(updateEmployee.fulfilled, (state, action) => {
        const index = state.employees.findIndex(emp => emp.id === action.payload.id);
        if (index !== -1) {
          state.employees[index] = action.payload;
        }
        state.currentEmployee = action.payload;
      })
      // Delete employee
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.employees = state.employees.filter(emp => emp.id !== action.payload);
        state.total -= 1;
      });
  },
});

export const { clearError, clearCurrentEmployee } = employeeSlice.actions;
export default employeeSlice.reducer;
