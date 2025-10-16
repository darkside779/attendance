import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  Divider,
  Alert
} from '@mui/material';
import {
  AccountBalance,
  People,
  Assessment,
  Schedule,
  Payment,
  TrendingUp,
  AccessTime,
  Person,
  AttachMoney,
  BarChart
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  totalHoursToday: number;
  pendingPayroll: number;
}

const AccountingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    totalHoursToday: 0,
    pendingPayroll: 0
  });

  useEffect(() => {
    // Fetch dashboard statistics
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Mock data for now - you can replace with actual API calls
      setStats({
        totalEmployees: 25,
        presentToday: 18,
        totalHoursToday: 144,
        pendingPayroll: 3
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const accountingModules = [
    {
      title: 'Employee Management',
      description: 'Manage employee records, departments, and information',
      icon: <People fontSize="large" />,
      color: '#2196F3',
      path: '/employees',
      features: ['Add/Edit Employees', 'Department Management', 'Employee Records']
    },
    {
      title: 'Attendance Tracker',
      description: 'View and manage employee attendance records',
      icon: <Schedule fontSize="large" />,
      color: '#4CAF50',
      path: '/attendance',
      features: ['Daily Attendance', 'Attendance History', 'Time Tracking']
    },
    {
      title: 'Reports & Analytics',
      description: 'Generate comprehensive reports and analytics',
      icon: <Assessment fontSize="large" />,
      color: '#FF9800',
      path: '/reports',
      features: ['Attendance Reports', 'Employee Analytics', 'Export Data']
    },
    {
      title: 'Payroll Management',
      description: 'Handle payroll calculations and salary management',
      icon: <Payment fontSize="large" />,
      color: '#9C27B0',
      path: '/payroll',
      features: ['Salary Calculations', 'Payroll Periods', 'Deductions']
    }
  ];

  return (
    <Box sx={{ flexGrow: 1, p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
          <AccountBalance sx={{ mr: 2, verticalAlign: 'middle' }} />
          Accounting Dashboard
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Manage employees, attendance, payroll, and generate reports
        </Typography>
      </Box>

      {/* Welcome Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Welcome to the Accounting Portal!</strong> You have access to employee management, 
          attendance tracking, payroll processing, and comprehensive reporting features.
        </Typography>
      </Alert>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)' }}>
            <CardContent sx={{ color: 'white', textAlign: 'center' }}>
              <People sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {stats.totalEmployees}
              </Typography>
              <Typography variant="body2">Total Employees</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)' }}>
            <CardContent sx={{ color: 'white', textAlign: 'center' }}>
              <Person sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {stats.presentToday}
              </Typography>
              <Typography variant="body2">Present Today</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(45deg, #FF9800 30%, #FFC107 90%)' }}>
            <CardContent sx={{ color: 'white', textAlign: 'center' }}>
              <AccessTime sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {stats.totalHoursToday}
              </Typography>
              <Typography variant="body2">Hours Today</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(45deg, #9C27B0 30%, #E91E63 90%)' }}>
            <CardContent sx={{ color: 'white', textAlign: 'center' }}>
              <AttachMoney sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {stats.pendingPayroll}
              </Typography>
              <Typography variant="body2">Pending Payroll</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Accounting Modules */}
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Accounting Modules
      </Typography>
      
      <Grid container spacing={3}>
        {accountingModules.map((module, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
              onClick={() => navigate(module.path)}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: module.color, 
                      width: 56, 
                      height: 56, 
                      mr: 2 
                    }}
                  >
                    {module.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {module.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {module.description}
                    </Typography>
                  </Box>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Key Features:
                </Typography>
                <List dense>
                  {module.features.map((feature, idx) => (
                    <ListItem key={idx} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 20 }}>
                        <TrendingUp fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={feature} 
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
                
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Button 
                    variant="contained" 
                    sx={{ 
                      bgcolor: module.color,
                      '&:hover': { bgcolor: module.color, opacity: 0.9 }
                    }}
                    startIcon={<BarChart />}
                  >
                    Access Module
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          Quick Actions
        </Typography>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="outlined" 
              startIcon={<People />}
              onClick={() => navigate('/employees')}
            >
              Add Employee
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<Schedule />}
              onClick={() => navigate('/attendance')}
            >
              View Attendance
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<Payment />}
              onClick={() => navigate('/payroll')}
            >
              Process Payroll
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<Assessment />}
              onClick={() => navigate('/reports')}
            >
              Generate Report
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default AccountingDashboard;
