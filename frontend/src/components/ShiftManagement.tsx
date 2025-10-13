import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Autocomplete,
  FormControlLabel,
  Checkbox,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import api from '../services/api';

interface Employee {
  id: number;
  name: string;
  employee_id: string;
  department?: string;
  position?: string;
}

interface Shift {
  id: number;
  employee_id?: number;
  employee_name?: string;
  employee_employee_id?: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  days_of_week: string[];
  description?: string;
  is_active: string;
}

interface ShiftForm {
  employee_id: number | null;
  shift_name: string;
  start_time: string;
  end_time: string;
  days_of_week: string[];
  description: string;
}

const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

const ShiftManagement: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shiftTemplates, setShiftTemplates] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);

  // Form states
  const [shiftForm, setShiftForm] = useState<ShiftForm>({
    employee_id: null,
    shift_name: '',
    start_time: '09:00',
    end_time: '17:00',
    days_of_week: [],
    description: ''
  });

  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Shift | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  useEffect(() => {
    loadShifts();
    loadEmployees();
    loadShiftTemplates();
  }, []);

  const loadShifts = async () => {
    try {
      setLoading(true);
      
      // Load all shifts (both assigned and templates) from single endpoint
      const response = await api.get('/shifts');
      setShifts(response.data || []);
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to load shifts';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      console.log('🔄 Loading employees...');
      const response = await api.get('/employees/');
      console.log('📋 Employees response:', response.data);
      
      // Handle EmployeeList response format: {employees: [...], total: 4, page: 1, per_page: 100}
      let employeeData = [];
      if (response.data && response.data.employees && Array.isArray(response.data.employees)) {
        employeeData = response.data.employees;
      } else if (Array.isArray(response.data)) {
        employeeData = response.data;
      }
      
      console.log('👥 Employee data processed:', employeeData);
      console.log('👥 Employee count:', employeeData.length);
      setEmployees(employeeData);
      
      if (employeeData.length === 0) {
        console.warn('⚠️ No employees found in response');
        setError('No employees found. Please add employees first.');
      } else {
        console.log('✅ Employees loaded successfully');
        // Clear any previous error
        setError('');
      }
    } catch (err: any) {
      console.error('❌ Error loading employees:', err);
      console.error('Status:', err.response?.status);
      console.error('Response:', err.response?.data);
      const errorMessage = err.response?.data?.detail || 'Failed to load employees';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
      // Set empty array on error
      setEmployees([]);
    }
  };

  const loadShiftTemplates = async () => {
    try {
      const response = await api.get('/shifts/templates/predefined');
      setShiftTemplates(response.data);
    } catch (err: any) {
      // Templates might not exist yet, that's okay
      console.log('No shift templates found');
    }
  };

  const createPredefinedTemplates = async () => {
    try {
      setLoading(true);
      await api.post('/shifts/templates/create');
      await loadShiftTemplates();
      await loadShifts(); // Refresh main table to show new templates
      setSuccess('Predefined shift templates created successfully!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to create templates';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = async () => {
    try {
      // Validate required fields
      if (!shiftForm.shift_name || shiftForm.days_of_week.length === 0) {
        setError('Please fill in shift name and select days');
        return;
      }
      
      // For assigned shifts, employee is required
      if (!isCreatingTemplate && !shiftForm.employee_id) {
        setError('Please select an employee for assigned shifts');
        return;
      }

      setLoading(true);
      
      // Prepare form data - set employee_id to null for templates
      const formData = {
        ...shiftForm,
        employee_id: isCreatingTemplate ? null : shiftForm.employee_id
      };
      
      await api.post('/shifts', formData);
      await loadShifts();
      await loadShiftTemplates(); // Refresh templates if we created a template
      setCreateDialogOpen(false);
      resetForm();
      setIsCreatingTemplate(false);
      setSuccess(isCreatingTemplate ? 'Template created successfully!' : 'Shift created successfully!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to create shift';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleEditShift = async () => {
    try {
      if (!editingShift) return;

      setLoading(true);
      const updateData = {
        shift_name: shiftForm.shift_name,
        start_time: shiftForm.start_time,
        end_time: shiftForm.end_time,
        days_of_week: shiftForm.days_of_week,
        description: shiftForm.description
      };

      await api.put(`/shifts/${editingShift.id}`, updateData);
      await loadShifts();
      await loadShiftTemplates(); // Refresh templates for assign dialog
      setEditDialogOpen(false);
      resetForm();
      setSuccess('Shift updated successfully!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to update shift';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShift = async (shiftId: number) => {
    try {
      if (!window.confirm('Are you sure you want to delete this shift?')) return;

      setLoading(true);
      await api.delete(`/shifts/${shiftId}`);
      await loadShifts();
      await loadShiftTemplates(); // Refresh templates for assign dialog
      setSuccess('Shift deleted successfully!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to delete shift';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleAssignShift = async () => {
    try {
      if (!selectedEmployee || !selectedTemplate) {
        setError('Please select both employee and shift');
        return;
      }

      setLoading(true);
      await api.post('/shifts/assign', {
        employee_id: selectedEmployee.id,
        template_id: selectedTemplate.id
      });
      await loadShifts();
      setAssignDialogOpen(false);
      setSelectedEmployee(null);
      setSelectedTemplate(null);
      setSuccess('Shift assigned successfully!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to assign shift';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShiftForm({
      employee_id: null,
      shift_name: '',
      start_time: '09:00',
      end_time: '17:00',
      days_of_week: [],
      description: ''
    });
    setEditingShift(null);
    setIsCreatingTemplate(false);
  };

  const openEditDialog = (shift: Shift) => {
    setEditingShift(shift);
    setShiftForm({
      employee_id: shift.employee_id || null,
      shift_name: shift.shift_name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      days_of_week: shift.days_of_week,
      description: shift.description || ''
    });
    setEditDialogOpen(true);
  };

  const handleDayToggle = (day: string) => {
    const newDays = shiftForm.days_of_week.includes(day)
      ? shiftForm.days_of_week.filter(d => d !== day)
      : [...shiftForm.days_of_week, day];
    
    setShiftForm({ ...shiftForm, days_of_week: newDays });
  };

  const formatDays = (days: string[]) => {
    return days.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ');
  };

  const getShiftDuration = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    // Handle overnight shifts
    if (diff < 0) {
      diff += 24;
    }
    
    return `${diff} hours`;
  };

  const handleEditTemplate = (template: Shift) => {
    setShiftForm({
      shift_name: template.shift_name,
      start_time: template.start_time,
      end_time: template.end_time,
      days_of_week: template.days_of_week,
      description: template.description || '',
      employee_id: null
    });
    setEditingShift(template);
    setEditDialogOpen(true);
    setTemplatesDialogOpen(false);
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!window.confirm('Are you sure you want to delete this shift template?')) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/shifts/${templateId}`);
      setSuccess('Template deleted successfully!');
      setError('');
      loadShiftTemplates();
      loadShifts(); // Refresh main table
    } catch (error: any) {
      console.error('❌ Error deleting template:', error);
      setError(error.response?.data?.detail || 'Failed to delete template');
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon /> Shift Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AssignmentIcon />}
            onClick={() => setTemplatesDialogOpen(true)}
          >
            Templates
          </Button>
          <Button
            variant="outlined"
            startIcon={<PersonIcon />}
            onClick={() => setAssignDialogOpen(true)}
          >
            Assign Shift
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Shift
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Shifts Summary Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Shifts
                  </Typography>
                  <Typography variant="h4">
                    {shifts.filter(s => s.employee_id).length}
                  </Typography>
                </Box>
                <ScheduleIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Employees with Shifts
                  </Typography>
                  <Typography variant="h4">
                    {new Set(shifts.filter(s => s.employee_id).map(s => s.employee_id)).size}
                  </Typography>
                </Box>
                <PersonIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Templates Available
                  </Typography>
                  <Typography variant="h4">
                    {shiftTemplates.length}
                  </Typography>
                </Box>
                <AssignmentIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Shifts
                  </Typography>
                  <Typography variant="h4">
                    {shifts.filter(s => s.is_active === 'true').length}
                  </Typography>
                </Box>
                <AccessTimeIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Shifts Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            All Shifts (Assigned & Templates)
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Shift Name</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Days</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shifts.map((shift) => (
                  <TableRow 
                    key={shift.id}
                    sx={{ 
                      backgroundColor: shift.employee_id ? 'inherit' : 'action.hover',
                      '&:hover': { backgroundColor: 'action.selected' }
                    }}
                  >
                    <TableCell>
                      <Box>
                        <Typography 
                          variant="body2" 
                          fontWeight="bold"
                          color={shift.employee_id ? 'inherit' : 'primary.main'}
                        >
                          {shift.employee_name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          ID: {shift.employee_employee_id}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{shift.shift_name}</TableCell>
                    <TableCell>
                      {shift.start_time} - {shift.end_time}
                    </TableCell>
                    <TableCell>
                      {getShiftDuration(shift.start_time, shift.end_time)}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {shift.days_of_week.map((day) => (
                          <Chip
                            key={day}
                            label={day.charAt(0).toUpperCase() + day.slice(1, 3)}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                        {shift.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(shift)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteShift(shift.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {shifts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="textSecondary">
                        No shifts found. Create your first shift to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create Shift Dialog */}
      <Dialog open={createDialogOpen} onClose={() => { setCreateDialogOpen(false); resetForm(); }} maxWidth="md" fullWidth>
        <DialogTitle>Create New Shift</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isCreatingTemplate}
                  onChange={(e) => {
                    setIsCreatingTemplate(e.target.checked);
                    if (e.target.checked) {
                      setShiftForm({ ...shiftForm, employee_id: null });
                    }
                  }}
                />
              }
              label="Create as Template (not assigned to specific employee)"
            />
            
            {!isCreatingTemplate && (
              <Autocomplete
                options={employees}
                getOptionLabel={(option) => `${option.name} (${option.employee_id})`}
                value={employees?.find?.(e => e.id === shiftForm.employee_id) || null}
                onChange={(_, value) => setShiftForm({ ...shiftForm, employee_id: value?.id || null })}
                renderInput={(params) => (
                  <TextField {...params} label="Employee" required />
                )}
              />
            )}
            
            <TextField
              label="Shift Name"
              value={shiftForm.shift_name}
              onChange={(e) => setShiftForm({ ...shiftForm, shift_name: e.target.value })}
              required
              fullWidth
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Start Time"
                type="time"
                value={shiftForm.start_time}
                onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Time"
                type="time"
                value={shiftForm.end_time}
                onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Working Days *
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {DAYS_OF_WEEK.map((day) => (
                  <FormControlLabel
                    key={day}
                    control={
                      <Checkbox
                        checked={shiftForm.days_of_week.includes(day)}
                        onChange={() => handleDayToggle(day)}
                      />
                    }
                    label={day.charAt(0).toUpperCase() + day.slice(1)}
                  />
                ))}
              </Box>
            </Box>
            
            <TextField
              label="Description"
              value={shiftForm.description}
              onChange={(e) => setShiftForm({ ...shiftForm, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateShift} variant="contained" disabled={loading}>
            Create Shift
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Shift Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingShift?.employee_id ? 'Edit Assigned Shift' : 'Edit Shift Template'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Shift Name"
              value={shiftForm.shift_name}
              onChange={(e) => setShiftForm({ ...shiftForm, shift_name: e.target.value })}
              required
              fullWidth
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Start Time"
                type="time"
                value={shiftForm.start_time}
                onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Time"
                type="time"
                value={shiftForm.end_time}
                onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Working Days *
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {DAYS_OF_WEEK.map((day) => (
                  <FormControlLabel
                    key={day}
                    control={
                      <Checkbox
                        checked={shiftForm.days_of_week.includes(day)}
                        onChange={() => handleDayToggle(day)}
                      />
                    }
                    label={day.charAt(0).toUpperCase() + day.slice(1)}
                  />
                ))}
              </Box>
            </Box>
            
            <TextField
              label="Description"
              value={shiftForm.description}
              onChange={(e) => setShiftForm({ ...shiftForm, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditShift} variant="contained" disabled={loading}>
            Update Shift
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Shift Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Shift to Employee</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Autocomplete
              options={employees}
              getOptionLabel={(option) => `${option.name} (${option.employee_id})`}
              value={selectedEmployee}
              onChange={(_, value) => setSelectedEmployee(value)}
              renderInput={(params) => (
                <TextField {...params} label="Select Employee" required />
              )}
            />
            
            <Autocomplete
              options={shifts}
              getOptionLabel={(option) => `${option.shift_name} (${option.start_time} - ${option.end_time}) - ${option.employee_name}`}
              value={selectedTemplate}
              onChange={(_, value) => setSelectedTemplate(value)}
              renderInput={(params) => (
                <TextField {...params} label="Select Shift to Assign" required />
              )}
            />
            
            {selectedTemplate && (
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Shift Details:
                </Typography>
                <Typography variant="body2">
                  <strong>Name:</strong> {selectedTemplate.shift_name}
                </Typography>
                <Typography variant="body2">
                  <strong>Time:</strong> {selectedTemplate.start_time} - {selectedTemplate.end_time}
                </Typography>
                <Typography variant="body2">
                  <strong>Days:</strong> {formatDays(selectedTemplate.days_of_week)}
                </Typography>
                <Typography variant="body2">
                  <strong>Duration:</strong> {getShiftDuration(selectedTemplate.start_time, selectedTemplate.end_time)}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAssignShift} variant="contained" disabled={loading}>
            Assign Shift
          </Button>
        </DialogActions>
      </Dialog>

      {/* Templates Dialog */}
      <Dialog open={templatesDialogOpen} onClose={() => setTemplatesDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Shift Templates</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              onClick={createPredefinedTemplates}
              disabled={loading}
            >
              Create Predefined Templates
            </Button>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          {shiftTemplates.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {shiftTemplates.map((template) => (
                <Card key={template.id} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {template.shift_name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditTemplate(template)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteTemplate(template.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Time:</strong> {template.start_time} - {template.end_time}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Days:</strong> {formatDays(template.days_of_week)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Duration:</strong> {getShiftDuration(template.start_time, template.end_time)}
                    </Typography>
                    {template.description && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {template.description}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Typography color="textSecondary" align="center">
              No templates available. Click "Create Predefined Templates" to get started.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplatesDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ShiftManagement;
