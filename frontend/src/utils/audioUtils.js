// Audio utilities for pitch detection and analysis

// Note frequencies for G3 (196 Hz) to E7 (2637 Hz)
export const NOTE_FREQUENCIES = {
  G3: 196.00,
  'G#3': 207.65,
  A3: 220.00,
  'A#3': 233.08,
  B3: 246.94,
  C4: 261.63,
  'C#4': 277.18,
  D4: 293.66,
  'D#4': 311.13,
  E4: 329.63,
  F4: 349.23,
  'F#4': 369.99,
  G4: 392.00,
  'G#4': 415.30,
  A4: 440.00,
  'A#4': 466.16,
  B4: 493.88,
  C5: 523.25,
  'C#5': 554.37,
  D5: 587.33,
  'D#5': 622.25,
  E5: 659.25,
  F5: 698.46,
  'F#5': 739.99,
  G5: 783.99,
  'G#5': 830.61,
  A5: 880.00,
  'A#5': 932.33,
  B5: 987.77,
  C6: 1046.50,
  'C#6': 1108.73,
  D6: 1174.66,
  'D#6': 1244.51,
  E6: 1318.51,
  F6: 1396.91,
  'F#6': 1479.98,
  G6: 1567.98,
  'G#6': 1661.22,
  A6: 1760.00,
  'A#6': 1864.66,
  B6: 1975.53,
  C7: 2093.00,
  'C#7': 2217.46,
  D7: 2349.32,
  'D#7': 2489.02,
  E7: 2637.02
}

// Generate all note names
export const ALL_NOTES = Object.keys(NOTE_FREQUENCIES)

// Convert frequency to note and cents. Optionally supply concertA to retune (default 440Hz)
export function frequencyToNote(frequency, concertA = 440) {
  if (!frequency || frequency < 150) {
    return { note: null, cents: 0, accuracy: 0, targetFreq: null }
  }

  let minDiff = Infinity
  let closestNote = null
  let targetFreq = null

  // Scale all reference frequencies by tuning ratio relative to A4 = 440
  const tuningRatio = concertA / 440

  for (const [note, baseFrequency] of Object.entries(NOTE_FREQUENCIES)) {
    const targetFrequency = baseFrequency * tuningRatio
    const diff = Math.abs(frequency - targetFrequency)
    if (diff < minDiff) {
      minDiff = diff
      closestNote = note
      targetFreq = targetFrequency
    }
  }

  if (!closestNote) {
    return { note: null, cents: 0, accuracy: 0, targetFreq: null }
  }

  // Calculate cents deviation (1200 cents = 1 octave)
  const cents = 1200 * Math.log2(frequency / targetFreq)
  
  // Calculate accuracy (100% when on-tune, decreasing with cents deviation)
  const accuracy = Math.max(0, 100 - Math.abs(cents))
  
  return {
    note: closestNote,
    cents: Math.round(cents * 10) / 10,
    accuracy: Math.round(accuracy * 10) / 10,
    targetFreq,
    frequency
  }
}

// Get feedback based on cent deviation
export function getFeedback(cents, note) {
  const absCents = Math.abs(cents)
  
  if (absCents < 5) {
    return { message: 'Perfect tuning!', color: 'green' }
  } else if (absCents < 10) {
    return { message: 'Very close. Minor adjustment needed.', color: 'green-400' }
  } else if (absCents < 20) {
    return { message: cents > 0 ? 'Slightly sharp. Relax pressure.' : 'Slightly flat. Press closer.', color: 'yellow-500' }
  } else if (absCents < 30) {
    return { message: cents > 0 ? 'Sharp. Reduce finger pressure.' : 'Flat. Check finger placement.', color: 'orange-500' }
  } else {
    return { message: cents > 0 ? 'Too sharp. Significant adjustment needed.' : 'Too flat. Reposition finger.', color: 'red-500' }
  }
}

