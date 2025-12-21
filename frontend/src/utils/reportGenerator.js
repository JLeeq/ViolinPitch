// Integrated Report Generator - AI-free analysis based on rules and statistics
import { NOTE_FREQUENCIES } from './audioUtils'

/**
 * Generate comprehensive integrated report from all sessions
 */
export async function generateIntegratedReport(noteRepository) {
  // Load all sessions
  const allSessions = await noteRepository.listRecent(100)
  
  if (allSessions.length === 0) {
    return generateEmptyReport()
  }

  // Combine all note data from sessions
  const allNotes = combineAllNotes(allSessions)
  
  // Generate report sections
  const overview = generateOverview(allSessions, allNotes)
  const strengths = identifyStrengths(allSessions, allNotes)
  const weaknesses = identifyWeaknesses(allSessions, allNotes)
  const trends = analyzeTrends(allSessions)
  const statistics = calculateStatistics(allSessions, allNotes)
  const recommendations = generateRecommendations(strengths, weaknesses, statistics)
  const charts = generateChartData(allSessions, allNotes)
  const detailedBreakdown = generateDetailedBreakdown(allSessions)

  return {
    overview,
    strengths,
    weaknesses,
    trends,
    statistics,
    recommendations,
    charts,
    detailedBreakdown,
    generatedAt: new Date().toISOString()
  }
}

/**
 * Combine all notes from all sessions into a single array
 */
function combineAllNotes(sessions) {
  const allNotes = []
  
  sessions.forEach(session => {
    if (session.noteStats && Array.isArray(session.noteStats)) {
      session.noteStats.forEach(noteStat => {
        // Each noteStat may appear multiple times in a session
        // We'll count occurrences by tracking unique note+session combinations
        // For now, we'll add each noteStat as-is and count later
        allNotes.push({
          note: noteStat.note,
          accuracy: noteStat.accuracy || 0,
          avgCents: noteStat.avgCents || null,
          count: 1, // Each entry represents at least 1 occurrence
          sessionId: session.id,
          sessionDate: session.createdAt,
          sessionName: session.sourceName
        })
      })
    }
  })
  
  return allNotes
}

/**
 * Generate overview section
 */
