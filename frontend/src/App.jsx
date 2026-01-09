import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navigation from './components/Navigation'
import Home from './pages/Home'
import Tuner from './pages/Tuner'
import Metronome from './pages/Metronome'
import RecordAndAnalysis from './pages/RecordAndAnalysis'
import Analysis from './pages/Analysis'
import DetailedAnalysis from './pages/DetailedAnalysis'

function AppContent() {
  const { user } = useAuth()
  const [currentPage, setCurrentPage] = useState('home')
  const [selectedRecordings, setSelectedRecordings] = useState([])

  const handleAnalyze = (fileData) => {
    setSelectedRecordings(fileData)
    setCurrentPage('detailed-analysis')
  }

  const handleBack = () => {
    // Go back to previous page - check if we came from record or analysis
    const previousNotes = localStorage.getItem('violin-recorded-notes')
    if (previousNotes) {
      // If we have notes, go back to analysis tab (guest can access it now)
      setCurrentPage('analysis')
    } else {
      setCurrentPage('record')
    }
  }

  // Allow guests to access analysis tab for sample analysis
  // (Previously required auth, but now we allow sample analysis for guests)

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home setCurrentPage={setCurrentPage} />
      case 'tuner':
        return <Tuner />
      case 'metronome':
        return <Metronome />
      case 'record':
        return <RecordAndAnalysis onAnalyze={handleAnalyze} />
      case 'analysis':
        return <Analysis setCurrentPage={setCurrentPage} />
      case 'detailed-analysis':
        return <DetailedAnalysis recordings={selectedRecordings} onBack={handleBack} />
      default:
        return <Home setCurrentPage={setCurrentPage} />
    }
  }

  return (
    <div className={`min-h-screen relative font-trajan ${currentPage === 'metronome' ? '' : currentPage === 'home' ? '' : 'wood-bg'}`}>
      {currentPage !== 'home' && (
        <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
      )}
      <main className={currentPage === 'home' ? '' : currentPage === 'metronome' ? 'relative' : 'container mx-auto px-2 md:px-4 py-4 md:py-8 max-w-6xl'}>
        {renderPage()}
      </main>
    </div>
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
