import { useState, useEffect, useMemo } from 'react'
import { analyzeWithPreviousNotes, aggregateNoteStats, colorTokenToBorderClass, formatNote } from '../utils/audioUtils'
import { generateIntegratedReport } from '../utils/reportGenerator'
import { noteRepository } from '../storage/noteRepository'
import { useAuth } from '../context/AuthContext'
import { analyzeSampleAudio } from '../utils/sampleAnalysis'
import { useSettings } from '../context/SettingsContext'
import { SAMPLE_AUDIO, SAMPLE_AUDIO_ALLOWLIST } from '../lib/sampleAudio'
import { generatePracticeReport } from '../lib/generatePracticeReport'

function Analysis({ setCurrentPage }) {
  const { user } = useAuth()
  const { settings } = useSettings()
  const isGuest = !user
  const [useFlats, setUseFlats] = useState(false)
  const [recordedNotes, setRecordedNotes] = useState([])
  const [report, setReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(true)
  const [practiceReport, setPracticeReport] = useState(null)
  const [practiceReportLoading, setPracticeReportLoading] = useState(false)
  const [practiceReportError, setPracticeReportError] = useState(null)
  
  // Load recorded notes from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem('violin-recorded-notes')
    if (savedNotes) {
      try {
        setRecordedNotes(JSON.parse(savedNotes))
      } catch (e) {
        console.error('Error loading recorded notes:', e)
      }
    }
    
    // Load saved practice report from localStorage
    const savedReport = localStorage.getItem('violin-practice-report')
    if (savedReport) {
      try {
        setPracticeReport(savedReport)
      } catch (e) {
        console.error('Error loading practice report:', e)
      }
    }
    
    // Load integrated report
    loadReport()
  }, [])

  const loadReport = async () => {
    try {
      setReportLoading(true)
      const generatedReport = await generateIntegratedReport(noteRepository)
      setReport(generatedReport)
    } catch (err) {
      console.error('Error generating report:', err)
    } finally {
      setReportLoading(false)
    }
  }

  // Generate practice report
  const handleGeneratePracticeReport = async () => {
    try {
      setPracticeReportLoading(true)
      setPracticeReportError(null)
      
      const stored = localStorage.getItem('violin-recorded-notes')
      if (!stored) {
        setPracticeReportError('No practice data found. Please record first.')
        return
      }
      
      const notes = JSON.parse(stored)
      if (!notes || !Array.isArray(notes) || notes.length === 0) {
        setPracticeReportError('No practice data available. Please record first.')
        return
      }
      
      const report = await generatePracticeReport(notes)
      setPracticeReport(report)
      // Save report to localStorage
      localStorage.setItem('violin-practice-report', report)
    } catch (error) {
      console.error('Error generating practice report:', error)
      setPracticeReportError(error.message || 'Failed to generate report. Please try again.')
    } finally {
      setPracticeReportLoading(false)
    }
  }

  // Copy report to clipboard
  const handleCopyPracticeReport = () => {
    if (practiceReport) {
      navigator.clipboard.writeText(practiceReport).then(() => {
        alert('Report copied to clipboard!')
      }).catch((err) => {
        console.error('Failed to copy report:', err)
        alert('Failed to copy report. Please select and copy manually.')
      })
    }
  }

  // Note conversion mapping between sharp and flat notation
  const noteConversion = {
    'C#': 'D♭',
    'D#': 'E♭', 
    'F#': 'G♭',
    'G#': 'A♭',
    'A#': 'B♭'
  }

  const reverseNoteConversion = {
    'D♭': 'C#',
    'E♭': 'D#',
    'G♭': 'F#', 
    'A♭': 'G#',
    'B♭': 'A#'
  }

  // Convert note notation
  const convertNote = (note) => {
    if (!note) return '—'
    if (useFlats) {
      // Convert sharps to flats
      for (const [sharp, flat] of Object.entries(noteConversion)) {
        if (note.includes(sharp)) {
          return note.replace(sharp, flat)
        }
      }
    } else {
      // Convert flats to sharps
      for (const [flat, sharp] of Object.entries(reverseNoteConversion)) {
        if (note.includes(flat)) {
          return note.replace(flat, sharp)
        }
      }
    }
    return note
  }

  // Detected Notes: group recorded frames and compute average accuracy and cents per note. Fallback to sample when empty.
  const sampleDetectedNotes = () => ([
    { note: 'G3', accuracy: 95, feedback: 'Excellent tuning!', color: 'border-l-green-500' },
    { note: 'G#3', accuracy: 88, feedback: 'Slightly flat. Try pressing closer to the bridge.', color: 'border-l-yellow-500' },
    { note: 'A3', accuracy: 92, feedback: 'Good intonation. Keep practicing.', color: 'border-l-green-500' },
    { note: 'A#3', accuracy: 75, feedback: 'Sharp by ~25 cents. Relax finger pressure.', color: 'border-l-red-500' },
    { note: 'B3', accuracy: 90, feedback: 'Well-tuned note.', color: 'border-l-green-500' },
    { note: 'C4', accuracy: 85, feedback: 'Slightly inconsistent. Focus on finger placement.', color: 'border-l-orange-500' },
    { note: 'C#4', accuracy: 93, feedback: 'Very good intonation.', color: 'border-l-green-500' },
    { note: 'D4', accuracy: 97, feedback: 'Perfect tuning! Excellent work.', color: 'border-l-green-500' },
    { note: 'D#4', accuracy: 82, feedback: 'Flat by ~18 cents. Check finger position.', color: 'border-l-yellow-500' },
    { note: 'E4', accuracy: 89, feedback: 'Good intonation overall.', color: 'border-l-green-500' },
    { note: 'F4', accuracy: 91, feedback: 'Well-tuned note.', color: 'border-l-green-500' },
    { note: 'F#4', accuracy: 86, feedback: 'Minor variations. Practice sustained notes.', color: 'border-l-orange-500' },
    { note: 'G4', accuracy: 94, feedback: 'Excellent tuning!', color: 'border-l-green-500' },
    { note: 'A4', accuracy: 96, feedback: 'Perfect reference note!', color: 'border-l-green-500' },
    { note: 'B4', accuracy: 90, feedback: 'Good intonation.', color: 'border-l-green-500' },
  ])

  const analysisSummary = useMemo(() => {
    if (recordedNotes.length === 0) return null
    return aggregateNoteStats(recordedNotes)
  }, [recordedNotes])

  const detectedNotes = useMemo(() => {
    if (recordedNotes.length === 0) return sampleDetectedNotes()
    if (!analysisSummary) return []
    return analysisSummary.perNote.map((item) => ({
      note: item.note,
      accuracy: item.accuracy,
      avgCents: item.avgCents,
      feedback: item.feedback,
      color: item.colorClass ?? colorTokenToBorderClass(item.feedbackColor),
    }))
  }, [recordedNotes, analysisSummary])

  const averageAccuracyDisplay = detectedNotes.length > 0
    ? Math.round(detectedNotes.reduce((sum, note) => sum + note.accuracy, 0) / detectedNotes.length)
    : 0

  const wellTunedCount = detectedNotes.filter(note => note.accuracy >= 90).length

  const handleSampleAnalyze = async (sampleId) => {
    if (!SAMPLE_AUDIO_ALLOWLIST.includes(sampleId)) {
      console.error('Invalid sample ID')
      return
    }

    try {
      // Fetch and analyze the sample audio file
      const response = await fetch(SAMPLE_AUDIO.url)
      if (!response.ok) {
        throw new Error('Failed to load sample audio')
      }
      const audioBlob = await response.blob()
      
      // Analyze using the same pipeline as real recordings
      const sampleNotes = await analyzeSampleAudio(audioBlob, sampleId, settings.concertA)
      
      // Save to localStorage (same format as real recordings)
      localStorage.setItem('violin-recorded-notes', JSON.stringify(sampleNotes))
      
      // Reload recorded notes
      setRecordedNotes(sampleNotes)
      
      // Navigate to DetailedAnalysis
      if (setCurrentPage) {
        setCurrentPage('detailed-analysis')
      }
    } catch (error) {
      console.error('Error analyzing sample:', error)
    }
  }

  return (
    <div className="space-y-4 md:space-y-8 px-2 md:px-0">

      {/* Sharp/Flat Toggle */}
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-xl shadow-lg border border-brown-200 p-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-bold text-brown-700">Notation:</span>
              <div className="flex bg-brown-100 rounded-lg p-1">
                <button
                  onClick={() => setUseFlats(false)}
                  className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                    !useFlats
                      ? 'bg-amber-700 text-white shadow-md'
                      : 'text-brown-700 hover:bg-brown-200'
                  }`}
                >
                  Sharp (#)
                </button>
                <button
                  onClick={() => setUseFlats(true)}
                  className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                    useFlats
                      ? 'bg-amber-700 text-white shadow-md'
                      : 'text-brown-700 hover:bg-brown-200'
                  }`}
                >
                  Flat (♭)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-brown-200 p-6 text-center">
            <p className="text-sm text-brown-700 font-bold mb-2">Total Notes Detected</p>
            <p className="text-4xl font-bold text-purple-700 font-trajan">{detectedNotes.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-brown-200 p-6 text-center">
            <p className="text-sm text-brown-700 font-bold mb-2">Average Accuracy</p>
            <p className="text-4xl font-bold text-emerald-700 font-trajan">
              {detectedNotes.length > 0 ? `${averageAccuracyDisplay}%` : '—'}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-brown-200 p-6 text-center">
            <p className="text-sm text-brown-700 font-bold mb-2">Well-Tuned Notes</p>
            <p className="text-4xl font-bold text-emerald-700 font-trajan">
              {wellTunedCount}
            </p>
          </div>
        </div>
      </div>

      {/* Error Analysis Based on Previous Notes */}
      {recordedNotes.length > 0 && (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-brown-200 p-6">
            <h3 className="text-xl font-bold text-brown-800 mb-4 font-trajan">Pattern Analysis</h3>
            {(() => {
              const analysis = analyzeWithPreviousNotes(null, recordedNotes)
              return analysis.hasError ? (
                <div className={`border-l-4 ${analysis.color === 'green' ? 'border-emerald-500 bg-emerald-50' : analysis.color === 'yellow' ? 'border-amber-500 bg-amber-50' : 'border-red-500 bg-red-50'} p-4 rounded-r-lg`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 ${analysis.color === 'green' ? 'bg-emerald-500' : analysis.color === 'yellow' ? 'bg-amber-500' : 'bg-red-500'} rounded-full flex items-center justify-center`}>
                        <span className="text-white text-xl">⚠</span>
                      </div>
                    </div>
                    <div className="flex-grow">
                      <h4 className={`text-lg font-bold ${analysis.color === 'green' ? 'text-emerald-700' : analysis.color === 'yellow' ? 'text-amber-700' : 'text-red-700'} mb-2`}>
                        {analysis.errorType}
                      </h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{analysis.suggestion}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-l-4 border-emerald-500 bg-emerald-50 p-4 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xl">✓</span>
                      </div>
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-lg font-bold text-emerald-700 mb-2">Good Intonation Pattern</h4>
                      <p className="text-gray-700 text-sm">Your recent notes show consistent tuning. Keep up the good work!</p>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Detected Notes Grid */}
      <div className="max-w-7xl mx-auto">
        <h3 className="text-lg md:text-2xl font-bold text-brown-800 mb-4 md:mb-6 px-2 font-trajan">
          {recordedNotes.length > 0 ? 'Your Recorded Notes' : '예시 분석 (샘플 데이터) — 녹음하면 내 데이터가 표시됩니다'} (G3 - E7)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 px-2">
          {detectedNotes.map((item, index) => (
            <div
              key={index}
              className={`bg-white rounded-lg shadow-lg p-4 border-l-4 ${item.color.includes('green') ? 'border-emerald-600' : item.color.includes('yellow') ? 'border-amber-600' : item.color.includes('red') ? 'border-orange-600' : 'border-purple-600'} transform transition-all duration-200 hover:scale-105 hover:shadow-xl`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    item.accuracy >= 90 ? 'bg-emerald-600' :
                    item.accuracy >= 80 ? 'bg-amber-600' :
                    item.accuracy >= 70 ? 'bg-orange-600' :
                    'bg-red-600'
                  }`}>
                    <span className="text-white font-bold text-sm">{convertNote(item.note)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-brown-800">{item.accuracy}%</span>
                  {typeof item.avgCents === 'number' && (
                    <div className="text-xs text-brown-600">{item.avgCents > 0 ? '+' : ''}{item.avgCents}c</div>
                  )}
                </div>
              </div>
              <p className="text-sm text-brown-700 leading-relaxed">{item.feedback}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-brown-200 p-8">
          <h3 className="text-xl font-bold text-brown-800 mb-6 font-trajan">Accuracy by Octave</h3>
          <div className="space-y-4">
            {/* Octave accuracy bars */}
            {[3, 4, 5, 6, 7].map((octave, index) => {
              const octaveNotes = detectedNotes.filter(note => note.note.includes(octave))
              const avgAccuracy = octaveNotes.length > 0 
                ? Math.round(octaveNotes.reduce((sum, note) => sum + note.accuracy, 0) / octaveNotes.length)
                : 0
              const color = avgAccuracy >= 90 ? 'bg-emerald-600' : avgAccuracy >= 80 ? 'bg-amber-600' : 'bg-orange-600'
              
              // Get sample notes from this octave to show in the chart
              const sampleNotes = octaveNotes.slice(0, 3).map(note => convertNote(note.note)).join(', ')
              const moreNotes = octaveNotes.length > 3 ? ` +${octaveNotes.length - 3} more` : ''
              
              return (
                <div key={octave} className="flex items-center gap-4">
                  <div className="w-24">
                    <span className="font-semibold text-brown-800">Oct {octave}</span>
                    <div className="text-xs text-brown-600 truncate">
                      {sampleNotes}{moreNotes}
                    </div>
                  </div>
                  <div className="flex-grow bg-brown-300 rounded-lg h-10 overflow-hidden">
                    <div className={`${color} h-full rounded-lg flex items-center justify-end pr-3`} 
                         style={{width: `${avgAccuracy}%`}}>
                      <span className="text-white font-semibold text-sm">
                        {avgAccuracy}%
                      </span>
                    </div>
                  </div>
                  <span className="w-16 text-sm text-brown-600">
                    ({octaveNotes.length} notes)
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ==================== INTEGRATED REPORT SECTION ==================== */}
      {!reportLoading && report && !report.isEmpty && (
        <>
          {/* Overview Section */}
          <div className="max-w-6xl mx-auto mt-12">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-lg border border-amber-200 p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800 font-trajan">Practice Overview</h3>
                <div className="text-right">
                  <div className="text-3xl font-bold text-purple-600">{report.overview.grade}</div>
                  <div className="text-sm text-gray-600">Overall Grade</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
                  <div className="text-sm text-gray-500 mb-1">Total Sessions</div>
                  <div className="text-2xl font-bold text-gray-800">{report.overview.practiceSessions.total}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {report.overview.analysisPeriod?.days || 0} days
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
                  <div className="text-sm text-gray-500 mb-1">Practice Time</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {report.overview.practiceSessions.totalPracticeTime || 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Avg {report.overview.practiceSessions.averageSessionDuration || 0} min
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
                  <div className="text-sm text-gray-500 mb-1">Average Accuracy</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {report.overview.overallPerformance.averageAccuracy}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {report.overview.overallPerformance.improvementTrend === 'improving' && '⬆️ '}
                    {report.overview.overallPerformance.improvementRate || '0%'}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
                  <div className="text-sm text-gray-500 mb-1">Well-Tuned Notes</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {report.overview.overallPerformance.wellTunedNotes}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {report.overview.overallPerformance.wellTunedPercentage}%
                  </div>
                </div>
              </div>

              {report.overview.analysisPeriod && (
                <div className="text-sm text-gray-600">
                  Analysis Period: {new Date(report.overview.analysisPeriod.startDate).toLocaleDateString()} - {new Date(report.overview.analysisPeriod.endDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Strengths Section */}
          {report.strengths.masteredNotes && report.strengths.masteredNotes.length > 0 && (
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg border border-brown-200 p-8">
                <h3 className="text-2xl font-bold text-brown-800 mb-6 font-trajan">✅ Strengths</h3>

                <div className="mb-6">
                  <h4 className="text-lg font-bold text-brown-800 mb-3">Mastered Notes</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {report.strengths.masteredNotes.map((note, idx) => (
                      <div key={idx} className="bg-brown-50 border-l-4 border-emerald-600 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl font-bold text-brown-800">{convertNote(note.note)}</span>
                          <span className="text-lg font-semibold text-emerald-700">{note.averageAccuracy}%</span>
                        </div>
                        <div className="text-sm text-brown-700">{note.feedback}</div>
                        <div className="text-xs text-brown-600 mt-2">Played {note.totalPlayed} times</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Weaknesses Section */}
          {report.weaknesses.problematicNotes && report.weaknesses.problematicNotes.length > 0 && (
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg border border-brown-200 p-8">
                <h3 className="text-2xl font-bold text-brown-800 mb-6 font-trajan">⚠️ Areas for Improvement</h3>

                <div className="mb-6">
                  <h4 className="text-lg font-bold text-brown-800 mb-3">Problematic Notes</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {report.weaknesses.problematicNotes.map((note, idx) => (
                      <div key={idx} className="bg-brown-50 border-l-4 border-orange-600 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl font-bold text-brown-800">{convertNote(note.note)}</span>
                          <span className="text-lg font-semibold text-orange-700">{note.averageAccuracy}%</span>
                        </div>
                        <div className="text-sm text-brown-700 mb-2">{note.feedback}</div>
                        <div className="text-xs text-brown-600">
                          {note.averageCents !== null && note.averageCents !== undefined && (
                            <span>{note.averageCents > 0 ? '+' : ''}{note.averageCents}c • </span>
                          )}
                          {note.frequency}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations Section */}
          {report.recommendations && report.recommendations.priorityFocus && report.recommendations.priorityFocus.length > 0 && (
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg border border-brown-200 p-8">
                <h3 className="text-2xl font-bold text-brown-800 mb-6 font-trajan">💡 Recommendations</h3>

                <div className="mb-6">
                  <h4 className="text-lg font-bold text-brown-800 mb-4">Priority Focus Areas</h4>
                  <div className="space-y-4">
                    {report.recommendations.priorityFocus.map((focus, idx) => (
                      <div key={idx} className="bg-brown-50 border-l-4 border-purple-600 rounded-lg p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                                {focus.priority}
                              </span>
                              <span className="text-lg font-bold text-brown-800">{focus.area}</span>
                            </div>
                            <div className="text-sm text-brown-700">
                              Current: {focus.currentAccuracy}% → Target: {focus.targetAccuracy}%
                            </div>
                          </div>
                        </div>
                        <div className="mb-3">
                          <div className="text-sm font-bold text-brown-800 mb-2">Exercises:</div>
                          <ul className="list-disc list-inside text-sm text-brown-700 space-y-1">
                            {focus.exercises.map((exercise, exIdx) => (
                              <li key={exIdx}>{exercise}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="text-xs text-brown-600">
                          Estimated practice time: {focus.estimatedPracticeTime}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {report.recommendations.techniqueTips && report.recommendations.techniqueTips.length > 0 && (
                  <div>
                    <h4 className="text-lg font-bold text-brown-800 mb-4">Technique Tips</h4>
                    <div className="space-y-3">
                      {report.recommendations.techniqueTips.map((tip, idx) => (
                        <div key={idx} className="bg-brown-50 border-l-4 border-amber-600 rounded-lg p-4">
                          <div className="font-bold text-brown-800 mb-1">{tip.issue}</div>
                          <div className="text-sm text-brown-700">{tip.tip}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Refresh Button */}
          <div className="max-w-6xl mx-auto text-center pb-8">
            <button
              onClick={loadReport}
              className="px-6 py-3 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors"
            >
              Refresh Report
            </button>
          </div>
        </>
      )}

      {/* No Data Message for Report / Practice Summary Report */}
      {!reportLoading && (!report || report.isEmpty) && (
        <div className="max-w-6xl mx-auto mt-12">
          <div className="bg-white rounded-xl shadow-lg border border-brown-200 p-12">
            {!practiceReport ? (
              <>
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-2xl font-bold text-brown-800 mb-4 font-trajan">No Practice Data Yet</h3>
                  <p className="text-brown-700 mb-6">
                    Start recording your practice sessions to generate a comprehensive report.
                  </p>
                  <p className="text-sm text-brown-600">
                    Go to "Record & Analysis" tab and start recording to begin tracking your progress.
                  </p>
                </div>
                
                <div className="border-t border-brown-200 pt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-brown-800">Practice Summary Report</h3>
                    <button
                      onClick={handleGeneratePracticeReport}
                      disabled={practiceReportLoading}
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {practiceReportLoading ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          Generating...
                        </>
                      ) : (
                        'Generate Practice Summary'
                      )}
                    </button>
                  </div>

                  {practiceReportError && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                      {practiceReportError}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-2xl font-bold text-brown-800 mb-4 font-trajan">No Practice Data Yet</h3>
                  <p className="text-brown-700 mb-6">
                    Start recording your practice sessions to generate a comprehensive report.
                  </p>
                  <p className="text-sm text-brown-600">
                    Go to "Record & Analysis" tab and start recording to begin tracking your progress.
                  </p>
                </div>
                
                <div className="border-t border-brown-200 pt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-brown-800">Practice Summary Report</h3>
                    <button
                      onClick={handleGeneratePracticeReport}
                      disabled={practiceReportLoading}
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {practiceReportLoading ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          Generating...
                        </>
                      ) : (
                        'Generate Practice Summary'
                      )}
                    </button>
                  </div>

                  {practiceReportError && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                      {practiceReportError}
                    </div>
                  )}

                  {practiceReport && (
                    <div className="mt-4">
                      <div className="flex justify-end mb-2">
                        <button
                          onClick={handleCopyPracticeReport}
                          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                        >
                          Copy Report
                        </button>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-6 text-gray-900 whitespace-pre-line leading-relaxed font-sans">
                        {practiceReport}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Analysis
