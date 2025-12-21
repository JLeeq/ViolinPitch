// Metronome click sound generator using Web Audio API

/**
 * Generate a metronome click sound using Web Audio API
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {number} frequency - Frequency of the click sound (default: 1000 Hz)
 * @param {number} duration - Duration of the click in seconds (default: 0.01)
 * @param {number} volume - Volume (0-1, default: 0.3)
 */
export function playClick(audioContext, frequency = 1000, duration = 0.01, volume = 0.3) {
  if (!audioContext) return

  try {
    // Create oscillator for the click sound
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Configure oscillator
    oscillator.frequency.value = frequency
    oscillator.type = 'sine'

    // Create envelope for click sound (quick attack, quick decay)
    const now = audioContext.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.001) // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration) // Quick decay
    gainNode.gain.setValueAtTime(0, now + duration + 0.01)

    // Start and stop oscillator
    oscillator.start(now)
    oscillator.stop(now + duration + 0.01)
  } catch (error) {
    console.error('Error playing metronome click:', error)
  }
}

/**
 * Metronome class for scheduled click sounds
 */
export class Metronome {
  constructor(audioContext, bpm = 120, frequency = 1000, volume = 0.3, onTick = null) {
    this.audioContext = audioContext
    this.bpm = bpm
    this.frequency = frequency
    this.volume = volume
    this.isPlaying = false
    this.nextClickTime = 0
    this.scheduledClicks = []
    this.onTick = onTick // Callback function called on each click
  }

  /**
   * Start the metronome
   */
  start() {
    if (this.isPlaying) return

    this.isPlaying = true
    const intervalSeconds = 60 / this.bpm
    const now = this.audioContext.currentTime

    // Calculate the next click time aligned to the BPM interval
    // Start from a small delay to ensure audio context is ready, then align to BPM intervals
    const initialDelay = 0.05 // 50ms delay
    const nextAlignedTime = Math.ceil((now + initialDelay) / intervalSeconds) * intervalSeconds
    
    // Schedule first click at aligned time
    this.nextClickTime = nextAlignedTime
    this.scheduleClick(this.nextClickTime)

    // Schedule multiple clicks ahead for better accuracy
    const lookahead = 0.05 // Schedule 50ms ahead (reduced for better precision)
    const scheduleAheadTime = 0.25 // Schedule 0.25 seconds ahead

    const schedule = () => {
      if (!this.isPlaying) return

      while (this.nextClickTime < this.audioContext.currentTime + scheduleAheadTime) {
        this.scheduleClick(this.nextClickTime)
        this.nextClickTime += intervalSeconds
      }

      if (this.isPlaying) {
        setTimeout(schedule, lookahead * 1000)
      }
    }

    schedule()
  }

  /**
   * Stop the metronome
   */
  stop() {
    this.isPlaying = false
    // Clear any scheduled clicks
    this.scheduledClicks = []
    // Clear any pending tick callbacks
    if (this.tickTimeouts) {
      this.tickTimeouts.forEach(id => clearTimeout(id))
      this.tickTimeouts = []
    }
  }

  /**
   * Schedule a click at a specific time
   * @param {number} time - Time in seconds (AudioContext time)
   */
  scheduleClick(time) {
    try {
      // Create oscillator for the click sound at scheduled time
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      // Configure oscillator
      oscillator.frequency.value = this.frequency
      oscillator.type = 'sine'

      // Create envelope for click sound (quick attack, quick decay)
      const duration = 0.01
      gainNode.gain.setValueAtTime(0, time)
      gainNode.gain.linearRampToValueAtTime(this.volume, time + 0.001) // Quick attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration) // Quick decay
      gainNode.gain.setValueAtTime(0, time + duration + 0.01)

      // Start and stop oscillator at scheduled time
      oscillator.start(time)
      oscillator.stop(time + duration + 0.01)

      // Call onTick callback at the exact time the click plays
      // Use a small setTimeout to ensure the callback fires when the click actually plays
      if (this.onTick) {
        const delay = Math.max(0, (time - this.audioContext.currentTime) * 1000)
        // Schedule callback to fire when click plays
        const timeoutId = setTimeout(() => {
          if (this.isPlaying && this.onTick) {
            this.onTick()
          }
        }, delay)
        
        // Store timeout ID to potentially cancel if needed
        if (!this.tickTimeouts) {
          this.tickTimeouts = []
        }
        this.tickTimeouts.push(timeoutId)
        
        // Clean up old timeouts (older than 2 seconds)
        this.tickTimeouts = this.tickTimeouts.filter(id => {
          // Keep all for now, cleanup happens on stop
          return true
        })
      }

      this.scheduledClicks.push(time)
      // Keep only recent scheduled clicks
      const now = this.audioContext.currentTime
      this.scheduledClicks = this.scheduledClicks.filter(t => t > now - 1)
    } catch (error) {
      console.error('Error scheduling click:', error)
    }
  }

  /**
   * Update BPM (restart metronome with new BPM)
   * @param {number} newBpm - New BPM value
   */
  setBPM(newBpm) {
    const wasPlaying = this.isPlaying
    if (wasPlaying) {
      this.stop()
    }
    this.bpm = newBpm
    if (wasPlaying) {
      this.start()
    }
  }

  /**
   * Set the tick callback
   * @param {Function} callback - Function to call on each click
   */
  setOnTick(callback) {
    this.onTick = callback
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stop()
    this.audioContext = null
  }
}
