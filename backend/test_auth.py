"""
Test script to verify authentication endpoints
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8001"

def test_authentication():
    """Test the authentication flow"""
    print("Testing Authentication System...")
    
    # Test 1: Login with admin credentials
    print("\n1. Testing login with admin credentials...")
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/v1/auth/token",
        data=login_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    if response.status_code == 200:
        token_data = response.json()
        access_token = token_data["access_token"]
        print("SUCCESS: Login successful!")
        print(f"Access Token: {access_token[:50]}...")
        
        # Test 2: Get current user info
        print("\n2. Testing get current user...")
        headers = {"Authorization": f"Bearer {access_token}"}
        user_response = requests.get(f"{BASE_URL}/api/v1/auth/me", headers=headers)
        
        if user_response.status_code == 200:
            user_data = user_response.json()
            print("SUCCESS: User info retrieved!")
            print(f"User: {user_data['username']} ({user_data['role']})")
        else:
            print(f"ERROR: Failed to get user info: {user_response.text}")
        
        # Test 3: Try to register a new user (accounting role)
        print("\n3. Testing user registration...")
        new_user_data = {
            "username": "accounting1",
            "email": "accounting1@attendance.com",
            "password": "accounting123",
            "role": "accounting"
        }
        
        register_response = requests.post(
            f"{BASE_URL}/api/v1/auth/register",
            json=new_user_data,
            headers=headers
        )
        
        if register_response.status_code == 200:
            new_user = register_response.json()
            print("SUCCESS: New user registered!")
            print(f"New User: {new_user['username']} ({new_user['role']})")
        else:
            print(f"ERROR: Failed to register user: {register_response.text}")
            
    else:
        print(f"ERROR: Login failed: {response.text}")
    
    # Test 4: Test invalid login
    print("\n4. Testing invalid login...")
    invalid_login = {
        "username": "invalid",
        "password": "invalid"
    }
    
    invalid_response = requests.post(
        f"{BASE_URL}/api/v1/auth/token",
        data=invalid_login,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    if invalid_response.status_code == 401:
        print("SUCCESS: Invalid login correctly rejected!")
    else:
        print(f"ERROR: Invalid login should have been rejected: {invalid_response.text}")

def test_api_endpoints():
    """Test basic API endpoints"""
    print("\n\nTesting Basic API Endpoints...")
    
    # Test root endpoint
    response = requests.get(f"{BASE_URL}/")
    if response.status_code == 200:
        data = response.json()
        print(f"SUCCESS: Root endpoint - {data['message']}")
    else:
        print(f"ERROR: Root endpoint failed: {response.text}")
    
    # Test health endpoint
    response = requests.get(f"{BASE_URL}/health")
    if response.status_code == 200:
        data = response.json()
        print(f"SUCCESS: Health endpoint - {data['status']}")
    else:
        print(f"ERROR: Health endpoint failed: {response.text}")

if __name__ == "__main__":
    try:
        test_api_endpoints()
        test_authentication()
        print("\n" + "="*50)
        print("Authentication system test completed!")
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to the server.")
        print("Make sure the FastAPI server is running on http://127.0.0.1:8001")
    except Exception as e:
        print(f"ERROR: Unexpected error: {e}")