function generateOverview(sessions, allNotes) {
  const totalSessions = sessions.length
  const totalNotesPlayed = sessions.reduce((sum, session) => sum + (session.totalEvents || 0), 0)
  
  // Calculate total practice time
  const totalPracticeTimeMs = sessions.reduce((sum, session) => {
    return sum + (session.metadata?.durationMs || 0)
  }, 0)
  
  const totalPracticeTimeMinutes = Math.round(totalPracticeTimeMs / 60000)
  const totalPracticeTimeHours = Math.floor(totalPracticeTimeMinutes / 60)
  const totalPracticeTimeMins = totalPracticeTimeMinutes % 60
  
  // Calculate average accuracy
  const allAccuracies = []
  sessions.forEach(session => {
    if (session.averageEventAccuracy !== null && session.averageEventAccuracy !== undefined) {
      allAccuracies.push(session.averageEventAccuracy)
    }
  })
  
  const averageAccuracy = allAccuracies.length > 0
    ? Math.round(allAccuracies.reduce((sum, acc) => sum + acc, 0) / allAccuracies.length)
    : 0
  
  // Calculate date range
  const dates = sessions.map(s => new Date(s.createdAt)).sort((a, b) => a - b)
  const startDate = dates[0]
  const endDate = dates[dates.length - 1]
  const days = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)))
  
  // Well-tuned notes count (notes with accuracy >= 90)
  const wellTunedNotes = allNotes.filter(note => (note.accuracy || 0) >= 90).length
  const wellTunedPercentage = allNotes.length > 0
    ? Math.round((wellTunedNotes / allNotes.length) * 100 * 10) / 10
    : 0
  
  // Improvement trend
  const firstHalf = sessions.slice(0, Math.ceil(sessions.length / 2))
  const secondHalf = sessions.slice(Math.ceil(sessions.length / 2))
  
  const firstHalfAvg = firstHalf.length > 0
    ? firstHalf.reduce((sum, s) => sum + (s.averageEventAccuracy || 0), 0) / firstHalf.length
    : 0
  const secondHalfAvg = secondHalf.length > 0
    ? secondHalf.reduce((sum, s) => sum + (s.averageEventAccuracy || 0), 0) / secondHalf.length
    : 0
  
  const improvementRate = firstHalfAvg > 0 && secondHalfAvg > firstHalfAvg
    ? `+${Math.round((secondHalfAvg - firstHalfAvg) * 10) / 10}%`
    : firstHalfAvg > 0 && secondHalfAvg < firstHalfAvg
    ? `${Math.round((secondHalfAvg - firstHalfAvg) * 10) / 10}%`
    : "0%"
  
  const improvementTrend = secondHalfAvg > firstHalfAvg ? "improving" 
    : secondHalfAvg < firstHalfAvg ? "declining"
    : "stable"
  
  // Grade calculation
  let grade = "F"
  if (averageAccuracy >= 95) grade = "A+"
  else if (averageAccuracy >= 90) grade = "A"
  else if (averageAccuracy >= 85) grade = "B+"
  else if (averageAccuracy >= 80) grade = "B"
  else if (averageAccuracy >= 75) grade = "C+"
  else if (averageAccuracy >= 70) grade = "C"
  else if (averageAccuracy >= 65) grade = "D"
  
  return {
    reportGeneratedAt: new Date().toISOString(),
    analysisPeriod: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days
    },
    practiceSessions: {
      total: totalSessions,
      averagePerWeek: days > 0 ? Math.round((totalSessions / days) * 7 * 10) / 10 : 0,
      totalPracticeTime: totalPracticeTimeHours > 0 
        ? `${totalPracticeTimeHours}시간 ${totalPracticeTimeMins}분`
        : `${totalPracticeTimeMins}분`,
      averageSessionDuration: totalSessions > 0
        ? Math.round(totalPracticeTimeMinutes / totalSessions)
        : 0
    },
    overallPerformance: {
      averageAccuracy,
      totalNotesPlayed,
      wellTunedNotes,
      wellTunedPercentage,
      improvementTrend,
      improvementRate
    },
    grade: `${grade} (${averageAccuracy >= 90 ? 'Excellent' : averageAccuracy >= 85 ? 'Good Progress' : averageAccuracy >= 80 ? 'Fair' : 'Needs Improvement'})`
  }
}

/**
 * Identify strengths
 */
function identifyStrengths(sessions, allNotes) {
  // Group notes by note name
  const notesMap = new Map()
  
  allNotes.forEach(note => {
    if (!note.note) return
    
    if (!notesMap.has(note.note)) {
      notesMap.set(note.note, {
        note: note.note,
        accuracies: [],
        counts: [],
        sessions: []
      })
    }
    
    const noteData = notesMap.get(note.note)
    noteData.        accuracies.push(note.accuracy || 0)
        noteData.counts.push(1) // Each noteStat entry represents at least 1 occurrence
        noteData.sessions.push(note.sessionDate)
  })
  
  // Calculate averages for each note
  const noteAverages = Array.from(notesMap.entries()).map(([note, data]) => {
    const avgAccuracy = data.accuracies.length > 0
      ? Math.round(data.accuracies.reduce((sum, acc) => sum + acc, 0) / data.accuracies.length)
      : 0
    const totalPlayed = data.counts.reduce((sum, count) => sum + count, 0)
    const consistency = calculateConsistency(data.accuracies)
    
    return {
      note,
      averageAccuracy: avgAccuracy,
      totalPlayed,
      consistency,
      sessions: data.sessions
    }
  })
  
  // Find mastered notes (high accuracy, high consistency)
  const masteredNotes = noteAverages
    .filter(n => n.averageAccuracy >= 90 && n.consistency >= 85)
    .sort((a, b) => b.averageAccuracy - a.averageAccuracy)
    .slice(0, 5)
    .map(note => ({
      note: note.note,
      averageAccuracy: note.averageAccuracy,
      totalPlayed: note.totalPlayed,
      consistency: note.consistency >= 90 ? "excellent" : "very good",
      feedback: `${note.note}는 거의 완벽하게 연주하고 있습니다.${note.note === 'A4' ? ' 참고 음으로 활용하세요.' : ''}`
    }))
  
  // Find improving notes (comparing first half vs second half of sessions)
  const improvingNotes = findImprovingNotes(sessions)
  
  // Find stable octaves
  const stableOctaves = findStableOctaves(noteAverages)
  
  return {
    masteredNotes,
    improvingNotes,
    stableOctaves,
    consistentAreas: identifyConsistentAreas(noteAverages)
  }
}

