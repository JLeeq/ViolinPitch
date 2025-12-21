import { useAuth } from '../context/AuthContext'

function Navigation({ currentPage, setCurrentPage, onBackToHome }) {
  const { user, signOut } = useAuth()
  
  const navItems = [
    { id: 'tuner', label: 'Tuner' },
    { id: 'metronome', label: 'Metronome' },
    { id: 'record', label: 'Record & Analysis' },
    { id: 'analysis', label: 'Analysis' },
  ]

  // Hide navigation on home page
  if (currentPage === 'home') {
    return null
  }

  return (
    <nav className="bg-brown-100 shadow-md relative z-50 border-b border-brown-300">
      <div className="container mx-auto px-2 md:px-4 max-w-6xl">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Back to Home Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="flex items-center gap-2 px-3 py-2 bg-white text-brown-700 rounded-lg hover:bg-brown-50 transition-all duration-200 text-sm font-medium border border-brown-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden md:inline">Home</span>
            </button>
            <h1 className="text-lg md:text-2xl font-bold text-brown-800 font-trajan">Violin Pitch</h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex space-x-0.5 md:space-x-2 overflow-x-auto">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`px-2 md:px-4 lg:px-6 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    currentPage === item.id
                      ? 'bg-amber-700 text-white shadow-md'
                      : 'bg-white text-brown-700 hover:bg-brown-50 border border-brown-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            
            {/* Logout Button */}
            <button
              onClick={signOut}
              className="flex items-center gap-1 px-3 py-1.5 md:py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-200 text-xs md:text-sm font-medium border border-red-200"
              title={user?.email}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
