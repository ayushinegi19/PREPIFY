# 🎓 Prepify - AI-Powered Study Companion

## 📖 Overview

Prepify is an intelligent study platform that helps students learn more effectively by transforming their study materials into interactive content. Upload PDFs or images of your notes, and let AI generate:

- 📄 **Concise Summaries** - Key points extracted and condensed
- ❓ **Practice Quizzes** - 10 AI-generated questions with instant feedback
- 🧠 **Mind Maps** - Visual hierarchical concept maps
- 📊 **Flowcharts** - Process diagrams for better understanding
- 📈 **Analytics** - Track your progress and performance

### 🎯 Perfect For

- 📚 College Students preparing for exams
- 👨‍🎓 High School Students studying for tests
- 📝 Anyone who wants to learn more efficiently
- 🧠 Visual learners who prefer diagrams and maps

---

## ✨ Features

### 📚 Core Features

| Feature | Description |
|---------|-------------|
| 📄 **Smart Document Upload** | Upload PDFs and images with automatic text extraction using OCR |
| 🤖 **AI Summarization** | Generate summaries in short, medium, or long formats |
| ❓ **Quiz Generation** | Create practice quizzes with 10 AI-generated multiple choice questions |
| 🧠 **Mind Maps** | Visualize concepts with hierarchical, color-coded mind maps |
| 📊 **Flowcharts** | Generate process flowcharts with decision points |
| 📈 **Analytics Dashboard** | Track study time, quiz scores, and performance trends |

### 🔐 User Management

- ✅ Secure JWT-based authentication
- ✅ Profile management with academic information
- ✅ Password change functionality
- ✅ Document organization and search
- ✅ Upload history tracking

### 🎯 Smart Learning

- ⏱️ Timed quizzes with countdown timer
- 📊 Instant feedback and scoring
- 📈 Performance tracking across attempts
- 🏆 Best score tracking
- 💾 Download generated content
- 🔍 Search through your notes

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI framework | 18.2.0 |
| **Lucide React** | Icon library | Latest |
| **Axios** | HTTP client | Latest |
| **CSS3** | Styling with gradients & animations | - |

### Backend

| Technology | Purpose | Version |
|------------|---------|---------|
| **Flask** | Web framework | 2.3.0+ |
| **MongoDB** | Database | 5.0+ |
| **PyMongo** | MongoDB driver | 4.0+ |
| **PyMuPDF (fitz)** | PDF processing | 1.23.0+ |
| **Tesseract OCR** | Image text recognition | 4.0+ |
| **EasyOCR** | Fallback OCR (handwriting) | 1.7.0+ |
| **Transformers** | AI models (HuggingFace) | 4.30.0+ |

### AI Models

| Model | Purpose | Size | Provider |
|-------|---------|------|----------|
| `sshleifer/distilbart-cnn-12-6` | Text summarization | ~1.2GB | HuggingFace |
| `valhalla/t5-small-qg-hl` | Question generation | ~240MB | HuggingFace |
| `en_core_web_sm` | NLP processing | ~50MB | spaCy |
| KeyBERT | Keyword extraction | Lightweight | - |

### Additional Libraries

- **JWT** - Token-based authentication
- **bcrypt** - Password hashing
- **python-dotenv** - Environment variables
- **Flask-CORS** - Cross-origin requests
- **opencv-python** - Image preprocessing
- **spaCy** - Natural language processing

---

## 📋 Prerequisites

### Required Software

1. **Python 3.8 or higher**
   - Download: https://www.python.org/downloads/
   - Verify: `python --version`

2. **Node.js 16 or higher**
   - Download: https://nodejs.org/
   - Verify: `node --version`

3. **MongoDB 5.0 or higher**
   - Download: https://www.mongodb.com/try/download/community
   - Verify: `mongod --version`

