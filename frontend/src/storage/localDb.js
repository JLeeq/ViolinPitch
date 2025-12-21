import Dexie from 'dexie'

export const localDb = new Dexie('violinCoachAI')

localDb.version(1).stores({
  sessions: '++id, createdAt, sourceType, syncStatus'
})



