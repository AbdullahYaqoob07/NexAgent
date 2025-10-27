# 📋 Templates & Library Module - Complete Documentation

## Overview

The **Templates & Library** module provides a comprehensive template marketplace for workflows. Users can create templates from their workflows, share them with the community, discover and clone templates created by others, and manage their template library.

### Key Features
- ✅ **Template Creation** from existing workflows
- ✅ **Advanced Search & Filtering** by category, tags, difficulty
- ✅ **Rating & Review System** (1-5 stars with text reviews)
- ✅ **Bookmark System** for saving favorite templates
- ✅ **Template Cloning** to workflows
- ✅ **Category Management**
- ✅ **Featured Templates**
- ✅ **Usage Statistics** and analytics
- ✅ **Admin Controls** for featured/active status

---

## 🏗️ Architecture

### File Structure
```
backend/app/
├── models/
│   └── template_models.py      # Pydantic models (240+ lines)
├── db/
│   └── template_db.py           # Database operations (540+ lines)
├── services/
│   └── template_service.py      # Business logic (588+ lines)
└── api/v1/
    └── templates.py             # API routes (794+ lines)
```

### Firestore Collections
- `workflow_templates` - Template documents
- `template_categories` - Category definitions
- `template_ratings` - User ratings and reviews
- `template_bookmarks` - User bookmarks

---

## 📊 Data Models

### Template Document Structure
```json
{
  "id": "template_123",
  "workflowId": "workflow_456",
  "authorId": "user_789",
  "authorName": "John Doe",
  "name": "Daily Email Report from Google Sheets",
  "description": "Automatically send daily email reports with data from Google Sheets",
  "category": "automation",
  "tags": ["email", "googlesheets", "reporting"],
  "difficulty": "beginner",
  "requiredIntegrations": ["gmail", "googlesheets"],
  "estimatedTime": "5 minutes",
  
  "nodes": [...],  // Workflow structure
  "edges": [...],
  
  "usageCount": 1234,
  "rating": 4.7,
  "reviewCount": 89,
  "bookmarkCount": 456,
  
  "isActive": true,
  "isFeatured": false,
  
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-20T14:22:00Z"
}
```

---

## 🔌 API Endpoints

### Base URL
```
http://localhost:8000/api/v1/templates
```

---

## 📋 Template CRUD Operations

### 1. Create Template
**POST** `/api/v1/templates`

**Authentication:** Required

**Description:** Create a new template from an existing workflow

**Request Body:**
```json
{
  "workflowId": "workflow_123",
  "name": "My Awesome Template",
  "description": "This template automates email sending based on spreadsheet data",
  "category": "automation",
  "tags": ["email", "automation", "spreadsheet"],
  "difficulty": "beginner",
  "requiredIntegrations": ["gmail", "googlesheets"],
  "estimatedTime": "10 minutes"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "template": {
    "id": "template_123",
    "workflowId": "workflow_123",
    "authorId": "user_456",
    "authorName": "John Doe",
    "name": "My Awesome Template",
    "description": "...",
    "category": "automation",
    "tags": ["email", "automation", "spreadsheet"],
    "difficulty": "beginner",
    "requiredIntegrations": ["gmail", "googlesheets"],
    "estimatedTime": "10 minutes",
    "nodes": [...],
    "edges": [...],
    "usageCount": 0,
    "rating": 0.0,
    "reviewCount": 0,
    "bookmarkCount": 0,
    "isActive": true,
    "isFeatured": false,
    "createdAt": "2025-01-20T10:00:00Z",
    "updatedAt": "2025-01-20T10:00:00Z"
  },
  "isBookmarked": false,
  "userRating": null
}
```

---

### 2. Search Templates
**GET** `/api/v1/templates/search`

**Authentication:** Not Required

**Description:** Search and filter templates

**Query Parameters:**
- `query` (optional) - Search text
- `category` (optional) - Filter by category
- `tags` (optional) - Filter by tags (array)
- `difficulty` (optional) - `beginner`, `intermediate`, or `advanced`
- `sortBy` (optional) - `popular` (default), `newest`, `rating`, `most_used`
- `page` (optional) - Page number (default: 1)
- `pageSize` (optional) - Items per page (default: 20, max: 100)

**Example:**
```
GET /api/v1/templates/search?query=email&category=automation&sortBy=rating&page=1&pageSize=20
```

