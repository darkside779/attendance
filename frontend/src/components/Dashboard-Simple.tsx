import React, { useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  People,
  AccessTime,
  AttachMoney,
  AccountCircle,
  ExitToApp,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../store/authSlice';
import { fetchEmployees } from '../store/employeeSlice';
import { RootState, AppDispatch } from '../store';

const Dashboard: React.FC = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { employees, total } = useSelector((state: RootState) => state.employees);

  useEffect(() => {
    dispatch(fetchEmployees({}));
  }, [dispatch]);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const stats = [
    {
      title: 'Total Employees',
      value: total,
      icon: <People fontSize="large" />,
      color: '#1976d2',
    },
    {
      title: 'Present Today',
      value: '0',
      icon: <AccessTime fontSize="large" />,
      color: '#2e7d32',
    },
    {
      title: 'Monthly Payroll',
      value: '$0',
      icon: <AttachMoney fontSize="large" />,
      color: '#ed6c02',
    },
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Attendance Management System
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            Welcome, {user?.username} ({user?.role})
          </Typography>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleLogout}>
              <ExitToApp sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>

        {/* Stats Cards */}
        <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
          {stats.map((stat, index) => (
            <Card key={index} sx={{ minWidth: 250, flex: 1 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: stat.color,
                      color: 'white',
                      mr: 2,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography variant="h4" component="div">
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Quick Actions */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={() => navigate('/employees')}
              >
                Manage Employees
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/attendance')}
              >
                View Attendance
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => navigate('/attendance-realtime')}
              >
                Real-Time Check In/Out
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/reports')}
              >
                Generate Reports
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Recent Employees */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Employees
            </Typography>
            {employees.slice(0, 5).map((employee) => (
              <Box
                key={employee.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                  borderBottom: '1px solid #eee',
                }}
              >
                <Box>
                  <Typography variant="body1">{employee.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {employee.employee_id} - {employee.position}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  ${(employee.salary_rate / 100).toFixed(2)}/hr
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Dashboard;
