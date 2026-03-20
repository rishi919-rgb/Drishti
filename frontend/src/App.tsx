import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import { ScanPage } from './pages/Scan'
import { apiService } from './services/api'

interface User {
  id: string
  name: string
  email: string
}

function AppContent() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [showAuth, setShowAuth] = useState(false)

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (err) {
        console.error('Failed to parse user data:', err)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
  }, [])

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password) as any
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      setUser(response.user)
      setShowAuth(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      console.error('Login error:', errorMessage)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const handleNavigateToHistory = () => {
    navigate('/history')
  }

  const handleNavigateToReport = (publicId: string) => {
    navigate(`/report/${publicId}`)
  }

  const handleShowAuth = () => {
    setShowAuth(true)
  }

  return (
    <>
      <ScanPage
        user={user}
        onNavigateToHistory={handleNavigateToHistory}
        onNavigateToReport={handleNavigateToReport}
        onShowAuth={handleShowAuth}
        onLogout={handleLogout}
      />

      {/* Authentication Modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Login to Drishti</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="your@email.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAuth(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const email = (document.querySelector('input[type="email"]') as HTMLInputElement)?.value
                    const password = (document.querySelector('input[type="password"]') as HTMLInputElement)?.value
                    if (email && password) {
                      handleLogin(email, password)
                    }
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </Router>
  )
}

export default App