/**
 * Identify weaknesses
 */
function identifyWeaknesses(sessions, allNotes) {
  // Group notes by note name
  const notesMap = new Map()
  
  allNotes.forEach(note => {
    if (!note.note) return
    
    if (!notesMap.has(note.note)) {
      notesMap.set(note.note, {
        note: note.note,
        accuracies: [],
        centsValues: [],
        sessions: []
      })
    }
    
    const noteData = notesMap.get(note.note)
    noteData.accuracies.push(note.accuracy || 0)
    if (note.avgCents !== null && note.avgCents !== undefined) {
      noteData.centsValues.push(note.avgCents)
    }
    noteData.sessions.push(note.sessionDate)
  })
  
  // Find problematic notes
  const noteAverages = Array.from(notesMap.entries()).map(([note, data]) => {
    const avgAccuracy = data.accuracies.length > 0
      ? Math.round(data.accuracies.reduce((sum, acc) => sum + acc, 0) / data.accuracies.length)
      : 0
    const avgCents = data.centsValues.length > 0
      ? Math.round((data.centsValues.reduce((sum, cents) => sum + cents, 0) / data.centsValues.length) * 10) / 10
      : 0
    const sessionCount = new Set(data.sessions).size
    
    return {
      note,
      averageAccuracy: avgAccuracy,
      averageCents: avgCents,
      sessionCount,
      totalPlayed: data.accuracies.length
    }
  })
  
  const problematicNotes = noteAverages
    .filter(n => n.averageAccuracy < 85)
    .sort((a, b) => a.averageAccuracy - b.averageAccuracy)
    .slice(0, 5)
    .map(note => {
      const issue = note.averageCents < -10 ? "consistent_flat"
        : note.averageCents > 10 ? "consistent_sharp"
        : "inconsistent"
      
      const frequency = sessions.length > 0
        ? `${Math.round((note.sessionCount / sessions.length) * 100)}% of sessions`
        : "N/A"
      
      let feedback = ""
      if (issue === "consistent_flat") {
        feedback = `${note.note}가 지속적으로 플랫합니다. 손가락을 브릿지에 더 가까이 두세요.`
      } else if (issue === "consistent_sharp") {
        feedback = `${note.note}가 너무 샤프합니다. 손가락 압력을 줄이고 위치를 조정하세요.`
      } else {
        feedback = `${note.note}의 일관성이 부족합니다. 집중 연습이 필요합니다.`
      }
      
      return {
        note: note.note,
        averageAccuracy: note.averageAccuracy,
        totalPlayed: note.totalPlayed,
        averageCents: note.averageCents,
        issue,
        frequency,
        feedback
      }
    })
  
  // Find octave issues
  const octaveIssues = findOctaveIssues(noteAverages)
  
  // Find common mistakes
  const commonMistakes = findCommonMistakes(noteAverages)
  
  return {
    problematicNotes,
    octaveIssues,
    commonMistakes
  }
}

/**
 * Analyze trends
 */
