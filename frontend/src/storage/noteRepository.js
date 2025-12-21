import { localDb } from './localDb'
import { apiService } from '../services/aiAnalysisService'

class NoteRepository {
  // 프론트엔드 데이터를 백엔드 스키마로 변환
  convertToBackendFormat({ sourceType, sourceName, summary, metadata, sequence = [] }) {
    // sequence에서 note별 첫 timestamp 찾기
    const noteTimestamps = {}
    sequence.forEach(event => {
      if (event.note && !noteTimestamps[event.note] && event.timestamp) {
        noteTimestamps[event.note] = event.timestamp
      }
    })

    return {
      source_type: sourceType,
      source_name: sourceName,
      total_events: summary.metrics.totalEvents,
      average_event_accuracy: summary.metrics.averageEventAccuracy,
      session_metadata: metadata,
      note_stats: summary.perNote.map(note => ({
        note: note.note,
        frequency: null, // 집계 데이터에는 개별 frequency가 없음
        cents_deviation: note.avgCents || null,
        accuracy: note.accuracy || null,
        timestamp_ms: noteTimestamps[note.note] || null,
      })),
      low_accuracy_events: summary.lowAccuracyEvents.map(event => ({
        note: event.note || null,
        frequency: event.frequency || null,
        cents_deviation: event.cents || null,
        accuracy: event.accuracy || null,
        timestamp_ms: event.timestamp ? Math.round(event.timestamp) : null,
      })),
    }
  }

  async saveSession({ sourceType = 'microphone', sourceName = 'Live Recording', summary, metadata = {} }) {
    if (!summary || !Array.isArray(summary.perNote)) {
      throw new Error('Invalid summary payload for note session.')
    }

    // 로컬 DB에 저장 (오프라인 지원)
    const localPayload = {
      createdAt: new Date().toISOString(),
      sourceType,
      sourceName,
      syncStatus: 'pending',
      noteStats: summary.perNote,
      lowAccuracyEvents: summary.lowAccuracyEvents,
      sequence: summary.sequence || [],
      totalEvents: summary.metrics.totalEvents,
      averageEventAccuracy: summary.metrics.averageEventAccuracy,
      metadata,
    }

    const localId = await localDb.table('sessions').add(localPayload)

      // 백엔드에 동기화 시도
      try {
        // sequence 데이터도 함께 전달 (timestamp를 위해)
        const sequence = summary.sequence || []
        const backendPayload = this.convertToBackendFormat({ 
          sourceType, 
          sourceName, 
          summary, 
          metadata,
          sequence 
        })
        const backendSession = await apiService.createAnalysisSession(backendPayload)
      
      // 동기화 성공 시 로컬 DB 업데이트
      await localDb.table('sessions').update(localId, {
        syncStatus: 'synced',
        backendId: backendSession.id,
      })

      return { localId, backendId: backendSession.id, synced: true }
    } catch (error) {
      console.error('Failed to sync to backend, saved locally only:', error)
      // 백엔드 동기화 실패해도 로컬 저장은 유지
      return { localId, synced: false, error: error.message }
    }
  }

  async listRecent(limit = 20) {
    // 로컬 DB에서 먼저 조회
    const localSessions = await localDb.table('sessions')
      .orderBy('createdAt')
      .reverse()
      .limit(limit)
      .toArray()

    // 백엔드에서도 조회 시도 (최신 데이터)
    try {
      const backendSessions = await apiService.listSessions(0, limit)
      // 백엔드 데이터와 로컬 데이터 병합 (중복 제거)
      return { local: localSessions, backend: backendSessions }
    } catch (error) {
      console.error('Failed to fetch from backend, using local data only:', error)
      return { local: localSessions, backend: [] }
    }
  }

  async syncToBackend(localSessionId) {
    try {
      const localSession = await localDb.table('sessions').get(localSessionId)
      if (!localSession || localSession.syncStatus === 'synced') {
        return { success: false, message: 'Already synced or not found' }
      }

      const backendPayload = this.convertToBackendFormat({
        sourceType: localSession.sourceType,
        sourceName: localSession.sourceName,
        summary: {
          perNote: localSession.noteStats,
          lowAccuracyEvents: localSession.lowAccuracyEvents,
          metrics: {
            totalEvents: localSession.totalEvents,
            averageEventAccuracy: localSession.averageEventAccuracy,
          },
          sequence: localSession.sequence || [],
        },
        metadata: localSession.metadata,
        sequence: localSession.sequence || [],
      })

      const backendSession = await apiService.createAnalysisSession(backendPayload)
      
      await localDb.table('sessions').update(localSessionId, {
        syncStatus: 'synced',
        backendId: backendSession.id,
      })

      return { success: true, backendId: backendSession.id }
    } catch (error) {
      console.error('Sync failed:', error)
      await localDb.table('sessions').update(localSessionId, {
        syncStatus: 'failed',
      })
      return { success: false, error: error.message }
    }
  }
}

export const noteRepository = new NoteRepository()



