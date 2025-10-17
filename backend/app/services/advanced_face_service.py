"""
Advanced face recognition service with multiple angles and facial landmarks
"""
import cv2
import numpy as np
import json
import os
from typing import List, Optional, Tuple, Dict
# import dlib  # Optional - will handle gracefully if not available
from PIL import Image
import io

class AdvancedFaceService:
    def __init__(self):
        # Load OpenCV face cascade
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Try to load dlib's facial landmark predictor
        try:
            import dlib
            # Download shape predictor if not exists
            predictor_path = "shape_predictor_68_face_landmarks.dat"
            if not os.path.exists(predictor_path):
                print("⚠️  Facial landmark predictor not found. Using basic face detection only.")
                self.predictor = None
            else:
                self.predictor = dlib.shape_predictor(predictor_path)
        except ImportError:
            print("⚠️  dlib not installed. Using basic face detection only.")
            self.predictor = None
        except Exception as e:
            print(f"⚠️  Could not load dlib predictor: {e}")
            self.predictor = None
        
        self.tolerance = 0.6
    
    def extract_facial_landmarks(self, image_data: bytes) -> Optional[Dict]:
        """
        Extract 68 facial landmarks from face image
        Returns dictionary with landmark points and face features
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return None
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Detect faces
            faces = self.face_cascade.detectMultiScale(gray, 1.2, 5, minSize=(50, 50))
            
            if len(faces) == 0:
                return None
            
            # Get the largest face
            largest_face = max(faces, key=lambda x: x[2] * x[3])
            x, y, w, h = largest_face
            
            landmarks_data = {
                'face_box': {'x': int(x), 'y': int(y), 'width': int(w), 'height': int(h)},
                'landmarks': [],
                'features': {}
            }
            
            # If dlib predictor is available, extract detailed landmarks
            if self.predictor:
                try:
                    import dlib
                    # Convert to dlib rectangle
                    rect = dlib.rectangle(int(x), int(y), int(x + w), int(y + h))
                except ImportError:
                    # Fallback to basic features if dlib not available
                    landmarks_data['features'] = self._extract_basic_features(x, y, w, h)
                    return landmarks_data
                
                # Get facial landmarks
                landmarks = self.predictor(gray, rect)
                
                # Extract landmark points
                landmark_points = []
                for i in range(68):
                    point = landmarks.part(i)
                    landmark_points.append({'x': int(point.x), 'y': int(point.y)})
                
                landmarks_data['landmarks'] = landmark_points
                
                # Extract key facial features
                landmarks_data['features'] = self._extract_facial_features(landmark_points)
            else:
                # Basic feature extraction without dlib
                landmarks_data['features'] = self._extract_basic_features(x, y, w, h)
            
            return landmarks_data
            
        except Exception as e:
            print(f"Error extracting facial landmarks: {e}")
            return None
    
    def _extract_facial_features(self, landmarks: List[Dict]) -> Dict:
        """Extract key facial features from 68 landmarks"""
        try:
            features = {}
            
            # Eye features (landmarks 36-47)
            left_eye = landmarks[36:42]
            right_eye = landmarks[42:48]
            
            # Calculate eye centers
            left_eye_center = self._calculate_center(left_eye)
            right_eye_center = self._calculate_center(right_eye)
            
            features['left_eye_center'] = left_eye_center
            features['right_eye_center'] = right_eye_center
            features['eye_distance'] = float(self._calculate_distance(left_eye_center, right_eye_center))
            
            # Nose features (landmarks 27-35)
            nose_tip = landmarks[30]  # Nose tip
            nose_bridge = landmarks[27]  # Nose bridge
            
            features['nose_tip'] = nose_tip
            features['nose_bridge'] = nose_bridge
            features['nose_length'] = float(self._calculate_distance(nose_bridge, nose_tip))
            
            # Mouth features (landmarks 48-67)
            mouth_corners = [landmarks[48], landmarks[54]]  # Left and right corners
            mouth_center = landmarks[51]  # Upper lip center
            
            features['mouth_corners'] = mouth_corners
            features['mouth_center'] = mouth_center
            features['mouth_width'] = float(self._calculate_distance(mouth_corners[0], mouth_corners[1]))
            
            # Face outline (landmarks 0-16)
            jaw_line = landmarks[0:17]
            features['jaw_line'] = jaw_line
            
            # Calculate face ratios for better matching (ensure float conversion)
            features['face_ratios'] = {
                'eye_to_nose_ratio': float(features['eye_distance'] / features['nose_length']) if features['nose_length'] > 0 else 0.0,
                'nose_to_mouth_ratio': float(features['nose_length'] / features['mouth_width']) if features['mouth_width'] > 0 else 0.0,
                'eye_to_mouth_ratio': float(features['eye_distance'] / features['mouth_width']) if features['mouth_width'] > 0 else 0.0
            }
            
            return features
            
        except Exception as e:
            print(f"Error extracting facial features: {e}")
            return {}
    
    def _extract_basic_features(self, x: int, y: int, w: int, h: int) -> Dict:
        """Extract basic features when dlib is not available"""
        return {
            'face_center': {'x': int(x + w//2), 'y': int(y + h//2)},
            'face_width': int(w),
            'face_height': int(h),
            'face_ratio': float(w / h) if h > 0 else 1.0
        }
    
    def _calculate_center(self, points: List[Dict]) -> Dict:
        """Calculate center point of a list of points"""
        if not points:
            return {'x': 0, 'y': 0}
        
        avg_x = sum(p['x'] for p in points) / len(points)
        avg_y = sum(p['y'] for p in points) / len(points)
        
        return {'x': int(avg_x), 'y': int(avg_y)}
    
    def _make_json_serializable(self, obj):
        """Convert numpy types to native Python types for JSON serialization"""
        if isinstance(obj, dict):
            return {key: self._make_json_serializable(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._make_json_serializable(item) for item in obj]
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        else:
            return obj
    
    def _calculate_distance(self, point1: Dict, point2: Dict) -> float:
        """Calculate Euclidean distance between two points"""
        dx = point1['x'] - point2['x']
        dy = point1['y'] - point2['y']
        return np.sqrt(dx*dx + dy*dy)
    
    def extract_multiple_face_encodings(self, image_data_list: List[bytes]) -> Dict:
        """
        Extract face encodings from multiple images (different angles)
        Returns dictionary with encodings and landmarks for each image
        """
        try:
            multi_data = {
                'encodings': [],
                'landmarks': [],
                'angles': [],
                'quality_scores': []
            }
            
            for i, image_data in enumerate(image_data_list):
                # Extract basic face features
                face_features = self.extract_face_features_for_checkin(image_data)
                if face_features:
                    multi_data['encodings'].append(face_features)
                
                # Extract facial landmarks
                landmarks = self.extract_facial_landmarks(image_data)
                if landmarks:
                    multi_data['landmarks'].append(landmarks)
                
                # Estimate angle (basic implementation)
                angle = self._estimate_face_angle(image_data)
                multi_data['angles'].append(angle)
                
                # Calculate quality score
                quality = self._calculate_image_quality(image_data)
                multi_data['quality_scores'].append(quality)
            
            # Ensure all data is JSON serializable
            multi_data = self._make_json_serializable(multi_data)
            return multi_data
            
        except Exception as e:
            print(f"Error extracting multiple face encodings: {e}")
            return {'encodings': [], 'landmarks': [], 'angles': [], 'quality_scores': []}
    
    def extract_face_features_for_checkin(self, image_data: bytes) -> Optional[List[float]]:
        """Extract face features for check-in (same as before but enhanced)"""
        try:
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return None
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 3, minSize=(30, 30))
            
            if len(faces) == 0:
                return None
            
            # Get the largest face
            largest_face = max(faces, key=lambda x: x[2] * x[3])
            x, y, w, h = largest_face
            
            # Extract face region
            face_roi = gray[y:y+h, x:x+w]
            face_resized = cv2.resize(face_roi, (100, 100))
            face_normalized = cv2.equalizeHist(face_resized)
            
            # Convert to feature vector
            features = face_normalized.flatten().astype(float) / 255.0
            
            return features.tolist()
            
        except Exception as e:
            print(f"Error extracting face features: {e}")
            return None
    
    def _estimate_face_angle(self, image_data: bytes) -> str:
        """Estimate face angle (front, left, right, etc.)"""
        try:
            landmarks = self.extract_facial_landmarks(image_data)
            if not landmarks or not landmarks.get('features'):
                return 'unknown'
            
            features = landmarks['features']
            
            # Simple angle estimation based on eye positions
            if 'left_eye_center' in features and 'right_eye_center' in features:
                left_eye = features['left_eye_center']
                right_eye = features['right_eye_center']
                
                # Calculate eye level difference
                eye_diff = abs(left_eye['y'] - right_eye['y'])
                eye_distance = features.get('eye_distance', 1)
                
                tilt_ratio = eye_diff / eye_distance if eye_distance > 0 else 0
                
                if tilt_ratio < 0.1:
                    return 'front'
                elif left_eye['y'] < right_eye['y']:
                    return 'left_tilt'
                else:
                    return 'right_tilt'
            
            return 'front'  # Default
            
        except Exception as e:
            print(f"Error estimating face angle: {e}")
            return 'unknown'
    
    def _calculate_image_quality(self, image_data: bytes) -> float:
        """Calculate image quality score (0-1)"""
        try:
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return 0.0
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Calculate sharpness using Laplacian variance
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Normalize to 0-1 range (empirically determined thresholds)
            quality_score = min(float(laplacian_var) / 1000.0, 1.0)
            
            return float(quality_score)
            
        except Exception as e:
            print(f"Error calculating image quality: {e}")
            return 0.0
    
    def compare_multi_encodings(self, unknown_features: List[float], known_multi_data: Dict) -> Tuple[bool, float]:
        """
        Compare unknown face against multiple stored encodings and landmarks
        Returns best match result
        """
        try:
            if not known_multi_data.get('encodings'):
                return False, 1.0
            
            best_match = False
            best_distance = float('inf')
            
            # Compare against each stored encoding
            for encoding in known_multi_data['encodings']:
                if encoding:
                    # Calculate similarity
                    distance = np.linalg.norm(np.array(unknown_features) - np.array(encoding))
                    
                    if distance < best_distance:
                        best_distance = distance
                        best_match = distance < self.tolerance
            
            return best_match, best_distance
            
        except Exception as e:
            print(f"Error comparing multi encodings: {e}")
            return False, 1.0
    
    def save_face_image(self, image_data: bytes, filename_prefix: str) -> Optional[str]:
        """
        Save face image to disk for debugging/verification purposes
        Returns the saved file path or None if failed
        """
        try:
            import os
            from datetime import datetime
            
            # Create uploads directory if it doesn't exist
            upload_dir = "/app/uploads/faces"
            os.makedirs(upload_dir, exist_ok=True)
            
            # Generate unique filename
            timestamp = int(datetime.now().timestamp() * 1000000)
            filename = f"{filename_prefix}_{timestamp}.jpg"
            file_path = os.path.join(upload_dir, filename)
            
            # Save image data to file
            with open(file_path, 'wb') as f:
                f.write(image_data)
            
            print(f"DEBUG: Saved face image to {file_path}")
            return file_path
            
        except Exception as e:
            print(f"Error saving face image: {e}")
            return None

# Global instance
advanced_face_service = AdvancedFaceService()
