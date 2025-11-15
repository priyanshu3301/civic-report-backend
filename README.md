# 🔐 User Authentication API Documentation

Complete guide for the Civic Report System authentication endpoints.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [Environment Setup](#environment-setup)
4. [API Endpoints](#api-endpoints)
5. [Request/Response Examples](#request-response-examples)
6. [Error Handling](#error-handling)
7. [Security Features](#security-features)
8. [Testing Guide](#testing-guide)

---

## Overview

### Features

✅ **OTP-Based Email Verification**
- 6-digit OTP sent via email
- 10-minute expiry window
- Rate limited (3 OTPs per hour)
- Account lock after 5 failed attempts

✅ **JWT Token Authentication**
- Long-lived token (7 days)
- HttpOnly cookie storage
- Automatic token refresh
- Secure token validation

✅ **Security**
- Password hashing (bcrypt)
- OTP hashing in database
- Rate limiting on all auth routes
- Input validation & sanitization
- XSS protection

✅ **User Management**
- Email verification required
- Account activation status
- Role-based access (user/admin)
- Profile management

---

## Authentication Flow

### Registration & Verification Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Email
    participant Database

    User->>Frontend: Enter registration details
    Frontend->>Backend: POST /api/auth/register
    Backend->>Database: Check if email exists
    Database-->>Backend: Email unique
    Backend->>Backend: Hash password
    Backend->>Backend: Generate OTP (6 digits)
    Backend->>Backend: Hash OTP
    Backend->>Database: Save user (isVerified: false)
    Backend->>Email: Send OTP email
    Backend-->>Frontend: Success (userId, email)
    Frontend-->>User: Check your email

    User->>Frontend: Enter OTP
    Frontend->>Backend: POST /api/auth/verify-otp
    Backend->>Database: Find user by email
    Backend->>Backend: Verify OTP hash
    Backend->>Backend: Check expiry
    Backend->>Database: Update (isVerified: true)
    Backend->>Backend: Generate JWT token
    Backend->>Backend: Set HttpOnly cookie
    Backend-->>Frontend: Success (user, token in cookie)
    Frontend-->>User: Welcome! Logged in
```

### Login Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database

    User->>Frontend: Enter email & password
    Frontend->>Backend: POST /api/auth/login
    Backend->>Database: Find user by email
    Database-->>Backend: User found
    Backend->>Backend: Verify password (bcrypt)
    Backend->>Backend: Check isVerified
    Backend->>Backend: Check isActive
    Backend->>Backend: Generate JWT token
    Backend->>Backend: Set HttpOnly cookie
    Backend-->>Frontend: Success (user, token in cookie)
    Frontend-->>User: Logged in successfully
```

---

## Environment Setup

### Required Environment Variables

Add these to your `.env` file:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
MONGO_URI=mongodb://localhost:27017/civic-report

# JWT Configuration
JWT_SECRET=your_64_character_secret_key_here_minimum_32_characters
JWT_EXPIRE=7d

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=Civic Report <noreply@civicreport.com>
EMAIL_TEST_MODE=true

# OTP Configuration
OTP_EXPIRY_MINUTES=10
```

### Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Gmail App Password Setup

1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Security → 2-Step Verification (enable if not already)
3. Security → App Passwords
4. Generate new app password
5. Copy password to `EMAIL_PASSWORD` in `.env`

---

## API Endpoints

### Base URL
```
http://localhost:5000/api/auth
```

### Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | ❌ No |
| POST | `/verify-otp` | Verify OTP & activate account | ❌ No |
| GET | `/verify-otp/:email/:otp` | Verify OTP via URL | ❌ No |
| POST | `/resend-otp` | Resend verification OTP | ❌ No |
| POST | `/login` | Login user | ❌ No |
| GET | `/me` | Get current user profile | ✅ Yes |
| GET | `/logout` | Logout user | ❌ No |

---

## Request/Response Examples

### 1. Register User

**Endpoint:** `POST /api/auth/register`

**Request:**
```http
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePass123"
}
```

**Validation Rules:**
- `name`: 2-100 characters (required)
- `email`: Valid email format (required)
- `password`: 8+ characters, must contain number and letter (required)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration successful! Please check your email for OTP verification.",
  "data": {
    "userId": "68f76536b4a5978764e937c6",
    "email": "john.doe@example.com",
    "otpExpiresIn": 10
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Email already registered. Please login."
}
```

**Error Response (400 - Not Verified):**
```json
{
  "success": false,
  "message": "Email already registered but not verified. Please verify your email or request a new OTP.",
  "code": "EMAIL_NOT_VERIFIED"
}
```

---

### 2. Verify OTP

**Endpoint:** `POST /api/auth/verify-otp`

**Request:**
```http
POST http://localhost:5000/api/auth/verify-otp
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "otp": "123456"
}
```

**Validation Rules:**
- `email`: Valid email format (required)
- `otp`: Exactly 6 digits (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully! You are now logged in.",
  "data": {
    "user": {
      "id": "68f76536b4a5978764e937c6",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "user",
      "isVerified": true
    }
  }
}
```

**Note:** JWT token is automatically set in HttpOnly cookie.

**Error Response (400 - Invalid OTP):**
```json
{
  "success": false,
  "message": "Invalid OTP. 4 attempts remaining."
}
```

**Error Response (400 - Expired OTP):**
```json
{
  "success": false,
  "message": "OTP has expired. Please request a new OTP.",
  "code": "OTP_EXPIRED"
}
```

**Error Response (429 - Account Locked):**
```json
{
  "success": false,
  "message": "Account temporarily locked due to too many failed attempts. Try again in 15 minutes."
}
```

---

### 3. Verify OTP via URL

**Endpoint:** `GET /api/auth/verify-otp/:email/:otp`

**Request:**
```http
GET http://localhost:5000/api/auth/verify-otp/john.doe%40example.com/123456
```

**Success Response:**
- Redirects to `FRONTEND_URL` with token set in cookie
- HTTP Status: 302 (Redirect)

**Note:** This endpoint is designed for email link verification. The frontend should handle the redirect and check for authentication.

---

### 4. Resend OTP

**Endpoint:** `POST /api/auth/resend-otp`

**Request:**
```http
POST http://localhost:5000/api/auth/resend-otp
Content-Type: application/json

{
  "email": "john.doe@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "New OTP sent to your email.",
  "data": {
    "email": "john.doe@example.com",
    "otpExpiresIn": 10
  }
}
```

**Error Response (429 - Rate Limited):**
```json
{
  "success": false,
  "message": "Too many OTP requests. Please try again in 45 minutes."
}
```

---

### 5. Login

**Endpoint:** `POST /api/auth/login`

**Request:**
```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePass123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "68f76536b4a5978764e937c6",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "user",
      "isVerified": true
    }
  }
}
```

**Note:** JWT token is automatically set in HttpOnly cookie.

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password."
}
```

**Error Response (403 - Not Verified):**
```json
{
  "success": false,
  "message": "Please verify your email before logging in.",
  "code": "EMAIL_NOT_VERIFIED"
}
```

**Error Response (403 - Deactivated):**
```json
{
  "success": false,
  "message": "Your account has been deactivated. Please contact support."
}
```

---

### 6. Get Current User

**Endpoint:** `GET /api/auth/me`

**Request:**
```http
GET http://localhost:5000/api/auth/me
Cookie: token=<jwt_token>
```

**Note:** Token is automatically sent via HttpOnly cookie. No manual header needed.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "68f76536b4a5978764e937c6",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "user",
      "isVerified": true,
      "hasSeenTour": false,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Not authorized. No token provided."
}
```

---

### 7. Logout

**Endpoint:** `GET /api/auth/logout`

**Request:**
```http
GET http://localhost:5000/api/auth/logout
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Note:** Clears the HttpOnly cookie containing the JWT token.

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Specific error 1", "Specific error 2"]
}
```

### Common Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Validation failed |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Account not verified or deactivated |
| 404 | Not Found - User not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

### Validation Errors

**Example:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Name is required",
    "Password must be at least 8 characters",
    "Password must contain at least one number"
  ]
}
```

