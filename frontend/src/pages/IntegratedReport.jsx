import { useState, useEffect } from 'react'
import { generateIntegratedReport } from '../utils/reportGenerator'
import { noteRepository } from '../storage/noteRepository'
import { formatNote } from '../utils/audioUtils'

function IntegratedReport() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [useFlats, setUseFlats] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadReport()
  }, [])

  const loadReport = async () => {
    try {
      setLoading(true)
      setError(null)
      const generatedReport = await generateIntegratedReport(noteRepository)
      setReport(generatedReport)
    } catch (err) {
      console.error('Error generating report:', err)
      setError('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const convertNote = (note) => {
    if (!note) return '—'
    return formatNote(note, useFlats)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl font-bold text-white mb-4">Loading Report...</div>
          <div className="text-brown-300">Analyzing your practice sessions...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-accent-orange mb-4">{error}</div>
          <button
            onClick={loadReport}
            className="px-6 py-3 bg-softblue-500 text-white rounded-lg hover:bg-softblue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!report || report.isEmpty) {
    return (
      <div className="space-y-8">
        <h2 className="text-4xl font-bold text-center text-white">Integrated Report</h2>
        <div className="max-w-2xl mx-auto bg-brown-700 rounded-xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-2xl font-semibold text-white mb-4">No Practice Data Yet</h3>
          <p className="text-brown-200 mb-6">
            Start recording your practice sessions to generate a comprehensive report.
          </p>
          <p className="text-sm text-brown-300">
            Go to "Record & Analysis" tab and start recording to begin tracking your progress.
          </p>
        </div>
      </div>
    )
  }

  const { overview, strengths, weaknesses, trends, statistics, recommendations, charts, detailedBreakdown } = report

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-white">Integrated Report</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-brown-200">Notation:</span>
          <div className="flex bg-brown-600 rounded-lg p-1">
            <button
              onClick={() => setUseFlats(false)}
              className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                !useFlats
                  ? 'bg-accent-green text-white shadow-md'
                  : 'text-brown-200 hover:bg-brown-500'
              }`}
            >
              Sharp (#)
            </button>
            <button
              onClick={() => setUseFlats(true)}
              className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                useFlats
                  ? 'bg-accent-green text-white shadow-md'
                  : 'text-brown-200 hover:bg-brown-500'
              }`}
            >
              Flat (♭)
            </button>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-br from-brown-700 to-brown-800 rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Overview</h3>
            <div className="text-right">
              <div className="text-3xl font-bold text-accent-purple">{overview.grade}</div>
              <div className="text-sm text-brown-200">Overall Grade</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-brown-600 rounded-lg p-4 shadow">
              <div className="text-sm text-brown-200 mb-1">Total Sessions</div>
              <div className="text-2xl font-bold text-white">{overview.practiceSessions.total}</div>
              <div className="text-xs text-brown-300 mt-1">
                {overview.analysisPeriod?.days || 0} days
              </div>
            </div>
            <div className="bg-brown-600 rounded-lg p-4 shadow">
              <div className="text-sm text-brown-200 mb-1">Practice Time</div>
              <div className="text-2xl font-bold text-white">
                {overview.practiceSessions.totalPracticeTime || 'N/A'}
              </div>
              <div className="text-xs text-brown-300 mt-1">
                Avg {overview.practiceSessions.averageSessionDuration || 0} min
              </div>
            </div>
            <div className="bg-brown-600 rounded-lg p-4 shadow">
              <div className="text-sm text-brown-200 mb-1">Average Accuracy</div>
              <div className="text-2xl font-bold text-accent-green">
                {overview.overallPerformance.averageAccuracy}%
              </div>
              <div className="text-xs text-brown-300 mt-1">
                {overview.overallPerformance.improvementTrend === 'improving' && '⬆️ '}
                {overview.overallPerformance.improvementRate || '0%'}
              </div>
            </div>
            <div className="bg-brown-600 rounded-lg p-4 shadow">
              <div className="text-sm text-brown-200 mb-1">Well-Tuned Notes</div>
              <div className="text-2xl font-bold text-accent-green">
                {overview.overallPerformance.wellTunedNotes}
              </div>
              <div className="text-xs text-brown-300 mt-1">
                {overview.overallPerformance.wellTunedPercentage}%
              </div>
            </div>
          </div>

          {overview.analysisPeriod && (
            <div className="text-sm text-brown-200">
              Analysis Period: {new Date(overview.analysisPeriod.startDate).toLocaleDateString()} - {new Date(overview.analysisPeriod.endDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Strengths Section */}
      {strengths.masteredNotes && strengths.masteredNotes.length > 0 && (
        <div className="max-w-6xl mx-auto">
          <div className="bg-brown-700 rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-white mb-6">✅ Strengths</h3>

            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3">Mastered Notes</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {strengths.masteredNotes.map((note, idx) => (
                  <div key={idx} className="bg-brown-600 border-l-4 border-accent-green rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl font-bold text-white">{convertNote(note.note)}</span>
                      <span className="text-lg font-semibold text-accent-green">{note.averageAccuracy}%</span>
                    </div>
                    <div className="text-sm text-brown-200">{note.feedback}</div>
                    <div className="text-xs text-brown-300 mt-2">Played {note.totalPlayed} times</div>
                  </div>
                ))}
              </div>
            </div>

            {strengths.improvingNotes && strengths.improvingNotes.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-white mb-3">Improving Notes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {strengths.improvingNotes.map((note, idx) => (
                    <div key={idx} className="bg-brown-600 border-l-4 border-accent-purple rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl font-bold text-white">{convertNote(note.note)}</span>
                        <span className="text-sm font-semibold text-accent-purple">{note.improvement}</span>
                      </div>
                      <div className="text-sm text-brown-200">{note.feedback}</div>
                      <div className="text-xs text-brown-300 mt-2">
                        {note.firstWeekAccuracy}% → {note.lastWeekAccuracy}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {strengths.stableOctaves && strengths.stableOctaves.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Stable Octaves</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {strengths.stableOctaves.map((octave, idx) => (
                    <div key={idx} className="bg-brown-600 border-l-4 border-accent-green rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-white">Octave {octave.octave}</span>
                        <span className="text-lg font-semibold text-accent-green">{octave.averageAccuracy}%</span>
                      </div>
                      <div className="text-sm text-brown-200">{octave.feedback}</div>
                      <div className="text-xs text-brown-300 mt-2">{octave.notesCount} notes</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weaknesses Section */}
      {weaknesses.problematicNotes && weaknesses.problematicNotes.length > 0 && (
        <div className="max-w-6xl mx-auto">
          <div className="bg-brown-700 rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-white mb-6">⚠️ Areas for Improvement</h3>

            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3">Problematic Notes</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {weaknesses.problematicNotes.map((note, idx) => (
                  <div key={idx} className="bg-brown-600 border-l-4 border-accent-orange rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl font-bold text-white">{convertNote(note.note)}</span>
                      <span className="text-lg font-semibold text-accent-orange">{note.averageAccuracy}%</span>
                    </div>
                    <div className="text-sm text-brown-200 mb-2">{note.feedback}</div>
                    <div className="text-xs text-brown-300">
                      {note.averageCents !== null && note.averageCents !== undefined && (
                        <span>{note.averageCents > 0 ? '+' : ''}{note.averageCents}c • </span>
                      )}
                      {note.frequency}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {weaknesses.octaveIssues && weaknesses.octaveIssues.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-white mb-3">Octave Issues</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {weaknesses.octaveIssues.map((octave, idx) => (
                    <div key={idx} className="bg-brown-600 border-l-4 border-accent-orange rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-white">Octave {octave.octave}</span>
                        <span className="text-lg font-semibold text-accent-orange">{octave.averageAccuracy}%</span>
                      </div>
                      <div className="text-sm text-brown-200">{octave.feedback}</div>
                      <div className="text-xs text-brown-300 mt-2">{octave.notesCount} notes analyzed</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {weaknesses.commonMistakes && weaknesses.commonMistakes.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Common Patterns</h4>
                <div className="space-y-3">
                  {weaknesses.commonMistakes.map((mistake, idx) => (
                    <div key={idx} className="bg-brown-600 border-l-4 border-accent-yellow rounded-lg p-4">
                      <div className="font-semibold text-white mb-1">{mistake.pattern}</div>
                      <div className="text-sm text-brown-200 mb-2">
                        Affected notes: {mistake.affectedNotes.map(n => convertNote(n)).join(', ')}
                      </div>
                      <div className="text-sm text-brown-200">{mistake.suggestion}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trends Section */}
      {trends.overallTrend && (
        <div className="max-w-6xl mx-auto">
          <div className="bg-brown-700 rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-white mb-6">📈 Trends</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-brown-100 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-black mb-4">Overall Trend</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-black">Direction:</span>
                    <span className={`font-semibold ${
                      trends.overallTrend.direction === 'improving' ? 'text-accent-green' :
                      trends.overallTrend.direction === 'declining' ? 'text-accent-orange' :
                      'text-black'
                    }`}>
                      {trends.overallTrend.direction === 'improving' ? '⬆️ Improving' :
                       trends.overallTrend.direction === 'declining' ? '⬇️ Declining' :
                       '➡️ Stable'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">First Half:</span>
                    <span className="font-semibold text-black">{trends.overallTrend.firstWeekAverage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">Last Half:</span>
                    <span className="font-semibold text-black">{trends.overallTrend.lastWeekAverage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">Change:</span>
                    <span className={`font-semibold ${
                      trends.overallTrend.change.startsWith('+') ? 'text-accent-green' :
                      trends.overallTrend.change.startsWith('-') ? 'text-accent-orange' :
                      'text-black'
                    }`}>
                      {trends.overallTrend.change}
                    </span>
                  </div>
                </div>
              </div>

              {trends.bestSession && (
                <div className="bg-brown-100 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-black mb-4">Best Session</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-black">Date:</span>
                      <span className="font-semibold text-black">
                        {new Date(trends.bestSession.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">Accuracy:</span>
                      <span className="font-semibold text-black">{trends.bestSession.averageAccuracy}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">Notes:</span>
                      <span className="font-semibold text-black">{trends.bestSession.notesPlayed}</span>
                    </div>
                    {trends.bestSession.highlights && trends.bestSession.highlights.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-brown-300">
                        <div className="text-sm text-black font-semibold">Highlights:</div>
                        <ul className="text-sm text-black list-disc list-inside mt-1">
                          {trends.bestSession.highlights.map((h, idx) => (
                            <li key={idx}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Statistics Section */}
      {statistics && (
        <div className="max-w-6xl mx-auto">
          <div className="bg-brown-700 rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-white mb-6">📊 Statistics</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Accuracy Distribution</h4>
                <div className="space-y-3">
                  {statistics.accuracyDistribution && Object.entries(statistics.accuracyDistribution).map(([range, count]) => (
                    <div key={range} className="flex items-center justify-between">
                      <span className="text-sm text-brown-200">{range}:</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-brown-200 rounded-full h-4 overflow-hidden">
                          <div
                            className={`h-full ${
                              range === '90-100' ? 'bg-green-500' :
                              range === '80-89' ? 'bg-yellow-500' :
                              range === '70-79' ? 'bg-orange-500' :
                              'bg-red-500'
                            }`}
                            style={{
                              width: `${count > 0 ? (count / Object.values(statistics.accuracyDistribution).reduce((a, b) => a + b, 0)) * 100 : 0}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-white w-12 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Consistency</h4>
                {statistics.consistency && (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-brown-200">Score:</span>
                      <span className="font-semibold text-white">{statistics.consistency.consistencyScore}/100</span>
                    </div>
                    <div className="text-sm text-brown-200">{statistics.consistency.feedback}</div>
                  </div>
                )}
              </div>
            </div>

            {statistics.rangeAnalysis && statistics.rangeAnalysis.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Range Analysis</h4>
                <div className="space-y-3">
                  {statistics.rangeAnalysis.map((octave, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-24">
                        <span className="font-semibold text-white">Octave {octave.octave}</span>
                      </div>
                      <div className="flex-grow bg-brown-200 rounded-lg h-8 overflow-hidden">
                        <div
                          className={`h-full ${
                            octave.averageAccuracy >= 90 ? 'bg-green-400' :
                            octave.averageAccuracy >= 80 ? 'bg-yellow-400' :
                            'bg-red-400'
                          } flex items-center justify-end pr-3`}
                          style={{ width: `${octave.averageAccuracy}%` }}
                        >
                          <span className="text-white font-semibold text-sm">
                            {octave.averageAccuracy}%
                          </span>
                        </div>
                      </div>
                      <span className="w-20 text-sm text-brown-200">
                        ({octave.notesCount} notes)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations Section */}
      {recommendations && recommendations.priorityFocus && recommendations.priorityFocus.length > 0 && (
        <div className="max-w-6xl mx-auto">
          <div className="bg-brown-700 rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-white mb-6">💡 Recommendations</h3>

            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-4">Priority Focus Areas</h4>
              <div className="space-y-4">
                {recommendations.priorityFocus.map((focus, idx) => (
                  <div key={idx} className="bg-brown-100 border-l-4 border-accent-purple rounded-lg p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-accent-purple text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                            {focus.priority}
                          </span>
                          <span className="text-lg font-bold text-black">{focus.area}</span>
                        </div>
                        <div className="text-sm text-black">
                          Current: {focus.currentAccuracy}% → Target: {focus.targetAccuracy}%
                        </div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="text-sm font-semibold text-black mb-2">Exercises:</div>
                      <ul className="list-disc list-inside text-sm text-black space-y-1">
                        {focus.exercises.map((exercise, exIdx) => (
                          <li key={exIdx}>{exercise}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-xs text-black">
                      Estimated practice time: {focus.estimatedPracticeTime}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {recommendations.practiceRoutines && recommendations.practiceRoutines.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-white mb-4">Practice Routines</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recommendations.practiceRoutines.map((routine, idx) => (
                    <div key={idx} className="bg-brown-100 rounded-lg p-4">
                      <div className="font-semibold text-black mb-2">{routine.routine}</div>
                      <div className="text-sm text-black mb-2">Duration: {routine.duration}</div>
                      <div className="text-sm text-black mb-2">Frequency: {routine.frequency}</div>
                      <div className="text-sm text-black">
                        Focus: {routine.focus.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recommendations.techniqueTips && recommendations.techniqueTips.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Technique Tips</h4>
                <div className="space-y-3">
                  {recommendations.techniqueTips.map((tip, idx) => (
                    <div key={idx} className="bg-brown-100 border-l-4 border-accent-yellow rounded-lg p-4">
                      <div className="font-semibold text-black mb-1">{tip.issue}</div>
                      <div className="text-sm text-black">{tip.tip}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Breakdown */}
      {detailedBreakdown && detailedBreakdown.bySession && detailedBreakdown.bySession.length > 0 && (
        <div className="max-w-6xl mx-auto">
          <div className="bg-brown-700 rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-white mb-6">📋 Session History</h3>
            <div className="space-y-3">
              {detailedBreakdown.bySession.map((session, idx) => (
                <div key={idx} className="border-l-4 border-accent-purple bg-brown-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-semibold text-black">
                        {new Date(session.date).toLocaleDateString()}
                      </span>
                      <span className="text-sm text-black ml-3">
                        {session.duration} • {session.notesPlayed} notes
                      </span>
                    </div>
                    <span className="text-lg font-bold text-black">{session.averageAccuracy}%</span>
                  </div>
                  {session.highlights && session.highlights.length > 0 && (
                    <div className="text-sm text-black mt-2">
                      Highlights: {session.highlights.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="max-w-6xl mx-auto text-center">
        <button
          onClick={loadReport}
          className="px-6 py-3 bg-softblue-500 text-white rounded-lg hover:bg-softblue-600 transition-colors"
        >
          Refresh Report
        </button>
      </div>
    </div>
  )
}

export default IntegratedReport

