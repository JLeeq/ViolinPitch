import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const DEFAULT_SETTINGS = {
  concertA: 440,
  noteText: 'ABC', // 'ABC' | 'DoReMi'
  noteOrder: 'lowToHigh', // 'lowToHigh' | 'highToLow'
  accidental: 'sharps', // 'sharps' | 'flats'
  sensitivity: 1.0,
}

const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  resetDefaults: () => {},
})

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('violincoach_settings')
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  useEffect(() => {
    localStorage.setItem('violincoach_settings', JSON.stringify(settings))
  }, [settings])

  const value = useMemo(() => ({
    settings,
    updateSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
    resetDefaults: () => setSettings(DEFAULT_SETTINGS),
  }), [settings])

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}

export default SettingsContext