---

## Security Features

### 1. Password




# 📋 Report Routes Setup Instructions

## ✅ Files Created

All report-related files have been created. Here's what was added:

### **New Files:**
1. `/config/cloudinary.js` - Cloudinary configuration
2. `/middleware/uploadMiddleware.js` - Multer + file upload handling
3. `/utils/mediaService.js` - Cloudinary upload/delete operations
4. `/utils/reportValidation.js` - Report data validation
5. `/controllers/reportController.js` - 5 report endpoints
6. `/routes/reportRoutes.js` - Report routes configuration

### **Updated Files:**
- `/server.js` - Added report routes and Cloudinary test

---

## 📦 Install Required Packages

```bash
npm install cloudinary multer
```

**Packages:**
- `cloudinary` - Cloud storage for images/videos/audio
- `multer` - Handle multipart/form-data file uploads

---

## 🔐 Environment Variables

Add these to your `.env` file:

```env
MONGO_URI=""
JWT_SECRET="someverylongandhardtoguesssecret"
PORT=5000
FRONTEND_URL='http://localhost:5000'
EMAIL_TEST_MODE= true  # Set to true unless you want to send real emails
OTP_EXPIRY_MINUTES=10
EMAIL_FROM="'Civic Report' <noreply@civicreport.com>"

# for sending real emails, configure these
EMAIL_USER=''
EMAIL_PASSWORD=''

JWT_EXPIRE='7d'

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=''
CLOUDINARY_API_KEY=''
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=civic-reports

# File Upload Limits
MAX_IMAGE_SIZE=5242880    # 5MB in bytes
MAX_VIDEO_SIZE=52428800   # 50MB in bytes
MAX_AUDIO_SIZE=10485760   # 10MB in bytes
MAX_IMAGES_COUNT=5
MAX_VIDEOS_COUNT=1
MAX_AUDIO_COUNT=1
```

