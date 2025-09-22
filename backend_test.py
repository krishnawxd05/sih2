import requests
import sys
import json
import io
import pandas as pd
from datetime import datetime, timedelta

class EduPredictAPITester:
    def __init__(self, base_url="https://mentorview.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_student_id = "TEST001"

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        
        if files is None and data is not None:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}...")

            return success, response.json() if response.text and response.status_code < 500 else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def create_test_excel_file(self, file_type):
        """Create test Excel files for different data types"""
        if file_type == "students":
            data = {
                'student_id': [self.test_student_id, 'TEST002', 'TEST003'],
                'name': ['John Doe', 'Jane Smith', 'Bob Johnson'],
                'email': ['john@test.com', 'jane@test.com', 'bob@test.com'],
                'phone': ['1234567890', '0987654321', '1122334455'],
                'course': ['Computer Science', 'Mathematics', 'Physics'],
                'semester': [3, 2, 4]
            }
        elif file_type == "attendance":
            data = {
                'student_id': [self.test_student_id, self.test_student_id, 'TEST002'],
                'subject': ['Math', 'Physics', 'Math'],
                'total_classes': [20, 25, 20],
                'attended_classes': [14, 18, 19],
                'attendance_percentage': [70.0, 72.0, 95.0],
                'month': ['January', 'January', 'January'],
                'year': [2024, 2024, 2024]
            }
        elif file_type == "assessments":
            data = {
                'student_id': [self.test_student_id, self.test_student_id, 'TEST002'],
                'subject': ['Math', 'Physics', 'Math'],
                'assessment_type': ['quiz', 'midterm', 'quiz'],
                'score': [65.0, 45.0, 85.0],
                'max_score': [100.0, 100.0, 100.0],
                'percentage': [65.0, 45.0, 85.0],
                'date': ['2024-01-15', '2024-01-20', '2024-01-15'],
                'attempt_number': [1, 2, 1]
            }
        elif file_type == "fees":
            data = {
                'student_id': [self.test_student_id, 'TEST002', 'TEST003'],
                'amount_due': [5000.0, 5000.0, 5000.0],
                'amount_paid': [3000.0, 5000.0, 0.0],
                'due_date': ['2024-01-31', '2024-01-31', '2024-01-31'],
                'paid_date': ['2024-01-25', '2024-01-30', ''],
                'status': ['pending', 'paid', 'overdue'],
                'semester': [1, 1, 1]
            }
        
        df = pd.DataFrame(data)
        excel_buffer = io.BytesIO()
        df.to_excel(excel_buffer, index=False)
        excel_buffer.seek(0)
        return excel_buffer

    def test_file_uploads(self):
        """Test all file upload endpoints"""
        print("\n" + "="*50)
        print("TESTING FILE UPLOAD ENDPOINTS")
        print("="*50)
        
        upload_types = ['students', 'attendance', 'assessments', 'fees']
        
        for upload_type in upload_types:
            excel_file = self.create_test_excel_file(upload_type)
            files = {'file': (f'test_{upload_type}.xlsx', excel_file, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            
            success, response = self.run_test(
                f"Upload {upload_type}",
                "POST",
                f"upload/{upload_type}",
                200,
                files=files
            )
            
            if not success:
                print(f"⚠️  Upload {upload_type} failed - this may affect subsequent tests")

    def test_dashboard_endpoints(self):
        """Test dashboard-related endpoints"""
        print("\n" + "="*50)
        print("TESTING DASHBOARD ENDPOINTS")
        print("="*50)
        
        # Test dashboard overview
        self.run_test(
            "Dashboard Overview",
            "GET",
            "dashboard/overview",
            200
        )
        
        # Test get all students
        self.run_test(
            "Get All Students",
            "GET",
            "students",
            200
        )
        
        # Test get at-risk students
        self.run_test(
            "Get At-Risk Students",
            "GET",
            "students/at-risk",
            200
        )
        
        # Test get notifications
        self.run_test(
            "Get Notifications",
            "GET",
            "notifications",
            200
        )

    def test_ai_analysis(self):
        """Test AI analysis endpoint"""
        print("\n" + "="*50)
        print("TESTING AI ANALYSIS ENDPOINT")
        print("="*50)
        
        print("⏳ Testing AI analysis - this may take a few seconds due to GPT-5 processing...")
        success, response = self.run_test(
            f"Analyze Student {self.test_student_id}",
            "POST",
            f"analyze/student/{self.test_student_id}",
            200
        )
        
        if success:
            print("✅ AI Analysis completed successfully!")
            if 'risk_level' in response:
                print(f"   Risk Level: {response.get('risk_level')}")
                print(f"   Risk Score: {response.get('risk_score')}")
                print(f"   Risk Factors: {response.get('risk_factors')}")
        else:
            print("❌ AI Analysis failed - check GPT-5 integration and API key")

    def test_notification_management(self):
        """Test notification management"""
        print("\n" + "="*50)
        print("TESTING NOTIFICATION MANAGEMENT")
        print("="*50)
        
        # First get notifications to find one to mark as read
        success, notifications = self.run_test(
            "Get Notifications for Management",
            "GET",
            "notifications",
            200
        )
        
        if success and notifications and len(notifications) > 0:
            notification_id = notifications[0].get('id')
            if notification_id:
                self.run_test(
                    "Mark Notification as Read",
                    "PUT",
                    f"notifications/{notification_id}/read",
                    200
                )
            else:
                print("⚠️  No notification ID found to test marking as read")
        else:
            print("⚠️  No notifications found to test management features")

    def test_error_handling(self):
        """Test error handling scenarios"""
        print("\n" + "="*50)
        print("TESTING ERROR HANDLING")
        print("="*50)
        
        # Test analyzing non-existent student
        self.run_test(
            "Analyze Non-existent Student",
            "POST",
            "analyze/student/NONEXISTENT",
            404
        )
        
        # Test invalid file upload (should fail gracefully)
        invalid_file = io.BytesIO(b"invalid content")
        files = {'file': ('invalid.txt', invalid_file, 'text/plain')}
        
        self.run_test(
            "Upload Invalid File",
            "POST",
            "upload/students",
            400,
            files=files
        )

def main():
    print("🚀 Starting EduPredict API Testing...")
    print("="*60)
    
    tester = EduPredictAPITester()
    
    # Test sequence
    tester.test_file_uploads()
    tester.test_dashboard_endpoints()
    tester.test_ai_analysis()
    tester.test_notification_management()
    tester.test_error_handling()
    
    # Print final results
    print("\n" + "="*60)
    print("📊 FINAL TEST RESULTS")
    print("="*60)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Backend is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the details above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())