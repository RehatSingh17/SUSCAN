# SUSCAN — AI Powered News Verification & Misinformation Detection System

## Overview

SUSCAN is an AI-powered misinformation detection and news verification platform that helps users analyze headlines, screenshots, articles, and social media claims using:

* Trusted media sources
* AI-based reasoning
* OCR for image text extraction
* Source credibility scoring
* Bias detection
* Recency analysis
* Firebase authentication and history storage
* Focus Mode for region-specific verification

The system combines:

* React + Vite frontend
* FastAPI backend
* Groq LLMs (Llama models)
* SerpAPI Google Search
* BeautifulSoup web scraping
* Firebase Authentication
* Firestore database
* OCR image processing

---

# Features

## AI Claim Analysis

Users can:

* Paste headlines
* Paste article text
* Upload screenshots/images
* Verify claims against trusted news sources

---

## OCR Image Analysis

SUSCAN extracts text from uploaded images using EasyOCR.

Supported image types:

* PNG
* JPG
* JPEG
* WEBP

---

## Trusted Source Verification

The backend searches across:

* Reuters
* AP News
* BBC
* AFP
* Snopes
* Tribune
* Deccan Herald
* Regional media sources
* International media sources

---

## Focus Mode

Users can select:

* Indian States
* Union Territories
* International

This increases the weight of region-specific trusted media sources for better accuracy.

---

## AI Analysis Output

SUSCAN generates:

* Truth score
* Bias detection
* Final verdict
* Recency detection
* Neutral summary
* Detailed reasoning

---

## Firebase Authentication

Users can:

* Login with Google
* Access personalized search history
* Store previous analyses

---

## Search History

Searches are stored in Firebase Firestore.

Stored data:

* Query
* AI result
* Source analysis
* Focus regions
* Timestamps

---

# Tech Stack

| Layer          | Technology             |
| -------------- | ---------------------- |
| Frontend       | React + Vite           |
| Backend        | FastAPI                |
| AI Models      | Groq (Llama 3.3 & 3.1) |
| Search Engine  | SerpAPI                |
| OCR            | EasyOCR                |
| Scraping       | BeautifulSoup          |
| Database       | Firebase Firestore     |
| Authentication | Firebase Auth          |
| Deployment     | Vercel + Render        |

---

# Project Structure

```bash
SUSCAN/
│
├── src/
│   ├── api/
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── firebase/
│   ├── pages/
│   ├── services/
│   ├── App.jsx
│   └── main.jsx
│
├── sus-backend/
│   ├── mcp/
│   ├── processors/
│   ├── routes/
│   ├── services/
│   ├── main.py
│   ├── requirements.txt
│   └── sources.json
│
├── package.json
├── vite.config.js
└── README.md
```

---

# Frontend Setup

## 1. Clone Repository

```bash
git clone https://github.com/RehatSingh17/SUSCAN.git
```

---

## 2. Move Into Project

```bash
cd SUSCAN
```

---

## 3. Install Frontend Dependencies

```bash
npm install
```

---

# Frontend Environment Variables

Create a `.env` file in the ROOT directory.

Location:

```bash
SUSCAN/.env
```

---

## Frontend `.env` Structure

```env
VITE_API_URL=http://localhost:8000

VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
```

---

# Backend Setup

## 1. Move Into Backend Directory

```bash
cd sus-backend
```

---

## 2. Create Virtual Environment

### Windows

```bash
python -m venv venv
```

Activate:

```bash
venv\Scripts\activate
```

---

### Mac/Linux

```bash
python3 -m venv venv
```

Activate:

```bash
source venv/bin/activate
```

---

## 3. Install Backend Dependencies

```bash
pip install -r requirements.txt
```

---

# Backend Environment Variables

Create `.env` INSIDE:

```bash
SUSCAN/sus-backend/.env
```

---

## Backend `.env` Structure

```env
GROQ_API_KEY=YOUR_GROQ_API_KEY
SERP_API_KEY=YOUR_SERP_API_KEY

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=YOUR_EMAIL
SMTP_PASSWORD=YOUR_APP_PASSWORD
```

---

# Running the Project

## Start Backend

Move into backend:

```bash
cd sus-backend
```

Run:

```bash
uvicorn main:app --reload
```