### **How to Get Cloudinary Credentials:**

1. Go to https://cloudinary.com/
2. Sign up for free account (no credit card required)
3. After login, go to **Dashboard**
4. Copy these values:
   - **Cloud Name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`

---

## 🚀 API Endpoints

### **1. Create Report**
```http
POST /api/reports/create
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

Form Data:
- title: "Large pothole on Main Street"
- description: "Dangerous pothole causing vehicle damage"
- category: "public_works"
- severity: "high"
- location: {"coordinates": [77.2090, 28.6139], "name": "Main Street, Agra"}
- images: [file1.jpg, file2.jpg]
- videos: [video1.mp4]
- audio: [voice-note.m4a]
```

**Response:**
```json
{
  "success": true,
  "message": "Report created successfully",
  "data": {
    "report": {
      "_id": "65abc123...",
      "title": "Large pothole on Main Street",
      "status": "reported",
      "severity": "high",
      "media": [
        {
          "type": "image",
          "url": "https://res.cloudinary.com/...",
          "thumbnail": "https://res.cloudinary.com/..."
        }
      ],
      "upvotes": 0,
      "createdAt": "2025-01-15T10:30:00Z"
    }
  }
}
```

---

### **2. Get My Reports**
```http
GET /api/reports/my-reports?page=1&limit=20&status=reported&category=sanitation&sortBy=createdAt&order=desc
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `status` - Filter by status (optional)
- `category` - Filter by category (optional)
- `sortBy` - Sort field (default: createdAt)
- `order` - asc/desc (default: desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "reports": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

---

### **3. Get Report by ID**
```http
GET /api/reports/65abc123...
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "report": {
      "_id": "65abc123...",
      "title": "...",
      "description": "...",
      "user": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "history": [...],
      "media": [...]
    }
  }
}
```

---

### **4. Get Nearby Reports**
```http
GET /api/reports/nearby?lat=28.6139&lng=77.2090&radius=5000&limit=100
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `lat` - Latitude (required)
- `lng` - Longitude (required)
- `radius` - Radius in meters (default: 5000, max: 50000)
- `limit` - Max results (default: 100, max: 100)
- `status` - Filter by status (optional)
- `category` - Filter by category (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "reports": [...],
    "query": {
      "center": { "lat": 28.6139, "lng": 77.2090 },
      "radius": 5000,
      "count": 15
    }
  }
}
```

---

### **5. Upvote Report (Toggle)**
```http
PATCH /api/reports/65abc123.../upvote
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Report upvoted successfully",
  "data": {
    "reportId": "65abc123...",
    "upvotes": 6,
    "severity": "medium",
    "hasUpvoted": true,
    "severityUpgraded": true
  }
}
```

**Severity Auto-Upgrade Logic:**
- 0-4 upvotes: Original severity
- 5-9 upvotes: Upgrade 'low' → 'medium'
- 10-19 upvotes: Upgrade to 'high'
- 20+ upvotes: Upgrade to 'critical'

---

## 🧪 Testing with Postman/Thunder Client

### **Test 1: Create Report**

1. **Set Authorization:**
   - Type: Bearer Token
   - Token: Copy from login/verify-otp response

2. **Set Body:**
   - Type: form-data
   - Add fields:
     ```
     title: "Test Report"
     description: "This is a test report with detailed description"
     category: "sanitation"
     severity: "medium"
     location: {"coordinates": [77.2090, 28.6139], "name": "Test Location, Agra"}
     ```
   - Add files:
     ```
     images: [select 1-5 image files]
     videos: [select 1 video file]
     audio: [select 1 audio file]
     ```

3. **Send Request**

---

### **Test 2: Get My Reports**

```http
GET http://localhost:5000/api/reports/my-reports
Authorization: Bearer <token>
```

---

### **Test 3: Upvote Report**

```http
PATCH http://localhost:5000/api/reports/<reportId>/upvote
Authorization: Bearer <token>
```

Send twice to test toggle (upvote → un-upvote)

---

## ⚠️ File Upload Limits

| Type | Max Size | Max Count | Allowed Formats |
|------|----------|-----------|-----------------|
| Images | 5MB each | 5 files | jpg, jpeg, png, webp |
| Videos | 50MB each | 1 file | mp4, mov, avi |
| Audio | 10MB each | 1 file | mp3, wav, m4a |

---

## 🔍 Validation Rules

### **Create Report:**
- ✅ Title: 5-100 characters (required)
- ✅ Description: 10-500 characters (required)
- ✅ Category: Must be valid enum value (required)
- ✅ Severity: low/medium/high/critical (required)
- ✅ Location coordinates: Valid [lng, lat] (required)
- ✅ Location name: 3-200 characters (required)
- ✅ At least 1 media file (required)

### **Nearby Reports:**
- ✅ lat: -90 to 90 (required)
- ✅ lng: -180 to 180 (required)
- ✅ radius: 100-50000 meters (default: 5000)
- ✅ limit: 1-100 (default: 100)

---

## 🛠️ Troubleshooting

### **Error: "Cloudinary configuration missing"**
- Make sure `.env` has all Cloudinary variables
- Restart server after adding env variables

### **Error: "File too large"**
- Check file size limits in `.env`
- Images: Max 5MB each
- Videos: Max 50MB each
- Audio: Max 10MB each

### **Error: "Invalid file type"**
- Only allowed formats work
- Images: jpg, jpeg, png, webp
- Videos: mp4, mov, avi
- Audio: mp3, wav, m4a

### **Error: "At least one media file required"**
- You must upload at least 1 file (image/video/audio)

### **Error: "Location coordinates are required"**
- Location must be JSON format: `{"coordinates": [lng, lat], "name": "Location Name"}`
- In Postman form-data, make sure location value is valid JSON string

---

## 📊 Cloudinary Features

Your uploaded files will have:

✅ **Images:**
- Original image uploaded
- 200x200 thumbnail auto-generated
- Optimized format (auto WebP when supported)

✅ **Videos:**
- Transcoded to MP4 format
- Video thumbnail auto-generated
- Optimized quality

✅ **Audio:**
- Converted to MP3 format
- Compressed for web delivery

---

## 🎯 Next Steps

You now have a complete report system with:
- ✅ Media upload to Cloudinary
- ✅ File validation & size limits
- ✅ Geospatial queries (nearby reports)
- ✅ Upvote system with severity auto-upgrade
- ✅ Pagination & filtering
- ✅ Full error handling

**Need to add:**
- Admin routes (update status, assign departments)
- Report editing/deletion
- Comments system
- Notifications

Let me know when you're ready for the next feature! 🚀


# Admin Dashboard API Documentation

## Overview
Complete admin dashboard functionality for managing reports and users in the Civic Report System.

## Authentication
All admin endpoints require:
- Valid JWT token in cookies (`token`)
- User role must be `admin`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

---

## 📊 Dashboard Statistics

### Get Dashboard Stats
Get comprehensive statistics for the admin dashboard.

**Endpoint:** `GET /api/admin/dashboard/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "reports": {
      "totalReports": 150,
      "reported": 45,
      "acknowledged": 30,
      "inProgress": 25,
      "resolved": 40,
      "closed": 8,
      "rejected": 2,
      "totalUpvotes": 320,
      "avgUpvotes": 2.13
    },
    "categories": [
      { "_id": "sanitation", "count": 60 },
      { "_id": "public_works", "count": 45 }
    ],
    "severity": [
      { "_id": "high", "count": 50 },
      { "_id": "medium", "count": 70 }
    ],
    "users": {
      "totalUsers": 500,
      "activeUsers": 480,
      "verifiedUsers": 450,
      "admins": 5
    },
    "recentActivity": {
      "last7Days": 35,
      "today": 8
    }
  }
}
```

---

## 📋 Report Management

### 1. Get All Reports (with filters)

**Endpoint:** `GET /api/admin/reports`

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 20) - Results per page
- `status` - Filter by status (reported, acknowledged, in_progress, resolved, closed, rejected)
- `category` - Filter by category (sanitation, public_works, etc.)
- `severity` - Filter by severity (low, medium, high, critical)
- `userId` - Filter by user ID
- `search` - Search in title and description
- `startDate` - Filter reports from this date (ISO format)
- `endDate` - Filter reports until this date (ISO format)
- `sortBy` (default: createdAt) - Sort field
- `order` (default: desc) - Sort order (asc/desc)