function analyzeTrends(sessions) {
  if (sessions.length < 2) {
    return {
      overallTrend: {
        direction: "insufficient_data",
        firstWeekAverage: 0,
        lastWeekAverage: 0,
        change: "0%",
        confidence: "low"
      }
    }
  }
  
  // Sort by date
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(a.createdAt) - new Date(b.createdAt)
  )
  
  const firstHalf = sortedSessions.slice(0, Math.ceil(sortedSessions.length / 2))
  const secondHalf = sortedSessions.slice(Math.ceil(sortedSessions.length / 2))
  
  const firstHalfAvg = firstHalf.length > 0
    ? firstHalf.reduce((sum, s) => sum + (s.averageEventAccuracy || 0), 0) / firstHalf.length
    : 0
  const secondHalfAvg = secondHalf.length > 0
    ? secondHalf.reduce((sum, s) => sum + (s.averageEventAccuracy || 0), 0) / secondHalf.length
    : 0
  
  const change = firstHalfAvg > 0
    ? `${secondHalfAvg >= firstHalfAvg ? '+' : ''}${Math.round((secondHalfAvg - firstHalfAvg) * 10) / 10}%`
    : "0%"
  
  const direction = secondHalfAvg > firstHalfAvg ? "improving"
    : secondHalfAvg < firstHalfAvg ? "declining"
    : "stable"
  
  const confidence = sessions.length >= 5 ? "high" : sessions.length >= 3 ? "medium" : "low"
  
  // Find best session
  const bestSession = sortedSessions.reduce((best, current) => {
    return (current.averageEventAccuracy || 0) > (best.averageEventAccuracy || 0) ? current : best
  }, sortedSessions[0])
  
  return {
    overallTrend: {
      direction,
      firstWeekAverage: Math.round(firstHalfAvg * 10) / 10,
      lastWeekAverage: Math.round(secondHalfAvg * 10) / 10,
      change,
      confidence
    },
    bestSession: bestSession ? {
      date: new Date(bestSession.createdAt).toISOString().split('T')[0],
      averageAccuracy: bestSession.averageEventAccuracy || 0,
      notesPlayed: bestSession.totalEvents || 0,
      highlights: generateSessionHighlights(bestSession)
    } : null
  }
}

/**
 * Calculate statistics
 */
function calculateStatistics(sessions, allNotes) {
  // Accuracy distribution
  const distribution = {
    "90-100": 0,
    "80-89": 0,
    "70-79": 0,
    "below-70": 0
  }
  
  allNotes.forEach(note => {
    const acc = note.accuracy || 0
    if (acc >= 90) distribution["90-100"]++
    else if (acc >= 80) distribution["80-89"]++
    else if (acc >= 70) distribution["70-79"]++
    else distribution["below-70"]++
  })
  
  // Consistency calculation
  const allAccuracies = allNotes.map(n => n.accuracy || 0).filter(a => a > 0)
  const avgAccuracy = allAccuracies.length > 0
    ? allAccuracies.reduce((sum, a) => sum + a, 0) / allAccuracies.length
    : 0
  
  const variance = allAccuracies.length > 0
    ? allAccuracies.reduce((sum, a) => sum + Math.pow(a - avgAccuracy, 2), 0) / allAccuracies.length
    : 0
  
  const standardDeviation = Math.round(Math.sqrt(variance) * 10) / 10
  const consistencyScore = Math.max(0, Math.round(100 - (standardDeviation * 5)))
  
  // Range analysis
  const rangeAnalysis = analyzeByOctave(allNotes)
  
  return {
    accuracyDistribution: distribution,
    consistency: {
      standardDeviation,
      consistencyScore,
      feedback: consistencyScore >= 90 ? "일관성이 매우 높습니다."
        : consistencyScore >= 80 ? "일관성이 좋은 편입니다."
        : consistencyScore >= 70 ? "일관성이 보통 수준입니다. 반복 연습으로 개선 가능합니다."
        : "일관성이 낮습니다. 집중 연습이 필요합니다."
    },
    rangeAnalysis
  }
}

