import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiService, DrishtiHistoryItem } from '../services/api'
import { SpeechService } from '../services/speech'

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<DrishtiHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [user, setUser] = useState<any>(null)
  
  const navigate = useNavigate()
  const speechService = new SpeechService()

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (err) {
        console.error('Failed to parse user data:', err)
        navigate('/')
        return
      }
    } else {
      navigate('/')
      return
    }

    loadHistory()
  }, [page])

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await apiService.getHistory(page, 10)
      setAnalyses(response.analyses)
      setTotalPages(response.pagination.pages)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load history'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSpeak = async (text: string) => {
    try {
      await speechService.speak(text)
    } catch (err) {
      console.error('Speech error:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this analysis?')) return

    try {
      await apiService.deleteAnalysis(id)
      setAnalyses(analyses.filter(item => item._id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete analysis'
      setError(errorMessage)
    }
  }

  const handleShare = async (publicId: string) => {
    const shareUrl = `${window.location.origin}/report/${publicId}`
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      await speechService.speak('Share link copied to clipboard')
    } catch (err) {
      console.error('Failed to copy share link:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold">Analysis History</h1>
          </div>
          
          <div className="text-sm text-gray-400">
            Welcome, {user?.name}
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-4">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Loading history...</p>
            </div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No analyses found. Start using Drishti to build your history!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analyses.map((item) => (
                <div key={item._id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-lg font-medium mb-2">{item.description}</p>
                      
                      {item.detectedText && (
                        <p className="text-sm text-gray-400 mb-1">
                          <strong>Text:</strong> {item.detectedText}
                        </p>
                      )}
                      
                      {item.currency && (
                        <p className="text-sm text-gray-400 mb-2">
                          <strong>Currency:</strong> {item.currency}
                        </p>
                      )}
                      
                      <p className="text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSpeak(item.description)}
                        className="bg-green-600 hover:bg-green-700 p-2 rounded text-sm"
                        title="Speak"
                      >
                        🔊
                      </button>
                      
                      <button
                        onClick={() => handleShare(item.publicId)}
                        className="bg-purple-600 hover:bg-purple-700 p-2 rounded text-sm"
                        title="Share"
                      >
                        🔗
                      </button>
                      
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="bg-red-600 hover:bg-red-700 p-2 rounded text-sm"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 px-4 py-2 rounded"
                  >
                    Previous
                  </button>
                  
                  <span className="px-4 py-2">
                    Page {page} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 px-4 py-2 rounded"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
