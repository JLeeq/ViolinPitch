import { useState, useRef, useEffect } from 'react'
import { SAMPLE_AUDIO } from '../lib/sampleAudio'

function SampleAudioTry({ sample = SAMPLE_AUDIO, onAnalyze, compact = false, isGuest = false }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const handlePlayPause = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(sample.url)
      audioRef.current.onended = () => setIsPlaying(false)
      audioRef.current.onerror = () => {
        console.error('Error loading sample audio')
        setIsPlaying(false)
      }
    }

    if (isPlaying) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true)
      }).catch(err => {
        console.error('Error playing audio:', err)
      })
    }
  }

  const handleAnalyze = async () => {
    if (isAnalyzing) return
    setIsAnalyzing(true)
    try {
      if (onAnalyze) {
        await onAnalyze(sample.id)
      }
    } catch (error) {
      console.error('Error analyzing sample:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (compact) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-brown-200 p-4 opacity-75">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-brown-700">{sample.title}</h4>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePlayPause}
              className="px-3 py-1 bg-brown-600 text-white rounded text-sm hover:bg-brown-700"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 disabled:opacity-50"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`max-w-4xl mx-auto px-2 ${isGuest ? 'mb-6' : 'mb-4'}`}>
      <div className={`bg-white rounded-xl shadow-lg border ${isGuest ? 'border-amber-300 border-2' : 'border-brown-200'} p-6 ${!isGuest ? 'opacity-75' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-lg md:text-xl font-bold ${isGuest ? 'text-amber-800' : 'text-brown-700'} mb-2 font-trajan`}>
              {isGuest ? '🎯 Try Sample Audio (No recording needed)' : 'Sample Audio'}
            </h3>
            <p className={`text-sm ${isGuest ? 'text-amber-700' : 'text-brown-600'}`}>
              {sample.title}
            </p>
            {isGuest && (
              <p className="text-xs text-amber-600 mt-1">
                Demo audio. Your data is not uploaded.
              </p>
            )}
          </div>
        </div>
        
        <div className="mb-4">
          <audio
            ref={audioRef}
            src={sample.url}
            controls
            preload="none"
            className="w-full"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className={`flex-1 px-6 py-3 ${isGuest ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'} text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {isAnalyzing ? (
              <>
                <span className="animate-spin">⏳</span>
                Analyzing...
              </>
            ) : (
              'Analyze Sample'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SampleAudioTry

