import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import CreateCompany from './pages/admin/CreateCompany'
import UploadData from './pages/admin/UploadData'
import ClientLayout from './pages/client/ClientLayout'
import OverviewPage from './pages/client/OverviewPage'
import ItemsPage from './pages/client/ItemsPage'
import PartiesPage from './pages/client/PartiesPage'
import IncomePage from './pages/client/IncomePage'
import TrendsPage from './pages/client/TrendsPage'
import AnalysisPage from './pages/client/AnalysisPage'
import MaterialsPage from './pages/client/MaterialsPage'
import GradesPage from './pages/client/GradesPage'
import CustomersPage from './pages/client/CustomersPage'
import DebugPage from './pages/client/DebugPage'
import { useAuth } from './context/AuthContext'

type PropsWithChildren = { children: React.ReactNode }

function ProtectedAdminRoute({ children }: PropsWithChildren) {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function ProtectedClientRoute({ children }: PropsWithChildren) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={
            <ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>
          } />
          <Route path="/admin/companies/new" element={
            <ProtectedAdminRoute><CreateCompany /></ProtectedAdminRoute>
          } />
          <Route path="/admin/upload" element={
            <ProtectedAdminRoute><UploadData /></ProtectedAdminRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedClientRoute><ClientLayout /></ProtectedClientRoute>
          }>
            <Route index element={<OverviewPage />} />
            <Route path="items" element={<ItemsPage />} />
            <Route path="parties" element={<PartiesPage />} />
            <Route path="income" element={<IncomePage />} />
            <Route path="trends" element={<TrendsPage />} />
            <Route path="analysis" element={<AnalysisPage />} />
            <Route path="materials" element={<MaterialsPage />} />
            <Route path="grades" element={<GradesPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="debug" element={<DebugPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}