/**
 * Generate recommendations
 */
function generateRecommendations(strengths, weaknesses, statistics) {
  const priorityFocus = []
  
  // Add problematic notes as priority
  weaknesses.problematicNotes.slice(0, 3).forEach((note, index) => {
    priorityFocus.push({
      priority: index + 1,
      area: `${note.note} 정확도 향상`,
      currentAccuracy: note.averageAccuracy,
      targetAccuracy: 85.0,
      exercises: generateExercisesForNote(note),
      estimatedPracticeTime: "주 3회, 15분씩"
    })
  })
  
  // Add octave issues
  if (weaknesses.octaveIssues && weaknesses.octaveIssues.length > 0) {
    const octaveIssue = weaknesses.octaveIssues[0]
    priorityFocus.push({
      priority: priorityFocus.length + 1,
      area: `${octaveIssue.octave}옥타브 전체 개선`,
      currentAverage: octaveIssue.averageAccuracy,
      targetAverage: 85.0,
      exercises: [
        `${octaveIssue.octave}옥타브 스케일 연습`,
        "손가락 간격 조정 연습",
        "손목 위치 확인"
      ],
      estimatedPracticeTime: "주 2-3회, 20분씩"
    })
  }
  
  // Practice routines
  const practiceRoutines = [
    {
      routine: "기본 워밍업",
      duration: "10분",
      focus: ["G3-E4 범위", "기본 음정 확인"],
      frequency: "매일"
    },
    {
      routine: "약점 집중 연습",
      duration: "20분",
      focus: weaknesses.problematicNotes.slice(0, 3).map(n => n.note),
      frequency: "주 3회"
    },
    {
      routine: "전체 범위 연습",
      duration: "15분",
      focus: ["G3-E7 전체", "포지션 전환"],
      frequency: "주 2회"
    }
  ]
  
  // Technique tips
  const techniqueTips = []
  
  weaknesses.problematicNotes.forEach(note => {
    if (note.issue === "consistent_flat") {
      techniqueTips.push({
        issue: `${note.note} 플랫 경향`,
        tip: "손가락을 브릿지에 더 가까이 두고, 손목을 약간 앞으로 이동하세요."
      })
    } else if (note.issue === "consistent_sharp") {
      techniqueTips.push({
        issue: `${note.note} 샤프 경향`,
        tip: "손가락 압력을 줄이고, 위치를 조정하세요."
      })
    }
  })
  
  if (weaknesses.octaveIssues && weaknesses.octaveIssues.length > 0) {
    const highOctaveIssue = weaknesses.octaveIssues.find(o => parseInt(o.octave) >= 5)
    if (highOctaveIssue) {
      techniqueTips.push({
        issue: "고음역 정확도 하락",
        tip: "왼손 손목을 높이고, 손가락 압력을 줄이세요. 손목이 뒤로 꺾이지 않도록 주의하세요."
      })
    }
  }
  
  return {
    priorityFocus,
    practiceRoutines,
    techniqueTips
  }
}

/**
 * Generate chart data
 */
