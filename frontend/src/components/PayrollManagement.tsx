import React, { useState, useEffect } from 'react';
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
  Grid,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Add,
  Calculate,
  GetApp,
  Visibility,
  CheckCircle,
  Schedule,
  AttachMoney,
  TrendingUp,
  People
} from '@mui/icons-material';
// import { DatePicker } from '@mui/x-date-pickers/DatePicker';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../services/api';

interface PayrollPeriod {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

interface PayrollRecord {
  id: number;
  employee_id: number;
  employee_name: string;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  days_worked: number;
  days_absent: number;
  days_late: number;
  base_salary: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  status: string;
}

interface PayrollSummary {
  total_employees: number;
  total_gross_salary: number;
  total_deductions: number;
  total_net_salary: number;
  average_hours: number;
  total_overtime_hours: number;
}

const PayrollManagement: React.FC = () => {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Dialog states
  const [createPeriodDialog, setCreatePeriodDialog] = useState(false);
  const [viewRecordDialog, setViewRecordDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  
  // Form states
  const [periodForm, setPeriodForm] = useState({
    name: '',
    start_date: null as Date | null,
    end_date: null as Date | null
  });

  useEffect(() => {
    loadPayrollPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadPeriodData(selectedPeriod.id);
    }
  }, [selectedPeriod]);

  const loadPayrollPeriods = async () => {
    try {
      const response = await api.get('/payroll/periods');
      setPeriods(response.data);
      if (response.data.length > 0 && !selectedPeriod) {
        setSelectedPeriod(response.data[0]);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading payroll periods' });
    }
  };

  const loadPeriodData = async (periodId: number) => {
    setLoading(true);
    try {
      // Load payroll records
      const recordsResponse = await api.get(`/payroll/periods/${periodId}/records`);
      setPayrollRecords(recordsResponse.data);

      // Load payroll summary
      const summaryResponse = await api.get(`/payroll/periods/${periodId}/summary`);
      setPayrollSummary(summaryResponse.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading period data' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePeriod = async () => {
    if (!periodForm.name || !periodForm.start_date || !periodForm.end_date) {
      setMessage({ type: 'error', text: 'Please fill all fields' });
      return;
    }

    try {
      const response = await api.post('/payroll/periods', {
        name: periodForm.name,
        start_date: periodForm.start_date.toISOString().split('T')[0],
        end_date: periodForm.end_date.toISOString().split('T')[0]
      });

      setMessage({ type: 'success', text: 'Payroll period created successfully' });
      setCreatePeriodDialog(false);
      setPeriodForm({ name: '', start_date: null, end_date: null });
      loadPayrollPeriods();
    } catch (error) {
      setMessage({ type: 'error', text: 'Error creating payroll period' });
    }
  };

  const handleCalculatePayroll = async () => {
    if (!selectedPeriod) return;

    setLoading(true);
    try {
      await api.post(`/payroll/periods/${selectedPeriod.id}/calculate`);
      setMessage({ type: 'success', text: 'Payroll calculated successfully' });
      loadPeriodData(selectedPeriod.id);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error calculating payroll' });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRecord = async (recordId: number) => {
    try {
      await api.post(`/payroll/records/${recordId}/approve`);
      setMessage({ type: 'success', text: 'Payroll record approved' });
      if (selectedPeriod) {
        loadPeriodData(selectedPeriod.id);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error approving payroll record' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'calculated': return 'warning';
      case 'approved': return 'success';
      case 'paid': return 'primary';
      default: return 'default';
    }
  };

  return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          💰 Payroll Management
        </Typography>

        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {/* Header Actions */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreatePeriodDialog(true)}
          >
            Create Period
          </Button>
          
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Select Period</InputLabel>
            <Select
              value={selectedPeriod?.id || ''}
              onChange={(e) => {
                const period = periods.find(p => p.id === e.target.value);
                setSelectedPeriod(period || null);
              }}
              label="Select Period"
            >
              {periods.map((period) => (
                <MenuItem key={period.id} value={period.id}>
                  {period.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedPeriod && (
            <Button
              variant="outlined"
              startIcon={<Calculate />}
              onClick={handleCalculatePayroll}
              disabled={loading}
            >
              Calculate Payroll
            </Button>
          )}
        </Box>

        {/* Payroll Summary */}
        {payrollSummary && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <People sx={{ mr: 1, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="h6">{payrollSummary.total_employees}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Total Employees
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AttachMoney sx={{ mr: 1, color: 'success.main' }} />
                    <Box>
                      <Typography variant="h6">
                        {formatCurrency(payrollSummary.total_gross_salary)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Gross Salary
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TrendingUp sx={{ mr: 1, color: 'error.main' }} />
                    <Box>
                      <Typography variant="h6">
                        {formatCurrency(payrollSummary.total_deductions)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Total Deductions
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Schedule sx={{ mr: 1, color: 'info.main' }} />
                    <Box>
                      <Typography variant="h6">
                        {payrollSummary.average_hours.toFixed(1)}h
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Average Hours
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Payroll Records Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Payroll Records
              {selectedPeriod && ` - ${selectedPeriod.name}`}
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee</TableCell>
                      <TableCell align="right">Hours</TableCell>
                      <TableCell align="right">Days Worked</TableCell>
                      <TableCell align="right">Gross Salary</TableCell>
                      <TableCell align="right">Deductions</TableCell>
                      <TableCell align="right">Net Salary</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payrollRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.employee_name}</TableCell>
                        <TableCell align="right">
                          {record.total_hours.toFixed(1)}
                          {record.overtime_hours > 0 && (
                            <Typography variant="caption" color="primary" display="block">
                              +{record.overtime_hours.toFixed(1)} OT
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {record.days_worked}
                          {record.days_absent > 0 && (
                            <Typography variant="caption" color="error" display="block">
                              -{record.days_absent} absent
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(record.gross_salary)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(record.total_deductions)}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(record.net_salary)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={record.status}
                            color={getStatusColor(record.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton
                              onClick={() => {
                                setSelectedRecord(record);
                                setViewRecordDialog(true);
                              }}
                              size="small"
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          {record.status === 'calculated' && (
                            <Tooltip title="Approve">
                              <IconButton
                                onClick={() => handleApproveRecord(record.id)}
                                color="success"
                                size="small"
                              >
                                <CheckCircle />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {payrollRecords.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          No payroll records found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Create Period Dialog */}
        <Dialog open={createPeriodDialog} onClose={() => setCreatePeriodDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create Payroll Period</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Period Name"
                value={periodForm.name}
                onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                fullWidth
                placeholder="e.g., October 2025"
              />
              <DatePicker
                label="Start Date"
                value={periodForm.start_date}
                onChange={(date) => setPeriodForm({ ...periodForm, start_date: date })}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
              <DatePicker
                label="End Date"
                value={periodForm.end_date}
                onChange={(date) => setPeriodForm({ ...periodForm, end_date: date })}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreatePeriodDialog(false)}>Cancel</Button>
            <Button onClick={handleCreatePeriod} variant="contained">Create</Button>
          </DialogActions>
        </Dialog>

        {/* View Record Dialog */}
        <Dialog open={viewRecordDialog} onClose={() => setViewRecordDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Payroll Details - {selectedRecord?.employee_name}</DialogTitle>
          <DialogContent>
            {selectedRecord && (
              <Box sx={{ mt: 1 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>Work Summary</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Total Hours:</Typography>
                        <Typography fontWeight="bold">{selectedRecord.total_hours.toFixed(1)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Regular Hours:</Typography>
                        <Typography>{selectedRecord.regular_hours.toFixed(1)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Overtime Hours:</Typography>
                        <Typography color="primary">{selectedRecord.overtime_hours.toFixed(1)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Days Worked:</Typography>
                        <Typography>{selectedRecord.days_worked}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Days Absent:</Typography>
                        <Typography color="error">{selectedRecord.days_absent}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Days Late:</Typography>
                        <Typography color="warning.main">{selectedRecord.days_late}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>Salary Breakdown</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Base Salary:</Typography>
                        <Typography>{formatCurrency(selectedRecord.base_salary)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Gross Salary:</Typography>
                        <Typography fontWeight="bold" color="success.main">
                          {formatCurrency(selectedRecord.gross_salary)}
                        </Typography>
                      </Box>
                      <Divider />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Total Deductions:</Typography>
                        <Typography color="error">{formatCurrency(selectedRecord.total_deductions)}</Typography>
                      </Box>
                      <Divider />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h6">Net Salary:</Typography>
                        <Typography variant="h6" color="primary">
                          {formatCurrency(selectedRecord.net_salary)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewRecordDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default PayrollManagement;