**Example Request:**
```bash
GET /api/admin/reports?page=1&limit=20&status=reported&category=sanitation&search=garbage
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "_id": "report123",
        "title": "Garbage pile on Main Street",
        "description": "Large pile of garbage blocking sidewalk",
        "status": "reported",
        "category": "sanitation",
        "severity": "high",
        "upvotes": 15,
        "user": {
          "_id": "user123",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "location": {
          "name": "Main Street, Downtown",
          "coordinates": [77.2090, 28.6139]
        },
        "media": [...],
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    },
    "stats": {
      "totalReports": 50,
      "reported": 20,
      "acknowledged": 15,
      "avgUpvotes": 3.5
    }
  }
}
```

### 2. Get Report Details (with full history)

**Endpoint:** `GET /api/admin/reports/:reportId`

**Response:**
```json
{
  "success": true,
  "data": {
    "report": {
      "_id": "report123",
      "title": "Garbage pile on Main Street",
      "description": "...",
      "status": "in_progress",
      "history": [
        {
          "status": "reported",
          "notes": "Report created",
          "updatedBy": null,
          "timestamp": "2024-01-15T10:30:00Z"
        },
        {
          "status": "acknowledged",
          "notes": "We are looking into this issue",
          "updatedBy": {
            "name": "Admin User",
            "email": "admin@example.com",
            "role": "admin"
          },
          "timestamp": "2024-01-15T11:00:00Z"
        }
      ],
      "upvotedBy": [...],
      "user": {...}
    }
  }
}
```

