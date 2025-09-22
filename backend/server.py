from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import pandas as pd
import io
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# LLM Integration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Initialize LLM Chat
llm_chat = LlmChat(
    api_key=EMERGENT_LLM_KEY,
    session_id="dropout_prediction_system",
    system_message="""You are an AI assistant specialized in educational data analysis and dropout risk prediction. 
    Your role is to analyze student data including attendance, test scores, fee payments, and academic attempts to predict dropout risk.
    
    Provide risk assessments in the following format:
    - Risk Level: LOW/MEDIUM/HIGH
    - Risk Score: 0-100
    - Key Risk Factors: List the main concerns
    - Recommendations: Specific counseling recommendations
    - Intervention Priority: IMMEDIATE/MODERATE/LOW
    
    Consider these factors:
    - Attendance below 75% = HIGH risk factor
    - Declining test scores = MEDIUM-HIGH risk factor  
    - Multiple failed attempts per subject = HIGH risk factor
    - Fee payment delays = MEDIUM risk factor
    - Combination of factors increases overall risk significantly"""
).with_model("openai", "gpt-5")

# Define Models
class Student(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    name: str
    email: str
    phone: Optional[str] = None
    course: str
    semester: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StudentAttendance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    subject: str
    total_classes: int
    attended_classes: int
    attendance_percentage: float
    month: str
    year: int

class StudentAssessment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    subject: str
    assessment_type: str  # quiz, midterm, final, assignment
    score: float
    max_score: float
    percentage: float
    date: datetime
    attempt_number: int = 1

class FeePayment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    amount_due: float
    amount_paid: float
    due_date: datetime
    paid_date: Optional[datetime] = None
    status: str  # paid, pending, overdue
    semester: int

class RiskAssessment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    risk_level: str  # LOW, MEDIUM, HIGH
    risk_score: float  # 0-100
    risk_factors: List[str]
    recommendations: List[str]
    intervention_priority: str  # IMMEDIATE, MODERATE, LOW
    assessment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ai_analysis: str

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    message: str
    type: str  # risk_alert, payment_reminder, academic_concern
    priority: str  # high, medium, low
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Upload endpoints
@api_router.post("/upload/students")
async def upload_students(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        students = []
        for _, row in df.iterrows():
            student = Student(
                student_id=str(row['student_id']),
                name=str(row['name']),
                email=str(row['email']),
                phone=str(row.get('phone', '')),
                course=str(row['course']),
                semester=int(row['semester'])
            )
            students.append(student.dict())
        
        # Insert into database
        await db.students.insert_many(students)
        return {"message": f"Successfully uploaded {len(students)} students"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

@api_router.post("/upload/attendance")
async def upload_attendance(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        attendance_records = []
        for _, row in df.iterrows():
            attendance = StudentAttendance(
                student_id=str(row['student_id']),
                subject=str(row['subject']),
                total_classes=int(row['total_classes']),
                attended_classes=int(row['attended_classes']),
                attendance_percentage=float(row['attendance_percentage']),
                month=str(row['month']),
                year=int(row['year'])
            )
            attendance_records.append(attendance.dict())
        
        await db.attendance.insert_many(attendance_records)
        return {"message": f"Successfully uploaded {len(attendance_records)} attendance records"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing attendance file: {str(e)}")

@api_router.post("/upload/assessments")
async def upload_assessments(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        assessments = []
        for _, row in df.iterrows():
            assessment = StudentAssessment(
                student_id=str(row['student_id']),
                subject=str(row['subject']),
                assessment_type=str(row['assessment_type']),
                score=float(row['score']),
                max_score=float(row['max_score']),
                percentage=float(row['percentage']),
                date=pd.to_datetime(row['date']),
                attempt_number=int(row.get('attempt_number', 1))
            )
            assessments.append(assessment.dict())
        
        await db.assessments.insert_many(assessments)
        return {"message": f"Successfully uploaded {len(assessments)} assessment records"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing assessments file: {str(e)}")

@api_router.post("/upload/fees")
async def upload_fees(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        fee_records = []
        for _, row in df.iterrows():
            fee = FeePayment(
                student_id=str(row['student_id']),
                amount_due=float(row['amount_due']),
                amount_paid=float(row.get('amount_paid', 0)),
                due_date=pd.to_datetime(row['due_date']),
                paid_date=pd.to_datetime(row['paid_date']) if pd.notna(row.get('paid_date')) else None,
                status=str(row['status']),
                semester=int(row['semester'])
            )
            fee_records.append(fee.dict())
        
        await db.fees.insert_many(fee_records)
        return {"message": f"Successfully uploaded {len(fee_records)} fee records"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing fees file: {str(e)}")

# Analysis endpoints
@api_router.post("/analyze/student/{student_id}")
async def analyze_student_risk(student_id: str):
    try:
        # Get student data
        student = await db.students.find_one({"student_id": student_id})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Get all related data
        attendance = await db.attendance.find({"student_id": student_id}).to_list(None)
        assessments = await db.assessments.find({"student_id": student_id}).to_list(None)
        fees = await db.fees.find({"student_id": student_id}).to_list(None)
        
        # Prepare data for AI analysis
        student_data = {
            "student_info": {
                "name": student['name'],
                "course": student['course'],
                "semester": student['semester']
            },
            "attendance_summary": [],
            "assessment_summary": [],
            "fee_summary": []
        }
        
        # Process attendance data
        for att in attendance:
            student_data["attendance_summary"].append({
                "subject": att['subject'],
                "attendance_percentage": att['attendance_percentage'],
                "month": att['month'],
                "year": att['year']
            })
        
        # Process assessment data
        for ass in assessments:
            student_data["assessment_summary"].append({
                "subject": ass['subject'],
                "type": ass['assessment_type'],
                "percentage": ass['percentage'],
                "attempt_number": ass['attempt_number'],
                "date": ass['date'].isoformat() if isinstance(ass['date'], datetime) else str(ass['date'])
            })
        
        # Process fee data
        for fee in fees:
            student_data["fee_summary"].append({
                "amount_due": fee['amount_due'],
                "amount_paid": fee['amount_paid'],
                "status": fee['status'],
                "semester": fee['semester']
            })
        
        # AI Analysis
        analysis_prompt = f"""
        Analyze this student's data for dropout risk:
        
        Student Data: {json.dumps(student_data, indent=2)}
        
        Please provide a comprehensive risk assessment following the specified format.
        """
        
        user_message = UserMessage(text=analysis_prompt)
        ai_response = await llm_chat.send_message(user_message)
        
        # Parse AI response (simplified - in production, you'd want more robust parsing)
        ai_text = ai_response
        
        # Extract risk level and score (basic parsing)
        risk_level = "MEDIUM"  # Default
        risk_score = 50.0  # Default
        
        if "HIGH" in ai_text.upper():
            risk_level = "HIGH"
            risk_score = 80.0
        elif "LOW" in ai_text.upper():
            risk_level = "LOW"
            risk_score = 25.0
        
        # Create risk assessment
        risk_assessment = RiskAssessment(
            student_id=student_id,
            risk_level=risk_level,
            risk_score=risk_score,
            risk_factors=["Low attendance", "Declining scores", "Fee delays"],  # Simplified
            recommendations=["Immediate counseling", "Academic support", "Financial assistance"],  # Simplified
            intervention_priority="MODERATE" if risk_level == "MEDIUM" else risk_level.lower().capitalize(),
            ai_analysis=ai_text
        )
        
        # Save assessment
        await db.risk_assessments.insert_one(risk_assessment.dict())
        
        # Create notification if high risk
        if risk_level == "HIGH":
            notification = Notification(
                student_id=student_id,
                message=f"HIGH RISK ALERT: {student['name']} requires immediate intervention",
                type="risk_alert",
                priority="high"
            )
            await db.notifications.insert_one(notification.dict())
        
        return risk_assessment.dict()
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing student: {str(e)}")

# Dashboard endpoints
@api_router.get("/dashboard/overview")
async def get_dashboard_overview():
    try:
        total_students = await db.students.count_documents({})
        high_risk = await db.risk_assessments.count_documents({"risk_level": "HIGH"})
        medium_risk = await db.risk_assessments.count_documents({"risk_level": "MEDIUM"})
        low_risk = await db.risk_assessments.count_documents({"risk_level": "LOW"})
        unread_notifications = await db.notifications.count_documents({"is_read": False})
        
        return {
            "total_students": total_students,
            "risk_distribution": {
                "high": high_risk,
                "medium": medium_risk,
                "low": low_risk
            },
            "unread_notifications": unread_notifications
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard data: {str(e)}")

@api_router.get("/students/at-risk")
async def get_at_risk_students():
    try:
        # Get recent risk assessments
        risk_assessments = await db.risk_assessments.find().sort("assessment_date", -1).to_list(None)
        
        at_risk_students = []
        for assessment in risk_assessments:
            if assessment['risk_level'] in ['HIGH', 'MEDIUM', 'LOW']:
                student = await db.students.find_one({"student_id": assessment['student_id']})
                if student:
                    # Convert ObjectId to string
                    if '_id' in assessment:
                        assessment['_id'] = str(assessment['_id'])
                    if '_id' in student:
                        student['_id'] = str(student['_id'])
                        
                    student_risk = {
                        "student_id": assessment['student_id'],
                        "name": student['name'],
                        "course": student['course'],
                        "risk_level": assessment['risk_level'],
                        "risk_score": assessment['risk_score'],
                        "risk_factors": assessment['risk_factors'],
                        "intervention_priority": assessment['intervention_priority'],
                        "assessment_date": assessment['assessment_date'].isoformat() if isinstance(assessment['assessment_date'], datetime) else str(assessment['assessment_date'])
                    }
                    at_risk_students.append(student_risk)
        
        return at_risk_students
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching at-risk students: {str(e)}")

@api_router.get("/notifications")
async def get_notifications():
    try:
        notifications = await db.notifications.find().sort("created_at", -1).to_list(50)
        # Convert MongoDB ObjectId to string for JSON serialization
        for notification in notifications:
            if '_id' in notification:
                notification['_id'] = str(notification['_id'])
        return notifications
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching notifications: {str(e)}")

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    try:
        await db.notifications.update_one(
            {"id": notification_id},
            {"$set": {"is_read": True}}
        )
        return {"message": "Notification marked as read"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating notification: {str(e)}")

@api_router.get("/students")
async def get_all_students():
    try:
        students = await db.students.find().to_list(None)
        # Convert MongoDB ObjectId to string for JSON serialization
        for student in students:
            if '_id' in student:
                student['_id'] = str(student['_id'])
        return students
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching students: {str(e)}")

# New endpoints for data management pages
@api_router.get("/assessments/all")
async def get_all_assessments():
    try:
        assessments = await db.assessments.find().to_list(None)
        # Convert MongoDB ObjectId and datetime to string for JSON serialization
        for assessment in assessments:
            if '_id' in assessment:
                assessment['_id'] = str(assessment['_id'])
            if 'date' in assessment and isinstance(assessment['date'], datetime):
                assessment['date'] = assessment['date'].isoformat()
        return assessments
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching assessments: {str(e)}")

@api_router.get("/fees/all")
async def get_all_fees():
    try:
        fees = await db.fees.find().to_list(None)
        # Convert MongoDB ObjectId and datetime to string for JSON serialization
        for fee in fees:
            if '_id' in fee:
                fee['_id'] = str(fee['_id'])
            if 'due_date' in fee and isinstance(fee['due_date'], datetime):
                fee['due_date'] = fee['due_date'].isoformat()
            if 'paid_date' in fee and isinstance(fee['paid_date'], datetime):
                fee['paid_date'] = fee['paid_date'].isoformat()
        return fees
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching fees: {str(e)}")

@api_router.get("/attendance/all")
async def get_all_attendance():
    try:
        attendance = await db.attendance.find().to_list(None)
        # Convert MongoDB ObjectId to string for JSON serialization
        for record in attendance:
            if '_id' in record:
                record['_id'] = str(record['_id'])
        return attendance
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching attendance: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    