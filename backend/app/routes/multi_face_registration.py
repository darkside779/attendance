"""
Multi-angle face registration routes with facial landmarks
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
import json

from app.core.database import get_db
from app.models.user import User
from app.models.employee import Employee
from app.services.advanced_face_service import advanced_face_service
from app.services.employee_service import EmployeeService
from app.routes.auth import get_current_user

router = APIRouter()

@router.post("/register-multi-face/{employee_id}")
async def register_multi_face(
    employee_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Register multiple face images for an employee (3-5 different angles)"""
    
    # Check if employee exists
    employee_service = EmployeeService(db)
    employee = employee_service.get_employee_by_id(employee_id)
    
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Validate number of images
    if len(files) < 3 or len(files) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide 3-5 face images from different angles"
        )
    
    try:
        image_data_list = []
        
        # Read all uploaded images
        for i, file in enumerate(files):
            if not file.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File {i+1} must be an image"
                )
            
            image_data = await file.read()
            image_data_list.append(image_data)
            print(f"DEBUG: Processed image {i+1} of size: {len(image_data)} bytes")
        
        # Extract multiple face encodings and landmarks
        print("DEBUG: Extracting multiple face encodings and landmarks...")
        multi_face_data = advanced_face_service.extract_multiple_face_encodings(image_data_list)
        
        if not multi_face_data['encodings']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No faces detected in the provided images"
            )
        
        print(f"DEBUG: Successfully extracted {len(multi_face_data['encodings'])} face encodings")
        print(f"DEBUG: Extracted {len(multi_face_data['landmarks'])} landmark sets")
        
        # Save face images (optional - for debugging/verification)
        image_paths = []
        for i, image_data in enumerate(image_data_list):
            image_path = advanced_face_service.save_face_image(image_data, f"{employee.employee_id}_angle_{i}")
            if image_path:
                image_paths.append(image_path)
        
        # Update employee record with multi-face data
        employee.face_encodings_multi = json.dumps(multi_face_data)
        employee.face_landmarks = json.dumps(multi_face_data['landmarks'])
        employee.face_images_paths = json.dumps(image_paths)
        
        # Also update legacy field for backward compatibility
        if multi_face_data['encodings']:
            employee.face_encoding = json.dumps(multi_face_data['encodings'][0])
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Successfully registered {len(multi_face_data['encodings'])} face encodings for {employee.name}",
            "data": {
                "employee_id": employee.employee_id,
                "employee_name": employee.name,
                "encodings_count": len(multi_face_data['encodings']),
                "landmarks_count": len(multi_face_data['landmarks']),
                "angles_detected": multi_face_data['angles'],
                "quality_scores": multi_face_data['quality_scores'],
                "average_quality": sum(multi_face_data['quality_scores']) / len(multi_face_data['quality_scores']) if multi_face_data['quality_scores'] else 0
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"ERROR: Multi-face registration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register multi-face data: {str(e)}"
        )

@router.get("/face-data/{employee_id}")
async def get_employee_face_data(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get face registration data for an employee"""
    
    employee_service = EmployeeService(db)
    employee = employee_service.get_employee_by_id(employee_id)
    
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    try:
        face_data = {
            "employee_id": employee.employee_id,
            "employee_name": employee.name,
            "has_legacy_encoding": bool(employee.face_encoding),
            "has_multi_encodings": bool(employee.face_encodings_multi),
            "has_landmarks": bool(employee.face_landmarks),
            "has_image_paths": bool(employee.face_images_paths)
        }
        
        # Parse multi-face data if available
        if employee.face_encodings_multi:
            try:
                multi_data = json.loads(employee.face_encodings_multi)
                face_data.update({
                    "encodings_count": len(multi_data.get('encodings', [])),
                    "landmarks_count": len(multi_data.get('landmarks', [])),
                    "angles": multi_data.get('angles', []),
                    "quality_scores": multi_data.get('quality_scores', []),
                    "average_quality": sum(multi_data.get('quality_scores', [])) / len(multi_data.get('quality_scores', [])) if multi_data.get('quality_scores') else 0
                })
            except json.JSONDecodeError:
                face_data["multi_data_error"] = "Invalid JSON format"
        
        return face_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving face data: {str(e)}"
        )

@router.delete("/face-data/{employee_id}")
async def delete_employee_face_data(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete all face data for an employee"""
    
    employee_service = EmployeeService(db)
    employee = employee_service.get_employee_by_id(employee_id)
    
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    try:
        # Clear all face-related fields
        employee.face_encoding = None
        employee.face_encodings_multi = None
        employee.face_landmarks = None
        employee.face_image_path = None
        employee.face_images_paths = None
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Successfully deleted all face data for {employee.name}"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting face data: {str(e)}"
        )

@router.get("/registration-status")
async def get_registration_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get face registration status for all employees"""
    
    try:
        employees = db.query(Employee).filter(Employee.is_active == True).all()
        
        status_data = {
            "total_employees": len(employees),
            "with_legacy_faces": 0,
            "with_multi_faces": 0,
            "with_landmarks": 0,
            "without_faces": 0,
            "employees": []
        }
        
        for employee in employees:
            emp_status = {
                "id": employee.id,
                "employee_id": employee.employee_id,
                "name": employee.name,
                "has_legacy": bool(employee.face_encoding),
                "has_multi": bool(employee.face_encodings_multi),
                "has_landmarks": bool(employee.face_landmarks)
            }
            
            if employee.face_encoding:
                status_data["with_legacy_faces"] += 1
            if employee.face_encodings_multi:
                status_data["with_multi_faces"] += 1
            if employee.face_landmarks:
                status_data["with_landmarks"] += 1
            if not employee.face_encoding and not employee.face_encodings_multi:
                status_data["without_faces"] += 1
            
            status_data["employees"].append(emp_status)
        
        return status_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting registration status: {str(e)}"
        )
