import { useState, useEffect, useRef } from 'react'
import { BPMDetector } from '../utils/bpmDetection'
import { Metronome as MetronomeSound } from '../utils/metronomeSound'

function Metronome() {
  // State
  const [targetBPM, setTargetBPM] = useState(120)
  const [currentBPM, setCurrentBPM] = useState(null)
  const [isMetronomeRunning, setIsMetronomeRunning] = useState(false)
  const [isEditingTarget, setIsEditingTarget] = useState(false)
  const [editValue, setEditValue] = useState('120')
  const [error, setError] = useState(null)

  // Audio refs
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)
  const animationFrameRef = useRef(null)
  const streamRef = useRef(null)
  const bpmDetectorRef = useRef(null)
  const metronomeSoundRef = useRef(null)

  // Background flashing refs
  const [backgroundColor, setBackgroundColor] = useState('')
  const isBlackRef = useRef(true)

  // Initialize microphone and BPM detection
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)

      analyser.fftSize = 4096
      analyser.smoothingTimeConstant = 0.3
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Float32Array(bufferLength)

      audioContextRef.current = audioContext
      analyserRef.current = analyser
      dataArrayRef.current = dataArray

      source.connect(analyser)

      // Initialize BPM detector
      const bpmDetector = new BPMDetector(audioContext.sampleRate, 0.12, 5000)
      bpmDetectorRef.current = bpmDetector

      // Initialize metronome sound (callback will be set via useEffect)
      const metronome = new MetronomeSound(audioContext, targetBPM, 1000, 0.3)
      metronomeSoundRef.current = metronome

      // Start detection loop
      const detect = () => {
        if (!analyserRef.current) return

        analyser.getFloatTimeDomainData(dataArray)
        const detectedBPM = bpmDetector.process(dataArray)
        
        if (detectedBPM !== null) {
          setCurrentBPM(detectedBPM)
        } else {
          // No sound detected - clear current BPM after a delay
          // This allows the background to resume interval-based flashing
          setCurrentBPM(null)
        }

        animationFrameRef.current = requestAnimationFrame(detect)
      }

      detect()
      setError(null)
    } catch (err) {
      console.error('Error accessing microphone:', err)
      
      let errorMessage = '마이크 접근이 거부되었습니다.'
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = '마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.'
        // 권한 요청 재시도
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

  // Start/stop metronome sound
  const toggleMetronome = () => {
    if (!metronomeSoundRef.current) return

    if (isMetronomeRunning) {
      metronomeSoundRef.current.stop()
      setIsMetronomeRunning(false)
      // Don't stop background flash - keep it running
    } else {
      // Resume audio context if suspended
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume()
      }
      metronomeSoundRef.current.setBPM(targetBPM)
      metronomeSoundRef.current.start()
      setIsMetronomeRunning(true)
      // Background flash is already running
    }
  }

  // Handle target BPM edit
  const handleTargetClick = () => {
    setIsEditingTarget(true)
    setEditValue(targetBPM.toString())
  }

  const handleTargetSubmit = () => {
    const newBPM = parseInt(editValue, 10)
    if (!isNaN(newBPM) && newBPM >= 30 && newBPM <= 300) {
      setTargetBPM(newBPM)
      if (metronomeSoundRef.current) {
        metronomeSoundRef.current.setBPM(newBPM)
      }
    }
    setIsEditingTarget(false)
  }

  const handleTargetKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleTargetSubmit()
    } else if (e.key === 'Escape') {
      setIsEditingTarget(false)
    }
  }

  // Background color logic - synchronized with metronome clicks
  // Always flashes based on target BPM, changes color pair based on current BPM (if detected)
  const getColorPair = () => {
    // If no current BPM detected, always use black/white and flash at target BPM rate
    if (currentBPM === null) {
      return ['#000000', '#FFFFFF']
    }
    
    // Check BPM relationship with tolerance of 2 BPM
    if (Math.abs(currentBPM - targetBPM) < 2) {
      // Match: black/white
      return ['#000000', '#FFFFFF']
    } else if (currentBPM > targetBPM) {
      // Too fast: black/red
      return ['#000000', '#FF0000']
    } else {
      // Too slow: black/skyblue
      return ['#000000', '#87CEFA']
    }
  }

  // Handle metronome tick - change background color
  const handleMetronomeTick = useRef(() => {
    const [color1, color2] = getColorPair()
    setBackgroundColor(prev => {
      const nextColor = isBlackRef.current ? color2 : color1
      isBlackRef.current = !isBlackRef.current
      return nextColor
    })
  })

  // Background flash interval ref (for when no input sound)
  const backgroundFlashIntervalRef = useRef(null)

  // Start background flash based on target BPM (when no input or metronome not running)
  // Interval is set to the target BPM (same speed as metronome clicks)
  const startBackgroundFlash = () => {
    // Clear existing interval
    if (backgroundFlashIntervalRef.current) {
      clearInterval(backgroundFlashIntervalRef.current)
      backgroundFlashIntervalRef.current = null
    }

    // Set interval to the target BPM period
    // Example: 120 BPM = 500ms per click, so 500ms for color flash
    const intervalMs = (60 / targetBPM) * 1000
    
    // Reset state - start with black
    isBlackRef.current = true
    setBackgroundColor('#000000')

    const flash = () => {
      const [color1, color2] = getColorPair()
      // color1 = black (#000000), color2 = white/red/skyblue
      // isBlackRef.current = true → show color2 (white/red/skyblue)
      // isBlackRef.current = false → show color1 (black)
      const nextColor = isBlackRef.current ? color2 : color1
      setBackgroundColor(nextColor)
      isBlackRef.current = !isBlackRef.current
    }

    // Start interval - first flash will happen after intervalMs
    // Pattern: 검(초기) → 힌(interval 첫 실행) → 검(interval 두 번째) → 힌(interval 세 번째) → ...
    // Each flash toggles between black and white/other color
    backgroundFlashIntervalRef.current = setInterval(flash, intervalMs)
  }

  const stopBackgroundFlash = () => {
    if (backgroundFlashIntervalRef.current) {
      clearInterval(backgroundFlashIntervalRef.current)
      backgroundFlashIntervalRef.current = null
    }
  }

  // Update tick handler when BPM or color pair changes
  useEffect(() => {
    handleMetronomeTick.current = () => {
      // If no input BPM is detected, ignore metronome ticks and let the background
      // flash interval control the colors (same behavior as stop 상태)
      if (currentBPM === null) {
        return
      }
      const [color1, color2] = getColorPair()
      setBackgroundColor(prev => {
        const nextColor = isBlackRef.current ? color2 : color1
        isBlackRef.current = !isBlackRef.current
        return nextColor
      })
    }
    
    if (metronomeSoundRef.current) {
      metronomeSoundRef.current.setOnTick(() => handleMetronomeTick.current())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetBPM, currentBPM]) // Update handler when BPM or current input changes

  // When target BPM changes, update flash interval if conditions allow
  useEffect(() => {
    // Restart flash if:
    // 1. Metronome is not running, OR
    // 2. No sound is detected (currentBPM is null)
    // This ensures interval updates when target BPM changes, even if metronome is on
    if (!isMetronomeRunning || currentBPM === null) {
      startBackgroundFlash()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetBPM]) // React to targetBPM changes to update flash interval

  // When metronome starts/stops, adjust background flash
  // Also handle when currentBPM becomes null (no input sound)
  useEffect(() => {
    if (isMetronomeRunning && currentBPM !== null) {
      // Metronome is running AND sound is detected - stop interval-based flash, use click sync only
      // This ensures each click changes color only once, synchronized with audio
      stopBackgroundFlash()
    } else {
      // Metronome stopped OR no sound detected - restart interval for continuous flash at target BPM rate
      // This ensures background keeps flashing even when metronome is off or no sound is detected
      startBackgroundFlash()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMetronomeRunning, currentBPM])

  // Initialize background flash immediately on mount - ensure it always starts
  useEffect(() => {
    // Start immediately to ensure flashing begins right away
    startBackgroundFlash()
    
    return () => {
      stopBackgroundFlash()
    }
  }, [])

  // Initialize on mount
  useEffect(() => {
    startListening()

    return () => {
      // Cleanup - 페이지를 벗어날 때 스트림 정지
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (backgroundFlashIntervalRef.current) {
        clearInterval(backgroundFlashIntervalRef.current)
        backgroundFlashIntervalRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (metronomeSoundRef.current) {
        metronomeSoundRef.current.destroy()
        metronomeSoundRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [])

  return (
    <div 
      className="fixed inset-0 transition-colors duration-75 z-10"
      style={{ backgroundColor: backgroundColor || '#000000' }}
    >
      <div className="min-h-screen flex items-center justify-center p-4 md:p-8 pt-20 md:pt-24">
        <div className="bg-brown-700/95 backdrop-blur-sm rounded-2xl shadow-2xl p-5 md:p-8 max-w-[280px] w-full mx-2">
          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-accent-orange/20 rounded-lg p-4 text-center border border-accent-orange/30">
              <p className="text-accent-orange font-semibold">{error}</p>
            </div>
          )}

          {/* Target BPM */}
          <div className="mb-8 text-center">
            <label className="block text-sm font-medium text-brown-200 mb-2">
              Target BPM
            </label>
            {isEditingTarget ? (
              <input
                type="number"
                min="30"
                max="300"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleTargetSubmit}
                onKeyDown={handleTargetKeyPress}
                className="text-6xl font-bold text-center w-full bg-transparent border-2 border-accent-green rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green text-white"
                autoFocus
              />
            ) : (
              <div
                onClick={handleTargetClick}
                className="text-6xl font-bold text-white cursor-pointer hover:text-accent-green transition-colors"
              >
                {targetBPM}
              </div>
            )}
          </div>

          {/* Current BPM */}
          <div className="mb-8 text-center">
            <label className="block text-sm font-medium text-brown-200 mb-2">
              Current BPM
            </label>
            <div className="text-4xl font-semibold text-white">
              {currentBPM !== null ? currentBPM : '—'}
            </div>
            {currentBPM !== null && (
              <div className="mt-2 text-xs md:text-sm text-brown-300">
                {currentBPM > targetBPM ? (
                  <span className="text-accent-orange">Too fast</span>
                ) : currentBPM < targetBPM ? (
                  <span className="text-accent-yellow">Too slow</span>
                ) : (
                  <span className="text-accent-green">Perfect!</span>
                )}
              </div>
            )}
          </div>

          {/* Start/Stop Button */}
          <div className="text-center">
            <button
              onClick={toggleMetronome}
              className={`px-6 md:px-8 py-3 md:py-4 rounded-xl font-semibold text-base md:text-lg transition-all duration-200 w-full md:w-auto ${
                isMetronomeRunning
                  ? 'bg-accent-orange hover:bg-accent-orange/80 text-white'
                  : 'bg-accent-green hover:bg-accent-green/80 text-white'
              }`}
            >
              {isMetronomeRunning ? '⏹ Stop' : '▶ Start'}
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-6 md:mt-8 text-center text-xs text-brown-300">
            <p>Click Target BPM to edit</p>
            <p>Tap or play along to measure your tempo</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Metronome
