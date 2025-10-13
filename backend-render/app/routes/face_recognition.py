"""
Face recognition routes for employee identification and attendance
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
import json

from app.core.database import get_db
from app.models.user import User
from app.models.employee import Employee
from app.services.simple_face_service import simple_face_service
from app.services.employee_service import EmployeeService
from app.routes.auth import get_current_user

router = APIRouter()

@router.post("/upload-face/{employee_id}")
async def upload_employee_face(
    employee_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload and process face image for an employee"""
    
    # Check if employee exists
    employee_service = EmployeeService(db)
    employee = employee_service.get_employee_by_id(employee_id)
    
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    try:
        # Read image data
        image_data = await file.read()
        print(f"DEBUG: Received image data of size: {len(image_data)} bytes")
        print(f"DEBUG: File content type: {file.content_type}")
        print(f"DEBUG: File filename: {file.filename}")
        
        # Validate image quality - be more lenient for face registration
        validation = simple_face_service.validate_image_quality(image_data)
        print(f"DEBUG: Image validation result: {validation}")
        
        # Only reject for serious issues, not multiple faces (common in registration)
        if not validation['valid'] and not validation['reason'].startswith('Multiple faces'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=validation['reason']
            )
        
        # If multiple faces detected, just log it but continue
        if validation['reason'].startswith('Multiple faces'):
            print("DEBUG: Multiple faces detected, but proceeding with registration")
        
        # Extract face features - will automatically use the largest face if multiple detected
        face_features = simple_face_service.extract_face_features(image_data)
        print(f"DEBUG: Extracted face features: {len(face_features) if face_features else 0} features")
        if not face_features:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No face detected in the image"
            )
        
        # Save face image
        image_path = simple_face_service.save_face_image(image_data, str(employee_id))
        
        # Update employee with face features
        face_features_json = json.dumps(face_features)
        print(f"DEBUG: Saving face data for employee {employee_id}")
        print(f"DEBUG: Face features length: {len(face_features)}")
        print(f"DEBUG: Face JSON length: {len(face_features_json)}")
        
        updated_employee = employee_service.update_face_encoding(
            employee_id, 
            face_features_json, 
            image_path
        )
        
        if not updated_employee:
            print(f"ERROR: Failed to update employee {employee_id} with face data")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update employee face data"
            )
        
        print(f"SUCCESS: Face data saved for employee {employee_id}")
        print(f"DEBUG: Updated employee face_encoding exists: {bool(updated_employee.face_encoding)}")
        
        return {
            "message": "Face uploaded and processed successfully",
            "employee_id": employee_id,
            "employee_name": employee.name,
            "face_features_length": len(face_features),
            "image_path": image_path
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing face image: {str(e)}"
        )

