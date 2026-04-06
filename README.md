# Krishvedi Portal - Multi-Tenant Sales Analysis System

A complete multi-tenant admin portal for managing multiple company clients with dedicated login credentials and data access.

## Features

- **Multi-Tenant Admin Portal** - Manage multiple company clients
- **Separate Client Access** - Each client sees only their own data
- **Admin Data Upload** - Admin uploads Excel files per company
- **Client View Only** - Clients can view dashboards, cannot upload/modify
- **Persistent Storage** - Data stored in SQLite database
- **Fully Deployable** - Backend on Render, Frontend on Vercel

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, SQLite, Python
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Recharts

## Default Admin Credentials

- Username: `admin`
- Password: `admin@krishvedi123`

## Local Setup

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python run_server.py
```

The backend will start at `http://localhost:8006`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:3006`

## Project Structure

```
KRISHVEDI_PORTAL/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── database.py          # SQLAlchemy setup
│   ├── models.py            # Database models
│   ├── auth.py              # Authentication utilities
│   ├── routes/
│   │   ├── auth_routes.py   # Login/logout endpoints
│   │   ├── admin_routes.py # Admin company management
│   │   └── dashboard_routes.py # Client dashboard data
│   ├── requirements.txt    # Python dependencies
│   ├── run_server.py       # Server startup script
│   └── .env                # Environment variables
│
└── frontend/
    ├── src/
    │   ├── App.tsx          # Main app with routing
    │   ├── api.ts           # Axios API client
    │   ├── context/
    │   │   └── AuthContext.tsx # Auth state management
    │   ├── pages/
    │   │   ├── LoginPage.tsx
    │   │   ├── admin/
    │   │   │   ├── AdminDashboard.tsx
    │   │   │   ├── CreateCompany.tsx
    │   │   │   └── UploadData.tsx
    │   │   └── client/
    │   │       ├── ClientLayout.tsx
    │   │       ├── OverviewPage.tsx
    │   │       ├── ItemsPage.tsx
    │   │       ├── PartiesPage.tsx
    │   │       └── IncomePage.tsx
    │   └── components/
    │       └── ProtectedRoute.tsx
    └── package.json
```

## Deployment

### Backend - Render

1. Push your code to GitHub
2. Create a new Web Service on Render
3. Connect your GitHub repository
4. Set environment variables:
   - `SECRET_KEY` (auto-generated)
   - `ADMIN_USERNAME` = `admin`
   - `ADMIN_PASSWORD` = `admin@krishvedi123`
5. Build command: `pip install -r requirements.txt`
6. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend - Vercel

1. Push your code to GitHub
2. Import project on Vercel
3. Add environment variable: `VITE_API_URL` = your Render backend URL
4. Deploy

## How to Use

### As Admin

1. Login with `admin` / `admin@krishvedi123`
2. Go to "Create New Company" to add a new client
3. Note the client credentials displayed after creation
4. Use "Upload Data" to upload Excel files for each company
5. Monitor all companies and their data status

### As Client

1. Use the username/password created by admin
2. View dashboard with Overview, Items, Parties, and Income Statement
3. Filter data by month using the selector
4. Export to PDF if needed
5. Cannot upload or modify data (view-only)

## Excel Data Format

The system expects Excel files with columns like:
- Date
- Party
- Items
- Vch Type
- Vch No.
- Inwards_QTY
- Value
- Outwards_QTY
- Value_1
- Gross Value
- Consumption
- Gross Profit
- Perc %
- Closing_QTY
- Balance

The system will automatically categorize entries as Sales, Purchases, or other types based on the "Vch Type" column.