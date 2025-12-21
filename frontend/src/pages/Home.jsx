import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

function Home({ setCurrentPage }) {
  const { user, signOut, signInWithGoogle, signIn, signUp } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    
    if (isSignUp) {
      const { error } = await signUp(email, password)
      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email to confirm your account!')
      }
    } else {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message)
      } else {
        setShowLoginModal(false)
      }
    }
  }

  const handleGoogleLogin = async () => {
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error.message)
    }
  }

  const features = [
    {
      id: 'tuner',
      title: 'Tuner',
      icon: '🎵',
      description: 'Real-time pitch detection to help you tune your violin strings accurately.',
      color: 'from-emerald-500 to-teal-600',
      requiresAuth: false
    },
    {
      id: 'metronome',
      title: 'Metronome',
      icon: '🎼',
      description: 'Keep perfect tempo with our visual and audio metronome.',
      color: 'from-amber-500 to-orange-600',
      requiresAuth: false
    },
    {
      id: 'record',
      title: 'Record & Analysis',
      icon: '🎻',
      description: 'Record your practice sessions and get instant feedback on your intonation.',
      color: 'from-violet-500 to-purple-600',
      requiresAuth: true
    },
    {
      id: 'analysis',
      title: 'Analysis & Report',
      icon: '📊',
      description: 'View your pitch accuracy trends, comprehensive reports, and identify areas for improvement.',
      color: 'from-rose-500 to-pink-600',
      requiresAuth: true
    }
  ]

  const instructions = [
    {
      step: 1,
      title: 'Tune Your Violin',
      description: 'Start with the Tuner to ensure your strings (G, D, A, E) are perfectly in tune.'
    },
    {
      step: 2,
      title: 'Set Your Tempo',
      description: 'Use the Metronome to practice with consistent rhythm at your desired BPM.'
    },
    {
      step: 3,
      title: 'Record Your Practice',
      description: 'Go to Record & Analysis to capture your playing and receive real-time pitch feedback.'
    },
    {
      step: 4,
      title: 'Review & Improve',
      description: 'Check the Analysis and Reports to track your progress and focus on weak areas.'
    }
  ]

  const handleFeatureClick = (feature) => {
    if (feature.requiresAuth && !user) {
      setShowLoginModal(true)
    } else {
      setCurrentPage(feature.id)
    }
  }

  return (
    <div className="min-h-screen wood-bg">
      {/* Top Bar with Login */}
      <div className="bg-brown-800/90 backdrop-blur-sm sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-3 max-w-6xl">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold text-white font-trajan">
              Violin Pitch
            </h1>
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-white/80 text-sm hidden md:block">
                  {user.email}
                </span>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-200 rounded-lg hover:bg-red-500/30 transition-all duration-200 text-sm font-medium border border-red-400/30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden md:inline">Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all duration-200 text-sm font-medium shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
            <button
              onClick={() => { setShowLoginModal(false); setError(''); setMessage(''); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-2xl font-bold text-center text-amber-800 mb-2 font-trajan">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-center text-gray-600 mb-6">
              {isSignUp ? 'Sign up to save your practice sessions' : 'Login to access your practice data'}
            </p>
            
            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 p-3 rounded-lg font-bold hover:bg-gray-50 transition mb-4"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-4 my-4">
              <hr className="flex-1 border-gray-300" />
              <span className="text-gray-500 text-sm">or</span>
              <hr className="flex-1 border-gray-300" />
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                required
              />
              
              {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
              {message && <p className="text-green-600 text-sm font-bold">{message}</p>}
              
              <button 
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-lg font-bold transition"
              >
                {isSignUp ? 'Sign Up' : 'Login'}
              </button>
            </form>
            
            <p className="text-center mt-6 text-gray-600">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button 
                onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
                className="text-amber-600 ml-2 font-bold hover:underline"
              >
                {isSignUp ? 'Login' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100/30 via-transparent to-transparent"></div>
        <div className="container mx-auto px-4 py-12 md:py-20 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-6 inline-block">
              <span className="text-7xl md:text-8xl">🎻</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-brown-800 mb-4 tracking-tight font-trajan">
              Violin Pitch
            </h1>
            <p className="text-lg md:text-xl text-brown-700 mb-8 leading-relaxed max-w-2xl mx-auto">
              Your intelligent companion for mastering violin intonation. 
              Practice smarter with real-time feedback and detailed analysis.
            </p>
          </div>
        </div>
      </div>

      {/* How to Use Section */}
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <h2 className="text-2xl md:text-3xl font-bold text-brown-800 text-center mb-10 font-trajan">
          How to Use
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {instructions.map((item) => (
            <div 
              key={item.step}
              className="relative bg-white rounded-xl p-6 border border-brown-200 hover:border-amber-500 hover:shadow-lg transition-all duration-300"
            >
              <div className="absolute -top-4 left-6 w-8 h-8 bg-amber-700 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                {item.step}
              </div>
              <h3 className="text-lg font-bold text-brown-800 mt-2 mb-3 font-trajan">
                {item.title}
              </h3>
              <p className="text-brown-700 text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <h2 className="text-2xl md:text-3xl font-bold text-brown-800 text-center mb-10 font-trajan">
          Get Started
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <button
              key={feature.id}
              onClick={() => handleFeatureClick(feature)}
              className="group relative overflow-hidden bg-white rounded-2xl p-6 text-left transition-all duration-300 hover:scale-105 hover:shadow-xl border border-brown-200 hover:border-amber-500"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </span>
                  {feature.requiresAuth && !user && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                      Login required
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-brown-800 mb-2 group-hover:text-amber-700 transition-colors font-trajan">
                  {feature.title}
                </h3>
                <p className="text-brown-700 text-sm leading-relaxed">
                  {feature.description}
                </p>
                <div className="mt-4 flex items-center text-amber-700 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>Open</span>
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tips Section */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-2xl p-8 border border-brown-200 shadow-lg">
          <h3 className="text-xl font-bold text-brown-800 mb-4 flex items-center gap-2 font-trajan">
            <span>💡</span> Pro Tips
          </h3>
          <ul className="space-y-3 text-brown-700">
            <li className="flex items-start gap-3">
              <span className="text-amber-700 mt-1">•</span>
              <span>Practice in a quiet environment for accurate pitch detection</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-700 mt-1">•</span>
              <span>Use headphones when practicing with the metronome to avoid feedback</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-700 mt-1">•</span>
              <span>Record multiple takes and compare your progress over time</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-700 mt-1">•</span>
              <span>Focus on notes with lower accuracy scores in your detailed analysis</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-brown-600 text-sm">
          Made with ❤️ for violin enthusiasts
        </p>
      </div>
    </div>
  )
}

export default Home
