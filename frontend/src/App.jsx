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
    setCurrentPage('record')
  }


  // 로그인이 필요한 페이지에서 로그인 안되어 있으면 홈으로
  const requiresAuth = ['record', 'analysis', 'detailed-analysis']
  if (requiresAuth.includes(currentPage) && !user) {
    setCurrentPage('home')
  }

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
        return <Analysis />
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
