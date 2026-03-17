import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { apiService } from '../services/api'
import { SpeechService } from '../services/speech'

interface ReportData {
  description: string
  detectedText: string
  currency: string
  createdAt: string
  publicId: string
}

export default function ReportPage() {
  const { publicId } = useParams<{ publicId: string }>()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const speechService = new SpeechService()

  useEffect(() => {
    if (publicId) {
      loadReport()
    }
  }, [publicId])

  const loadReport = async () => {
    try {
      setLoading(true)
      setError('')
      
      const data = await apiService.getReport(publicId!)
      setReport(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Report not found'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSpeak = async () => {
    if (!report) return

    let textToSpeak = report.description
    if (report.detectedText) {
      textToSpeak += ` Text found: ${report.detectedText}`
    }
    if (report.currency) {
      textToSpeak += ` Currency: ${report.currency}`
    }

    try {
      await speechService.speak(textToSpeak)
    } catch (err) {
      console.error('Speech error:', err)
    }
  }

  const handleShare = async () => {
    if (!report) return

    const shareUrl = window.location.href
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      
      // Show success feedback
      const button = document.querySelector('[data-share-button]') as HTMLButtonElement
      if (button) {
        const originalText = button.textContent
        button.textContent = '✓ Copied!'
        button.classList.add('bg-green-600')
        
        setTimeout(() => {
          button.textContent = originalText
          button.classList.remove('bg-green-600')
        }, 2000)
      }
    } catch (err) {
      console.error('Failed to copy share link:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading report...</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Report Not Found</h1>
          <p className="text-gray-400 mb-4">{error || 'This report could not be found.'}</p>
          <a
            href="/"
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg inline-block"
          >
            Go to Drishti
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Drishti Report</h1>
            <p className="text-gray-400">AI Visual Analysis</p>
          </div>
          
          <a
            href="/"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            ← Back to Drishti
          </a>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-6">
            {/* Report Header */}
            <div className="mb-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold">Analysis Results</h2>
                <div className="text-sm text-gray-400">
                  Report ID: {report.publicId}
                </div>
              </div>
              
              <p className="text-sm text-gray-500">
                Analyzed on {new Date(report.createdAt).toLocaleString()}
              </p>
            </div>

            {/* Analysis Content */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Scene Description</h3>
                <p className="text-gray-300 leading-relaxed">{report.description}</p>
              </div>

              {report.detectedText && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Detected Text</h3>
                  <p className="text-gray-300 bg-gray-700 p-3 rounded">{report.detectedText}</p>
                </div>
              )}

              {report.currency && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Currency Detected</h3>
                  <p className="text-gray-300 bg-gray-700 p-3 rounded">{report.currency}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={handleSpeak}
                className="flex-1 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-4 focus:ring-green-500"
              >
                🔊 Speak Analysis
              </button>
              
              <button
                onClick={handleShare}
                data-share-button
                className="flex-1 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-4 focus:ring-purple-500"
              >
                🔗 Share Report
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-400">
            <p className="mb-2">
              Powered by Drishti - AI Visual Assistant
            </p>
            <p className="text-sm">
              This analysis was generated using Google's Gemini AI technology.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
