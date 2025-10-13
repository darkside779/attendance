"""
Face recognition service for employee identification
"""
import face_recognition
import numpy as np
import cv2
import json
import base64
from typing import List, Optional, Tuple
from PIL import Image
import io
import os
from app.core.config import settings

class FaceRecognitionService:
    def __init__(self):
        self.tolerance = settings.FACE_RECOGNITION_TOLERANCE
        self.model = settings.FACE_ENCODING_MODEL
    
    def encode_face_from_image(self, image_data: bytes) -> Optional[List[float]]:
        """
        Extract face encoding from image data
        Returns the first face encoding found or None if no face detected
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            # Convert BGR to RGB (face_recognition uses RGB)
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Find face locations
            face_locations = face_recognition.face_locations(rgb_image, model=self.model)
            
            if not face_locations:
                return None
            
            # Get face encodings
            face_encodings = face_recognition.face_encodings(rgb_image, face_locations, model=self.model)
            
            if face_encodings:
                # Return the first face encoding as a list
                return face_encodings[0].tolist()
            
            return None
            
        except Exception as e:
            print(f"Error encoding face: {e}")
            return None
    
    def encode_face_from_base64(self, base64_image: str) -> Optional[List[float]]:
        """
        Extract face encoding from base64 image string
        """
        try:
            # Remove data URL prefix if present
            if base64_image.startswith('data:image'):
                base64_image = base64_image.split(',')[1]
            
            # Decode base64 to bytes
            image_data = base64.b64decode(base64_image)
            return self.encode_face_from_image(image_data)
            
        except Exception as e:
            print(f"Error encoding face from base64: {e}")
            return None
    
    def compare_faces(self, known_encoding: List[float], unknown_encoding: List[float]) -> Tuple[bool, float]:
        """
        Compare two face encodings
        Returns (is_match, distance)
        """
        try:
            known_np = np.array(known_encoding)
            unknown_np = np.array(unknown_encoding)
            
            # Calculate face distance
            distance = face_recognition.face_distance([known_np], unknown_np)[0]
            
            # Check if faces match within tolerance
            is_match = distance <= self.tolerance
            
            return is_match, float(distance)
            
        except Exception as e:
            print(f"Error comparing faces: {e}")
            return False, 1.0
    
    def find_best_match(self, unknown_encoding: List[float], known_encodings: List[Tuple[int, List[float]]]) -> Optional[Tuple[int, float]]:
        """
        Find the best matching face from a list of known encodings
        Returns (employee_id, distance) or None if no match found
        """
        try:
            if not known_encodings:
                return None
            
            unknown_np = np.array(unknown_encoding)
            
            best_match_id = None
            best_distance = float('inf')
            
            for employee_id, encoding in known_encodings:
                known_np = np.array(encoding)
                distance = face_recognition.face_distance([known_np], unknown_np)[0]
                
                if distance < best_distance and distance <= self.tolerance:
                    best_distance = distance
                    best_match_id = employee_id
            
            if best_match_id is not None:
                return best_match_id, best_distance
            
            return None
            
        except Exception as e:
            print(f"Error finding best match: {e}")
            return None
    
    def detect_faces_in_image(self, image_data: bytes) -> List[dict]:
        """
        Detect all faces in an image and return their locations
        """
        try:
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            face_locations = face_recognition.face_locations(rgb_image, model=self.model)
            
            faces = []
            for i, (top, right, bottom, left) in enumerate(face_locations):
                faces.append({
                    'face_id': i,
                    'location': {
                        'top': top,
                        'right': right,
                        'bottom': bottom,
                        'left': left
                    }
                })
            
            return faces
            
        except Exception as e:
            print(f"Error detecting faces: {e}")
            return []
    
    def save_face_image(self, image_data: bytes, employee_id: str) -> Optional[str]:
        """
        Save face image to disk and return the file path
        """
        try:
            # Create uploads directory if it doesn't exist
            upload_dir = os.path.join(settings.UPLOAD_DIR, 'faces')
            os.makedirs(upload_dir, exist_ok=True)
            
            # Generate filename
            filename = f"employee_{employee_id}_{int(cv2.getTickCount())}.jpg"
            file_path = os.path.join(upload_dir, filename)
            
            # Save image
            with open(file_path, 'wb') as f:
                f.write(image_data)
            
            return file_path
            
        except Exception as e:
            print(f"Error saving face image: {e}")
            return None
    
    def validate_image_quality(self, image_data: bytes) -> dict:
        """
        Validate image quality for face recognition
        """
        try:
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {'valid': False, 'reason': 'Invalid image format'}
            
            height, width = image.shape[:2]
            
            # Check minimum resolution
            if width < 200 or height < 200:
                return {'valid': False, 'reason': 'Image resolution too low (minimum 200x200)'}
            
            # Check if image is too large
            if width > 2000 or height > 2000:
                return {'valid': False, 'reason': 'Image resolution too high (maximum 2000x2000)'}
            
            # Convert to RGB for face detection
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            face_locations = face_recognition.face_locations(rgb_image)
            
            if not face_locations:
                return {'valid': False, 'reason': 'No face detected in image'}
            
            if len(face_locations) > 1:
                return {'valid': False, 'reason': 'Multiple faces detected. Please use image with single face'}
            
            # Check face size
            top, right, bottom, left = face_locations[0]
            face_width = right - left
            face_height = bottom - top
            
            if face_width < 50 or face_height < 50:
                return {'valid': False, 'reason': 'Face too small in image'}
            
            return {'valid': True, 'reason': 'Image quality is good'}
            
        except Exception as e:
            return {'valid': False, 'reason': f'Error validating image: {str(e)}'}

    def detect_and_recognize_faces(self, image_data: bytes) -> dict:
        """
        Detect faces and try to recognize them in real-time
        Returns face locations and recognized employee info
        """
        try:
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {'faces': [], 'recognized': []}
            
            # Get image dimensions
            height, width = image.shape[:2]
            
            # Convert to RGB for face_recognition
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            face_locations = face_recognition.face_locations(rgb_image, model=self.model)
            
            if not face_locations:
                return {'faces': [], 'recognized': [], 'image_dimensions': {'width': width, 'height': height}}
            
            # Get face encodings
            face_encodings = face_recognition.face_encodings(rgb_image, face_locations, model=self.model)
            
            face_list = []
            recognized_list = []
            
            for i, ((top, right, bottom, left), encoding) in enumerate(zip(face_locations, face_encodings)):
                # Convert to relative coordinates (0-1 range) for frontend
                face_info = {
                    'id': i,
                    'x': left / width,
                    'y': top / height,
                    'width': (right - left) / width,
                    'height': (bottom - top) / height,
                    'absolute': {
                        'x': int(left),
                        'y': int(top),
                        'width': int(right - left),
                        'height': int(bottom - top)
                    }
                }
                face_list.append(face_info)
                
                # Add encoding for recognition
                recognized_list.append({
                    'face_id': i,
                    'employee_name': None,
                    'employee_id': None,
                    'confidence': 0.0,
                    'features': encoding.tolist()
                })
            
            return {
                'faces': face_list,
                'recognized': recognized_list,
                'image_dimensions': {'width': width, 'height': height}
            }
            
        except Exception as e:
            print(f"Error in real-time face detection: {e}")
            return {'faces': [], 'recognized': []}

# Global instance
face_recognition_service = FaceRecognitionService()