function generateChartData(sessions, allNotes) {
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(a.createdAt) - new Date(b.createdAt)
  )
  
  // Timeline chart
  const timelineChart = {
    type: "line",
    data: sortedSessions.map(session => ({
      date: new Date(session.createdAt).toISOString().split('T')[0],
      accuracy: session.averageEventAccuracy || 0
    })),
    trend: sortedSessions.length >= 2 
      ? (sortedSessions[sortedSessions.length - 1].averageEventAccuracy || 0) > (sortedSessions[0].averageEventAccuracy || 0)
        ? "increasing"
        : "decreasing"
      : "stable"
  }
  
  // Heatmap data
  const heatmapData = {}
  const notesMap = new Map()
  
  allNotes.forEach(note => {
    if (!note.note) return
    
    if (!notesMap.has(note.note)) {
      notesMap.set(note.note, [])
    }
    notesMap.get(note.note).push(note.accuracy || 0)
  })
  
  Array.from(notesMap.entries()).forEach(([note, accuracies]) => {
    const avg = accuracies.length > 0
      ? Math.round(accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length)
      : 0
    heatmapData[note] = avg
  })
  
  const heatmap = {
    type: "heatmap",
    data: heatmapData
  }
  
  // Octave comparison
  const octaveComparison = {
    type: "radar",
    data: analyzeByOctave(allNotes).reduce((acc, octave) => {
      acc[`Octave ${octave.octave}`] = octave.averageAccuracy
      return acc
    }, {})
  }
  
  // Accuracy distribution
  const distribution = calculateStatistics(sessions, allNotes).accuracyDistribution
  const accuracyDistribution = {
    type: "pie",
    data: {
      "Excellent (90-100%)": distribution["90-100"],
      "Good (80-89%)": distribution["80-89"],
      "Fair (70-79%)": distribution["70-79"],
      "Needs Improvement (<70%)": distribution["below-70"]
    }
  }
  
  return {
    timelineAccuracy: timelineChart,
    noteAccuracyHeatmap: heatmap,
    octaveComparison,
    accuracyDistribution
  }
}

/**
 * Generate detailed breakdown
 */
function generateDetailedBreakdown(sessions) {
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(a.createdAt) - new Date(b.createdAt)
  )
  
  return {
    bySession: sortedSessions.map(session => ({
      sessionId: session.id,
      date: new Date(session.createdAt).toISOString().split('T')[0],
      duration: session.metadata?.durationMs 
        ? `${Math.round(session.metadata.durationMs / 60000)}분`
        : "N/A",
      notesPlayed: session.totalEvents || 0,
      averageAccuracy: session.averageEventAccuracy || 0,
      highlights: generateSessionHighlights(session),
      notes: ""
    }))
  }
}

// Helper functions

function generateEmptyReport() {
  return {
    overview: {
      reportGeneratedAt: new Date().toISOString(),
      practiceSessions: { total: 0 },
      overallPerformance: { averageAccuracy: 0 }
    },
    strengths: { masteredNotes: [], improvingNotes: [] },
    weaknesses: { problematicNotes: [], octaveIssues: [] },
    trends: { overallTrend: { direction: "insufficient_data" } },
    statistics: {},
    recommendations: { priorityFocus: [] },
    charts: {},
    detailedBreakdown: { bySession: [] },
    isEmpty: true
  }
}

function calculateConsistency(accuracies) {
  if (accuracies.length < 2) return 0
  
  const avg = accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length
  const variance = accuracies.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) / accuracies.length
  const stdDev = Math.sqrt(variance)
  
  return Math.max(0, Math.round(100 - (stdDev * 5)))
}

function findImprovingNotes(sessions) {
  if (sessions.length < 2) return []
  
  // Group notes by note name across sessions
  const notesBySession = new Map()
  
  sessions.forEach(session => {
    if (session.noteStats && Array.isArray(session.noteStats)) {
      session.noteStats.forEach(note => {
        if (!note.note) return
        
        if (!notesBySession.has(note.note)) {
          notesBySession.set(note.note, [])
        }
        
        notesBySession.get(note.note).push({
          accuracy: note.accuracy || 0,
          date: new Date(session.createdAt)
        })
      })
    }
  })
  
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(a.createdAt) - new Date(b.createdAt)
  )
  
  const firstHalf = sortedSessions.slice(0, Math.ceil(sortedSessions.length / 2))
  const secondHalf = sortedSessions.slice(Math.ceil(sortedSessions.length / 2))
  
  const improving = []
  
  Array.from(notesBySession.entries()).forEach(([note, accuracies]) => {
    const firstHalfAcc = accuracies
      .filter(a => firstHalf.some(s => Math.abs(new Date(s.createdAt) - a.date) < 1000))
      .map(a => a.accuracy)
    const secondHalfAcc = accuracies
      .filter(a => secondHalf.some(s => Math.abs(new Date(s.createdAt) - a.date) < 1000))
      .map(a => a.accuracy)
    
    if (firstHalfAcc.length > 0 && secondHalfAcc.length > 0) {
      const firstAvg = firstHalfAcc.reduce((sum, a) => sum + a, 0) / firstHalfAcc.length
      const secondAvg = secondHalfAcc.reduce((sum, a) => sum + a, 0) / secondHalfAcc.length
      
      if (secondAvg > firstAvg + 3) {
        improving.push({
          note,
          trend: "improving",
          firstWeekAccuracy: Math.round(firstAvg * 10) / 10,
          lastWeekAccuracy: Math.round(secondAvg * 10) / 10,
          improvement: `+${Math.round((secondAvg - firstAvg) * 10) / 10}%`,
          feedback: `${note}이 크게 개선되고 있습니다. 좋은 진전입니다!`
        })
      }
    }
  })
  
  return improving.sort((a, b) => parseFloat(b.improvement) - parseFloat(a.improvement)).slice(0, 5)
}

