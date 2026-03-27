import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ScanPage } from './pages/Scan'
import LoginPage from './pages/Login'
import SignupPage from './pages/Signup'

const HistoryPage = lazy(() => import('./pages/History'))
const ReportPage = lazy(() => import('./pages/Report'))

// Guards the History page – redirects to /login if not authenticated
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function AppContent() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleNavigateToHistory = () => navigate('/history')
  const handleNavigateToReport = (publicId: string) => navigate(`/report/${publicId}`)
  const handleShowAuth = () => navigate('/login')

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/"
        element={
          <ScanPage
            user={user}
            onNavigateToHistory={handleNavigateToHistory}
            onNavigateToReport={handleNavigateToReport}
            onShowAuth={handleShowAuth}
            onLogout={logout}
          />
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected routes */}
      <Route
        path="/history"
        element={
          <PrivateRoute>
            <Suspense fallback={<div className="min-h-screen bg-[#0a0a12] flex items-center justify-center text-white">Loading...</div>}>
              <HistoryPage />
            </Suspense>
          </PrivateRoute>
        }
      />
      <Route
        path="/report/:publicId"
        element={
          <Suspense fallback={<div className="min-h-screen bg-[#0a0a12] flex items-center justify-center text-white">Loading...</div>}>
            <ReportPage />
          </Suspense>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