### 3. Update Report Status

**Endpoint:** `PATCH /api/admin/reports/:reportId/status`

**Request Body:**
```json
{
  "status": "acknowledged",
  "notes": "We have received your report and will investigate shortly"
}
```

**Valid Statuses:**
- `reported` - Initial status
- `acknowledged` - Admin has seen the report
- `in_progress` - Work has started
- `resolved` - Issue has been fixed
- `closed` - Report closed (no further action)
- `rejected` - Report rejected (use reject endpoint for this)

**Response:**
```json
{
  "success": true,
  "message": "Report status updated to acknowledged",
  "data": {
    "report": {
      "_id": "report123",
      "title": "Garbage pile on Main Street",
      "status": "acknowledged",
      "updatedAt": "2024-01-15T11:00:00Z",
      "history": [...]
    }
  }
}
```

### 4. Reject Report

**Endpoint:** `PATCH /api/admin/reports/:reportId/reject`

**Request Body:**
```json
{
  "reason": "This report does not contain sufficient information to proceed. Please provide the exact location and add photos."
}
```

**Validation:**
- Reason must be at least 10 characters
- Reason cannot exceed 500 characters

**Response:**
```json
{
  "success": true,
  "message": "Report rejected successfully",
  "data": {
    "report": {
      "_id": "report123",
      "status": "rejected",
      "rejectionReason": "This report does not contain...",
      "updatedAt": "2024-01-15T11:00:00Z"
    }
  }
}
```

---

## 👥 User Management

### 1. Get All Users (with filters)

