// Sample analysis utilities
import { detectPitch } from './pitchDetection'
import { frequencyToNote } from './audioUtils'

// Allowed sample IDs (security: only analyze allowed samples)
// Support both formats for backwards compatibility
const ALLOWED_SAMPLE_IDS = ['g-major-scale-beginner', 'g_major_scale_beginner']

/**
 * Analyzes an audio file using the same pipeline as real recordings
 * @param {File|Blob} audioFile - Audio file to analyze
 * @param {string} sampleId - Sample identifier (must be in allowlist)
 * @param {number} concertA - Concert A frequency (default 440)
 * @returns {Promise<Array>} Array of analyzed notes with timestamp, frequency, note, accuracy, cents
 */
export async function analyzeSampleAudio(audioFile, sampleId = 'g-major-scale-beginner', concertA = 440) {
  // Security check: only allow listed sample IDs
  if (!ALLOWED_SAMPLE_IDS.includes(sampleId)) {
    throw new Error(`Sample ID ${sampleId} is not allowed`)
  }

  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const fileReader = new FileReader()

    fileReader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result
        
        // Decode audio data
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        const sampleRate = audioBuffer.sampleRate
        const channelData = audioBuffer.getChannelData(0) // Use first channel
        
        // Analyze audio in chunks (similar to real-time recording)
        const chunkSize = 4096 // Same as analyser.fftSize
        const overlap = 0.5 // 50% overlap for better accuracy
        const stepSize = Math.floor(chunkSize * (1 - overlap))
        const analyzedNotes = []
        
        // Process audio in chunks
        for (let i = 0; i < channelData.length - chunkSize; i += stepSize) {
          const chunk = channelData.slice(i, i + chunkSize)
          
          // Detect pitch in this chunk
          const pitch = detectPitch(Array.from(chunk), sampleRate)
          
          if (pitch && pitch > 150 && pitch < 3000) {
            const noteInfo = frequencyToNote(pitch, concertA)
            
            if (noteInfo.note) {
              // Only add if note changed or significant frequency difference
              const lastEntry = analyzedNotes[analyzedNotes.length - 1]
              const timestamp = (i / sampleRate) * 1000 // Convert to milliseconds
              
              if (!lastEntry || 
                  lastEntry.note !== noteInfo.note || 
                  Math.abs(lastEntry.frequency - pitch) > 5) {
                analyzedNotes.push({
                  ...noteInfo,
                  frequency: pitch,
                  timestamp: timestamp,
                })
              }
            }
          }
        }
        
        audioContext.close()
        resolve(analyzedNotes)
      } catch (error) {
        audioContext.close()
        reject(error)
      }
    }

    fileReader.onerror = (error) => {
      reject(error)
    }

    fileReader.readAsArrayBuffer(audioFile)
  })
}

/**
 * Generates a G Major Scale sample data (for demonstration when audio file is not available)
 * This is a fallback - real analysis should use analyzeSampleAudio
 */
export function generateGMajorScaleSample() {
  const gMajorNotes = ['G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F#4', 'G4']
  const baseTimestamp = Date.now()
  
  return gMajorNotes.map((note, index) => {
    const accuracy = 85 + Math.floor(Math.random() * 15) // 85-100% accuracy
    const cents = (Math.random() - 0.5) * 20 // -10 to +10 cents deviation
    
    return {
      note,
      frequency: getNoteFrequency(note),
      accuracy,
      cents: Math.round(cents * 10) / 10,
      timestamp: baseTimestamp + index * 1000, // 1 second per note
    }
  })
}

function getNoteFrequency(note) {
  const frequencies = {
    'G3': 196.00,
    'A3': 220.00,
    'B3': 246.94,
    'C4': 261.63,
    'D4': 293.66,
    'E4': 329.63,
    'F#4': 369.99,
    'G4': 392.00,
  }
  return frequencies[note] || 440
}