4. **Tesseract OCR**
   - **Ubuntu/Debian**: `sudo apt-get install tesseract-ocr`
   - **macOS**: `brew install tesseract`
   - **Windows**: Download from [UB-Mannheim/tesseract](https://github.com/UB-Mannheim/tesseract/wiki)
   - Verify: `tesseract --version`

### System Requirements

- **RAM**: 8GB minimum (16GB recommended for AI models)
- **Storage**: 5GB free space (for AI models and cache)
- **OS**: Windows 10+, macOS 10.14+, Ubuntu 18.04+

---

## 🚀 Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/prepify.git
cd prepify
```

### 2️⃣ Backend Setup

#### Navigate to Backend Directory
```bash
cd backend
```

#### Create Virtual Environment

**Windows:**
```bash
python -m venv .venv
.venv\Scripts\activate
```

**Mac/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

#### Install Python Dependencies
```bash
pip install -r requirements.txt
```

#### Download spaCy Model
```bash
python -m spacy download en_core_web_sm
```

#### Create Environment File

Create a `.env` file in the `backend` directory:

```env
# Backend Environment Variables
SECRET_KEY=your-super-secret-key-change-in-production-make-it-long-and-random
MONGO_URI=mongodb://localhost:27017/prepify
FLASK_ENV=development
```

**Important**: Generate a secure SECRET_KEY:
```python
# Run this in Python to generate a secure key
import secrets
print(secrets.token_urlsafe(32))
```

#### Start MongoDB

**Windows (if installed as service):**
```bash
net start MongoDB
```

**macOS:**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

**Verify MongoDB is running:**
```bash
mongosh
# or
mongo
```

#### Run Flask Backend

```bash
python app.py
```

**Backend should now be running on**: http://localhost:5000

✅ **Verify Backend**: Open http://localhost:5000 in browser (should see React app or API message)

### 3️⃣ Frontend Setup

#### Open New Terminal and Navigate to Frontend

```bash
cd frontend  # From project root
```

#### Install Node Dependencies

```bash
npm install
```

#### Create Environment File (Optional)

Create a `.env` file in the `frontend` directory if you need custom API URLs:

```env
REACT_APP_API_URL=http://localhost:5000
```

#### Start React Development Server

```bash
npm start
```

**Frontend should now be running on**: http://localhost:3000

✅ **Verify Frontend**: Browser should automatically open to http://localhost:3000

---

## 🎯 Usage Guide

### Step 1: Register an Account

1. Open http://localhost:3000
2. Click **"Sign Up"** or **"Get Started"**
3. Fill in your details:
   - Username
   - Email
   - Password (min 6 characters)
   - Degree Program
   - Semester (1-8)
   - College

### Step 2: Upload Notes

1. Navigate to **"Upload Notes"** from the sidebar
2. Click to select a file:
   - ✅ PDF files (up to 16MB)
   - ✅ Images: JPG, PNG (up to 16MB)
3. Click **"Upload File"**
4. Wait for text extraction (OCR for images)

### Step 3: Generate AI Content

After successful upload, choose an action:

| Action | Description | Processing Time |
|--------|-------------|-----------------|
| 📄 **Summarize** | Get AI-generated summary with key points | ~2-3 seconds |
| ❓ **Create Quiz** | Generate 10 practice questions | ~5-8 seconds |
| 🧠 **Create Mind Map** | Visualize concepts hierarchically | ~3-4 seconds |
| 📊 **Create Flowchart** | Map processes with decision points | ~4-5 seconds |

### Step 4: Access Your Content

- **My Notes** - View and manage all uploaded documents
- **Quizzes & Tests** - Take quizzes and track your scores
- **Downloads** - Access all generated summaries and visualizations
- **Profile** - Update your information and change password
- **Analytics** - View performance trends (coming soon)

### 📊 Taking a Quiz

1. Go to **"Quizzes & Tests"**
2. Select a quiz from your generated quizzes
3. Click **"Start Quiz"**
4. Answer questions within the time limit
5. Submit and view your score
6. Review correct/incorrect answers

---

## 📁 Project Structure

```
prepify/
│
├── backend/                           # Flask Backend
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py                   # Authentication (login, register)
│   │   ├── upload.py                 # File upload & AI processing
│   │   ├── profile.py                # User profile management
│   │   └── dashboard.py              # Dashboard routes
│   │
│   ├── services/
│   │   ├── text_extractor.py        # PDF/Image OCR extraction
│   │   ├── summarization_service.py # AI summarization
│   │   ├── quiz_service.py          # Quiz generation
│   │   └── mindmap_service.py       # Mind map & flowchart generation
│   │
│   ├── uploads/                      # Uploaded files storage
│   ├── model_cache/                  # AI models cache
│   ├── app.py                        # Main Flask application
│   ├── config.py                     # Configuration & DB
│   ├── requirements.txt              # Python dependencies
│   └── .env                          # Environment variables (create this)
│
├── frontend/                          # React Frontend
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthModal.js         # Login/Register modal
│   │   │   ├── ProfileModal.js      # User profile modal
│   │   │   ├── ProcessingModal.js   # AI processing feedback
│   │   │   ├── DocumentSelector.js  # Document selection
│   │   │   ├── UploadNotes.js       # File upload interface
│   │   │   ├── MyNotes.js           # Document management
│   │   │   ├── QuizPage.js          # Quiz interface
│   │   │   ├── SummaryPage.js       # Summary display
│   │   │   ├── MindMapPage.js       # Mind map visualization
│   │   │   ├── ProfilePage.js       # Profile editor
│   │   │   └── DownloadsPage.js     # Generated content
│   │   │
│   │   ├── App.js                    # Main React component
│   │   ├── App.css                   # Global styles
│   │   ├── index.js                  # React entry point
│   │   └── index.css                 # Base styles
│   │
│   ├── package.json                  # Node dependencies
│   └── .env                          # Environment variables (optional)
│
├── .gitignore                        # Git ignore rules
├── README.md                         # This file
└── LICENSE                           # MIT License
```

---

## 🔧 Configuration

### MongoDB Configuration

**Default Connection:**
```
mongodb://localhost:27017/prepify
```

**Custom MongoDB Instance:**

Update `MONGO_URI` in `.env`:
```env
# Local with auth
MONGO_URI=mongodb://username:password@localhost:27017/prepify

# MongoDB Atlas (cloud)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/prepify?retryWrites=true&w=majority

# Custom host/port
MONGO_URI=mongodb://192.168.1.100:27017/prepify
```

### AI Models

Models are automatically downloaded on first use and cached in `backend/model_cache/`:

| Model | Purpose | Size | Download Time |
|-------|---------|------|---------------|
| `sshleifer/distilbart-cnn-12-6` | Summarization | ~1.2GB | 3-5 minutes |
| `valhalla/t5-small-qg-hl` | Quiz generation | ~240MB | 1-2 minutes |
| `en_core_web_sm` | NLP processing | ~50MB | 30 seconds |

**First Run**: Expect 5-10 minutes for model downloads

### Environment Variables

#### Backend (.env)
```env
SECRET_KEY=your-secret-key-here
MONGO_URI=mongodb://localhost:27017/prepify
FLASK_ENV=development
TRANSFORMERS_CACHE=./model_cache
```

#### Frontend (.env) - Optional
```env
REACT_APP_API_URL=http://localhost:5000
```

---

## 🧪 Testing

### Test OCR Functionality

Visit: http://localhost:5000/api/uploads/test-ocr

Expected response:
```json
{
  "ocr_available": true,
  "message": "Tesseract: ✅ Working\nEasyOCR: ✅ Working",
  "tesseract_installed": true
}
```

### Test Endpoints

```bash
# Health check
curl http://localhost:5000/

# Test authentication
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"test123"}'
```

---