Backend runs on:

```bash
http://localhost:8000
```

---

## Start Frontend

Open another terminal.

Move into project root:

```bash
cd SUSCAN
```

Run:

```bash
npm run dev
```

Frontend runs on:

```bash
http://localhost:5173
```

---

# Firebase Setup

## 1. Create Firebase Project

Go to:

[https://console.firebase.google.com/](https://console.firebase.google.com/)

---

## 2. Enable Authentication

Enable:

* Google Authentication

---

## 3. Enable Firestore Database

Create database in:

* Production mode
  OR
* Test mode

---

## 4. Copy Firebase Config

Go to:

```text
Project Settings → General → Your Apps
```

Copy config into frontend `.env`.

---

# Deployment

## Frontend Deployment (Vercel)

### Recommended Settings

| Setting          | Value      |
| ---------------- | ---------- |
| Framework        | Vite       |
| Build Command    | vite build |
| Output Directory | dist       |

---

## Frontend Production Environment Variables

```env
VITE_API_URL=https://your-render-backend-url.onrender.com

VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
```

---

# Backend Deployment (Render)

## Render Configuration

| Setting        | Value                                        |
| -------------- | -------------------------------------------- |
| Runtime        | Python 3                                     |
| Root Directory | sus-backend                                  |
| Build Command  | pip install -r requirements.txt              |
| Start Command  | uvicorn main:app --host 0.0.0.0 --port 10000 |

---

## Backend Production Environment Variables

```env
GROQ_API_KEY=YOUR_GROQ_API_KEY
SERP_API_KEY=YOUR_SERP_API_KEY

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=YOUR_EMAIL
SMTP_PASSWORD=YOUR_APP_PASSWORD
```

---

# CORS Configuration

In `main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://your-vercel-domain.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

# Search Pipeline Architecture

```text
User Input
    ↓
OCR Extraction (if image)
    ↓
Text Cleaning
    ↓
SerpAPI Google Search
    ↓
Trusted Source Filtering
    ↓
Parallel Article Scraping
    ↓
Fallback Handling
    ↓
AI Analysis (Groq)
    ↓
Result Validation
    ↓
Frontend Display
```

---

# AI Pipeline

SUSCAN uses:

```text
Llama 3.3 70B → Primary model
Llama 3.1 8B → Fallback model
```

Features:

* Retry logic
* Exponential backoff
* JSON validation
* Model fallback chain
* Rate limit handling

---

# Important Backend Features

## Parallel Scraping

Uses:

```python
ThreadPoolExecutor
```

to scrape multiple articles simultaneously.

---

## Scraping Fallback

If scraping fails:

```python
full_text = title + snippet
```

This prevents loss of trusted sources.

---

## AI Safety

The system:

* Validates JSON
* Prevents malformed responses
* Uses fallback responses
* Handles API failures gracefully

---

# API Endpoints

## Health Check

```http
GET /
```

Response:

```json
{
  "status": "ok"
}
```

---

## Analyze Claim

```http
POST /analyse
```

Supports:

* Text input
* Image upload
* Focus regions

---

# requirements.txt

```txt
fastapi
uvicorn
python-multipart
requests
beautifulsoup4
easyocr
pillow
groq
python-dotenv
```

---

# Security Notes

## Never Commit

* `.env`
* `venv/`
* `node_modules/`
* API keys
* Firebase secrets

---

## Recommended `.gitignore`

```gitignore
node_modules/
venv/
sus-backend/venv/
.env
__pycache__/
*.pyc
```

---

# Future Improvements

* Live misinformation tracking
* Multi-language OCR
* AI source credibility ranking
* Real-time trending misinformation
* Social media integration
* Deepfake detection
* Video analysis
* Browser extension

---

# Authors

Developed by:

* Raksham Sharma
* Team SUSCAN

---

# License

This project is intended for educational, research, and misinformation detection purposes.

---

# Final Notes

SUSCAN is designed as a modern AI-powered misinformation detection system using:

* LLM reasoning
* Trusted media verification
* OCR processing
* Parallel scraping
* Firebase infrastructure
* Region-focused source weighting

The goal is to help users:

* Verify news quickly
* Detect misleading information
* Understand media bias
* Access trusted reporting
* Analyze viral claims responsibly