**Response:** `200 OK`
```json
{
  "success": true,
  "templates": [...],
  "total": 150,
  "page": 1,
  "pageSize": 20
}
```

---

### 3. Get Featured Templates
**GET** `/api/v1/templates/featured`

**Authentication:** Not Required

**Query Parameters:**
- `limit` (optional) - Number of templates (default: 10, max: 50)

**Response:** `200 OK`
```json
{
  "success": true,
  "templates": [...],
  "total": 10,
  "page": 1,
  "pageSize": 10
}
```

---

### 4. Get My Templates
**GET** `/api/v1/templates/my-templates`

**Authentication:** Required

**Description:** Get all templates created by the authenticated user

**Response:** `200 OK`
```json
{
  "success": true,
  "templates": [...],
  "total": 5,
  "page": 1,
  "pageSize": 5
}
```

---

### 5. Get Template by ID
**GET** `/api/v1/templates/{template_id}`

**Authentication:** Optional (affects response data)

**Description:** Get template details

**Response:** `200 OK`
```json
{
  "success": true,
  "template": {...},
  "isBookmarked": true,
  "userRating": 5
}
```

---

### 6. Update Template
**PUT** `/api/v1/templates/{template_id}`

**Authentication:** Required (must be author)

**Request Body:**
```json
{
  "name": "Updated Template Name",
  "description": "Updated description",
  "tags": ["updated", "tags"],
  "difficulty": "intermediate",
  "isActive": true
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Template updated successfully"
}
```

---

### 7. Delete Template
**DELETE** `/api/v1/templates/{template_id}`

**Authentication:** Required (must be author)

**Description:** Soft delete - marks template as inactive

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Template deleted successfully"
}
```

---

## 🔄 Template Cloning

### Clone Template
**POST** `/api/v1/templates/clone`

**Authentication:** Required

**Description:** Clone a template into your workflows

**Request Body:**
```json
{
  "templateId": "template_123",
  "workflowName": "My Custom Workflow Name",
  "customizeVariables": {
    "email": "user@example.com",
    "frequency": "daily"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Template cloned successfully",
  "workflowId": "workflow_789",
  "workflowName": "My Custom Workflow Name"
}
```

---

## 📂 Categories

### Get All Categories
**GET** `/api/v1/templates/categories/all`

**Authentication:** Not Required

**Response:** `200 OK`
```json
{
  "success": true,
  "categories": [
    {
      "id": "automation",
      "name": "Automation",
      "description": "Workflow automation templates",
      "icon": "⚡",
      "templateCount": 45,
      "isActive": true
    },
    {
      "id": "data-processing",
      "name": "Data Processing",
      "description": "Data transformation and processing",
      "icon": "📊",
      "templateCount": 32,
      "isActive": true
    }
  ]
}
```

---

## ⭐ Ratings & Reviews

### Rate Template
**POST** `/api/v1/templates/{template_id}/rate`

**Authentication:** Required

**Request Body:**
```json
{
  "templateId": "template_123",
  "rating": 5,
  "review": "Excellent template! Saved me hours of work."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Rating added successfully"
}
```

---

### Get Template Ratings
**GET** `/api/v1/templates/{template_id}/ratings`

**Authentication:** Not Required

**Response:** `200 OK`
```json
{
  "success": true,
  "ratings": [
    {
      "id": "rating_123",
      "templateId": "template_123",
      "userId": "user_456",
      "userName": "John Doe",
      "rating": 5,
      "review": "Excellent template!",
      "createdAt": "2025-01-20T10:00:00Z",
      "updatedAt": "2025-01-20T10:00:00Z"
    }
  ],
  "averageRating": 4.7,
  "totalRatings": 89,
  "ratingDistribution": {
    "5": 60,
    "4": 20,
    "3": 7,
    "2": 1,
    "1": 1
  }
}
```

---

## 🔖 Bookmarks

### Toggle Bookmark
**POST** `/api/v1/templates/bookmark/toggle`

**Authentication:** Required

**Request Body:**
```json
{
  "templateId": "template_123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Bookmark added successfully",
  "isBookmarked": true
}
```

---

### Get My Bookmarks
**GET** `/api/v1/templates/bookmarks/my-bookmarks`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "success": true,
  "templates": [...],
  "total": 12
}
```

---

## 📊 Statistics

### Get Template Statistics
**GET** `/api/v1/templates/stats/overview`

**Authentication:** Not Required

**Response:** `200 OK`
```json
{
  "success": true,
  "totalTemplates": 450,
  "totalCategories": 12,
  "totalUsage": 15234,
  "averageRating": 4.5,
  "popularCategories": [
    {
      "id": "automation",
      "name": "Automation",
      "templateCount": 120
    }
  ],
  "trendingTemplates": [...]
}
```

---

## 🔐 Admin Endpoints

### Toggle Featured Status
**POST** `/api/v1/templates/admin/toggle-featured`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "templateId": "template_123",
  "isFeatured": true
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Template featured successfully"
}
```

---

### Toggle Active Status
**POST** `/api/v1/templates/admin/toggle-active`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "templateId": "template_123",
  "isActive": false
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Template deactivated successfully"
}
```

