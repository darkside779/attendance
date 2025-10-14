# Network Access Guide

## 🌐 Accessing the Attendance System from Other Devices

### Current Setup
- **Your PC IP**: 192.168.1.196
- **Frontend Port**: 3000
- **Backend Port**: 8001

### Access URLs

#### From Other Devices on Your Network:
- **Frontend**: `http://192.168.1.196:3000`
- **Backend API**: `http://192.168.1.196:8001/api/v1`

#### From Your PC (localhost):
- **Frontend**: `http://localhost:3000` or `http://127.0.0.1:3000`
- **Backend API**: `http://localhost:8001/api/v1` or `http://127.0.0.1:8001/api/v1`

### What Was Fixed

1. **Dynamic API URL Detection**: The frontend now automatically detects if it's being accessed via IP address and uses that same IP for API calls.

2. **Updated Files**:
   - ✅ `frontend/src/utils/apiUrl.ts` - New utility for dynamic API URLs
   - ✅ `frontend/src/services/api.ts` - Updated to use dynamic URLs
   - ✅ `frontend/src/components/Reports-Simple.tsx` - Fixed hardcoded URLs
   - ✅ `frontend/src/components/AttendanceEdit-Simple.tsx` - Fixed hardcoded URLs

3. **Docker Configuration**: Already correctly configured to bind to all interfaces (0.0.0.0)

### Testing Steps

1. **From Your PC**: 
   - Open `http://localhost:3000` - Should work as before

2. **From Another Device** (phone, tablet, another computer):
   - Connect to the same WiFi network
   - Open `http://192.168.1.196:3000`
   - Should now work without "Network Error"

### Troubleshooting

If you still get network errors:

1. **Check Windows Firewall**:
   ```cmd
   # Allow ports through Windows Firewall
   netsh advfirewall firewall add rule name="Attendance Frontend" dir=in action=allow protocol=TCP localport=3000
   netsh advfirewall firewall add rule name="Attendance Backend" dir=in action=allow protocol=TCP localport=8001
   ```

2. **Verify Docker is Running**:
   ```cmd
   docker-compose ps
   ```

3. **Check if ports are accessible**:
   ```cmd
   # From another device, test if ports are reachable
   telnet 192.168.1.196 3000
   telnet 192.168.1.196 8001
   ```

### Network Requirements

- All devices must be on the same WiFi network (192.168.1.x)
- Windows Firewall should allow ports 3000 and 8001
- Docker containers should be running

### Security Note

This setup allows access from any device on your local network. For production use, consider:
- Setting up proper authentication
- Using HTTPS
- Restricting access to specific IP ranges
- Using a reverse proxy like Nginx