function findStableOctaves(noteAverages) {
  const byOctave = new Map()
  
  noteAverages.forEach(note => {
    const octave = note.note.match(/\d+$/)?.[0]
    if (!octave) return
    
    if (!byOctave.has(octave)) {
      byOctave.set(octave, { accuracies: [], counts: [] })
    }
    
    byOctave.get(octave).accuracies.push(note.averageAccuracy)
    byOctave.get(octave).counts.push(note.totalPlayed)
  })
  
  return Array.from(byOctave.entries())
    .map(([octave, data]) => {
      const avgAccuracy = data.accuracies.length > 0
        ? Math.round(data.accuracies.reduce((sum, a) => sum + a, 0) / data.accuracies.length)
        : 0
      const totalNotes = data.counts.reduce((sum, c) => sum + c, 0)
      
      return {
        octave,
        averageAccuracy: avgAccuracy,
        notesCount: totalNotes
      }
    })
    .filter(o => o.averageAccuracy >= 85)
    .sort((a, b) => b.averageAccuracy - a.averageAccuracy)
    .slice(0, 3)
    .map(o => ({
      ...o,
      feedback: `${o.octave}옥타브가 가장 안정적입니다.`
    }))
}

function identifyConsistentAreas(noteAverages) {
  const ranges = []
  
  // Find consecutive notes with high accuracy
  const sortedNotes = noteAverages.sort((a, b) => 
    (NOTE_FREQUENCIES[a.note] || 0) - (NOTE_FREQUENCIES[b.note] || 0)
  )
  
  let currentRange = []
  sortedNotes.forEach(note => {
    if (note.averageAccuracy >= 85) {
      currentRange.push(note.note)
    } else {
      if (currentRange.length >= 3) {
        ranges.push(`${currentRange[0]} ~ ${currentRange[currentRange.length - 1]}`)
      }
      currentRange = []
    }
  })
  
  if (currentRange.length >= 3) {
    ranges.push(`${currentRange[0]} ~ ${currentRange[currentRange.length - 1]}`)
  }
  
  return ranges.slice(0, 3)
}

function findOctaveIssues(noteAverages) {
  const byOctave = new Map()
  
  noteAverages.forEach(note => {
    const octave = note.note.match(/\d+$/)?.[0]
    if (!octave) return
    
    if (!byOctave.has(octave)) {
      byOctave.set(octave, { accuracies: [], counts: [] })
    }
    
    byOctave.get(octave).accuracies.push(note.averageAccuracy)
    byOctave.get(octave).counts.push(note.totalPlayed)
  })
  
  return Array.from(byOctave.entries())
    .map(([octave, data]) => {
      const avgAccuracy = data.accuracies.length > 0
        ? Math.round(data.accuracies.reduce((sum, a) => sum + a, 0) / data.accuracies.length)
        : 0
      const totalNotes = data.counts.reduce((sum, c) => sum + c, 0)
      
      return {
        octave,
        averageAccuracy: avgAccuracy,
        notesCount: totalNotes
      }
    })
    .filter(o => o.averageAccuracy < 85 && o.totalNotes >= 3)
    .sort((a, b) => a.averageAccuracy - b.averageAccuracy)
    .map(o => ({
      ...o,
      problem: o.averageAccuracy < 80 ? "accuracy_decreases" : "needs_improvement",
      feedback: `${o.octave}옥타브에서 정확도가 낮습니다. 고음역 연습이 필요합니다.`
    }))
}