---

## 🧪 Testing with cURL

### Create a Template
```bash
curl -X POST http://localhost:8000/api/v1/templates \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "workflow_123",
    "name": "Test Template",
    "description": "This is a test template for automation",
    "category": "automation",
    "tags": ["test", "automation"],
    "difficulty": "beginner",
    "requiredIntegrations": ["gmail"],
    "estimatedTime": "5 minutes"
  }'
```

### Search Templates
```bash
curl -X GET "http://localhost:8000/api/v1/templates/search?query=email&sortBy=rating&page=1&pageSize=10"
```

### Clone Template
```bash
curl -X POST http://localhost:8000/api/v1/templates/clone \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "template_123",
    "workflowName": "My Email Workflow"
  }'
```

### Rate Template
```bash
curl -X POST http://localhost:8000/api/v1/templates/template_123/rate \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "template_123",
    "rating": 5,
    "review": "Great template!"
  }'
```

### Toggle Bookmark
```bash
curl -X POST http://localhost:8000/api/v1/templates/bookmark/toggle \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "template_123"
  }'
```

---

## 📝 Rate Limits

| Endpoint Type | Rate Limit |
|--------------|------------|
| Search/Browse | 100 req/min |
| CRUD Operations | 20 req/min |
| Clone | 30 req/min |
| Bookmarks | 50 req/min |
| Ratings | 20 req/min |
| Statistics | 50 req/min |
| Admin | 20 req/min |

---

## 🔒 Security

- **Authentication:** Firebase ID tokens via Bearer header
- **Authorization:** Template authors can update/delete their templates
- **Rate Limiting:** Prevents abuse
- **Input Validation:** Pydantic models validate all inputs
- **Soft Delete:** Templates are marked inactive, not permanently deleted

---

## 🚀 Getting Started

### 1. Start the Backend
```bash
cd backend
python run.py
```

### 2. Access API Documentation
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### 3. Test Endpoints
Use the interactive Swagger UI to test all endpoints with authentication.

---

## 📦 Summary

### Total Endpoints: **17**

#### Public (No Auth Required): **5**
- Search Templates
- Get Featured Templates
- Get Template by ID
- Get Categories
- Get Template Ratings
- Get Statistics

#### Authenticated: **10**
- Create Template
- Update Template
- Delete Template
- Get My Templates
- Clone Template
- Rate Template
- Toggle Bookmark
- Get My Bookmarks

#### Admin: **2**
- Toggle Featured Status
- Toggle Active Status

---

## 🎯 Use Cases

### For Users
1. **Create** templates from successful workflows
2. **Browse** community templates
3. **Search** by category, tags, difficulty
4. **Clone** templates to customize
5. **Rate** and **review** templates
6. **Bookmark** favorites for quick access

### For Admins
1. **Feature** high-quality templates
2. **Moderate** template content
3. **Manage** categories
4. **Monitor** usage statistics

---

## 🔮 Future Enhancements

- [ ] Template versioning
- [ ] Collaborative template editing
- [ ] Template collections/bundles
- [ ] Premium template marketplace
- [ ] Template analytics dashboard
- [ ] AI-powered template recommendations
- [ ] Template import/export

---

## 🐛 Troubleshooting

### Template Not Found
- Verify the template exists and is active
- Check template ID is correct

### Unauthorized Errors
- Ensure valid Firebase token in Authorization header
- Verify token hasn't expired
- Check user owns the template (for update/delete)

### Rate Limit Exceeded
- Wait for rate limit window to reset
- Implement exponential backoff in client

---

## 📞 Support

For issues or questions:
- Check `/docs` for interactive API testing
- Review error messages in response
- Check backend logs for detailed error info

---

**Built with ❤️ using FastAPI + Firebase + Firestore**
