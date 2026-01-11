import { useState, useEffect, useRef } from 'react'
import { formatNote, ALL_NOTES, NOTE_FREQUENCIES, frequencyToNote } from '../utils/audioUtils'

function DetailedAnalysis({ recordings, onBack }) {
  const [useFlats, setUseFlats] = useState(false)
  const [detectedNotes, setDetectedNotes] = useState([])
  const [trendNotes, setTrendNotes] = useState([])
  const [position, setPosition] = useState('1st')
  const [isSample, setIsSample] = useState(false)
  const audioContextRef = useRef(null)

  useEffect(() => {
    // Initialize AudioContext for playing notes
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
    
    // Load recorded notes (with cents) if available for detected notes and trend analysis
    try {
      const stored = localStorage.getItem('violin-recorded-notes')
      console.log('Loading from localStorage:', stored ? 'found' : 'not found')
      
      if (stored) {
        const parsed = JSON.parse(stored)
        console.log('Parsed data:', parsed)
        console.log('Is array?', Array.isArray(parsed), 'Length:', Array.isArray(parsed) ? parsed.length : 'N/A')
        
        if (Array.isArray(parsed)) {
          setTrendNotes(parsed)
          if (parsed.length > 0) {
            const detected = buildDetectedFromRecorded(parsed)
            console.log('Loaded recorded notes:', parsed.length, 'frames')
            console.log('Detected notes:', detected.length, detected)
            
            if (detected.length === 0) {
              console.warn('No notes detected from recorded data, using sample data')
              setDetectedNotes(generateSampleAnalysis())
              setIsSample(true)
            } else {
              setDetectedNotes(detected)
              setIsSample(false)
            }
          } else {
            console.log('Empty array, using sample data')
            setDetectedNotes(generateSampleAnalysis())
            setIsSample(true)
          }
        } else {
          console.log('Not an array, using sample data')
          setDetectedNotes(generateSampleAnalysis())
          setIsSample(true)
        }
      } else {
        console.log('No stored data, using sample data')
        setDetectedNotes(generateSampleAnalysis())
        setIsSample(true)
      }
    } catch (error) {
      console.error('Error loading recorded notes:', error)
      setDetectedNotes(generateSampleAnalysis())
      setIsSample(true)
    }
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [recordings])

  // Sample analysis used when no recordings exist
  const generateSampleAnalysis = () => ([
    { note: 'G3', accuracy: 95 },
    { note: 'A3', accuracy: 92 },
    { note: 'B3', accuracy: 88 },
    { note: 'C4', accuracy: 93 },
    { note: 'D4', accuracy: 97 },
    { note: 'E4', accuracy: 91 },
    { note: 'F#4', accuracy: 85 },
    { note: 'G4', accuracy: 94 },
    { note: 'A4', accuracy: 96 },
    { note: 'B4', accuracy: 90 }
  ])

  // Build Detected Notes from recorded frames by averaging accuracy per note
  const buildDetectedFromRecorded = (frames) => {
    if (!Array.isArray(frames) || frames.length === 0) {
      console.log('buildDetectedFromRecorded: empty or invalid input')
      return []
    }
    
    const byNote = new Map()
    let processedCount = 0
    let skippedCount = 0
    
    frames.forEach((f, index) => {
      // 매우 관대한 필터링
      if (!f) {
        skippedCount++
        return
      }
      
      // note 추출 - 여러 방법 시도
      let note = f.note
      if (!note && f.noteName) note = f.noteName
      
      // frequency가 있으면 note를 추론 (note가 없을 때만)
      if (!note && typeof f.frequency === 'number') {
        const inferredNoteInfo = frequencyToNote(f.frequency, 440)
        if (inferredNoteInfo && inferredNoteInfo.note) {
          note = inferredNoteInfo.note
        }
      }
      
      // note를 찾지 못했으면 스킵
      if (!note) {
        skippedCount++
        return
      }
      
      // accuracy 계산 - 매우 관대하게
      let accuracy = typeof f.accuracy === 'number' ? f.accuracy : null
      if (accuracy === null && typeof f.cents === 'number') {
        accuracy = Math.max(0, Math.round(100 - Math.abs(f.cents)))
      }
      if (accuracy === null || isNaN(accuracy)) {
        accuracy = 85 // 기본값
      }
      
      // Map에 추가
      const key = note
      const prev = byNote.get(key) || { sum: 0, centsSum: 0, count: 0 }
      prev.sum += accuracy
      if (typeof f.cents === 'number') prev.centsSum += f.cents
      prev.count += 1
      byNote.set(key, prev)
      processedCount++
    })
    
    console.log(`Processed ${processedCount} frames, skipped ${skippedCount}, found ${byNote.size} unique notes`)
    console.log('Unique notes found:', Array.from(byNote.keys()))
    
    const result = Array.from(byNote.entries()).map(([note, agg]) => ({
      note,
      accuracy: Math.round(agg.sum / Math.max(1, agg.count)),
      avgCents: agg.count > 0 ? Math.round((agg.centsSum / agg.count) * 10) / 10 : 0
    }))
    
    // sort by frequency ascending
    result.sort((a, b) => {
      const fa = NOTE_FREQUENCIES[a.note] || 0
      const fb = NOTE_FREQUENCIES[b.note] || 0
      return fa - fb
    })
    
    return result
  }

  const playNote = (noteName) => {
    if (!audioContextRef.current) return
    
    const frequency = NOTE_FREQUENCIES[noteName]
    if (!frequency) return

    const audioContext = audioContextRef.current
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = frequency
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 1)
  }

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 90) return 'green'
    if (accuracy >= 80) return 'yellow'
    if (accuracy >= 70) return 'orange'
    return 'red'
  }

  const getAccuracyFeedback = (accuracy) => {
    if (accuracy >= 95) return 'Perfect tuning!'
    if (accuracy >= 90) return 'Excellent tuning!'
    if (accuracy >= 85) return 'Very good intonation'
    if (accuracy >= 80) return 'Good intonation'
    if (accuracy >= 75) return 'Minor intonation issues'
    return 'Needs improvement'
  }

  // Detect tendency: sharp on higher notes
  const sharpOnHigher = (() => {
    const notes = trendNotes.filter(n => typeof n.cents === 'number' && typeof n.targetFreq === 'number')
    if (notes.length < 6) return false
    const ordered = [...notes].sort((a, b) => a.targetFreq - b.targetFreq)
    const k = Math.max(2, Math.floor(ordered.length * 0.3))
    const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length
    const lowAvg = avg(ordered.slice(0, k).map(n => n.cents))
    const highAvg = avg(ordered.slice(-k).map(n => n.cents))
    return highAvg - lowAvg > 8 && highAvg > 5
  })()

  // Helpers to evaluate ranges and tendencies for Tip content
  const posIdToKey = { '1st': '1', '2nd': '2', '3rd': '3', '4th': '4' }
  const noteFreq = (n) => NOTE_FREQUENCIES[n] || 0
  const ratioThreshold = 0.6
  const centsThreshold = 5
  const hasTendency = (lowNote, highNote, sign) => {
    const lo = noteFreq(lowNote)
    const hi = noteFreq(highNote)
    const frames = trendNotes.filter(f => f && typeof f.targetFreq === 'number' && f.targetFreq >= lo && f.targetFreq <= hi)
    if (frames.length < 6) return false
    const match = frames.filter(f => sign === 'high' ? f.cents > centsThreshold : f.cents < -centsThreshold)
    return match.length / frames.length >= ratioThreshold
  }

  // Mapping of ranges per position for different registers
  const highSets = [
    { ranges: { '1': ['G#3','D4'], '2': ['A#3','D#4'], '3': ['B3','D#4'], '4': ['C#4','F4'] }, contentId: 'H1' },
    { ranges: { '1': ['D#4','A4'], '2': ['F4','A#4'], '3': ['G4','C5'],  '4': ['A4','C#5'] }, contentId: 'H2' },
    { ranges: { '1': ['A#4','E5'], '2': ['C#5','F5'], '3': ['B3','D#4'], '4': ['E5','G#5'] }, contentId: 'H3' },
    { ranges: { '1': ['F5','B5'],  '2': ['G5','C6'], '3': ['A5','C#6'], '4': ['B5','D#6'] }, contentId: 'H4' },
  ]
  const lowSets = [
    { ranges: { '1': ['G#3','D4'], '2': ['A#3','D#4'], '3': ['B3','D#4'], '4': ['C#4','F4'] }, contentId: 'L1' },
    { ranges: { '1': ['D#4','A4'], '2': ['F4','A#4'], '3': ['G4','C5'],  '4': ['A4','C#5'] }, contentId: 'L2' },
    { ranges: { '1': ['A#4','E5'], '2': ['C#5','F5'], '3': ['B3','D#4'], '4': ['E5','G#5'] }, contentId: 'L3' },
    { ranges: { '1': ['F5','B5'],  '2': ['G5','C6'], '3': ['A5','C#6'], '4': ['B5','D#6'] }, contentId: 'L4' },
  ]

  const positionKey = posIdToKey[position] || '1'
  let tipContent = null

  // Determine high/low set match for current position
  for (const s of highSets) {
    const r = s.ranges[positionKey]
    if (r && hasTendency(r[0], r[1], 'high')) { tipContent = s.contentId; break }
  }
  if (!tipContent) {
    for (const s of lowSets) {
      const r = s.ranges[positionKey]
      if (r && hasTendency(r[0], r[1], 'low')) { tipContent = s.contentId; break }
    }
  }

  const renderTipBody = () => {
    const getPositionAdvice = () => {
      if (avgAccuracy >= 90) return null
      switch (positionKey) {
        case '1':
          return (
            <div className="mt-4 space-y-2">
              <p><strong>First Position — Additional Advice</strong></p>
              <p><strong>Hand Frame:</strong> Your first finger sets the entire hand frame — don’t let it creep forward or backward. The thumb should rest opposite the second finger to balance tension.</p>
              <p><strong>Arm’s Axis:</strong> Align your elbow under the violin’s center line. Too much inward rotation makes G/D sharp; too little makes A/E flat.</p>
              <p><strong>Intonation Reference:</strong> Always check pitches against open strings. When your 4th finger matches the open string’s resonance, you’re truly in tune.</p>
            </div>
          )
        case '2':
          return (
            <div className="mt-4 space-y-2">
              <p><strong>Second Position — Additional Advice</strong></p>
              <p><strong>Hand Frame:</strong> After shifting, reset your hand frame — don’t stretch to reach the new position. Move the whole hand as one unit.</p>
              <p><strong>Arm’s Axis:</strong> Your elbow must follow the shift; if it stays behind, intonation goes flat.</p>
              <p><strong>Intonation Reference:</strong> Use perfect fourths and fifths between strings — you’ve moved away from open-string reference.</p>
            </div>
          )
        case '3':
          return (
            <div className="mt-4 space-y-2">
              <p><strong>Third Position — Additional Advice</strong></p>
              <p><strong>Hand Frame:</strong> Finger spacing compresses here — the semitone distances shrink. Avoid using 1st-position habits of wide intervals.</p>
              <p><strong>Arm’s Axis:</strong> Your elbow rotation should adjust to maintain even finger curvature — don’t let the wrist stiffen as you ascend.</p>
              <p><strong>Intonation Reference:</strong> There are fewer open strings to rely on — listen for sympathetic vibration and pure intervals inside the instrument</p>
            </div>
          )
        case '4':
          return (
            <div className="mt-4 space-y-2">
              <p><strong>Forth Position — Additional Advice</strong></p>
              <p><strong>Hand Frame:</strong> As tension increases near the bridge, think of releasing weight into the string rather than pressing down.</p>
              <p><strong>Arm’s Axis:</strong> Lower the elbow slightly to counterbalance the higher hand position — too high, and the pitch goes sharp.</p>
              <p><strong>Intonation Reference:</strong> At this height, resonance is felt more than heard. Use tactile vibration in your fingertips as pitch confirmation.</p>
            </div>
          )
        default:
          return null
      }
    }
    switch (tipContent) {
      case 'H1':
        return (
          <div className="space-y-2">
            <p><strong>Hand Frame:</strong> Relax the thumb joint and move it slightly toward the scroll. Let the base knuckles form a square frame — the 1st finger shouldn’t stretch forward.</p>
            <p><strong>Arm’s Rotation Axis:</strong> Reduce inward rotation. The elbow should align under the violin, not inside the rib.</p>
            <p><strong>Intonation Reference:</strong> Check resonance between the 4th-finger D and open D. Reset spatial memory by slowly sliding from 1st to 3rd position.</p>
            {getPositionAdvice()}
          </div>
        )
      case 'H2':
        return (
          <div className="space-y-2">
            <p><strong>Hand Frame:</strong> Pull the thumb slightly back and check that the 1st finger knuckle doesn’t cross the neck line.</p>
            <p><strong>Arm’s Rotational Axis:</strong> Let the elbow drop naturally — the D string doesn’t need the inward rotation used for G string.</p>
            <p><strong>Intonation Reference:</strong> Use open D as an anchor. Play D–E–F scale slowly and match E4 with the open E5’s overtone.</p>
            {getPositionAdvice()}
          </div>
        )
      case 'H3':
        return (
          <div className="space-y-2">
            <p><strong>Hand Frame:</strong> Narrow the spacing between fingers — higher positions require compressed semitone distances. Keep fingers relaxed and curved.</p>
            <p><strong>Arm’s Rotational Axis:</strong> Slightly open the elbow outward; over-rotation causes forward drift.</p>
            <p><strong>Intonation Reference:</strong> Check resonance of 4th-finger E5 with open E. This trains your spatial compression sense.</p>
            {getPositionAdvice()}
          </div>
        )
      case 'H4':
        return (
          <div className="space-y-2">
            <p><strong>Hand Frame:</strong> Release finger pressure — let the fingertips contact the string with elasticity rather than force.</p>
            <p><strong>Arm’s Rotational Axis:</strong> Slightly lower the elbow; avoid over-rotation which angles the fingers vertically.</p>
            <p><strong>Intonation Reference:</strong> Compare stopped A5 (on E string) with open A resonance; overpressure will kill resonance clarity.</p>
            {getPositionAdvice()}
          </div>
        )
      case 'L1':
        return (
          <div className="space-y-2">
            <p><strong>Hand Frame:</strong> Curve all fingers more and lift the wrist slightly to bring the hand closer to the bridge.</p>
            <p><strong>Arm’s Rotational Axis:</strong> Rotate the elbow slightly inward (toward the belly) to allow fingers to reach comfortably.</p>
            <p><strong>Intonation Reference:</strong> Play open G and the stopped G on D string together to feel the low resonance.</p>
            {getPositionAdvice()}
          </div>
        )
      case 'L2':
        return (
          <div className="space-y-2">
            <p><strong>Hand Frame:</strong> Move the whole hand slightly forward; the wrist should not collapse backward.</p>
            <p><strong>Arm’s Rotational Axis:</strong> Rotate the elbow slightly more inward; this brings fingers closer to the D-string plane.</p>
            <p><strong>Intonation Reference:</strong> Play the 4th-finger A and open A together, listening for pure resonance.</p>
            {getPositionAdvice()}
          </div>
        )
      case 'L3':
        return (
          <div className="space-y-2">
            <p><strong>Hand Frame:</strong> Lift the wrist and move the whole hand closer to the bridge — your fingers are lagging behind the instrument’s geometry.</p>
            <p><strong>Arm’s Rotational Axis:</strong> Rotate the elbow slightly inward so that the 3rd and 4th fingers can reach easily.</p>
            <p><strong>Intonation Reference:</strong> Match 1st-finger B4 with open E’s fifth overtone — this teaches proper forward hand balance.</p>
            {getPositionAdvice()}
          </div>
        )
      case 'L4':
        return (
          <div className="space-y-2">
            <p><strong>Hand Frame:</strong> Bring the wrist slightly forward and elevate the hand toward the bridge — don’t let the hand collapse backward.</p>
            <p><strong>Arm’s Rotational Axis:</strong> Rotate the elbow outward a bit to lift the hand plane toward E string height.</p>
            <p><strong>Intonation Reference:</strong> Play F5 and open A together to train interval resonance. Keep the bright ring in tone as a pitch reference.</p>
            {getPositionAdvice()}
          </div>
        )
      default:
        return (
          <div className="space-y-2">
            <p><strong>Tip:</strong> Hover over each note to hear the sound and familiarize yourself with the target tone and frequency. This may be sample data (before recording), so verify with actual playing.</p>
            <p><strong>Quick Check Routine (1 minute):</strong> On each string, slowly press the open string → 1st, 2nd, 3rd, and 4th fingers, checking that the needle stays centered. Be careful not to let the wrist collapse backward or fingers straighten.</p>
            <p><strong>Resonance Check:</strong> Play the same note (or perfect fifth) as the open string together to find where the resonance increases—this indicates you're close to proper intonation. For example, 4th finger D with open D, 4th finger E with open E, etc.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Left hand:</strong> Keep the first joint from collapsing, and ensure fingertips press the string vertically with elastic contact.</li>
              <li><strong>Right hand:</strong> Maintain consistent bow pressure and speed, separate from left-hand tension. Fine-tune the bow contact point at the midpoint between the fingerboard and bridge.</li>
              <li><strong>Tempo:</strong> Play very slowly (e.g., ♩=40~50) and hold notes long, remembering the point where needle fluctuation decreases.</li>
              <li><strong>Recording:</strong> Note down tendencies of the needle leaning left/right to quickly correct position-specific habits.</li>
            </ul>
            {getPositionAdvice()}
          </div>
        )
    }
  }

  const convertNote = (note) => {
    if (useFlats) {
      const flatMap = {
        'G#': 'A♭',
        'A#': 'B♭',
        'C#': 'D♭',
        'D#': 'E♭',
        'F#': 'G♭'
      }
      for (const [sharp, flat] of Object.entries(flatMap)) {
        if (note.includes(sharp)) {
          return note.replace(sharp, flat)
        }
      }
    }
    return note
  }

  const avgAccuracy = detectedNotes.length > 0
    ? Math.round(detectedNotes.reduce((sum, note) => sum + note.accuracy, 0) / detectedNotes.length)
    : 0

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
        >
          ← Back
        </button>
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

      <h2 className="text-4xl font-bold text-center text-white">Detailed Analysis</h2>

      {/* Position Selector */}
      <div className="max-w-4xl mx-auto mt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-brown-200">Position</span>
          <div className="flex bg-brown-600 rounded-lg p-1">
            {[
              { id: '1st', label: '1st position' },
              { id: '2nd', label: '2nd position' },
              { id: '3rd', label: 'Third position' },
              { id: '4th', label: 'Forth position' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPosition(p.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  position === p.id ? 'bg-accent-green text-white shadow-md' : 'text-brown-200 hover:bg-brown-500'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-brown-700 rounded-xl shadow-lg p-6 text-center">
            <p className="text-sm text-brown-200 mb-2">Notes Detected</p>
            <p className="text-4xl font-bold text-accent-purple">{detectedNotes.length}</p>
          </div>
          <div className="bg-brown-700 rounded-xl shadow-lg p-6 text-center">
            <p className="text-sm text-brown-200 mb-2">Average Accuracy</p>
            <p className="text-4xl font-bold text-accent-green">{avgAccuracy}%</p>
          </div>
          <div className="bg-brown-700 rounded-xl shadow-lg p-6 text-center">
            <p className="text-sm text-brown-200 mb-2">Well-Tuned Notes</p>
            <p className="text-4xl font-bold text-accent-green">
              {detectedNotes.filter(note => note.accuracy >= 90).length}
            </p>
          </div>
        </div>
      </div>

      {/* Detected Notes - Only show played notes */}
      <div className="max-w-7xl mx-auto">
        <h3 className="text-2xl font-semibold text-white mb-6">Detected Notes {isSample && <span className="text-sm text-brown-300">(예시)</span>}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {detectedNotes.map((item, index) => {
            const color = getAccuracyColor(item.accuracy)
            
            // 정적 클래스 매핑 - Tailwind가 인식하도록
            const colorClasses = {
              green: {
                border: 'border-accent-green',
                bg: 'bg-accent-green'
              },
              yellow: {
                border: 'border-accent-yellow',
                bg: 'bg-accent-yellow'
              },
              orange: {
                border: 'border-accent-orange',
                bg: 'bg-accent-orange'
              },
              red: {
                border: 'border-accent-orange',
                bg: 'bg-accent-orange'
              }
            }
            const colors = colorClasses[color] || colorClasses.yellow
            
            // note가 있는지 확인
            const noteDisplay = item.note ? convertNote(item.note) : '—'
            
            return (
              <div
                key={index}
                onMouseEnter={() => item.note && playNote(item.note)}
                className={`bg-brown-700 rounded-lg shadow-lg p-4 border-l-4 ${colors.border.includes('green') ? 'border-accent-green' : colors.border.includes('yellow') ? 'border-accent-yellow' : colors.border.includes('orange') ? 'border-accent-orange' : 'border-accent-orange'} transform transition-all duration-200 hover:scale-105 hover:shadow-xl cursor-pointer`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-shrink-0">
                    {item.note ? (
                      <div className={`w-12 h-12 ${colors.bg.includes('green') ? 'bg-accent-green' : colors.bg.includes('yellow') ? 'bg-accent-yellow' : colors.bg.includes('orange') ? 'bg-accent-orange' : 'bg-accent-orange'} rounded-full flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">{noteDisplay}</span>
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-brown-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">—</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-white">{item.accuracy}%</span>
                    {typeof item.avgCents === 'number' && (
                      <div className="text-xs text-brown-300">
                        {item.avgCents > 0 ? '+' : ''}{item.avgCents}c
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-brown-200 leading-relaxed">
                  {getAccuracyFeedback(item.accuracy)}
                </p>
                {item.note && (
                  <p className="text-xs text-brown-300 mt-1">Hover to hear note</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tip Box - moved below Detected Notes */}
      {!isSample && (
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-brown-600 border-l-4 border-accent-purple p-4 rounded-r-lg">
            <div className="text-sm text-white">
              {renderTipBody()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DetailedAnalysis