// Analyze errors based on previous notes
export function analyzeWithPreviousNotes(currentNote, previousNotes) {
  if (!previousNotes || previousNotes.length === 0) {
    return {
      hasError: false,
      errorType: null,
      suggestion: null
    }
  }

  const recentNotes = previousNotes.slice(-5) // Look at last 5 notes
  
  // Check for consistent flat/sharp tendencies
  const flatCount = recentNotes.filter(n => n.cents < -10).length
  const sharpCount = recentNotes.filter(n => n.cents > 10).length
  
  if (flatCount >= 3) {
    return {
      hasError: true,
      errorType: 'Consistent Flatness',
      suggestion: 'You tend to play flat. Focus on finger placement closer to the bridge and maintain consistent pressure.',
      color: 'yellow-500'
    }
  } else if (sharpCount >= 3) {
    return {
      hasError: true,
      errorType: 'Consistent Sharpness',
      suggestion: 'You tend to play sharp. Relax finger pressure and avoid over-pressing on the string.',
      color: 'orange-500'
    }
  }
  
  // Check for intonation consistency across octaves
  const octaves = new Set(recentNotes.map(n => n.note.slice(-1)))
  if (octaves.size > 2) {
    const octaveAccuracies = {}
    octaves.forEach(octave => {
      const notesInOctave = recentNotes.filter(n => n.note.slice(-1) === octave)
      const avgAccuracy = notesInOctave.reduce((sum, n) => sum + n.accuracy, 0) / notesInOctave.length
      octaveAccuracies[octave] = avgAccuracy
    })
    
    const minOctave = Math.min(...Object.values(octaveAccuracies))
    const problemOctave = Object.keys(octaveAccuracies).find(o => octaveAccuracies[o] === minOctave)
    
    if (minOctave < 80) {
      return {
        hasError: true,
        errorType: `Octave ${problemOctave} Consistency Issue`,
        suggestion: `Your intonation in octave ${problemOctave} needs improvement. Focus on proper left-hand position and finger spacing.`,
        color: 'orange-500'
      }
    }
  }
  
  return {
    hasError: false,
    errorType: null,
    suggestion: null
  }
}

// Format note with sharp/flat notation
export function formatNote(note, useFlats = false) {
  if (!note) return '—'
  
  if (useFlats) {
    const flatMap = {
      'G#': 'A♭',
      'A#': 'B♭',
      'C#': 'D♭',
      'D#': 'E♭',
      'F#': 'G♭'
    }
    
    for (const [sharp, flat] of Object.entries(flatMap)) {
      if (note.startsWith(sharp)) {
        return note.replace(sharp, flat)
      }
    }
  }
  
  return note
}


const DEFAULT_COLOR_SHADE = '500'

function normalizeColorToken(color) {
  if (!color) return `gray-${DEFAULT_COLOR_SHADE}`
  if (color.includes('-')) {
    return color
  }
  return `${color}-${DEFAULT_COLOR_SHADE}`
}

export function colorTokenToBorderClass(color) {
  const token = normalizeColorToken(color)
  return `border-l-${token}`
}

export const LOW_ACCURACY_THRESHOLD = 85

export function aggregateNoteStats(recordedNotes) {
  const byNote = new Map()
  const sequence = []
  const lowAccuracyEvents = []
  if (!Array.isArray(recordedNotes)) {
    return {
      perNote: [],
      sequence,
      lowAccuracyEvents,
      metrics: {
        totalEvents: 0,
        averageEventAccuracy: null,
      },
    }
  }

  recordedNotes.forEach((entry, index) => {
    if (!entry || !entry.note) {
      return
    }

    const accuracy = typeof entry.accuracy === 'number'
      ? Math.round(entry.accuracy)
      : Math.max(0, Math.round(100 - Math.abs(entry.cents ?? 0)))

    const cents = typeof entry.cents === 'number'
      ? Math.round(entry.cents * 10) / 10
      : null

    const event = {
      note: entry.note,
      accuracy,
      cents,
      timestamp: entry.timestamp ?? Date.now(),
      previousNote: null,
    }

    if (accuracy < LOW_ACCURACY_THRESHOLD) {
      event.previousNote = recordedNotes[index - 1]?.note ?? null
      lowAccuracyEvents.push(event)
    }

    sequence.push(event)

    const aggregate = byNote.get(entry.note) || { sum: 0, centsSum: 0, count: 0 }
    aggregate.sum += accuracy
    if (typeof cents === 'number') {
      aggregate.centsSum += cents
    }
    aggregate.count += 1
    byNote.set(entry.note, aggregate)
  })

  const perNote = Array.from(byNote.entries()).map(([note, aggregate]) => {
    const avgAccuracy = Math.round(aggregate.sum / Math.max(1, aggregate.count))
    const avgCents = aggregate.count > 0
      ? Math.round((aggregate.centsSum / aggregate.count) * 10) / 10
      : null
    const feedback = getFeedback(typeof avgCents === 'number' ? avgCents : 0, note)
    const feedbackColor = normalizeColorToken(feedback.color)

    return {
      note,
      accuracy: avgAccuracy,
      avgCents,
      feedback: feedback.message,
      feedbackColor,
      colorClass: colorTokenToBorderClass(feedback.color),
    }
  }).sort((a, b) => (NOTE_FREQUENCIES[a.note] || 0) - (NOTE_FREQUENCIES[b.note] || 0))

  const metrics = {
    totalEvents: sequence.length,
    averageEventAccuracy: sequence.length > 0
      ? Math.round(sequence.reduce((sum, event) => sum + event.accuracy, 0) / sequence.length)
      : null,
  }

  return {
    perNote,
    sequence,
    lowAccuracyEvents,
    metrics,
  }
}


