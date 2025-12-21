import React, { useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import { detectPitch } from '../utils/pitchDetection'

function Settings() {
  const { settings, updateSettings, resetDefaults } = useSettings()
  const [testPlaying, setTestPlaying] = useState(false)
  const [recordingA4, setRecordingA4] = useState(false)

  const handlePlayA4 = async () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = settings.concertA
      gain.gain.value = 0.1
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      setTestPlaying(true)
      setTimeout(() => {
        osc.stop()
        audioCtx.close()
        setTestPlaying(false)
      }, 1500)
    } catch {}
  }

  const handleRecordA4 = async () => {
    try {
      setRecordingA4(true)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = audioCtx.createAnalyser()
      const source = audioCtx.createMediaStreamSource(stream)
      analyser.fftSize = 2048
      const data = new Float32Array(analyser.frequencyBinCount)
      source.connect(analyser)

      const samples = []
      const start = Date.now()
      const sampleOnce = () => {
        analyser.getFloatTimeDomainData(data)
        const pitch = detectPitch(Array.from(data), audioCtx.sampleRate)
        if (pitch && pitch > 150 && pitch < 2000) {
          samples.push(pitch)
        }
        if (Date.now() - start < 1200) {
          requestAnimationFrame(sampleOnce)
        } else {
          const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : settings.concertA
          updateSettings({ concertA: Math.round(avg * 100) / 100 })
          stream.getTracks().forEach(t => t.stop())
          audioCtx.close()
          setRecordingA4(false)
        }
      }
      sampleOnce()
    } catch {
      setRecordingA4(false)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h2 className="text-3xl font-bold text-center text-white">Settings</h2>

      <div className="bg-brown-700 rounded-2xl shadow p-5 space-y-4">
        <h3 className="font-semibold text-white">Concert A</h3>
        <div className="flex items-center gap-3">
          <input
            type="number"
            className="flex-1 border border-brown-500 bg-brown-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-green"
            step="0.1"
            min="380"
            max="480"
            value={settings.concertA}
            onChange={(e) => updateSettings({ concertA: Number(e.target.value) || 440 })}
          />
          <span className="text-brown-200">Hz</span>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-500" onClick={resetDefaults}>Default</button>
          <button className={`px-3 py-2 bg-brown-500 text-white rounded-lg hover:bg-brown-400 ${recordingA4 ? 'opacity-70' : ''}`} onClick={handleRecordA4} disabled={recordingA4}>
            {recordingA4 ? 'Recording…' : 'Record'}
          </button>
          <button className={`px-3 py-2 rounded-lg text-white ${testPlaying ? 'bg-accent-green' : 'bg-accent-purple'}`} onClick={handlePlayA4}>
            {testPlaying ? 'Playing…' : 'Play'}
          </button>
        </div>
      </div>

      <div className="bg-brown-700 rounded-2xl shadow p-5 space-y-3">
        <h3 className="font-semibold text-white">Note Text</h3>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-white">
            <input type="radio" name="notetext" checked={settings.noteText === 'ABC'} onChange={() => updateSettings({ noteText: 'ABC' })} className="text-accent-green" />
            <span>A B C</span>
          </label>
          <label className="flex items-center gap-2 text-white">
            <input type="radio" name="notetext" checked={settings.noteText === 'DoReMi'} onChange={() => updateSettings({ noteText: 'DoReMi' })} className="text-accent-green" />
            <span>Do Re Mi</span>
          </label>
        </div>
      </div>

      <div className="bg-brown-700 rounded-2xl shadow p-5 space-y-3">
        <h3 className="font-semibold text-white">Note Order</h3>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-white">
            <input type="radio" name="noteorder" checked={settings.noteOrder === 'highToLow'} onChange={() => updateSettings({ noteOrder: 'highToLow' })} className="text-accent-green" />
            <span>High to Low</span>
          </label>
          <label className="flex items-center gap-2 text-white">
            <input type="radio" name="noteorder" checked={settings.noteOrder === 'lowToHigh'} onChange={() => updateSettings({ noteOrder: 'lowToHigh' })} className="text-accent-green" />
            <span>Low to High</span>
          </label>
        </div>
      </div>

      <div className="bg-brown-700 rounded-2xl shadow p-5 space-y-3">
        <h3 className="font-semibold text-white"># / ♭</h3>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-white">
            <input type="radio" name="accid" checked={settings.accidental === 'sharps'} onChange={() => updateSettings({ accidental: 'sharps' })} className="text-accent-green" />
            <span>#</span>
          </label>
          <label className="flex items-center gap-2 text-white">
            <input type="radio" name="accid" checked={settings.accidental === 'flats'} onChange={() => updateSettings({ accidental: 'flats' })} className="text-accent-green" />
            <span>♭</span>
          </label>
        </div>
      </div>

      <div className="bg-brown-700 rounded-2xl shadow p-5 space-y-3">
        <h3 className="font-semibold text-white">Sensitivity</h3>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={settings.sensitivity}
          onChange={(e) => updateSettings({ sensitivity: Number(e.target.value) })}
          className="w-full accent-accent-green"
        />
      </div>
    </div>
  )
}

export default Settings


