import { useState, useEffect, useRef } from 'react'
import { frequencyToNote, formatNote, aggregateNoteStats } from '../utils/audioUtils'
import { useSettings } from '../context/SettingsContext'
import { detectPitch } from '../utils/pitchDetection'
import { noteRepository } from '../storage/noteRepository'

function Record() {
  const { settings } = useSettings()
  const [isRecording, setIsRecording] = useState(false)
  const [recordedNotes, setRecordedNotes] = useState([])
  const [currentFrequency, setCurrentFrequency] = useState(0)
  const [currentNote, setCurrentNote] = useState(null)
  const [previousNote, setPreviousNote] = useState(null)
  const [averagePitchError, setAveragePitchError] = useState(0)
  const [waveformData, setWaveformData] = useState([])
  
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)
  const animationFrameRef = useRef(null)
  const streamRef = useRef(null)
  const recordedDataRef = useRef([])
  
  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [])
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      recordedDataRef.current = []
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      
      analyser.fftSize = 4096
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Float32Array(bufferLength)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      dataArrayRef.current = dataArray
      
      source.connect(analyser)
      
      const recordPitch = () => {
        analyser.getFloatTimeDomainData(dataArray)
        
        const pitch = detectPitch(Array.from(dataArray), audioContext.sampleRate)
        
        if (pitch && pitch > 150 && pitch < 3000) {
          const noteInfo = frequencyToNote(pitch, settings.concertA)
          const timestamp = Date.now()
          
          setCurrentFrequency(pitch)
          setCurrentNote(noteInfo)
          
          // Store if stable for a moment (simple threshold - you can improve this)
          if (recordedDataRef.current.length === 0 || 
              Math.abs(recordedDataRef.current[recordedDataRef.current.length - 1].frequency - pitch) > 5) {
            recordedDataRef.current.push({
              ...noteInfo,
              frequency: pitch,
              timestamp
            })
            
            if (recordedDataRef.current.length >= 2) {
              setPreviousNote(recordedDataRef.current[recordedDataRef.current.length - 2])
            }
            
            // Calculate average pitch error
            const absCents = recordedDataRef.current.map(n => Math.abs(n.cents))
            const avgError = absCents.reduce((a, b) => a + b, 0) / absCents.length
            setAveragePitchError(avgError.toFixed(1))
          }
          
          // Update waveform data
          setWaveformData(Array.from(dataArray).slice(0, 200))
        } else {
          setCurrentFrequency(0)
        }
        
        animationFrameRef.current = requestAnimationFrame(recordPitch)
      }
      
      recordPitch()
      setIsRecording(true)
    } catch (err) {
      console.error('Error accessing microphone:', err)
    }
  }
  
  const persistRecording = async (notes) => {
    if (!notes || !notes.length) return
    try {
      const summary = aggregateNoteStats(notes)
      const firstTimestamp = notes[0]?.timestamp
      const lastTimestamp = notes[notes.length - 1]?.timestamp
      const durationMs = firstTimestamp && lastTimestamp ? Math.max(0, lastTimestamp - firstTimestamp) : null

      await noteRepository.saveSession({
        sourceType: 'microphone',
        sourceName: 'Live Recording',
        summary,
        metadata: {
          durationMs,
          noteCount: notes.length,
        },
      })
    } catch (error) {
      console.error('Failed to persist note session:', error)
    }
  }

  const stopRecording = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    
    const notes = [...recordedDataRef.current]
    setRecordedNotes(notes)
    
    // Save to localStorage for Analysis page
    localStorage.setItem('violin-recorded-notes', JSON.stringify(notes))
    persistRecording(notes)
    
    setIsRecording(false)
    setCurrentFrequency(0)
    setCurrentNote(null)
  }
  
  const clearRecording = () => {
    recordedDataRef.current = []
    setRecordedNotes([])
    setAveragePitchError(0)
    setPreviousNote(null)
    localStorage.removeItem('violin-recorded-notes')
  }
  
  const currentNoteName = currentNote ? formatNote(currentNote.note) : '—'
  const previousNoteName = previousNote ? formatNote(previousNote.note) : '—'
  
  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-bold text-center text-gray-800">Record</h2>
      
      {/* Analysis Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <p className="text-sm text-gray-500 mb-2">Closest Note</p>
          <p className="text-3xl font-bold text-gray-800">{currentNoteName}</p>
          {currentFrequency > 0 && (
            <p className="text-sm text-gray-400 mt-1">{currentFrequency.toFixed(1)} Hz</p>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <p className="text-sm text-gray-500 mb-2">Previous Note</p>
          <p className="text-3xl font-bold text-gray-800">{previousNoteName}</p>
          {previousNote && (
            <p className="text-sm text-gray-400 mt-1">{previousNote.frequency.toFixed(1)} Hz</p>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <p className="text-sm text-gray-500 mb-2">Average Pitch Error</p>
          <p className="text-3xl font-bold text-gray-800">{averagePitchError} cents</p>
          {recordedNotes.length > 0 && (
            <p className="text-sm text-gray-400 mt-1">{recordedNotes.length} notes recorded</p>
          )}
        </div>
      </div>

      {/* Waveform Display */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <p className="text-center text-sm text-gray-500 mb-4">Waveform Display</p>
          <div className="h-48 bg-gradient-to-b from-softblue-100 to-softblue-200 rounded-lg flex items-center justify-center relative overflow-hidden">
            {waveformData.length > 0 ? (
              <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                <path
                  d={`M ${waveformData.map((val, i) => `${i * 4} ${100 - val * 50}`).join(' L ')}`}
                  stroke="#7AB2CE"
                  strokeWidth="2"
                  fill="none"
                  opacity="0.8"
                />
              </svg>
            ) : (
              <p className="text-gray-400">Start recording to see waveform</p>
            )}
          </div>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex gap-4 justify-center">
          {!isRecording ? (
            <button 
              onClick={startRecording}
              className="px-12 py-4 bg-green-500 text-white rounded-xl shadow-lg font-bold text-lg hover:bg-green-600 transition-all duration-200 transform hover:scale-105"
            >
              Start Recording
            </button>
          ) : (
            <button 
              onClick={stopRecording}
              className="px-12 py-4 bg-red-500 text-white rounded-xl shadow-lg font-bold text-lg hover:bg-red-600 transition-all duration-200 transform hover:scale-105"
            >
              Stop Recording
            </button>
          )}
          {recordedNotes.length > 0 && (
            <button 
              onClick={clearRecording}
              className="px-12 py-4 bg-gray-500 text-white rounded-xl shadow-lg font-bold text-lg hover:bg-gray-600 transition-all duration-200 transform hover:scale-105"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-center text-sm text-gray-500">
          Range analyzed: G3 (196 Hz) ~ E7 (2637 Hz)
        </p>
      </div>
      
      {/* Recorded Notes List */}
      {recordedNotes.length > 0 && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Recorded Notes</h3>
            <div className="max-h-64 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {recordedNotes.map((note, index) => (
                  <div key={index} className="bg-beige-100 rounded-lg p-3 text-center">
                    <p className="font-bold text-gray-800">{formatNote(note.note)}</p>
                    <p className="text-xs text-gray-500">{note.frequency.toFixed(0)} Hz</p>
                    <p className={`text-xs font-semibold ${Math.abs(note.cents) < 10 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {note.cents > 0 ? '+' : ''}{note.cents.toFixed(1)}c
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Record


