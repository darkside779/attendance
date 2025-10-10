# 🚀 **Start Face Recognition Attendance System**

## **Step 1: Start Backend Server**

Open PowerShell in the backend directory and run:

```powershell
cd C:\Users\hp\Desktop\attendance\backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8001 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Application startup complete.
```

## **Step 2: Start Frontend Server**

Open a **NEW** PowerShell window in the frontend directory and run:

```powershell
cd C:\Users\hp\Desktop\attendance\frontend
npm start
```

**Expected Output:**
```
webpack compiled successfully
Local:            http://localhost:3000
```

## **Step 3: Test the System**

### **3.1 Login to System**
1. Go to: http://localhost:3000
2. Login with: `admin` / `admin123`
3. You should see the dashboard

### **3.2 Register Your Face**
1. Go to **Employee Management**
2. Find an employee in the table (e.g., "John Doe")
3. Click the **Face icon** (👤) in the Actions column
4. **Face Upload Dialog** will open with camera
5. Allow camera access when prompted
6. Position your face clearly in the camera view
7. Click **"Capture Photo"**
8. System validates the image automatically
9. Click **"Upload Face Data"** to save
10. Success! Employee now has face data registered

### **3.3 Test Face Recognition**
1. Go to **Attendance Tracker** (from dashboard menu)
2. Click **"Check In"**
3. Allow camera access
4. Position your face in the camera
5. Click **"Capture Photo"**
6. System should recognize you and record attendance!

## **Step 4: Verify It's Working**

### **Check API Endpoints**
Visit: http://127.0.0.1:8001/docs

You should see these new endpoints:
- `/api/v1/face/upload-face/{employee_id}`
- `/api/v1/face/recognize-face`
- `/api/v1/attendance/check-in`
- `/api/v1/attendance/check-out`

### **Check Face Recognition Status**
1. In Employee Management, you should see which employees have face data
2. In Attendance Tracker, you should see today's attendance records
3. Dashboard should show updated statistics

## **🎯 Expected Results**

### **After Face Registration:**
✅ Employee shows "Has Face Data" status  
✅ Face features saved to database  
✅ Image saved to uploads/faces/ directory  

### **After Face Recognition:**
✅ System identifies you automatically  
✅ Shows confidence percentage (e.g., "95% confidence")  
✅ Records attendance with timestamp  
✅ Updates dashboard statistics  

## **🔧 Troubleshooting**

### **If Backend Fails to Start:**
- Check if port 8001 is already in use
- Make sure you're in the correct directory
- Verify OpenCV is installed: `python -c "import cv2; print('OpenCV OK')"`

### **If Face Recognition Shows "Not Found":**
- Make sure you registered your face first
- Try better lighting conditions
- Ensure face is clearly visible and centered
- Check if employee has face data in Employee Management

### **If Camera Doesn't Work:**
- Allow camera permissions in browser
- Try refreshing the page
- Check if another app is using the camera
- Try a different browser (Chrome works best)

### **If Recognition is Inaccurate:**
- Re-register face with better lighting
- Use front-facing camera position
- Ensure single face in image
- Try multiple angles during registration

## **🎉 Success Indicators**

When everything works correctly:

1. **Backend Console Shows:**
   ```
   INFO:     "POST /api/v1/face/upload-face/1 HTTP/1.1" 200 OK
   INFO:     "POST /api/v1/attendance/check-in HTTP/1.1" 200 OK
   ```

2. **Frontend Shows:**
   - ✅ "Face uploaded successfully"
   - ✅ "Check-in successful for [Your Name]"
   - ✅ "Recognition confidence: 85%"

3. **Dashboard Updates:**
   - Present count increases
   - Today's attendance shows your record
   - Statistics reflect new data

## **📊 What You Can Do Now**

✅ **Register multiple employee faces**  
✅ **Track attendance with face recognition**  
✅ **View real-time attendance statistics**  
✅ **Check attendance history**  
✅ **Manage employee face data**  

---

## **🎊 Congratulations!**

You now have a **fully functional facial recognition attendance system** that:

- **Automatically identifies employees** using their faces
- **Records attendance** with timestamps
- **Calculates working hours** automatically
- **Provides real-time statistics** and reporting
- **Works with webcam** for easy access

This is a **professional-grade biometric attendance system** ready for real-world deployment!
