-- 오디오 분석 세션 테이블
CREATE TABLE IF NOT EXISTS audio_analysis_sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),  -- Supabase Auth user ID (nullable for backwards compatibility)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    source_type VARCHAR(50) NOT NULL,  -- 'microphone', 'file', etc.
    source_name VARCHAR(255),
    sync_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'synced', 'failed'
    
    -- 통계 정보
    total_events INTEGER,
    average_event_accuracy DECIMAL(5, 2),
    
    -- 메타데이터 (JSONB로 저장)
    session_metadata JSONB,
    
    -- S3 오디오 파일 경로 (옵션)
    audio_file_s3_key VARCHAR(500),
    
    -- 인덱스
    CONSTRAINT valid_sync_status CHECK (sync_status IN ('pending', 'synced', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON audio_analysis_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_sync_status ON audio_analysis_sessions(sync_status);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON audio_analysis_sessions(user_id);

-- 노트별 통계 테이블 (각 세션의 상세 노트 정보)
CREATE TABLE IF NOT EXISTS note_stats (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES audio_analysis_sessions(id) ON DELETE CASCADE,
    
    -- 노트 정보
    note VARCHAR(10) NOT NULL,  -- 'A4', 'B#5', etc.
    frequency DECIMAL(10, 2),
    cents_deviation DECIMAL(8, 2),
    accuracy DECIMAL(5, 2),
    
    -- 타임스탬프
    timestamp_ms BIGINT,
    
    -- 인덱스
    CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES audio_analysis_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_note_stats_session ON note_stats(session_id);
CREATE INDEX IF NOT EXISTS idx_note_stats_note ON note_stats(note);

-- 낮은 정확도 이벤트 테이블
CREATE TABLE IF NOT EXISTS low_accuracy_events (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES audio_analysis_sessions(id) ON DELETE CASCADE,
    
    note VARCHAR(10),
    frequency DECIMAL(10, 2),
    cents_deviation DECIMAL(8, 2),
    accuracy DECIMAL(5, 2),
    timestamp_ms BIGINT,
    
    CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES audio_analysis_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_low_accuracy_session ON low_accuracy_events(session_id);

-- 기존 테이블에 user_id 컬럼 추가 (마이그레이션용)
-- ALTER TABLE audio_analysis_sessions ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);
-- CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON audio_analysis_sessions(user_id);
