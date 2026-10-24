import os
import sys
import unittest
import json
import time

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app
from backend.database import get_db

class TestAuthFlows(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_01_valid_logins(self):
        # 1. HOD login
        res = self.client.post("/api/auth/login", json={
            "email": "hod.cs@college.edu",
            "password": "HodPass@2026"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue("token" in data)
        self.assertEqual(data["user"]["role"], "hod")
        self.assertNotIn("password_hash", data["user"])

        # 2. Faculty login
        res = self.client.post("/api/auth/login", json={
            "email": "sarah.jenkins@college.edu",
            "password": "Password@123"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["user"]["role"], "faculty")

        # 3. Student login
        res = self.client.post("/api/auth/login", json={
            "email": "alex.chen@student.edu",
            "password": "Password@123"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["user"]["role"], "student")

    def test_02_invalid_logins(self):
        # Wrong password
        res = self.client.post("/api/auth/login", json={
            "email": "hod.cs@college.edu",
            "password": "WrongPasswordXYZ"
        })
        self.assertEqual(res.status_code, 401)
        self.assertIn("error", res.get_json())

        # Unknown email
        res = self.client.post("/api/auth/login", json={
            "email": "nobody@college.edu",
            "password": "Password@123"
        })
        self.assertEqual(res.status_code, 401)
        self.assertIn("error", res.get_json())

        # Missing password
        res = self.client.post("/api/auth/login", json={
            "email": "hod.cs@college.edu"
        })
        self.assertEqual(res.status_code, 400)

    def test_03_registration_validation_and_success(self):
        ts = int(time.time() * 1000)
        student_email = f"test.student.{ts}@student.edu"

        # 1. Password mismatch
        res = self.client.post("/api/auth/signup", json={
            "role": "student",
            "name": "Test Student",
            "email": student_email,
            "password": "Password@123",
            "confirm_password": "DifferentPassword@123"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("do not match", res.get_json()["error"].lower())

        # 2. HOD registration forbidden
        res = self.client.post("/api/auth/signup", json={
            "role": "hod",
            "name": "Imposter HOD",
            "email": f"hod.fake.{ts}@college.edu",
            "password": "Password@123"
        })
        self.assertEqual(res.status_code, 400)

        # 3. Faculty registration with non-college email
        res = self.client.post("/api/auth/signup", json={
            "role": "faculty",
            "name": "External Faculty",
            "email": f"faculty.{ts}@gmail.com",
            "password": "Password@123",
            "designation": "Assistant Professor"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("official college domain", res.get_json()["error"])

        # 4. Valid Student Registration
        res = self.client.post("/api/auth/signup", json={
            "role": "student",
            "name": "John Doe Test",
            "email": student_email,
            "password": "SecurePassword@123",
            "confirm_password": "SecurePassword@123",
            "reg_no": f"RA{ts}",
            "semester": 6,
            "cgpa": 8.7,
            "strength": "fullstack",
            "languages": "Python, React, TypeScript"
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue("token" in data)
        self.assertEqual(data["user"]["email"], student_email)

        # 5. Duplicate Email Rejection
        res_dup = self.client.post("/api/auth/signup", json={
            "role": "student",
            "name": "Duplicate Student",
            "email": student_email,
            "password": "AnotherPassword@123"
        })
        self.assertEqual(res_dup.status_code, 409)
        self.assertIn("already exists", res_dup.get_json()["error"])

    def test_04_forgot_and_reset_password_flow(self):
        ts = int(time.time() * 1000)
        user_email = f"recovery.user.{ts}@student.edu"

        # First create user
        res_signup = self.client.post("/api/auth/signup", json={
            "role": "student",
            "name": "Recovery User",
            "email": user_email,
            "password": "OldPassword@123",
            "confirm_password": "OldPassword@123"
        })
        self.assertEqual(res_signup.status_code, 201)

        # 1. Forgot password for non-existent user
        res_fake = self.client.post("/api/auth/forgot-password", json={
            "email": "nonexistent@college.edu"
        })
        self.assertEqual(res_fake.status_code, 404)

        # 2. Forgot password for valid user
        res_forgot = self.client.post("/api/auth/forgot-password", json={
            "email": user_email
        })
        self.assertEqual(res_forgot.status_code, 200)
        forgot_data = res_forgot.get_json()
        self.assertIn("token", forgot_data)
        # Verify honesty about email service
        self.assertFalse(forgot_data["email_sent"])
        self.assertIn("instructions", forgot_data)

        reset_token = forgot_data["token"]

        # 3. Reset password with mismatching confirmation
        res_mismatch = self.client.post("/api/auth/reset-password", json={
            "token": reset_token,
            "new_password": "BrandNewPassword@456",
            "confirm_password": "WrongConfirm@456"
        })
        self.assertEqual(res_mismatch.status_code, 400)
        self.assertIn("Passwords do not match", res_mismatch.get_json()["error"])

        # 4. Reset password with invalid token
        res_bad_token = self.client.post("/api/auth/reset-password", json={
            "token": "invalid.jwt.token.string",
            "new_password": "BrandNewPassword@456",
            "confirm_password": "BrandNewPassword@456"
        })
        self.assertEqual(res_bad_token.status_code, 400)

        # 5. Reset password successfully
        res_reset = self.client.post("/api/auth/reset-password", json={
            "token": reset_token,
            "new_password": "BrandNewPassword@456",
            "confirm_password": "BrandNewPassword@456"
        })
        self.assertEqual(res_reset.status_code, 200)
        self.assertIn("successfully", res_reset.get_json()["message"])

        # 6. Verify old password no longer works
        res_old_login = self.client.post("/api/auth/login", json={
            "email": user_email,
            "password": "OldPassword@123"
        })
        self.assertEqual(res_old_login.status_code, 401)

        # 7. Verify new password logs in successfully
        res_new_login = self.client.post("/api/auth/login", json={
            "email": user_email,
            "password": "BrandNewPassword@456"
        })
        self.assertEqual(res_new_login.status_code, 200)
        self.assertEqual(res_new_login.get_json()["user"]["email"], user_email)


if __name__ == "__main__":
    unittest.main()