@router.post("/recognize-face")
async def recognize_face(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Recognize employee from face image"""
    
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    try:
        # Read image data
        image_data = await file.read()
        
        # Extract face features from uploaded image
        unknown_features = simple_face_service.extract_face_features(image_data)
        if not unknown_features:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No face detected in the image"
            )
        
        # Get all employees with face features
        employee_service = EmployeeService(db)
        employees = employee_service.get_employees(active_only=True)
        
        # Prepare known features
        known_features = []
        for employee in employees:
            if employee.face_encoding:
                try:
                    features = json.loads(employee.face_encoding)
                    known_features.append((employee.id, features))
                except json.JSONDecodeError:
                    continue
        
        if not known_features:
            return {
                "recognized": False,
                "message": "No employees with face data found",
                "employee": None
            }
        
        # Find best match
        match_result = simple_face_service.find_best_match(unknown_features, known_features)
        
        if match_result:
            employee_id, distance = match_result
            employee = employee_service.get_employee_by_id(employee_id)
            
            return {
                "recognized": True,
                "confidence": round((1 - distance) * 100, 2),
                "distance": round(distance, 4),
                "employee": {
                    "id": employee.id,
                    "employee_id": employee.employee_id,
                    "name": employee.name,
                    "department": employee.department,
                    "position": employee.position
                }
            }
        else:
            return {
                "recognized": False,
                "message": "No matching employee found",
                "employee": None
            }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error recognizing face: {str(e)}"
        )

@router.post("/validate-image")
async def validate_face_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Validate if an image is suitable for face recognition"""
    
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    try:
        image_data = await file.read()
        validation = simple_face_service.validate_image_quality(image_data)
        
        # Detect faces for additional info
        faces = simple_face_service.detect_faces_in_image(image_data)
        
        return {
            "validation": validation,
            "faces_detected": len(faces),
            "face_locations": faces
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error validating image: {str(e)}"
        )

@router.get("/employees-with-faces")
async def get_employees_with_faces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of employees who have face data"""
    
    employee_service = EmployeeService(db)
    employees = employee_service.get_employees(active_only=True)
    
    employees_with_faces = []
    employees_without_faces = []
    
    for employee in employees:
        employee_data = {
            "id": employee.id,
            "employee_id": employee.employee_id,
            "name": employee.name,
            "department": employee.department,
            "position": employee.position,
            "has_face_data": bool(employee.face_encoding)
        }
        
        if employee.face_encoding:
            employees_with_faces.append(employee_data)
        else:
            employees_without_faces.append(employee_data)
    
    return {
        "total_employees": len(employees),
        "with_face_data": len(employees_with_faces),
        "without_face_data": len(employees_without_faces),
        "employees_with_faces": employees_with_faces,
        "employees_without_faces": employees_without_faces
    }

@router.post("/detect-realtime")
async def detect_faces_realtime(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Detect faces in real-time and try to recognize them"""
    
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    try:
        # Read image
        image_data = await file.read()
        
        # Detect faces and get coordinates
        detection_result = simple_face_service.detect_and_recognize_faces(image_data)
        
        if not detection_result['faces']:
            return {
                "faces_detected": 0,
                "faces": [],
                "recognized": []
            }
        
        # Get all employees with face data for recognition
        employee_service = EmployeeService(db)
        # Force refresh to get latest data
        db.expire_all()
        employees = employee_service.get_employees(active_only=True)
        
        known_features = []
        employee_map = {}
        for employee in employees:
            print(f"DEBUG: Employee {employee.id} ({employee.name}) - face_encoding exists: {employee.face_encoding is not None}")
            if employee.face_encoding:
                print(f"DEBUG: Face encoding length: {len(employee.face_encoding)}")
                try:
                    features = json.loads(employee.face_encoding)
                    known_features.append((employee.id, features))
                    employee_map[employee.id] = {
                        'name': employee.name,
                        'employee_id': employee.employee_id,
                        'department': employee.department
                    }
                    print(f"DEBUG: Successfully loaded {len(features)} features for employee {employee.name}")
                except json.JSONDecodeError as e:
                    print(f"DEBUG: JSON decode error for employee {employee.id}: {e}")
                    continue
            else:
                print(f"DEBUG: No face encoding for employee {employee.name}")
        
        print(f"DEBUG: Total known features loaded: {len(known_features)}")
        
        # Try to recognize each detected face
        recognized_faces = []
        print(f"DEBUG: Processing {len(detection_result['recognized'])} detected faces")
        print(f"DEBUG: Known features available: {len(known_features)}")
        for face_data in detection_result['recognized']:
            if known_features and face_data['features']:
                print(f"DEBUG: Trying to match face with {len(face_data['features'])} features")
                match_result = simple_face_service.find_best_match(
                    face_data['features'], 
                    known_features
                )
                print(f"DEBUG: Match result: {match_result}")
                
                if match_result:
                    employee_id, confidence = match_result
                    employee_info = employee_map.get(employee_id)
                    
                    if employee_info:
                        recognized_faces.append({
                            'face_id': face_data['face_id'],
                            'employee_name': employee_info['name'],
                            'employee_id': employee_info['employee_id'],
                            'department': employee_info['department'],
                            'confidence': round((1 - confidence) * 100, 2)
                        })
                    else:
                        recognized_faces.append({
                            'face_id': face_data['face_id'],
                            'employee_name': 'Unknown',
                            'employee_id': None,
                            'department': None,
                            'confidence': 0.0
                        })
                else:
                    recognized_faces.append({
                        'face_id': face_data['face_id'],
                        'employee_name': 'Unknown',
                        'employee_id': None,
                        'department': None,
                        'confidence': 0.0
                    })
        
        return {
            "faces_detected": len(detection_result['faces']),
            "faces": detection_result['faces'],
            "recognized": recognized_faces,
            "image_dimensions": detection_result['image_dimensions']
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in real-time detection: {str(e)}"
        )
