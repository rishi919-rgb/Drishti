import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ScanPage } from './pages/Scan'
import LoginPage from './pages/Login'
import SignupPage from './pages/Signup'
import HelpButton from './components/HelpButton'

const HistoryPage = lazy(() => import('./pages/History'))
const ReportPage  = lazy(() => import('./pages/Report'))

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
)

function AppContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const handleNavigateToHistory  = () => navigate('/history')
  const handleNavigateToReport   = (publicId: string) => navigate(`/report/${publicId}`)
  const handleShowAuth           = () => navigate('/login')

  // Hide HelpButton on the auth pages so it doesn't crowd the form
  const isAuthPage = ['/login', '/signup'].includes(location.pathname)

  return (
    <>
      {/* ── ARIA live region for screen-reader announcements ─────── */}
      <div
        id="drishti-live-region"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageWrapper>
                <ScanPage
                  user={user}
                  onNavigateToHistory={handleNavigateToHistory}
                  onNavigateToReport={handleNavigateToReport}
                  onShowAuth={handleShowAuth}
                  onLogout={logout}
                />
              </PageWrapper>
            }
          />
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route
            path="/history"
            element={
              <PrivateRoute>
                <Suspense fallback={
                  <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-white font-bold tracking-widest uppercase">
                    Initializing...
                  </div>
                }>
                  <PageWrapper><HistoryPage /></PageWrapper>
                </Suspense>
              </PrivateRoute>
            }
          />
          <Route
            path="/report/:publicId"
            element={
              <Suspense fallback={
                <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-white font-bold tracking-widest uppercase">
                  Retrieving...
                </div>
              }>
                <PageWrapper><ReportPage /></PageWrapper>
              </Suspense>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>

      {/* ── Global floating help button (hidden on auth pages) ───── */}
      {!isAuthPage && <HelpButton />}
    </>
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
