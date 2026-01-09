// Sample audio definitions and allowlist
export const SAMPLE_AUDIO = {
  id: "g_major_scale_beginner",
  title: "G Major Scale (Beginner)",
  url: "/sample-audio/g-major-scale-beginner.wav",
  instrument: "violin",
  bpm: 60,
  notes: "G major scale one octave, beginner intonation"
}

export const SAMPLE_AUDIO_ALLOWLIST = [SAMPLE_AUDIO.id]

export function isAllowedSample(sampleId) {
  return SAMPLE_AUDIO_ALLOWLIST.includes(sampleId)
}