function findCommonMistakes(noteAverages) {
  const mistakes = []
  
  // Find flat tendency
  const flatNotes = noteAverages.filter(n => n.averageCents < -10 && n.averageAccuracy < 85)
  if (flatNotes.length >= 2) {
    mistakes.push({
      pattern: "플랫 경향",
      affectedNotes: flatNotes.map(n => n.note),
      frequency: "높음",
      suggestion: "손가락 위치를 약간 앞으로 이동하세요."
    })
  }
  
  // Find sharp tendency
  const sharpNotes = noteAverages.filter(n => n.averageCents > 10 && n.averageAccuracy < 85)
  if (sharpNotes.length >= 2) {
    mistakes.push({
      pattern: "샤프 경향",
      affectedNotes: sharpNotes.map(n => n.note),
      frequency: "높음",
      suggestion: "손가락 압력을 줄이고 위치를 조정하세요."
    })
  }
  
  return mistakes
}

function analyzeByOctave(allNotes) {
  const byOctave = new Map()
  
  allNotes.forEach(note => {
    if (!note.note) return
    const octave = note.note.match(/\d+$/)?.[0]
    if (!octave) return
    
    if (!byOctave.has(octave)) {
      byOctave.set(octave, { accuracies: [], counts: [] })
    }
    
    byOctave.get(octave).accuracies.push(note.accuracy || 0)
    byOctave.get(octave).counts.push(note.count || 1)
  })
  
  return Array.from(byOctave.entries())
    .map(([octave, data]) => {
      const avgAccuracy = data.accuracies.length > 0
        ? Math.round(data.accuracies.reduce((sum, a) => sum + a, 0) / data.accuracies.length)
        : 0
      const totalNotes = data.counts.reduce((sum, c) => sum + c, 0)
      
      return {
        octave: parseInt(octave),
        averageAccuracy: avgAccuracy,
        notesCount: totalNotes
      }
    })
    .sort((a, b) => a.octave - b.octave)
}

function generateExercisesForNote(note) {
  const exercises = []
  
  if (note.issue === "consistent_flat") {
    exercises.push(
      `${note.note}를 개방현과 함께 연주하여 공명 확인`,
      `1st 포지션에서 ${note.note} 길게 유지 연습`,
      "손가락 위치를 브릿지 쪽으로 조정"
    )
  } else if (note.issue === "consistent_sharp") {
    exercises.push(
      `${note.note}를 천천히 연주하며 정확한 위치 찾기`,
      "손가락 압력 줄이기 연습",
      "손목 위치 확인"
    )
  } else {
    exercises.push(
      `${note.note} 집중 연습`,
      "반복 연주로 일관성 향상",
      "타이머로 30초씩 유지 연습"
    )
  }
  
  return exercises
}

function generateSessionHighlights(session) {
  const highlights = []
  
  if (session.noteStats && Array.isArray(session.noteStats)) {
    const highAccuracyNotes = session.noteStats
      .filter(n => n.accuracy >= 90)
      .map(n => n.note)
    
    if (highAccuracyNotes.length > 0) {
      highlights.push(`모든 ${highAccuracyNotes.slice(0, 3).join(', ')} 음이 90% 이상`)
    }
  }
  
  return highlights.length > 0 ? highlights : ["기본 음정 안정"]
}
