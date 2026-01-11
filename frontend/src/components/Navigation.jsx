import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

function Navigation({ currentPage, setCurrentPage }) {
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
          <h1 className="text-lg md:text-2xl font-bold text-brown-800 font-trajan">Violin Pitch</h1>
          
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
            
            {/* Login/Logout Button */}
            {user && user.email ? (
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1 px-3 py-1.5 md:py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-200 text-xs md:text-sm font-medium border border-red-200"
                title={user.email}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden md:inline">Logout</span>
              </button>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 md:py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all duration-200 text-xs md:text-sm font-medium border border-green-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span className="hidden md:inline">Login</span>
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
    </nav>
  )
}

export default Navigation
