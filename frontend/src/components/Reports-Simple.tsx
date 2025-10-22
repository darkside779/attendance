import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/apiUrl';
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
  DateRange,
  AttachMoney,
  Schedule,
  TrendingUp
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

interface HourlyRateData {
  employees: Array<{
    employee_id: string;
    employee_name: string;
    department: string;
    monthly_salary: number;
    total_hours: number;
    hourly_rate: number;
    per_minute_rate: number;
    earned_salary: number;
    salary_difference: number;
    cost_efficiency: number;
  }>;
  summary: {
    total_employees: number;
    total_salary_cost: number;
    total_earned_salary: number;
    total_salary_difference: number;
    total_hours_worked: number;
    average_hourly_rate: number;
    average_per_minute_rate: number;
    period_start: string;
    period_end: string;
  };
}

const Reports: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | ''>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [employeeSummary, setEmployeeSummary] = useState<EmployeeSummary | null>(null);
  const [hourlyRateData, setHourlyRateData] = useState<HourlyRateData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingRates, setLoadingRates] = useState(false);
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

      const response = await fetch(`${getApiBaseUrl()}/reports/pdf?${params}`, {
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

      const response = await fetch(`${getApiBaseUrl()}/reports/excel?${params}`, {
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

            const response = await fetch(`${getApiBaseUrl()}/reports/employee-summary/${employee.id}?${params}`, {
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

        const response = await fetch(`${getApiBaseUrl()}/reports/employee-summary/${selectedEmployee}?${params}`, {
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

  const loadHourlyRates = async () => {
    setLoadingRates(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate.toISOString().split('T')[0]);
      if (endDate) params.append('end_date', endDate.toISOString().split('T')[0]);
      if (selectedEmployee) params.append('employee_id', selectedEmployee.toString());

      const response = await fetch(`${getApiBaseUrl()}/reports/hourly-rates?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHourlyRateData(data.hourly_rates);
        setMessage({ type: 'success', text: 'Hourly rate analysis loaded successfully!' });
      } else {
        throw new Error('Failed to load hourly rates');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading hourly rate analysis' });
    } finally {
      setLoadingRates(false);
    }
  };

  const handleDownloadPDFWithRates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate.toISOString().split('T')[0]);
      if (endDate) params.append('end_date', endDate.toISOString().split('T')[0]);
      if (selectedEmployee) params.append('employee_id', selectedEmployee.toString());

      const response = await fetch(`${getApiBaseUrl()}/reports/pdf-with-rates?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_report_with_rates_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setMessage({ type: 'success', text: 'PDF report with hourly rates downloaded successfully!' });
      } else {
        throw new Error('Failed to download PDF with rates');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error downloading PDF report with rates' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcelWithRates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate.toISOString().split('T')[0]);
      if (endDate) params.append('end_date', endDate.toISOString().split('T')[0]);
      if (selectedEmployee) params.append('employee_id', selectedEmployee.toString());

      const response = await fetch(`${getApiBaseUrl()}/reports/excel-with-rates?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_report_with_rates_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setMessage({ type: 'success', text: 'Excel report with hourly rates downloaded successfully!' });
      } else {
        throw new Error('Failed to download Excel with rates');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error downloading Excel report with rates' });
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

        {/* Hourly Rate Analysis */}
        <Box sx={{ flex: 1, minWidth: 300 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AttachMoney sx={{ mr: 1, verticalAlign: 'middle' }} />
                Hourly Rate Analysis
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<TrendingUp />}
                  onClick={loadHourlyRates}
                  disabled={loadingRates}
                  fullWidth
                >
                  {loadingRates ? <CircularProgress size={20} /> : 'Load Hourly Rates'}
                </Button>
                
                <Divider />
                
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<PictureAsPdf />}
                  onClick={handleDownloadPDFWithRates}
                  disabled={loading}
                  fullWidth
                >
                  {loading ? <CircularProgress size={20} /> : 'PDF with Rates'}
                </Button>
                
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<TableChart />}
                  onClick={handleDownloadExcelWithRates}
                  disabled={loading}
                  fullWidth
                >
                  {loading ? <CircularProgress size={20} /> : 'Excel with Rates'}
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

      {/* Hourly Rate Data Display */}
      {hourlyRateData && (
        <Box sx={{ mt: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Schedule sx={{ mr: 1, verticalAlign: 'middle' }} />
                Hourly Rate Summary
              </Typography>
              
              {/* Summary Statistics */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                <Chip 
                  label={`Total Employees: ${hourlyRateData.summary.total_employees}`} 
                  color="primary" 
                  variant="outlined" 
                />
                <Chip 
                  label={`Total Earned: ${hourlyRateData.summary.total_salary_cost} AED`} 
                  color="success" 
                  variant="outlined" 
                />
                <Chip 
                  label={`Difference: ${hourlyRateData.summary.total_salary_difference >= 0 ? '+' : ''}${hourlyRateData.summary.total_salary_difference} AED`} 
                  color={hourlyRateData.summary.total_salary_difference >= 0 ? 'success' : 'error'} 
                  variant="outlined" 
                />
                <Chip 
                  label={`Avg Hourly Rate: ${hourlyRateData.summary.average_hourly_rate} AED/hour`} 
                  color="info" 
                  variant="outlined" 
                />
                <Chip 
                  label={`Avg Per Minute: ${hourlyRateData.summary.average_per_minute_rate} AED/min`} 
                  color="info" 
                  variant="outlined" 
                />
              </Box>

              {/* Calculation Example */}
              {hourlyRateData.employees.length > 0 && (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>Calculation Example ({hourlyRateData.employees[0].employee_name}):</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    1. Find the hourly rate:
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2, mb: 1 }}>
                    {hourlyRateData.employees[0].monthly_salary} AED ÷ {hourlyRateData.employees[0].total_hours} hours = {hourlyRateData.employees[0].hourly_rate} AED/hour
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    2. Calculate earned salary based on actual hours:
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2, mb: 1 }}>
                    {hourlyRateData.employees[0].hourly_rate} AED/hour × {hourlyRateData.employees[0].total_hours} hours = {hourlyRateData.employees[0].earned_salary} AED
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    3. Convert to per minute rate:
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2, mb: 1 }}>
                    {hourlyRateData.employees[0].hourly_rate} ÷ 60 = {hourlyRateData.employees[0].per_minute_rate} AED/minute
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main', mb: 1 }}>
                    ✅ Earned Salary = {hourlyRateData.employees[0].earned_salary} AED
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: hourlyRateData.employees[0].salary_difference >= 0 ? 'success.main' : 'error.main' }}>
                    💰 Difference = {hourlyRateData.employees[0].salary_difference >= 0 ? '+' : ''}{hourlyRateData.employees[0].salary_difference} AED
                  </Typography>
                </Box>
              )}

              {/* Employee Table */}
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Employee</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Department</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Monthly Salary (AED)</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Total Hours</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Hourly Rate (AED)</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Earned Salary (AED)</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Difference (AED)</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Per Minute (AED)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hourlyRateData.employees.map((emp, index) => (
                      <tr key={index}>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          {emp.employee_name} ({emp.employee_id})
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{emp.department}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>
                          {emp.monthly_salary.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>
                          {emp.total_hours.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>
                          {emp.hourly_rate.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', color: '#2e7d32' }}>
                          {emp.earned_salary.toFixed(2)}
                        </td>
                        <td style={{ 
                          padding: '8px', 
                          border: '1px solid #ddd', 
                          textAlign: 'right', 
                          fontWeight: 'bold',
                          color: emp.salary_difference >= 0 ? '#2e7d32' : '#d32f2f'
                        }}>
                          {emp.salary_difference >= 0 ? '+' : ''}{emp.salary_difference.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>
                          {emp.per_minute_rate.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default Reports;
