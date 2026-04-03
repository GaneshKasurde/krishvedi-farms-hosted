# Krishvedi Farms Analysis

Sales analysis dashboard for Krishvedi Farms.

## Deployment

### Backend (Render)

1. Create a new Web Service on https://dashboard.render.com
2. Connect your GitHub repository
3. Settings:
   - Name: krishvedi-farms
   - Root Directory: `app`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. After deploy, note your URL (e.g., `https://krishvedi-farms.onrender.com`)

### Frontend (Netlify)

1. Go to https://app.netlify.com
2. "Add new site" → "Import an existing project"
3. Select the `frontend/` folder from this repo
4. In Site settings → Environment Variables, add:
   - Key: `VITE_API_URL`
   - Value: Your Render backend URL (e.g., `https://krishvedi-farms.onrender.com`)
5. Trigger a new deploy

## Development

```bash
# Backend
cd app
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Tech Stack

- Frontend: React, Vite, TailwindCSS, Recharts
- Backend: FastAPI, Python
- Deployment: Render (backend), Netlify (frontend)