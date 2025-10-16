import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  Edit,
  Delete,
  Add,
  ArrowBack,
  Search,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  clearError,
} from '../store/employeeSlice';
import { RootState, AppDispatch } from '../store';

interface EmployeeFormData {
  employee_id: string;
  name: string;
  phone: string;
  email: string;
  department: string;
  position: string;
  salary_rate: number;
}

const EmployeeManagement: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<EmployeeFormData>({
    employee_id: '',
    name: '',
    phone: '',
    email: '',
    department: '',
    position: '',
    salary_rate: 0,
  });

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { employees, isLoading, error } = useSelector((state: RootState) => state.employees);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(fetchEmployees({}));
  }, [dispatch]);

  const handleOpen = (employee?: any) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        employee_id: employee.employee_id,
        name: employee.name,
        phone: employee.phone || '',
        email: employee.email || '',
        department: employee.department || '',
        position: employee.position || '',
        salary_rate: employee.salary_rate,
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        employee_id: '',
        name: '',
        phone: '',
        email: '',
        department: '',
        position: '',
        salary_rate: 0,
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingEmployee(null);
    dispatch(clearError());
  };

  const handleSubmit = async () => {
    try {
      if (editingEmployee) {
        await dispatch(updateEmployee({ id: editingEmployee.id, data: formData })).unwrap();
      } else {
        await dispatch(createEmployee(formData)).unwrap();
      }
      handleClose();
      dispatch(fetchEmployees({}));
    } catch (error) {
      console.error('Failed to save employee:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await dispatch(deleteEmployee(id)).unwrap();
        dispatch(fetchEmployees({}));
      } catch (error) {
        console.error('Failed to delete employee:', error);
      }
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.email && employee.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="back"
            onClick={() => {
              if (user?.role === 'accounting') {
                navigate('/accounting-dashboard');
              } else {
                navigate('/dashboard');
              }
            }}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Employee Management
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5">Employees</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  size="small"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpen()}
                >
                  Add Employee
                </Button>
              </Box>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Position</TableCell>
                    <TableCell>Salary Rate</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>{employee.employee_id}</TableCell>
                      <TableCell>{employee.name}</TableCell>
                      <TableCell>{employee.email || '-'}</TableCell>
                      <TableCell>{employee.department || '-'}</TableCell>
                      <TableCell>{employee.position || '-'}</TableCell>
                      <TableCell>${(employee.salary_rate / 100).toFixed(2)}/hr</TableCell>
                      <TableCell>
                        <Chip
                          label={employee.is_active === 'true' ? 'Active' : 'Inactive'}
                          color={employee.is_active === 'true' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleOpen(employee)}
                        >
                          <Edit />
                        </IconButton>
                        {user?.role === 'admin' && (
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(employee.id)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

      {/* Employee Form Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Employee ID"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                disabled={!!editingEmployee}
              />
              <TextField
                fullWidth
                label="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
              <TextField
                fullWidth
                label="Position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </Box>
            <TextField
              fullWidth
              label="Salary Rate (per hour in cents)"
              type="number"
              value={formData.salary_rate}
              onChange={(e) => setFormData({ ...formData, salary_rate: parseInt(e.target.value) || 0 })}
              helperText="Enter amount in cents (e.g., 5000 for $50.00/hour)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingEmployee ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeManagement;
