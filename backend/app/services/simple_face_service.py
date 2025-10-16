"""
Simplified face recognition service using OpenCV only
This version uses face detection + template matching instead of deep learning
"""
import cv2
import numpy as np
import base64
import json
import os
from typing import List, Optional, Tuple
from PIL import Image
import io

class SimpleFaceService:
    def __init__(self):
        # Load OpenCV face cascade
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.tolerance = 0.6  # Similarity threshold
    
    def extract_face_features_for_checkin(self, image_data: bytes) -> Optional[List[float]]:
        """
        Extract face features for check-in/check-out with more lenient detection
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return None
            
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # More lenient parameters for check-in detection
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 3, minSize=(30, 30))
            
            if len(faces) == 0:
                return None
            
            # Get the largest face
            largest_face = max(faces, key=lambda x: x[2] * x[3])
            x, y, w, h = largest_face
            
            # Extract face region
            face_roi = gray[y:y+h, x:x+w]
            
            # Resize to standard size
            face_resized = cv2.resize(face_roi, (100, 100))
            
            # Normalize
            face_normalized = cv2.equalizeHist(face_resized)
            
            # Convert to feature vector
            features = face_normalized.flatten().astype(float)
            
            # Normalize to 0-1 range
            features = features / 255.0
            
            return features.tolist()
            
        except Exception as e:
            print(f"Error extracting face features for check-in: {e}")
            return None

    def extract_face_features(self, image_data: bytes) -> Optional[List[float]]:
        """
        Extract simple face features using OpenCV
        Returns normalized face image as feature vector
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return None
            
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Use same lenient parameters as real-time detection
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 3, minSize=(30, 30))
            
            if len(faces) == 0:
                return None
            
            # Get the largest face
            largest_face = max(faces, key=lambda x: x[2] * x[3])
            x, y, w, h = largest_face
            
            # Extract face region
            face_roi = gray[y:y+h, x:x+w]
            
            # Resize to standard size
            face_resized = cv2.resize(face_roi, (100, 100))
            
            # Normalize
            face_normalized = cv2.equalizeHist(face_resized)
            
            # Convert to feature vector
            features = face_normalized.flatten().astype(float)
            
            # Normalize to 0-1 range
            features = features / 255.0
            
            return features.tolist()
            
        except Exception as e:
            print(f"Error extracting face features: {e}")
            return None
    
    def compare_faces(self, known_features: List[float], unknown_features: List[float]) -> Tuple[bool, float]:
        """
        Compare two face feature vectors using correlation
        """
        try:
            known_np = np.array(known_features)
            unknown_np = np.array(unknown_features)
            
            # Calculate correlation coefficient
            correlation = np.corrcoef(known_np, unknown_np)[0, 1]
            
            # Handle NaN case
            if np.isnan(correlation):
                correlation = 0.0
            
            # Convert to similarity (0-1, higher is more similar)
            similarity = (correlation + 1) / 2
            
            # Check if faces match
            is_match = similarity >= self.tolerance
            
            return is_match, float(1 - similarity)  # Return distance (lower is better)
            
        except Exception as e:
            print(f"Error comparing faces: {e}")
            return False, 1.0
    
    def find_best_match(self, unknown_features: List[float], known_faces: List[Tuple[int, List[float]]]) -> Optional[Tuple[int, float]]:
        """
        Find the best matching face from known faces
        """
        try:
            if not known_faces:
                print("DEBUG: No known faces to compare against")
                return None
            
            print(f"DEBUG: Comparing unknown face against {len(known_faces)} known faces")
            
            best_match_id = None
            best_distance = float('inf')
            
            for employee_id, known_features in known_faces:
                is_match, distance = self.compare_faces(known_features, unknown_features)
                print(f"DEBUG: Employee {employee_id}: distance={distance:.4f}, match={is_match}")
                
                if is_match and distance < best_distance:
                    best_distance = distance
                    best_match_id = employee_id
            
            if best_match_id is not None:
                print(f"DEBUG: Best match found - Employee {best_match_id} with distance {best_distance:.4f}")
                return best_match_id, best_distance
            else:
                print("DEBUG: No match found within tolerance")
                return None
            
        except Exception as e:
            print(f"Error finding best match: {e}")
            return None
    
    def validate_image_quality(self, image_data: bytes) -> dict:
        """
        Validate image for face detection
        """
        try:
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {'valid': False, 'reason': 'Invalid image format'}
            
            height, width = image.shape[:2]
            
            # Check resolution
            if width < 200 or height < 200:
                return {'valid': False, 'reason': 'Image resolution too low (minimum 200x200)'}
            
            if width > 2000 or height > 2000:
                return {'valid': False, 'reason': 'Image resolution too high (maximum 2000x2000)'}
            
            # Convert to grayscale for face detection
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 3, minSize=(30, 30))
            
            if len(faces) == 0:
                return {'valid': False, 'reason': 'No face detected in image'}
            
            if len(faces) > 1:
                return {'valid': False, 'reason': 'Multiple faces detected. Please use image with single face'}
            
            # Check face size
            x, y, w, h = faces[0]
            if w < 30 or h < 30:
                return {'valid': False, 'reason': 'Face too small in image'}
            
            return {'valid': True, 'reason': 'Image quality is good'}
            
        except Exception as e:
            return {'valid': False, 'reason': f'Error validating image: {str(e)}'}
    
    def detect_faces_in_image(self, image_data: bytes) -> List[dict]:
        """
        Detect all faces in image
        """
        try:
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return []
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 3, minSize=(30, 30))
            
            face_list = []
            for i, (x, y, w, h) in enumerate(faces):
                face_list.append({
                    'face_id': i,
                    'location': {
                        'x': int(x),
                        'y': int(y),
                        'width': int(w),
                        'height': int(h)
                    }
                })
            
            return face_list
            
        except Exception as e:
            print(f"Error detecting faces: {e}")
            return []

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
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            # Use more strict parameters to avoid false detections
            faces = self.face_cascade.detectMultiScale(gray, 1.2, 5, minSize=(50, 50), maxSize=(300, 300))
            
            face_list = []
            recognized_list = []
            
            for i, (x, y, w, h) in enumerate(faces):
                # Convert to relative coordinates (0-1 range)
                face_info = {
                    'id': i,
                    'x': x / width,
                    'y': y / height,
                    'width': w / width,
                    'height': h / height,
                    'absolute': {
                        'x': int(x),
                        'y': int(y),
                        'width': int(w),
                        'height': int(h)
                    }
                }
                face_list.append(face_info)
                
                # Try to extract features for this face
                face_roi = gray[y:y+h, x:x+w]
                face_resized = cv2.resize(face_roi, (100, 100))
                face_normalized = cv2.equalizeHist(face_resized)
                features = face_normalized.flatten().astype(float) / 255.0
                
                # Try to recognize this face
                recognized_list.append({
                    'face_id': i,
                    'employee_name': None,
                    'employee_id': None,
                    'confidence': 0.0,
                    'features': features.tolist()
                })
            
            return {
                'faces': face_list,
                'recognized': recognized_list,
                'image_dimensions': {'width': width, 'height': height}
            }
            
        except Exception as e:
            print(f"Error in real-time face detection: {e}")
            return {'faces': [], 'recognized': []}

    def save_face_image(self, image_data: bytes, employee_id: str) -> Optional[str]:
        """
        Save face image to uploads directory
        """
        try:
            # Create uploads directory if it doesn't exist
            upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'uploads', 'faces')
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

# Global instance
simple_face_service = SimpleFaceService()
