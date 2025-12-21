// BPM detection using peak/onset detection from audio input
// Based on energy-based onset detection and inter-beat interval calculation

/**
 * Detect beats from audio buffer using energy-based onset detection
 * @param {Float32Array} buffer - Audio buffer data
 * @param {number} sampleRate - Audio sample rate
 * @param {number} threshold - Energy threshold for beat detection (0-1)
 * @returns {boolean} - True if a beat is detected in this frame
 */
export function detectBeat(buffer, sampleRate, threshold = 0.15) {
  if (!buffer || buffer.length === 0) return false

  // Calculate signal energy (RMS)
  let sumSquares = 0
  for (let i = 0; i < buffer.length; i++) {
    sumSquares += buffer[i] * buffer[i]
  }
  const rms = Math.sqrt(sumSquares / buffer.length)

  // Apply noise gate (ignore very quiet sounds)
  if (rms < 0.001) return false

  return rms > threshold
}

/**
 * Calculate BPM from inter-beat intervals
 * @param {number[]} beatTimestamps - Array of beat timestamps in milliseconds
 * @param {number} windowMs - Time window to consider for BPM calculation (default: 5000ms)
 * @returns {number|null} - Calculated BPM or null if insufficient data
 */
export function calculateBPM(beatTimestamps, windowMs = 5000) {
  if (!beatTimestamps || beatTimestamps.length < 2) return null

  const now = Date.now()
  const windowStart = now - windowMs

  // Filter beats within the time window
  const recentBeats = beatTimestamps.filter(t => t >= windowStart)

  if (recentBeats.length < 2) return null

  // Calculate intervals between consecutive beats
  const intervals = []
  for (let i = 1; i < recentBeats.length; i++) {
    const interval = recentBeats[i] - recentBeats[i - 1]
    // Filter out unrealistic intervals (between 200ms and 2000ms = 30-300 BPM)
    if (interval >= 200 && interval <= 2000) {
      intervals.push(interval)
    }
  }

  if (intervals.length === 0) return null

  // Calculate average interval
  const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length

  // Convert to BPM: 60 seconds * 1000 ms = 60000 ms per minute
  const bpm = 60000 / avgInterval

  // Round to nearest integer and validate range (30-300 BPM)
  const roundedBPM = Math.round(bpm)
  if (roundedBPM < 30 || roundedBPM > 300) return null

  return roundedBPM
}

/**
 * BPM Detector class for continuous real-time BPM detection
 */
export class BPMDetector {
  constructor(sampleRate = 44100, threshold = 0.15, windowMs = 5000) {
    this.sampleRate = sampleRate
    this.threshold = threshold
    this.windowMs = windowMs
    this.beatTimestamps = []
    this.lastEnergy = 0
    this.lastBeatTime = null
    this.minBeatInterval = 200 // Minimum time between beats (ms) to avoid duplicates
    this.smoothingFactor = 0.7 // Smoothing factor for energy changes
  }

  /**
   * Process audio buffer and return detected BPM
   * @param {Float32Array} buffer - Audio buffer data
   * @returns {number|null} - Current BPM or null
   */
  process(buffer) {
    if (!buffer || buffer.length === 0) return null

    // Calculate current energy
    let sumSquares = 0
    for (let i = 0; i < buffer.length; i++) {
      sumSquares += buffer[i] * buffer[i]
    }
    const currentEnergy = Math.sqrt(sumSquares / buffer.length)

    // Apply noise gate
    if (currentEnergy < 0.001) {
      this.lastEnergy = currentEnergy
      return this.getCurrentBPM()
    }

    // Detect onset (energy increase)
    const energyDiff = currentEnergy - this.lastEnergy
    const smoothedEnergy = this.lastEnergy * this.smoothingFactor + currentEnergy * (1 - this.smoothingFactor)

    const now = Date.now()

    // Detect beat if energy increases significantly and enough time has passed
    if (energyDiff > this.threshold && 
        (this.lastBeatTime === null || (now - this.lastBeatTime) >= this.minBeatInterval)) {
      this.beatTimestamps.push(now)
      this.lastBeatTime = now

      // Keep only beats within the window
      const windowStart = now - this.windowMs
      this.beatTimestamps = this.beatTimestamps.filter(t => t >= windowStart)
    }

    this.lastEnergy = smoothedEnergy

    return this.getCurrentBPM()
  }

  /**
   * Get current BPM from stored beat timestamps
   * @returns {number|null} - Current BPM or null
   */
  getCurrentBPM() {
    return calculateBPM(this.beatTimestamps, this.windowMs)
  }

  /**
   * Reset the detector
   */
  reset() {
    this.beatTimestamps = []
    this.lastEnergy = 0
    this.lastBeatTime = null
  }
}
