import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  Edit,
  History,
  Save,
  Cancel
} from '@mui/icons-material';
import { attendanceAPI } from '../services/attendanceAPI';

interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: number;
  status: string;
  notes: string | null;
}

interface ModificationHistory {
  id: number;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  reason: string;
  modified_by: string;
  modification_date: string;
}

const AttendanceEdit: React.FC = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editDialog, setEditDialog] = useState<{open: boolean, record: AttendanceRecord | null}>({
    open: false,
    record: null
  });
  const [historyDialog, setHistoryDialog] = useState<{open: boolean, recordId: number | null}>({
    open: false,
    recordId: null
  });
  const [modificationHistory, setModificationHistory] = useState<ModificationHistory[]>([]);
  const [editForm, setEditForm] = useState({
    check_in: '',
    check_out: '',
    status: '',
    notes: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    loadAttendanceRecords();
  }, [selectedDate]);

  const loadAttendanceRecords = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await attendanceAPI.getTodayAttendance(dateStr);
      setAttendanceRecords(response);
    } catch (error) {
      console.error('Error loading attendance records:', error);
      setMessage({ type: 'error', text: 'Error loading attendance records' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (record: AttendanceRecord) => {
    setEditForm({
      check_in: record.check_in || '',
      check_out: record.check_out || '',
      status: record.status,
      notes: record.notes || '',
      reason: ''
    });
    setEditDialog({ open: true, record });
  };

  const handleSaveEdit = async () => {
    if (!editDialog.record || !editForm.reason.trim()) {
      setMessage({ type: 'error', text: 'Please provide a reason for the modification' });
      return;
    }

    setLoading(true);
    try {
      const modifications = [];

      // Check what fields have changed
      if (editForm.check_in !== (editDialog.record.check_in || '')) {
        modifications.push({
          attendance_id: editDialog.record.id,
          field_name: 'check_in',
          new_value: editForm.check_in || 'None',
          reason: editForm.reason
        });
      }

      if (editForm.check_out !== (editDialog.record.check_out || '')) {
        modifications.push({
          attendance_id: editDialog.record.id,
          field_name: 'check_out',
          new_value: editForm.check_out || 'None',
          reason: editForm.reason
        });
      }

      if (editForm.status !== editDialog.record.status) {
        modifications.push({
          attendance_id: editDialog.record.id,
          field_name: 'status',
          new_value: editForm.status,
          reason: editForm.reason
        });
      }

      if (editForm.notes !== (editDialog.record.notes || '')) {
        modifications.push({
          attendance_id: editDialog.record.id,
          field_name: 'notes',
          new_value: editForm.notes,
          reason: editForm.reason
        });
      }

      if (modifications.length === 0) {
        setMessage({ type: 'error', text: 'No changes detected' });
        return;
      }

      // Send modifications to backend
      for (const mod of modifications) {
        const response = await fetch('/api/v1/reports/modify-attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(mod)
        });

        if (!response.ok) {
          throw new Error('Failed to modify attendance');
        }
      }

      setMessage({ type: 'success', text: 'Attendance record updated successfully' });
      setEditDialog({ open: false, record: null });
      loadAttendanceRecords();
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating attendance record' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = async (recordId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/reports/modification-history/${recordId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setModificationHistory(data.modifications);
        setHistoryDialog({ open: true, recordId });
      } else {
        throw new Error('Failed to load modification history');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading modification history' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present': return 'success';
      case 'late': return 'warning';
      case 'absent': return 'error';
      case 'half_day': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <Edit sx={{ mr: 1, verticalAlign: 'middle' }} />
        Edit Attendance Records
      </Typography>

      {message && (
        <Alert 
          severity={message.type} 
          onClose={() => setMessage(null)}
          sx={{ mb: 3 }}
        >
          {message.text}
        </Alert>
      )}

      {/* Date Selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                label="Select Date"
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                variant="contained"
                onClick={loadAttendanceRecords}
                disabled={loading}
                fullWidth
              >
                {loading ? <CircularProgress size={20} /> : 'Load Records'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Attendance Records Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Attendance Records for {selectedDate.toDateString()}
          </Typography>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Check In</TableCell>
                  <TableCell>Check Out</TableCell>
                  <TableCell>Total Hours</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendanceRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {record.employee_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {record.employee_code}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{record.check_in || 'N/A'}</TableCell>
                    <TableCell>{record.check_out || 'N/A'}</TableCell>
                    <TableCell>{record.total_hours?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={record.status} 
                        color={getStatusColor(record.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{record.notes || 'N/A'}</TableCell>
                    <TableCell>
                      <Tooltip title="Edit Record">
                        <IconButton 
                          onClick={() => handleEditClick(record)}
                          color="primary"
                          size="small"
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View History">
                        <IconButton 
                          onClick={() => handleViewHistory(record.id)}
                          color="info"
                          size="small"
                        >
                          <History />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {attendanceRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No attendance records found for this date
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog 
        open={editDialog.open} 
        onClose={() => setEditDialog({ open: false, record: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Edit Attendance Record
          {editDialog.record && (
            <Typography variant="subtitle2" color="text.secondary">
              {editDialog.record.employee_name} - {editDialog.record.date}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Check In Time"
                type="datetime-local"
                value={editForm.check_in}
                onChange={(e) => setEditForm({ ...editForm, check_in: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Check Out Time"
                type="datetime-local"
                value={editForm.check_out}
                onChange={(e) => setEditForm({ ...editForm, check_out: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as string })}
                  label="Status"
                >
                  <MenuItem value="present">Present</MenuItem>
                  <MenuItem value="late">Late</MenuItem>
                  <MenuItem value="absent">Absent</MenuItem>
                  <MenuItem value="half_day">Half Day</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Reason for Modification *"
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                fullWidth
                multiline
                rows={3}
                required
                helperText="Please provide a detailed reason for this modification"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setEditDialog({ open: false, record: null })}
            startIcon={<Cancel />}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveEdit}
            variant="contained"
            startIcon={<Save />}
            disabled={loading || !editForm.reason.trim()}
          >
            {loading ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog 
        open={historyDialog.open} 
        onClose={() => setHistoryDialog({ open: false, recordId: null })}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Modification History</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Field</TableCell>
                  <TableCell>Old Value</TableCell>
                  <TableCell>New Value</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Modified By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {modificationHistory.map((mod) => (
                  <TableRow key={mod.id}>
                    <TableCell>{mod.modification_date}</TableCell>
                    <TableCell>{mod.field_changed}</TableCell>
                    <TableCell>{mod.old_value || 'N/A'}</TableCell>
                    <TableCell>{mod.new_value || 'N/A'}</TableCell>
                    <TableCell>{mod.reason}</TableCell>
                    <TableCell>{mod.modified_by}</TableCell>
                  </TableRow>
                ))}
                {modificationHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No modification history found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialog({ open: false, recordId: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendanceEdit;