**Endpoint:** `GET /api/admin/users`

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 20) - Results per page
- `role` - Filter by role (user/admin)
- `isActive` - Filter by active status (true/false)
- `isVerified` - Filter by verification status (true/false)
- `search` - Search in name and email
- `sortBy` (default: createdAt) - Sort field
- `order` (default: desc) - Sort order (asc/desc)

**Example Request:**
```bash
GET /api/admin/users?page=1&limit=20&isActive=true&search=john
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "user123",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "user",
        "isActive": true,
        "isVerified": true,
        "reportCount": 5,
        "createdAt": "2024-01-10T08:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 500,
      "pages": 25
    },
    "stats": {
      "totalUsers": 500,
      "activeUsers": 480,
      "verifiedUsers": 450,
      "admins": 5,
      "regularUsers": 495
    }
  }
}
```

### 2. Update User Status (Activate/Deactivate)

**Endpoint:** `PATCH /api/admin/users/:userId/status`

**Request Body:**
```json
{
  "isActive": false
}
```

**Note:** Admins cannot change their own status.

**Response:**
```json
{
  "success": true,
  "message": "User deactivated successfully",
  "data": {
    "user": {
      "_id": "user123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": false,
      "isVerified": true
    }
  }
}
```

### 3. Update User Role

**Endpoint:** `PATCH /api/admin/users/:userId/role`

**Request Body:**
```json
{
  "role": "admin"
}
```

**Valid Roles:** `user`, `admin`

**Note:** Admins cannot change their own role.

**Response:**
```json
{
  "success": true,
  "message": "User role updated to admin successfully",
  "data": {
    "user": {
      "_id": "user123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "isActive": true,
      "isVerified": true
    }
  }
}
```

### 4. Delete User

**Endpoint:** `DELETE /api/admin/users/:userId`

**Note:** 
- Admins cannot delete themselves
- User's reports will be set to anonymous (user field becomes null)

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "deletedUserId": "user123"
  }
}
```

---

## 🧪 Testing with Postman/Thunder Client

### 1. Setup Environment Variables
```
BASE_URL = http://localhost:5000
ADMIN_TOKEN = <your_admin_jwt_token>
```

### 2. Login as Admin
First, create an admin user or change an existing user's role in the database:

```javascript
// In MongoDB shell or Compass
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

Then login:
```bash
POST {{BASE_URL}}/api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your_password"
}
```

The token will be set in cookies automatically.

### 3. Test Admin Endpoints

**Get Dashboard Stats:**
```bash
GET {{BASE_URL}}/api/admin/dashboard/stats
```

**Get All Reports:**
```bash
GET {{BASE_URL}}/api/admin/reports?status=reported&page=1&limit=10
```

**Update Report Status:**
```bash
PATCH {{BASE_URL}}/api/admin/reports/{{reportId}}/status
Content-Type: application/json

{
  "status": "acknowledged",
  "notes": "We will investigate this issue"
}
```

**Reject Report:**
```bash
PATCH {{BASE_URL}}/api/admin/reports/{{reportId}}/reject
Content-Type: application/json

{
  "reason": "This report lacks sufficient detail and location information"
}
```

**Get All Users:**
```bash
GET {{BASE_URL}}/api/admin/users?isActive=true&page=1&limit=20
```

**Deactivate User:**
```bash
PATCH {{BASE_URL}}/api/admin/users/{{userId}}/status
Content-Type: application/json

{
  "isActive": false
}
```

---

## 🔒 Security Features

1. **Role-Based Access Control**: All endpoints protected by `restrictTo('admin')` middleware
2. **Self-Protection**: Admins cannot modify their own status or role
3. **Input Validation**: All inputs validated before processing
4. **XSS Prevention**: Script tags removed from text inputs
5. **Rate Limiting**: General rate limiter applied to all API routes

---

## 📝 Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized. No token provided."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. This route is restricted to: admin"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Report not found"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Status is required",
    "Notes cannot exceed 500 characters"
  ]
}
```

---

## 📁 File Structure

```
controllers/
  └── adminController.js      # All admin logic

routes/
  └── adminRoutes.js           # Admin route definitions

middleware/
  └── adminValidation.js       # Admin input validation
  └── auth.js                  # Authentication & authorization
```

---

## 🎯 Next Steps

After implementing admin features, consider adding:
1. Email notifications when report status changes
2. Activity logs for admin actions
3. Bulk operations (update multiple reports)
4. Export data (CSV, PDF reports)
5. Advanced analytics and charts