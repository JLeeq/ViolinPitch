import { useState, useEffect, useRef } from 'react'
import { frequencyToNote, getFeedback, formatNote } from '../utils/audioUtils'
import { useSettings } from '../context/SettingsContext'
import Settings from './Settings'
import { detectPitch } from '../utils/pitchDetection'

function Tuner() {
  const { settings } = useSettings()
  const [currentNote, setCurrentNote] = useState(null)
  const [frequency, setFrequency] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)
  const animationFrameRef = useRef(null)
  const streamRef = useRef(null) // 스트림 참조 추가
  const lastNoteRef = useRef(null) // 마지막 측정된 음 저장
  const lastFrequencyRef = useRef(0) // 마지막 측정 주파수 저장
  
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream // 스트림 저장
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      
      // AudioContext가 suspended 상태일 수 있으므로 resume
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }
      
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      
      analyser.fftSize = 4096 // 더 정확한 감지를 위해 증가
      analyser.smoothingTimeConstant = 0.3 // 부드러운 전환을 위해
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Float32Array(bufferLength)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      dataArrayRef.current = dataArray
      
      source.connect(analyser)
      
      const detect = () => {
        if (!analyserRef.current) return // 안전 체크
        
        analyser.getFloatTimeDomainData(dataArray)
        
        const pitch = detectPitch(Array.from(dataArray), audioContext.sampleRate)
        
        if (pitch && pitch > 150 && pitch < 3000) {
          const noteInfo = frequencyToNote(pitch, settings.concertA)
          setCurrentNote(noteInfo)
          setFrequency(pitch)
          // 마지막 측정값 저장
          lastNoteRef.current = noteInfo
          lastFrequencyRef.current = pitch
        } else {
          // 소리가 없으면 마지막 측정값 유지
          if (lastNoteRef.current) {
            setCurrentNote(lastNoteRef.current)
            setFrequency(lastFrequencyRef.current)
          }
        }
        
        animationFrameRef.current = requestAnimationFrame(detect)
      }
      
      detect()
      
      setIsListening(true)
      setError(null)
    } catch (err) {
      console.error('Error accessing microphone:', err)
      
      let errorMessage = '마이크 접근이 거부되었습니다.'
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = '마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.'
        // 권한 요청 재시도 (사용자 상호작용 후)
        const retryButton = window.confirm(
          '마이크 권한이 필요합니다. 권한을 허용하시겠습니까?\n\n' +
          '확인을 누르면 권한 요청이 다시 시도됩니다.'
        )
        if (retryButton) {
          setTimeout(() => startListening(), 100)
        }
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = '마이크를 찾을 수 없습니다.'
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = '마이크에 접근할 수 없습니다. 다른 프로그램이 사용 중일 수 있습니다.'
      }
      
      setError(errorMessage)
    }
  }
  
  useEffect(() => {
    // 컴포넌트 마운트 시 자동으로 마이크 시작
    startListening()
    
    return () => {
      // cleanup - 페이지를 벗어날 때 스트림 정지
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [])
  
  const stopListening = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    // 스트림의 모든 트랙 정지
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    setIsListening(false)
    setCurrentNote(null)
    setFrequency(0)
  }
  
  const feedback = currentNote ? getFeedback(currentNote.cents) : null
  const useFlats = settings.accidental === 'flats'
  const currentNoteName = currentNote ? formatNote(currentNote.note, useFlats) : '—'
  const isInTune = currentNote ? Math.abs(currentNote.cents) < 5 : false
  
  return (
    <div className="space-y-4 md:space-y-8 px-2 md:px-0">
      {/* Settings Button - Top Right */}
      <div className="flex items-center justify-end max-w-3xl mx-auto">
        <button
          className="p-2 rounded-full bg-white shadow hover:bg-brown-50 text-brown-700 text-sm md:text-base border border-brown-200"
          title="Settings"
          onClick={() => setShowSettings(true)}
        >
          ⚙️
        </button>
      </div>
      
      {/* Main tuner UI */}
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg border border-brown-200 p-4 md:p-8">
        {/* Meter */}
        <div className="mb-6">
          <div className="relative h-8 bg-brown-100 rounded-full overflow-hidden">
            <div className="absolute left-1/2 -translate-x-1/2 top-0 h-full w-1/4 bg-emerald-500/30"></div>
            <div
              className={`${isInTune ? 'bg-emerald-600' : 'bg-red-600'} absolute top-0 h-full w-3 transition-all duration-300`}
              style={{ left: currentNote ? `${50 + (currentNote.cents / 50) * 25}%` : '50%' }}
            />
            {/* tick marks */}
            <div className="absolute inset-0 flex justify-between px-3 items-center">
              {Array.from({ length: 21 }, (_, i) => (
                <div key={i} className={`w-1 ${i % 5 === 0 ? 'h-5 bg-brown-500' : 'h-4 bg-brown-400'}`}></div>
              ))}
            </div>
          </div>
          <div className="flex justify-between text-lg font-bold text-brown-700 mt-2">
            <span>-50</span>
            <span className="font-bold">0</span>
            <span>+50</span>
          </div>
        </div>

        {/* Big note display */}
        <div className="text-center">
          <div className={`font-bold font-trajan ${isInTune ? 'text-emerald-600' : 'text-brown-800'}`} style={{ fontSize: 'clamp(48px, 12vw, 72px)', lineHeight: 1 }}>
            {currentNoteName}
          </div>
          <div className="mt-2 text-lg md:text-2xl font-mono text-brown-700">
            {frequency > 0 ? `${frequency.toFixed(1)} Hz` : '— Hz'}
          </div>
          {currentNote && (
            <div className="mt-1 text-xs md:text-sm text-brown-600">
              {currentNote.cents > 0 ? '+' : ''}{currentNote.cents.toFixed(1)} cents
            </div>
          )}
        </div>

        {/* Footer: Concert A */}
        <div className="mt-4 md:mt-6 flex items-center justify-center gap-2 md:gap-3 text-xs md:text-sm text-brown-600">
          <span className="font-bold">A4 = {settings.concertA.toFixed ? settings.concertA.toFixed(2) : settings.concertA} Hz</span>
          <span>•</span>
          <span className="font-bold">Sensitivity ×{settings.sensitivity}</span>
        </div>
      </div>

      {/* Feedback Display */}
      {feedback && (
        <div className="max-w-md mx-auto px-2">
          <div className={`${feedback.color === 'green' ? 'bg-white border-emerald-500' : 'bg-white border-orange-500'} rounded-lg p-3 md:p-4 text-center border shadow-lg`}>
            <p className={`text-base md:text-lg font-bold ${feedback.color === 'green' ? 'text-emerald-700' : 'text-orange-700'}`}>
              {feedback.message}
            </p>
            {currentNote && (
              <p className="text-xs md:text-sm text-brown-600 mt-1">
                {currentNote.cents > 0 ? '+' : ''}{currentNote.cents.toFixed(1)} cents
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="max-w-md mx-auto px-2 bg-white rounded-lg p-3 md:p-4 text-center border border-orange-500 shadow-lg">
          <p className="text-sm md:text-base text-orange-700 font-bold">{error}</p>
        </div>
      )}
      
      {/* Range Display */}
      <div className="text-center text-xs md:text-sm text-brown-600 px-2">
        Range: G3 (196 Hz) ~ E7 (2637 Hz)
      </div>
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-brown-700 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-brown-600">
              <button className="text-sm md:text-base text-accent-green">About</button>
              <div className="text-sm md:text-base font-semibold text-white">Settings</div>
              <button className="text-sm md:text-base text-accent-green" onClick={() => setShowSettings(false)}>Done</button>
            </div>
            <div className="p-4 md:p-5">
              <Settings />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Tuner
