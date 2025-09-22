import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Progress } from "./components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table";
import { 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Upload, 
  TrendingDown, 
  Bell,
  FileSpreadsheet,
  BarChart3,
  GraduationCap,
  AlertCircle,
  Menu,
  LogOut,
  Home,
  UserCheck,
  DollarSign,
  Calendar,
  Shield,
  Eye,
  Lock
} from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Login Component
const LoginPage = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simple authentication (in production, use proper authentication)
    if (credentials.username === 'admin' && credentials.password === 'admin123') {
      localStorage.setItem('edupredict_auth', 'authenticated');
      onLogin(true);
      toast.success('Login successful!');
    } else {
      toast.error('Invalid credentials! Use admin/admin123');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <GraduationCap className="h-10 w-10 text-blue-600 mr-2" />
            <h1 className="text-2xl font-bold text-slate-900">EduPredict</h1>
          </div>
          <CardTitle>Login to Dashboard</CardTitle>
          <CardDescription>AI-Powered Dropout Prevention System</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Username"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                className="w-full"
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                className="w-full"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <Lock className="h-4 w-4 mr-2" />
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Demo Credentials:</strong><br/>
              Username: admin<br/>
              Password: admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Sidebar Navigation
const Sidebar = ({ currentPage, setCurrentPage, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'students', name: 'Student Data', icon: Users },
    { id: 'assessments', name: 'Assessments', icon: BarChart3 },
    { id: 'fees', name: 'Fee Details', icon: DollarSign },
    { id: 'attendance', name: 'Attendance', icon: Calendar },
    { id: 'upload', name: 'Upload Data', icon: Upload }
  ];

  return (
    <div className="w-64 bg-white shadow-lg h-screen flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center space-x-3">
          <GraduationCap className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="font-bold text-slate-900">EduPredict</h2>
            <p className="text-xs text-slate-600">Admin Dashboard</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    currentPage === item.id 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t">
        <Button 
          onClick={onLogout} 
          variant="outline" 
          className="w-full flex items-center space-x-2"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
};

// Dashboard Component (Enhanced)
const Dashboard = ({ overview, atRiskStudents, analyzeStudent, uploading }) => {
  const getRiskColor = (level) => {
    switch (level) {
      case 'HIGH': return 'bg-red-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-blue-500';
      case 'SAFE': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'HIGH': return <AlertCircle className="h-4 w-4" />;
      case 'MEDIUM': return <AlertTriangle className="h-4 w-4" />;
      case 'LOW': return <Eye className="h-4 w-4" />;
      case 'SAFE': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Calculate safe students (assuming safe = total - high - medium - low)
  const safeStudents = Math.max(0, (overview?.total_students || 0) - 
    (overview?.risk_distribution?.high || 0) - 
    (overview?.risk_distribution?.medium || 0) - 
    (overview?.risk_distribution?.low || 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-600">Monitor student risk levels and interventions</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {overview?.total_students || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overview?.risk_distribution?.high || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {overview?.risk_distribution?.medium || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Risk</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {overview?.risk_distribution?.low || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Safe</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {safeStudents}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High Risk Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>High Risk Students</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {atRiskStudents.filter(s => s.risk_level === 'HIGH').length === 0 ? (
              <p className="text-slate-500 text-center py-4">No high risk students</p>
            ) : (
              <div className="space-y-3">
                {atRiskStudents.filter(s => s.risk_level === 'HIGH').map((student) => (
                  <div key={student.student_id} className="border border-red-200 rounded-lg p-3 bg-red-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-900">{student.name}</h4>
                        <p className="text-sm text-slate-600">{student.course} • {student.student_id}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-600">{student.risk_score}%</div>
                        <Button size="sm" onClick={() => analyzeStudent(student.student_id)} disabled={uploading}>
                          Re-analyze
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Medium Risk Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Medium Risk Students</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {atRiskStudents.filter(s => s.risk_level === 'MEDIUM').length === 0 ? (
              <p className="text-slate-500 text-center py-4">No medium risk students</p>
            ) : (
              <div className="space-y-3">
                {atRiskStudents.filter(s => s.risk_level === 'MEDIUM').map((student) => (
                  <div key={student.student_id} className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-900">{student.name}</h4>
                        <p className="text-sm text-slate-600">{student.course} • {student.student_id}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-yellow-600">{student.risk_score}%</div>
                        <Button size="sm" onClick={() => analyzeStudent(student.student_id)} disabled={uploading}>
                          Re-analyze
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Risk Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-600">
              <Eye className="h-5 w-5" />
              <span>Low Risk Students</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {atRiskStudents.filter(s => s.risk_level === 'LOW').length === 0 ? (
              <p className="text-slate-500 text-center py-4">No low risk students</p>
            ) : (
              <div className="space-y-3">
                {atRiskStudents.filter(s => s.risk_level === 'LOW').map((student) => (
                  <div key={student.student_id} className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-900">{student.name}</h4>
                        <p className="text-sm text-slate-600">{student.course} • {student.student_id}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">{student.risk_score}%</div>
                        <Button size="sm" onClick={() => analyzeStudent(student.student_id)} disabled={uploading}>
                          Re-analyze
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Safe Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>Safe Students</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-slate-500">
                {safeStudents} students performing well with no risk indicators
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Student Data Component
const StudentData = ({ students }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Student Data</h1>
        <p className="text-slate-600">Complete list of all registered students</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Students ({students.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Semester</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.student_id}>
                  <TableCell className="font-medium">{student.student_id}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.phone}</TableCell>
                  <TableCell>{student.course}</TableCell>
                  <TableCell>{student.semester}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// Assessment Data Component
const AssessmentData = () => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const response = await axios.get(`${API}/assessments/all`);
      setAssessments(response.data);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      toast.error('Failed to load assessment data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Loading assessments...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Student Assessments</h1>
        <p className="text-slate-600">All student assessment scores and performance data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assessment Records ({assessments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Assessment Type</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments.map((assessment, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{assessment.student_id}</TableCell>
                  <TableCell>{assessment.subject}</TableCell>
                  <TableCell>{assessment.assessment_type}</TableCell>
                  <TableCell>{assessment.score}/{assessment.max_score}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      assessment.percentage >= 75 ? 'bg-green-100 text-green-800' :
                      assessment.percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {assessment.percentage}%
                    </span>
                  </TableCell>
                  <TableCell>{assessment.attempt_number}</TableCell>
                  <TableCell>{new Date(assessment.date).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// Fee Details Component
const FeeDetails = () => {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    try {
      const response = await axios.get(`${API}/fees/all`);
      setFees(response.data);
    } catch (error) {
      console.error('Error fetching fees:', error);
      toast.error('Failed to load fee data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Loading fee details...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Student Fee Details</h1>
        <p className="text-slate-600">Payment records and outstanding balances</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee Records ({fees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Amount Due</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Semester</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map((fee, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{fee.student_id}</TableCell>
                  <TableCell>${fee.amount_due}</TableCell>
                  <TableCell>${fee.amount_paid}</TableCell>
                  <TableCell>{new Date(fee.due_date).toLocaleDateString()}</TableCell>
                  <TableCell>{fee.paid_date ? new Date(fee.paid_date).toLocaleDateString() : 'Not paid'}</TableCell>
                  <TableCell>
                    <Badge variant={
                      fee.status === 'paid' ? 'default' :
                      fee.status === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {fee.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{fee.semester}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// Attendance Records Component
const AttendanceRecords = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const response = await axios.get(`${API}/attendance/all`);
      setAttendance(response.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Loading attendance records...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Attendance Records</h1>
        <p className="text-slate-600">Student attendance tracking across all subjects</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Data ({attendance.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Total Classes</TableHead>
                <TableHead>Attended</TableHead>
                <TableHead>Attendance %</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Year</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.map((record, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{record.student_id}</TableCell>
                  <TableCell>{record.subject}</TableCell>
                  <TableCell>{record.total_classes}</TableCell>
                  <TableCell>{record.attended_classes}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      record.attendance_percentage >= 75 ? 'bg-green-100 text-green-800' :
                      record.attendance_percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {record.attendance_percentage}%
                    </span>
                  </TableCell>
                  <TableCell>{record.month}</TableCell>
                  <TableCell>{record.year}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// Upload Data Component (from original)
const UploadData = ({ handleFileUpload, uploading }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upload Data</h1>
        <p className="text-slate-600">Import Excel files with student information</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { name: 'students', title: 'Student Data', icon: Users, description: 'Upload student information (ID, name, email, course, semester)' },
          { name: 'attendance', title: 'Attendance Records', icon: CheckCircle, description: 'Upload attendance data (student ID, subject, attendance %)' },
          { name: 'assessments', title: 'Assessment Scores', icon: BarChart3, description: 'Upload test scores and assessment data' },
          { name: 'fees', title: 'Fee Records', icon: FileSpreadsheet, description: 'Upload fee payment status and history' }
        ].map((upload) => (
          <Card key={upload.name} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <upload.icon className="h-5 w-5 text-blue-600" />
                <span>{upload.title}</span>
              </CardTitle>
              <CardDescription>{upload.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleFileUpload(upload.name, e.target.files[0]);
                    }
                  }}
                  disabled={uploading}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : `Upload ${upload.title}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Alert>
        <FileSpreadsheet className="h-4 w-4" />
        <AlertDescription>
          <strong>File Format Requirements:</strong> Please ensure your Excel files contain the required columns. 
          Students: student_id, name, email, course, semester. 
          Attendance: student_id, subject, total_classes, attended_classes, attendance_percentage, month, year.
          Assessments: student_id, subject, assessment_type, score, max_score, percentage, date, attempt_number.
          Fees: student_id, amount_due, amount_paid, due_date, paid_date, status, semester.
        </AlertDescription>
      </Alert>
    </div>
  );
};

// Main App Component
const MainApp = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [overview, setOverview] = useState(null);
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [overviewRes, studentsRes, atRiskRes, notificationsRes] = await Promise.all([
        axios.get(`${API}/dashboard/overview`),
        axios.get(`${API}/students`),
        axios.get(`${API}/students/at-risk`),
        axios.get(`${API}/notifications`)
      ]);

      setOverview(overviewRes.data);
      setStudents(studentsRes.data);
      setAtRiskStudents(atRiskRes.data);
      setNotifications(notificationsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (endpoint, file) => {
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API}/upload/${endpoint}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`${endpoint} data uploaded successfully!`);
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload ${endpoint} data`);
    } finally {
      setUploading(false);
    }
  };

  const analyzeStudent = async (studentId) => {
    try {
      setUploading(true);
      await axios.post(`${API}/analyze/student/${studentId}`);
      toast.success('Student analysis completed!');
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze student');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('edupredict_auth');
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard overview={overview} atRiskStudents={atRiskStudents} analyzeStudent={analyzeStudent} uploading={uploading} />;
      case 'students':
        return <StudentData students={students} />;
      case 'assessments':
        return <AssessmentData />;
      case 'fees':
        return <FeeDetails />;
      case 'attendance':
        return <AttendanceRecords />;
      case 'upload':
        return <UploadData handleFileUpload={handleFileUpload} uploading={uploading} />;
      default:
        return <Dashboard overview={overview} atRiskStudents={atRiskStudents} analyzeStudent={analyzeStudent} uploading={uploading} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Toaster position="top-right" />
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} onLogout={handleLogout} />
      <div className="flex-1 p-6">
        {renderPage()}
      </div>
    </div>
  );
};

// Main App Component with Authentication
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const auth = localStorage.getItem('edupredict_auth');
    setIsAuthenticated(auth === 'authenticated');
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        {isAuthenticated ? (
          <MainApp />
        ) : (
          <LoginPage onLogin={setIsAuthenticated} />
        )}
      </BrowserRouter>
    </div>
  );
}

export default App;