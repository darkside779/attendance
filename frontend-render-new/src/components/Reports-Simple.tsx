import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
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
      console.log('Employees API Response:', response); // Debug log
      
      // Handle different response structures
      if (Array.isArray(response)) {
        setEmployees(response);
      } else if (response && Array.isArray(response.employees)) {
        setEmployees(response.employees);
      } else if (response && Array.isArray(response.data)) {
        setEmployees(response.data);
      } else {
        console.warn('Unexpected employees response structure:', response);
        setEmployees([]);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]); // Set empty array on error
    }
  };

  const handleDownloadPDF = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate.toISOString().split('T')[0]);
      if (endDate) params.append('end_date', endDate.toISOString().split('T')[0]);
      if (selectedEmployee) params.append('employee_id', selectedEmployee.toString());

      const response = await fetch(`http://127.0.0.1:8001/api/v1/reports/pdf?${params}`, {
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

      const response = await fetch(`http://127.0.0.1:8001/api/v1/reports/excel?${params}`, {
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
    setLoading(true);
    try {
      if (!selectedEmployee) {
        // Generate summary for all employees
        const allEmployeesData = await Promise.all(
          employees.map(async (employee) => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate.toISOString().split('T')[0]);
            if (endDate) params.append('end_date', endDate.toISOString().split('T')[0]);

            const response = await fetch(`http://127.0.0.1:8001/api/v1/reports/employee-summary/${employee.id}?${params}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });

            if (response.ok) {
              const summary = await response.json();
              return { name: employee.name, ...summary };
            }
            return null;
          })
        );

        const validData = allEmployeesData.filter(data => data !== null);
        
        // Calculate totals for all employees
        const totalSummary = validData.reduce((acc, curr) => ({
          total_days: acc.total_days + curr.total_days,
          present_days: acc.present_days + curr.present_days,
          late_days: acc.late_days + curr.late_days,
          absent_days: acc.absent_days + curr.absent_days,
          total_hours: acc.total_hours + curr.total_hours,
          attendance_rate: 0 // Will calculate below
        }), { total_days: 0, present_days: 0, late_days: 0, absent_days: 0, total_hours: 0, attendance_rate: 0 });

        // Calculate average attendance rate
        totalSummary.attendance_rate = totalSummary.total_days > 0 
          ? Math.round((totalSummary.present_days / totalSummary.total_days) * 100) 
          : 0;

        setEmployeeSummary(totalSummary);
        setMessage({ type: 'success', text: 'All employees summary loaded successfully!' });
      } else {
        // Generate summary for specific employee
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate.toISOString().split('T')[0]);
        if (endDate) params.append('end_date', endDate.toISOString().split('T')[0]);

        const response = await fetch(`http://127.0.0.1:8001/api/v1/reports/employee-summary/${selectedEmployee}?${params}`, {
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

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
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
                  onChange={(e) => setSelectedEmployee(e.target.value as number | '')}
                  label="Employee"
                  displayEmpty
                >
                  <MenuItem value="">All Employees</MenuItem>
                  {Array.isArray(employees) && employees.map((employee) => (
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
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Download Reports */}
        <Box sx={{ flex: 1, minWidth: 300 }}>
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
        <Box sx={{ flex: 1, minWidth: 300 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Employee Summary
              </Typography>
              
              <Button
                variant="outlined"
                onClick={handleGetEmployeeSummary}
                disabled={loading}
                fullWidth
                sx={{ mb: 2 }}
              >
                {loading ? <CircularProgress size={20} /> : 'Generate Summary'}
              </Button>

              {employeeSummary && (
                <Box>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Chip 
                      label={`Total Days: ${employeeSummary.total_days}`} 
                      color="primary" 
                      variant="outlined"
                      sx={{ width: '100%' }}
                    />
                    <Chip 
                      label={`Present: ${employeeSummary.present_days}`} 
                      color="success" 
                      variant="outlined"
                      sx={{ width: '100%' }}
                    />
                    <Chip 
                      label={`Late: ${employeeSummary.late_days}`} 
                      color="warning" 
                      variant="outlined"
                      sx={{ width: '100%' }}
                    />
                    <Chip 
                      label={`Absent: ${employeeSummary.absent_days}`} 
                      color="error" 
                      variant="outlined"
                      sx={{ width: '100%' }}
                    />
                    <Chip 
                      label={`Total Hours: ${employeeSummary.total_hours}`} 
                      color="info" 
                      variant="outlined"
                      sx={{ width: '100%' }}
                    />
                    <Chip 
                      label={`Attendance Rate: ${employeeSummary.attendance_rate}%`} 
                      color={employeeSummary.attendance_rate >= 90 ? 'success' : 
                            employeeSummary.attendance_rate >= 75 ? 'warning' : 'error'} 
                      variant="outlined"
                      sx={{ width: '100%' }}
                    />
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default Reports;
