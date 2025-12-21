import { supabase } from '../lib/supabase'

// API 서비스 - 백엔드와 통신
// 프로덕션에서는 상대 경로 사용 (같은 도메인), 개발 환경에서는 절대 경로
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? '' : 'http://54.241.44.26:8000')

class ApiService {
  // 인증 헤더 가져오기
  async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    const headers = {
      'Content-Type': 'application/json',
    }
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
    
    return headers
  }

  // 인증 헤더 (FormData용 - Content-Type 제외)
  async getAuthHeadersForFormData() {
    const { data: { session } } = await supabase.auth.getSession()
    const headers = {}
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
    
    return headers
  }

  async createAnalysisSession(sessionData) {
    try {
      const headers = await this.getAuthHeaders()
      
      const response = await fetch(`${API_BASE_URL}/api/analysis/sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(sessionData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating analysis session:', error)
      throw error
    }
  }

  async listSessions(skip = 0, limit = 20) {
    try {
      const headers = await this.getAuthHeaders()
      
      const response = await fetch(`${API_BASE_URL}/api/analysis/sessions?skip=${skip}&limit=${limit}`, {
        headers,
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('Not authenticated, returning empty sessions')
          return []
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error listing sessions:', error)
      throw error
    }
  }

  async getSession(sessionId) {
    try {
      const headers = await this.getAuthHeaders()
      
      const response = await fetch(`${API_BASE_URL}/api/analysis/sessions/${sessionId}`, {
        headers,
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting session:', error)
      throw error
    }
  }

  async uploadAudioFile(sessionId, audioBlob, fileName) {
    try {
      const headers = await this.getAuthHeadersForFormData()
      
      const formData = new FormData()
      formData.append('file', audioBlob, fileName)

      const response = await fetch(`${API_BASE_URL}/api/analysis/sessions/${sessionId}/upload-audio`, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error uploading audio file:', error)
      throw error
    }
  }

  async deleteSession(sessionId) {
    try {
      const headers = await this.getAuthHeaders()
      
      const response = await fetch(`${API_BASE_URL}/api/analysis/sessions/${sessionId}`, {
        method: 'DELETE',
        headers,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error deleting session:', error)
      throw error
    }
  }

  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`)
      return response.ok
    } catch (error) {
      console.error('Health check failed:', error)
      return false
    }
  }
}

export const apiService = new ApiService()
