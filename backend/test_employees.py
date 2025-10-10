"""
Test script for employee management endpoints
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8001"

def get_auth_token():
    """Get authentication token"""
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
        return response.json()["access_token"]
    else:
        raise Exception(f"Failed to get auth token: {response.text}")

def test_employee_management():
    """Test employee management endpoints"""
    print("Testing Employee Management System...")
    
    # Get authentication token
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 1: Create a new employee
    print("\n1. Testing employee creation...")
    employee_data = {
        "employee_id": "EMP001",
        "name": "John Doe",
        "phone": "+1234567890",
        "email": "john.doe@company.com",
        "department": "Engineering",
        "position": "Software Developer",
        "salary_rate": 5000  # $50.00 per hour (in cents)
    }
    
    response = requests.post(
        f"{BASE_URL}/api/v1/employees/",
        json=employee_data,
        headers=headers
    )
    
    if response.status_code == 200:
        employee = response.json()
        employee_id = employee["id"]
        print("SUCCESS: Employee created!")
        print(f"Employee: {employee['name']} (ID: {employee['employee_id']})")
        
        # Test 2: Get employee by ID
        print("\n2. Testing get employee by ID...")
        response = requests.get(f"{BASE_URL}/api/v1/employees/{employee_id}", headers=headers)
        
        if response.status_code == 200:
            employee = response.json()
            print("SUCCESS: Employee retrieved!")
            print(f"Employee: {employee['name']} - {employee['position']}")
        else:
            print(f"ERROR: Failed to get employee: {response.text}")
        
        # Test 3: Update employee
        print("\n3. Testing employee update...")
        update_data = {
            "position": "Senior Software Developer",
            "salary_rate": 6000  # $60.00 per hour
        }
        
        response = requests.put(
            f"{BASE_URL}/api/v1/employees/{employee_id}",
            json=update_data,
            headers=headers
        )
        
        if response.status_code == 200:
            updated_employee = response.json()
            print("SUCCESS: Employee updated!")
            print(f"New position: {updated_employee['position']}")
            print(f"New salary rate: ${updated_employee['salary_rate']/100:.2f}/hour")
        else:
            print(f"ERROR: Failed to update employee: {response.text}")
        
        # Test 4: Get all employees
        print("\n4. Testing get all employees...")
        response = requests.get(f"{BASE_URL}/api/v1/employees/", headers=headers)
        
        if response.status_code == 200:
            employees_data = response.json()
            print("SUCCESS: Employees list retrieved!")
            print(f"Total employees: {employees_data['total']}")
            for emp in employees_data['employees']:
                print(f"  - {emp['name']} ({emp['employee_id']}) - {emp['position']}")
        else:
            print(f"ERROR: Failed to get employees: {response.text}")
        
        # Test 5: Search employee
        print("\n5. Testing employee search...")
        response = requests.get(
            f"{BASE_URL}/api/v1/employees/search/EMP001",
            headers=headers
        )
        
        if response.status_code == 200:
            employee = response.json()
            print("SUCCESS: Employee found by search!")
            print(f"Found: {employee['name']} ({employee['employee_id']})")
        else:
            print(f"ERROR: Failed to search employee: {response.text}")
        
        # Test 6: Create another employee
        print("\n6. Testing creation of second employee...")
        employee_data2 = {
            "employee_id": "EMP002",
            "name": "Jane Smith",
            "phone": "+1234567891",
            "email": "jane.smith@company.com",
            "department": "HR",
            "position": "HR Manager",
            "salary_rate": 4500
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/employees/",
            json=employee_data2,
            headers=headers
        )
        
        if response.status_code == 200:
            employee2 = response.json()
            print("SUCCESS: Second employee created!")
            print(f"Employee: {employee2['name']} (ID: {employee2['employee_id']})")
        else:
            print(f"ERROR: Failed to create second employee: {response.text}")
        
        # Test 7: Test duplicate employee ID
        print("\n7. Testing duplicate employee ID...")
        duplicate_data = {
            "employee_id": "EMP001",  # Same as first employee
            "name": "Duplicate Employee",
            "phone": "+1111111111",
            "email": "duplicate@company.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/employees/",
            json=duplicate_data,
            headers=headers
        )
        
        if response.status_code == 400:
            print("SUCCESS: Duplicate employee ID correctly rejected!")
        else:
            print(f"ERROR: Duplicate should have been rejected: {response.text}")
            
    else:
        print(f"ERROR: Failed to create employee: {response.text}")

if __name__ == "__main__":
    try:
        test_employee_management()
        print("\n" + "="*50)
        print("Employee management test completed!")
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to the server.")
        print("Make sure the FastAPI server is running on http://127.0.0.1:8001")
    except Exception as e:
        print(f"ERROR: Unexpected error: {e}")
