import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Download,
  PictureAsPdf,
  TableChart,
  Assessment,
  DateRange
} from '@mui/icons-material';
import { employeeAPI } from '../services/attendanceAPI';

interface Employee {
  id: number;
  employee_id: string;
  name: string;
  department: string;
}

interface EmployeeSummary {
  total_days: number;
  present_days: number;
  late_days: number;
  absent_days: number;
  total_hours: number;
  attendance_rate: number;
}

const Reports: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | ''>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [employeeSummary, setEmployeeSummary] = useState<EmployeeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await employeeAPI.getEmployees();
      setEmployees(response.employees);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleDownloadPDF = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate.toISOString().split('T')[0]);
      if (endDate) params.append('end_date', endDate.toISOString().split('T')[0]);
      if (selectedEmployee) params.append('employee_id', selectedEmployee.toString());

      const response = await fetch(`/api/v1/reports/pdf?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setMessage({ type: 'success', text: 'PDF report downloaded successfully!' });
      } else {
        throw new Error('Failed to download PDF');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error downloading PDF report' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate.toISOString().split('T')[0]);
      if (endDate) params.append('end_date', endDate.toISOString().split('T')[0]);
      if (selectedEmployee) params.append('employee_id', selectedEmployee.toString());

      const response = await fetch(`/api/v1/reports/excel?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setMessage({ type: 'success', text: 'Excel report downloaded successfully!' });
      } else {
        throw new Error('Failed to download Excel');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error downloading Excel report' });
    } finally {
      setLoading(false);
    }
  };

  const handleGetEmployeeSummary = async () => {
    if (!selectedEmployee) {
      setMessage({ type: 'error', text: 'Please select an employee first' });
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate.toISOString().split('T')[0]);
      if (endDate) params.append('end_date', endDate.toISOString().split('T')[0]);

      const response = await fetch(`/api/v1/reports/employee-summary/${selectedEmployee}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const summary = await response.json();
        setEmployeeSummary(summary);
        setMessage({ type: 'success', text: 'Employee summary loaded successfully!' });
      } else {
        throw new Error('Failed to load employee summary');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading employee summary' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
          Reports & Analytics
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

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Filters */}
          <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <DateRange sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Report Filters
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Box sx={{ minWidth: 200, flex: 1 }}>
                    <FormControl fullWidth>
                      <InputLabel>Employee</InputLabel>
                      <Select
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value as number)}
                        label="Employee"
                      >
                        <MenuItem value="">All Employees</MenuItem>
                        {employees.map((employee) => (
                          <MenuItem key={employee.id} value={employee.id}>
                            {employee.name} ({employee.employee_id})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  
                  <Box sx={{ minWidth: 150, flex: 1 }}>
                    <TextField
                      label="Start Date"
                      type="date"
                      value={startDate ? startDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                  
                  <Box sx={{ minWidth: 150, flex: 1 }}>
                    <TextField
                      label="End Date"
                      type="date"
                      value={endDate ? endDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                  
                  <Box sx={{ minWidth: 120 }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setSelectedEmployee('');
                        setStartDate(null);
                        setEndDate(null);
                        setEmployeeSummary(null);
                      }}
                      fullWidth
                    >
                      Clear Filters
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>

          {/* Reports Section */}
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {/* Download Reports */}
            <Box sx={{ flex: "1 1 250px", minWidth: "250px" }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <Download sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Download Reports
                  </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<PictureAsPdf />}
                    onClick={handleDownloadPDF}
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? <CircularProgress size={20} /> : 'Download PDF Report'}
                  </Button>
                  
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<TableChart />}
                    onClick={handleDownloadExcel}
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? <CircularProgress size={20} /> : 'Download Excel Report'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Employee Summary */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Employee Summary
                </Typography>
                
                <Button
                  variant="outlined"
                  onClick={handleGetEmployeeSummary}
                  disabled={loading || !selectedEmployee}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  {loading ? <CircularProgress size={20} /> : 'Generate Summary'}
                </Button>

                {employeeSummary && (
                  <Box>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                      <Box sx={{ flex: "1 1 250px", minWidth: "250px" }}>
                        <Chip 
                          label={`Total Days: ${employeeSummary.total_days}`} 
                          color="primary" 
                          variant="outlined"
                          sx={{ width: '100%' }}
                        />
                      </Box>
                      <Box sx={{ flex: "1 1 250px", minWidth: "250px" }}>
                        <Chip 
                          label={`Present: ${employeeSummary.present_days}`} 
                          color="success" 
                          variant="outlined"
                          sx={{ width: '100%' }}
                        />
                      </Box>
                      <Box sx={{ flex: "1 1 250px", minWidth: "250px" }}>
                        <Chip 
                          label={`Late: ${employeeSummary.late_days}`} 
                          color="warning" 
                          variant="outlined"
                          sx={{ width: '100%' }}
                        />
                      </Box>
                      <Box sx={{ flex: "1 1 250px", minWidth: "250px" }}>
                        <Chip 
                          label={`Absent: ${employeeSummary.absent_days}`} 
                          color="error" 
                          variant="outlined"
                          sx={{ width: '100%' }}
                        />
                      </Box>
                      <Box sx={{ flex: "1 1 250px", minWidth: "250px" }}>
                        <Chip 
                          label={`Total Hours: ${employeeSummary.total_hours}`} 
                          color="info" 
                          variant="outlined"
                          sx={{ width: '100%' }}
                        />
                      </Box>
                      <Box sx={{ flex: "1 1 250px", minWidth: "250px" }}>
                        <Chip 
                          label={`Attendance Rate: ${employeeSummary.attendance_rate}%`} 
                          color={employeeSummary.attendance_rate >= 90 ? 'success' : 
                                employeeSummary.attendance_rate >= 75 ? 'warning' : 'error'} 
                          variant="outlined"
                          sx={{ width: '100%' }}
                        />
                      </Box>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Reports;
