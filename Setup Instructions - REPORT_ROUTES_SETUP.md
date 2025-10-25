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
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
CLOUDINARY_FOLDER=civic-reports

# File Upload Limits
MAX_IMAGE_SIZE=5242880
MAX_VIDEO_SIZE=52428800
MAX_AUDIO_SIZE=10485760
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