import { useState, useEffect, useRef } from 'react'
import { frequencyToNote, formatNote, aggregateNoteStats } from '../utils/audioUtils'
import { useSettings } from '../context/SettingsContext'
import { detectPitch } from '../utils/pitchDetection'
import { noteRepository } from '../storage/noteRepository'
import { apiService } from '../services/aiAnalysisService'

function RecordAndAnalysis({ onBack, onAnalyze }) {
  const { settings } = useSettings()
  const [isRecording, setIsRecording] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState(null)
  const [recordedFiles, setRecordedFiles] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [currentFrequency, setCurrentFrequency] = useState(0)
  const [currentNote, setCurrentNote] = useState(null)
  const [waveformData, setWaveformData] = useState([])
  const [playingFileId, setPlayingFileId] = useState(null) // 현재 재생 중인 파일 ID
  const [error, setError] = useState(null)
  const recordedDataRef = useRef([])
  
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)
  const animationFrameRef = useRef(null)
  const streamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const currentAudioRef = useRef(null) // 현재 재생 중인 Audio 객체

  useEffect(() => {
    // Load saved files from localStorage
    const saved = localStorage.getItem('violin-recorded-files')
    if (saved) {
      try {
        setRecordedFiles(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading files:', e)
      }
    }
    
    return () => {
      // cleanup - 페이지를 벗어날 때 스트림 정지
      stopRecording()
      stopPlaying()
      
      // 추가 cleanup (stopRecording이 호출되지 않은 경우 대비)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      
      // MediaRecorder for saving audio file
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      recordedDataRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        const audioUrl = URL.createObjectURL(audioBlob)
        
        const fileName = `recording_${Date.now()}.wav`
        const fileInfo = {
          id: Date.now(),
          name: fileName,
          url: audioUrl,
          blob: audioBlob,
          date: new Date().toISOString()
        }
        
        setRecordedFiles([...recordedFiles, fileInfo])
        localStorage.setItem('violin-recorded-files', JSON.stringify([...recordedFiles, fileInfo]))
        
        // 오디오 블롭을 저장하여 나중에 백엔드에 업로드
        audioChunksRef.current.audioBlob = audioBlob
      }
      
      mediaRecorder.start()
      
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
          setCurrentFrequency(pitch)
          setCurrentNote(noteInfo)
          setWaveformData(Array.from(dataArray).slice(0, 200))

          const lastEntry = recordedDataRef.current.at(-1)
          if (
            !lastEntry ||
            Math.abs(lastEntry.frequency - pitch) > 5 ||
            lastEntry.note !== noteInfo.note
          ) {
            recordedDataRef.current.push({
              ...noteInfo,
              frequency: pitch,
              timestamp: Date.now(),
            })
          }
        } else {
          setCurrentFrequency(0)
        }
        
        animationFrameRef.current = requestAnimationFrame(recordPitch)
      }
      
      recordPitch()
      setIsRecording(true)
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
          setTimeout(() => startRecording(), 100)
        }
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = '마이크를 찾을 수 없습니다.'
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = '마이크에 접근할 수 없습니다. 다른 프로그램이 사용 중일 수 있습니다.'
      }
      
      setError(errorMessage)
    }
  }

  const persistRecording = async (notes, audioBlob = null) => {
    if (!notes || notes.length === 0) return
    try {
      const summary = aggregateNoteStats(notes)
      const firstTimestamp = notes[0]?.timestamp
      const lastTimestamp = notes[notes.length - 1]?.timestamp
      const durationMs = firstTimestamp && lastTimestamp ? Math.max(0, lastTimestamp - firstTimestamp) : null

      // summary에 sequence 포함 (백엔드 동기화를 위해)
      const result = await noteRepository.saveSession({
        sourceType: 'microphone',
        sourceName: 'Live Recording',
        summary: {
          ...summary,
          sequence: summary.sequence || notes.map(note => ({
            note: note.note,
            accuracy: note.accuracy,
            cents: note.cents,
            timestamp: note.timestamp,
            frequency: note.frequency,
          })),
        },
        metadata: {
          durationMs,
          noteCount: notes.length,
        },
      })

      // 백엔드 동기화 성공 시 오디오 파일 업로드
      if (result.synced && result.backendId && audioBlob) {
        try {
          const fileName = `recording_${Date.now()}.wav`
          await apiService.uploadAudioFile(result.backendId, audioBlob, fileName)
          console.log('Audio file uploaded successfully')
        } catch (uploadError) {
          console.error('Failed to upload audio file:', uploadError)
          // 오디오 업로드 실패해도 세션은 저장됨
        }
      }
    } catch (error) {
      console.error('Failed to persist note session:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    // 스트림 정지 - 녹음 중지 시 마이크 스트림도 중지
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    setIsRecording(false)
    setCurrentFrequency(0)
    setCurrentNote(null)

    const notes = [...recordedDataRef.current]
    const audioBlob = audioChunksRef.current.audioBlob || null
    
    if (notes.length > 0) {
      localStorage.setItem('violin-recorded-notes', JSON.stringify(notes))
      persistRecording(notes, audioBlob)
    }
  }

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  const playFile = async (fileUrl, fileId) => {
    try {
      // 이미 재생 중인 오디오가 있으면 정지
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current.currentTime = 0
        currentAudioRef.current = null
        setPlayingFileId(null)
      }
      
      // 같은 파일이면 재생 중지
      if (playingFileId === fileId) {
        setPlayingFileId(null)
        return
      }
      
      // 새로운 오디오 재생
      const audio = new Audio(fileUrl)
      currentAudioRef.current = audio
      setPlayingFileId(fileId)
      
      // 재생 완료 시 정리
      audio.onended = () => {
        setPlayingFileId(null)
        currentAudioRef.current = null
      }
      
      // 에러 처리
      audio.onerror = (e) => {
        console.error('Error playing audio:', e)
        setPlayingFileId(null)
        currentAudioRef.current = null
      }
      
      // 재생 시도
      await audio.play()
    } catch (error) {
      console.error('Failed to play audio:', error)
      setPlayingFileId(null)
      currentAudioRef.current = null
      
      // 사용자에게 알림
      alert('Failed to play audio. Please check if the file is valid.')
    }
  }
  
  const stopPlaying = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
      currentAudioRef.current = null
      setPlayingFileId(null)
    }
  }

  const deleteFile = (fileId) => {
    const newFiles = recordedFiles.filter(f => f.id !== fileId)
    setRecordedFiles(newFiles)
    localStorage.setItem('violin-recorded-files', JSON.stringify(newFiles))
    setSelectedFiles(selectedFiles.filter(id => id !== fileId))
  }

  const handleAnalysis = () => {
    if (selectedFiles.length === 0) return
    const selectedFileData = recordedFiles.filter(f => selectedFiles.includes(f.id))
    if (onAnalyze) {
      onAnalyze(selectedFileData)
    }
  }

  return (
    <div className="space-y-4 md:space-y-8 px-2 md:px-0">
      {/* Error Display */}
      {error && (
        <div className="max-w-md mx-auto px-2 bg-orange-100 rounded-lg p-3 md:p-4 text-center border border-orange-500">
          <p className="text-sm md:text-base text-orange-700 font-semibold">{error}</p>
        </div>
      )}
      
      {/* Current Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-brown-200 p-4 md:p-6 text-center">
          <p className="text-xs md:text-sm text-brown-700 font-bold mb-2">Current Note</p>
          <p className="text-xl md:text-3xl font-bold text-brown-800 font-trajan">
            {currentNote ? formatNote(currentNote.note) : '—'}
          </p>
          {currentFrequency > 0 && (
            <p className="text-xs md:text-sm text-brown-600 mt-1">{currentFrequency.toFixed(1)} Hz</p>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-brown-200 p-4 md:p-6 text-center">
          <p className="text-xs md:text-sm text-brown-700 font-bold mb-2">Status</p>
          <p className="text-xl md:text-3xl font-bold text-brown-800">
            {isRecording ? '🔴 Recording' : '⚪ Idle'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-brown-200 p-4 md:p-6 text-center">
          <p className="text-xs md:text-sm text-brown-700 font-bold mb-2">Recordings</p>
          <p className="text-xl md:text-3xl font-bold text-brown-800">{recordedFiles.length}</p>
        </div>
      </div>

      {/* Waveform Display */}
      <div className="max-w-4xl mx-auto px-2">
        <div className="bg-white rounded-xl shadow-lg border border-brown-200 p-4 md:p-8">
          <p className="text-center text-xs md:text-sm text-brown-700 font-bold mb-4">Waveform Display</p>
          <div className="h-48 bg-gradient-to-b from-brown-100 to-brown-200 rounded-lg flex items-center justify-center relative overflow-hidden">
            {waveformData.length > 0 ? (
              <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                <path
                  d={`M ${waveformData.map((val, i) => `${i * 4} ${100 - val * 50}`).join(' L ')}`}
                  stroke="#059669"
                  strokeWidth="2"
                  fill="none"
                  opacity="0.8"
                />
              </svg>
            ) : (
              <p className="text-brown-600">Start recording to see waveform</p>
            )}
          </div>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="max-w-4xl mx-auto px-2">
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center">
          {!isRecording ? (
            <button 
              onClick={startRecording}
              className="w-full sm:w-auto px-8 md:px-12 py-3 md:py-4 bg-emerald-600 text-white rounded-xl shadow-lg font-bold text-base md:text-lg hover:bg-emerald-700 transition-all duration-200 transform hover:scale-105"
            >
              Start Recording
            </button>
          ) : (
            <button 
              onClick={stopRecording}
              className="w-full sm:w-auto px-8 md:px-12 py-3 md:py-4 bg-orange-600 text-white rounded-xl shadow-lg font-bold text-base md:text-lg hover:bg-orange-700 transition-all duration-200 transform hover:scale-105"
            >
              Stop Recording
            </button>
          )}
          
          {selectedFiles.length > 0 && (
            <button 
              onClick={handleAnalysis}
              className="w-full sm:w-auto px-8 md:px-12 py-3 md:py-4 bg-purple-600 text-white rounded-xl shadow-lg font-bold text-base md:text-lg hover:bg-purple-700 transition-all duration-200 transform hover:scale-105"
            >
              Analyze ({selectedFiles.length})
            </button>
          )}
        </div>
      </div>

      {/* Recorded Files List */}
      {recordedFiles.length > 0 && (
        <div className="max-w-4xl mx-auto px-2">
          <div className="bg-white rounded-xl shadow-lg border border-brown-200 p-4 md:p-6">
            <h3 className="text-lg md:text-xl font-bold text-brown-800 mb-4 font-trajan">Recorded Files</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recordedFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-4 p-4 bg-brown-50 rounded-lg hover:bg-brown-100 transition-colors border border-brown-200">
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.id)}
                    onChange={() => toggleFileSelection(file.id)}
                    className="w-5 h-5 text-emerald-600"
                  />
                  <div className="flex-grow">
                    <p className="font-semibold text-brown-800">{file.name}</p>
                    <p className="text-xs text-brown-600">{new Date(file.date).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => playFile(file.url, file.id)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    {playingFileId === file.id ? '⏸ Pause' : '▶ Play'}
                  </button>
                  <button
                    onClick={() => deleteFile(file.id)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <p className="text-center text-sm text-gray-500">
        Range analyzed: G3 (196 Hz) ~ E7 (2637 Hz)
      </p>
    </div>
  )
}

export default RecordAndAnalysis





