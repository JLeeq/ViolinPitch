# Violin Coach AI - 투자자 유치 목적 기술 보고서

## 1. Core Features (현재 구현된 기능)

### 1.1 실시간 피치 감지 및 튜닝 (Tuner)

#### 기능 상세
- **실시간 오디오 입력 처리**: Web Audio API의 `getUserMedia`를 통한 마이크 입력 실시간 스트리밍
- **피치 감지 알고리즘**: Autocorrelation 기반 피치 감지 알고리즘 구현
  - 샘플 레이트: 44.1kHz (기본) 또는 48kHz
  - FFT 크기: 4096 (고해상도 주파수 분석)
  - 주파수 범위: 150Hz ~ 3000Hz (바이올린 범위 G3 ~ E7)
  - 신호 증폭: 작은 볼륨의 음도 감지 가능하도록 자동 증폭 (최대 2배)
  - 노이즈 게이트: RMS 0.001 미만 신호 자동 필터링

#### 음표 변환 및 정확도 계산
- **음표 매핑**: 12평균율 기반 53개 음표 (G3 ~ E7) 지원
- **센트(cent) 계산**: `1200 * log2(frequency / targetFrequency)` 공식 사용
- **정확도 계산**: `max(0, 100 - |cents|)` - 센트 편차에 반비례
- **튜닝 조정**: A4 기준 주파수 조정 가능 (기본 440Hz, 사용자 설정 가능)

#### 시각적 피드백
- **실시간 미터**: -50센트 ~ +50센트 범위의 시각적 미터
  - 초록색 영역: ±5센트 (완벽한 튜닝)
  - 주황색/빨간색 영역: ±5센트 초과 (조정 필요)
  - 눈금 표시: 21개 눈금 (5센트 단위), 주요 눈금 강조
- **음표 표시**: 현재 감지된 음표를 큰 폰트로 표시
- **센트 편차 표시**: 실시간 센트 편차 (±XXc 형식)
- **피드백 메시지**: 센트 편차에 따른 실시간 피드백
  - ±5센트: "Perfect tuning!"
  - ±10센트: "Very close. Minor adjustment needed."
  - ±20센트: "Slightly sharp/flat"
  - ±30센트: "Sharp/Flat. Significant adjustment needed."

#### 기술 구현
- **AudioContext**: Web Audio API를 통한 실시간 오디오 처리
- **AnalyserNode**: FFT를 통한 주파수 도메인 분석
- **RequestAnimationFrame**: 60fps 실시간 업데이트
- **스트림 관리**: 페이지 전환 시 자동 스트림 정리 (메모리 누수 방지)

---

### 1.2 실시간 녹음 및 분석 (Record & Analysis)

#### 녹음 기능
- **실시간 녹음**: MediaRecorder API를 통한 오디오 녹음
  - 포맷: WAV (무손실 오디오)
  - 샘플 레이트: 디바이스 기본값 (일반적으로 44.1kHz 또는 48kHz)
  - 채널: 모노 (1채널)
- **동시 피치 감지**: 녹음 중 실시간 피치 감지 및 표시
- **웨이브폼 시각화**: Canvas API를 통한 실시간 오디오 웨이브폼 표시
  - 200개 샘플 포인트 실시간 렌더링
  - 부드러운 애니메이션 효과

#### 데이터 수집 및 저장
- **노트 이벤트 추적**: 각 음표 변화 시점 기록
  - 음표 이름 (예: "A4", "B5")
  - 주파수 (Hz)
  - 센트 편차
  - 정확도 (%)
  - 타임스탬프 (밀리초)
- **로컬 저장소**: IndexedDB (Dexie.js)를 통한 오프라인 저장
  - 세션별 데이터 저장
  - 오디오 파일 메타데이터 저장
  - 브라우저 재시작 후에도 데이터 유지

#### 통계 집계
- **노트별 통계**: 각 음표별 평균 정확도, 평균 센트 편차 계산
- **전체 통계**: 
  - 총 이벤트 수
  - 평균 이벤트 정확도
  - 낮은 정확도 이벤트 필터링 (85% 미만)
- **패턴 분석**: 
  - 일관된 플랫/샤프 경향 감지
  - 옥타브별 정확도 분석
  - 이전 음표 기반 오류 분석

#### 백엔드 동기화
- **자동 동기화**: 녹음 완료 시 자동으로 백엔드 API에 전송
- **오프라인 지원**: 네트워크 오류 시 로컬 저장 후 나중에 동기화
- **오디오 파일 업로드**: S3에 오디오 파일 자동 업로드
  - 파일명: `recording_{timestamp}.wav`
  - S3 키: `sessions/{session_id}/audio_{uuid}.wav`
  - 업로드 실패 시에도 세션 데이터는 저장됨

---

### 1.3 성능 분석 및 패턴 감지 (Analysis)

#### 개별 음표 분석
- **음표별 상세 통계**:
  - 평균 정확도
  - 평균 센트 편차
  - 피드백 메시지
  - 색상 코딩 (정확도에 따라)
    - 90% 이상: 초록색
    - 80-89%: 노란색
    - 70-79%: 주황색
    - 70% 미만: 주황색/빨간색

#### 패턴 분석
- **일관된 오류 감지**:
  - 최근 5개 음표 분석
  - 플랫 경향 감지 (3개 이상 -10센트 미만)
  - 샤프 경향 감지 (3개 이상 +10센트 초과)
- **옥타브별 분석**: 각 옥타브(3~7)별 평균 정확도 계산 및 시각화
- **이전 음표 기반 분석**: 이전 음표와의 관계 분석

#### 시각화
- **그리드 레이아웃**: 반응형 그리드 (1~4열 자동 조정)
- **옥타브별 정확도 바**: 각 옥타브의 평균 정확도를 바 차트로 표시
- **Sharp/Flat 표기 전환**: 사용자 선택에 따라 # 또는 ♭ 표기

---

### 1.4 메트로놈 및 BPM 감지 (Metronome)

#### BPM 감지
- **실시간 BPM 측정**: 마이크 입력을 통한 실시간 BPM 감지
- **알고리즘**: Energy-based onset detection
  - RMS (Root Mean Square) 에너지 계산
  - 에너지 증가율 기반 비트 감지
  - Inter-beat interval 계산
  - 5초 슬라이딩 윈도우 기반 BPM 계산
  - 범위: 30 ~ 300 BPM
- **스무딩**: 에너지 변화 스무딩 (smoothing factor: 0.7)
- **노이즈 게이트**: RMS 0.001 미만 신호 무시

#### 메트로놈 기능
- **타겟 BPM 설정**: 30 ~ 300 BPM 범위에서 설정 가능
- **메트로놈 사운드**: Web Audio API를 통한 정확한 타이밍 클릭 사운드
  - 주파수: 1000Hz
  - 지속 시간: 0.3초
  - 정확한 타이밍: AudioContext의 정밀한 스케줄링
- **시각적 피드백**: 배경색 변화를 통한 비트 표시
  - 검정/흰색: 타겟 BPM과 일치
  - 검정/빨강: 현재 BPM이 타겟보다 빠름
  - 검정/하늘색: 현재 BPM이 타겟보다 느림
- **배경 깜빡임**: 타겟 BPM에 맞춘 자동 배경색 전환
  - 입력 없을 때: 검정/흰색 자동 전환
  - 입력 있을 때: 감지된 BPM에 따라 색상 변경

---

### 1.5 통합 리포트 (Integrated Report)

#### 리포트 생성
- **세션 통합 분석**: 여러 세션 데이터를 통합하여 종합 분석
- **트렌드 분석**:
  - 전체 트렌드 방향 (개선/악화/안정)
  - 첫 주 평균 vs 마지막 주 평균 비교
  - 변화율 계산
- **최고 세션**: 평균 정확도가 가장 높은 세션 표시
- **통계 분석**:
  - 정확도 분포 (90-100%, 80-89%, 70-79%, 70% 미만)
  - 일관성 점수 (0-100)
  - 옥타브별 분석

#### 추천 시스템
- **우선순위 포커스 영역**: 정확도가 낮은 음표/옥타브 식별
- **연습 루틴 제안**: 개인화된 연습 루틴 제안
- **기술 팁**: 특정 문제에 대한 맞춤형 기술 팁

---

### 1.6 설정 및 사용자 커스터마이징

#### 설정 기능
- **A4 기준 주파수 조정**: 430Hz ~ 450Hz 범위에서 조정 가능
- **Sharp/Flat 표기 선택**: 사용자 선호에 따라 표기법 선택
- **로컬 저장소 관리**: 저장된 세션 데이터 관리

---

## 2. Technical Architecture

### 2.1 전체 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Web Browser)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Frontend (React + Vite)                             │   │
│  │  - Single Page Application (SPA)                     │   │
│  │  - Real-time Audio Processing                        │   │
│  │  - IndexedDB (Local Storage)                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS
                            │
┌─────────────────────────────────────────────────────────────┐
│                    EC2 Instance (AWS)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Nginx (Reverse Proxy)                               │   │
│  │  - Port 80 (HTTP)                                    │   │
│  │  - Static File Serving                                │   │
│  │  - API Request Proxy                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  FastAPI Backend (Uvicorn)                            │   │
│  │  - Port 8000 (localhost)                              │   │
│  │  - RESTful API                                        │   │
│  │  - SQLAlchemy ORM                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PostgreSQL (AWS RDS)                                 │   │
│  │  - Relational Database                                │   │
│  │  - Session & Analysis Data Storage                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  AWS S3                                               │   │
│  │  - Audio File Storage                                 │   │
│  │  - Scalable Object Storage                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Frontend Architecture

#### 2.2.1 기술 스택

**Core Framework**
- **React 18.2.0**: UI 라이브러리
  - 함수형 컴포넌트
  - Hooks API (useState, useEffect, useRef, useMemo, useCallback)
  - Context API (상태 관리)

**Build Tool**
- **Vite 7.2.4**: 빌드 도구 및 개발 서버
  - ES Module 기반
  - HMR (Hot Module Replacement)
  - 빠른 빌드 속도
  - 프로덕션 빌드 최적화 (코드 스플리팅, 트리 쉐이킹)

**Styling**
- **Tailwind CSS 3.4.0**: 유틸리티 퍼스트 CSS 프레임워크
  - 커스텀 색상 팔레트 (brown, beige, softblue, accent colors)
  - 반응형 디자인 (모바일 퍼스트)
  - JIT (Just-In-Time) 컴파일

**State Management**
- **React Context API**: 전역 상태 관리
  - SettingsContext: 사용자 설정 (A4 주파수 등)
  - AIConfigContext: AI 설정 (향후 확장용)

**Local Storage**
- **Dexie.js 4.2.1**: IndexedDB 래퍼
  - 비동기 데이터베이스 API
  - 오프라인 데이터 저장
  - 세션 데이터 영구 저장

#### 2.2.2 프로젝트 구조

```
frontend/src/
├── main.jsx                 # 애플리케이션 진입점
├── App.jsx                  # 메인 앱 컴포넌트, 라우팅
├── index.css                # 글로벌 스타일
├── components/
│   └── Navigation.jsx      # 네비게이션 바 컴포넌트
├── pages/
│   ├── Tuner.jsx           # 튜너 페이지
│   ├── Metronome.jsx        # 메트로놈 페이지
│   ├── RecordAndAnalysis.jsx # 녹음 및 분석 페이지
│   ├── Analysis.jsx         # 분석 페이지
│   ├── DetailedAnalysis.jsx # 상세 분석 페이지
│   ├── IntegratedReport.jsx # 통합 리포트 페이지
│   ├── Settings.jsx         # 설정 페이지
│   ├── Record.jsx          # 레거시 녹음 페이지
│   └── Vibration.jsx       # 비브라토 분석 (프로토타입)
├── utils/
│   ├── audioUtils.js       # 오디오 유틸리티 (피치 변환, 통계 집계)
│   ├── pitchDetection.js   # 피치 감지 알고리즘
│   ├── bpmDetection.js     # BPM 감지 알고리즘
│   ├── metronomeSound.js   # 메트로놈 사운드 생성
│   └── reportGenerator.js  # 리포트 생성 로직
├── services/
│   └── aiAnalysisService.js # 백엔드 API 서비스
├── storage/
│   ├── localDb.js          # IndexedDB 설정
│   └── noteRepository.js   # 데이터 저장소 레이어
└── context/
    ├── SettingsContext.jsx  # 설정 컨텍스트
    └── AIConfigContext.jsx # AI 설정 컨텍스트
```

#### 2.2.3 핵심 알고리즘 구현

**피치 감지 알고리즘 (pitchDetection.js)**
```javascript
// Autocorrelation 기반 피치 감지
function detectPitch(buffer, sampleRate) {
  // 1. 신호 강도 체크 및 증폭
  // 2. 주기 탐색 범위 설정 (150Hz ~ 3000Hz)
  // 3. Autocorrelation 계산
  // 4. 최대 상관관계 주기 찾기
  // 5. 주기를 주파수로 변환
  // 6. 유효 범위 검증
}
```

**BPM 감지 알고리즘 (bpmDetection.js)**
```javascript
// Energy-based onset detection
class BPMDetector {
  // 1. RMS 에너지 계산
  // 2. 에너지 증가율 감지 (onset detection)
  // 3. 비트 타임스탬프 저장
  // 4. Inter-beat interval 계산
  // 5. 5초 슬라이딩 윈도우로 BPM 계산
}
```

**통계 집계 알고리즘 (audioUtils.js)**
```javascript
function aggregateNoteStats(recordedNotes) {
  // 1. 음표별 그룹화
  // 2. 평균 정확도 계산
  // 3. 평균 센트 편차 계산
  // 4. 낮은 정확도 이벤트 필터링 (85% 미만)
  // 5. 전체 통계 계산
}
```

#### 2.2.4 오디오 처리 파이프라인

```
Microphone Input
    ↓
getUserMedia() → MediaStream
    ↓
AudioContext.createMediaStreamSource()
    ↓
AnalyserNode (FFT Size: 4096)
    ↓
getFloatTimeDomainData() → Float32Array
    ↓
detectPitch() / BPMDetector.process()
    ↓
Frequency → Note Conversion
    ↓
UI Update (RequestAnimationFrame)
```

#### 2.2.5 데이터 흐름

**녹음 및 저장 흐름**
```
User clicks "Start Recording"
    ↓
getUserMedia() → Stream
    ↓
MediaRecorder.start() + AnalyserNode
    ↓
Real-time pitch detection (every frame)
    ↓
Note events stored in recordedDataRef
    ↓
User clicks "Stop Recording"
    ↓
aggregateNoteStats() → Summary
    ↓
noteRepository.saveSession()
    ├─→ IndexedDB (local)
    └─→ API POST /api/analysis/sessions (backend)
        └─→ PostgreSQL
    ↓
Audio Blob → S3 Upload (if synced)
```

#### 2.2.6 반응형 디자인

**모바일 최적화**
- **뷰포트 설정**: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- **Tailwind 반응형 클래스**: `sm:`, `md:`, `lg:`, `xl:` 브레이크포인트 사용
- **터치 친화적 UI**: 버튼 크기 최소 44x44px, 충분한 터치 영역
- **가로 스크롤 방지**: 네비게이션 바 가로 스크롤 지원
- **텍스트 크기 조정**: `clamp()` 함수를 통한 유동적 폰트 크기
- **그리드 레이아웃**: 화면 크기에 따라 1~4열 자동 조정

---

### 2.3 Backend Architecture

#### 2.3.1 기술 스택

**Web Framework**
- **FastAPI 0.104.1**: 고성능 비동기 웹 프레임워크
  - 자동 API 문서 생성 (Swagger/OpenAPI)
  - Pydantic 기반 데이터 검증
  - 타입 힌팅 지원

**ASGI Server**
- **Uvicorn 0.24.0**: ASGI 서버
  - 비동기 요청 처리
  - 고성능 HTTP 서버
  - WebSocket 지원

**Database ORM**
- **SQLAlchemy 2.0.23**: Python ORM
  - Declarative API
  - 관계형 매핑
  - 트랜잭션 관리

**Database**
- **PostgreSQL**: 관계형 데이터베이스 (AWS RDS)
  - ACID 준수
  - JSONB 지원 (메타데이터 저장)
  - 인덱싱 최적화

**Database Driver**
- **psycopg2-binary 2.9.9**: PostgreSQL 어댑터

**Cloud Storage**
- **boto3 1.29.7**: AWS SDK for Python
  - S3 클라이언트
  - 파일 업로드/다운로드

**Data Validation**
- **Pydantic 2.5.0**: 데이터 검증 및 설정 관리
  - 타입 검증
  - 자동 직렬화/역직렬화

**Environment Management**
- **python-dotenv 1.0.0**: 환경 변수 관리

**File Upload**
- **python-multipart 0.0.6**: 멀티파트 파일 업로드 지원

#### 2.3.2 프로젝트 구조

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 앱 진입점
│   ├── database.py          # 데이터베이스 연결 설정
│   ├── models.py            # SQLAlchemy ORM 모델
│   ├── schemas.py           # Pydantic 스키마
│   ├── s3_service.py        # S3 업로드 서비스
│   └── routers/
│       ├── __init__.py
│       └── analysis.py      # 분석 관련 API 엔드포인트
├── create_tables.sql        # 데이터베이스 테이블 생성 스크립트
├── requirements.txt         # Python 의존성
├── env.example              # 환경 변수 예시
├── nginx/
│   └── violincoach-full.conf # Nginx 설정 파일
└── systemd/
    └── violincoach-api.service # Systemd 서비스 파일
```

#### 2.3.3 데이터베이스 스키마

**audio_analysis_sessions 테이블**
```sql
CREATE TABLE audio_analysis_sessions (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    source_type VARCHAR(50) NOT NULL,        -- 'microphone', 'file'
    source_name VARCHAR(255),                -- 'Live Recording'
    sync_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'synced', 'failed'
    total_events INTEGER,                     -- 총 이벤트 수
    average_event_accuracy DECIMAL(5, 2),     -- 평균 정확도
    session_metadata JSONB,                   -- 메타데이터 (JSON)
    audio_file_s3_key VARCHAR(500)           -- S3 오디오 파일 경로
);
```

**note_stats 테이블**
```sql
CREATE TABLE note_stats (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES audio_analysis_sessions(id) ON DELETE CASCADE,
    note VARCHAR(10) NOT NULL,                -- 'A4', 'B5'
    frequency DECIMAL(10, 2),                -- 주파수 (Hz)
    cents_deviation DECIMAL(8, 2),           -- 센트 편차
    accuracy DECIMAL(5, 2),                   -- 정확도 (%)
    timestamp_ms BIGINT                       -- 타임스탬프 (밀리초)
);
```

**low_accuracy_events 테이블**
```sql
CREATE TABLE low_accuracy_events (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES audio_analysis_sessions(id) ON DELETE CASCADE,
    note VARCHAR(10),
    frequency DECIMAL(10, 2),
    cents_deviation DECIMAL(8, 2),
    accuracy DECIMAL(5, 2),
    timestamp_ms BIGINT
);
```

**인덱스**
- `idx_sessions_created_at`: 세션 생성일 기준 정렬 최적화
- `idx_sessions_sync_status`: 동기화 상태 필터링 최적화
- `idx_note_stats_session`: 세션별 노트 조회 최적화
- `idx_note_stats_note`: 음표별 조회 최적화
- `idx_low_accuracy_session`: 세션별 낮은 정확도 이벤트 조회 최적화

#### 2.3.4 API 엔드포인트

**POST /api/analysis/sessions**
- 기능: 오디오 분석 세션 생성
- 요청 본문: `AudioAnalysisSessionCreate` (Pydantic 스키마)
- 응답: `AudioAnalysisSessionResponse`
- 처리 과정:
  1. 세션 레코드 생성
  2. 노트 통계 레코드 일괄 생성
  3. 낮은 정확도 이벤트 레코드 일괄 생성
  4. 트랜잭션 커밋
  5. 생성된 세션 반환

**POST /api/analysis/sessions/{session_id}/upload-audio**
- 기능: 오디오 파일을 S3에 업로드
- 요청: multipart/form-data (파일)
- 처리 과정:
  1. 세션 존재 확인
  2. S3 키 생성: `sessions/{session_id}/audio_{uuid}.{ext}`
  3. S3에 파일 업로드
  4. 세션 레코드에 S3 키 저장
  5. S3 URL 반환

**GET /api/analysis/sessions**
- 기능: 최근 분석 세션 목록 조회
- 쿼리 파라미터:
  - `skip`: 건너뛸 레코드 수 (기본: 0)
  - `limit`: 반환할 레코드 수 (기본: 20)
- 정렬: `created_at DESC` (최신순)

**GET /api/analysis/sessions/{session_id}**
- 기능: 특정 세션 상세 조회
- 응답: 세션 정보 및 관련 노트 통계, 낮은 정확도 이벤트 (관계 로딩)

**GET /health**
- 기능: 서버 상태 확인
- 응답: `{"status": "healthy"}`

#### 2.3.5 데이터베이스 연결 설정

**Connection Pool 설정**
```python
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # 연결 유효성 검사
    pool_size=5,             # 기본 연결 풀 크기
    max_overflow=10          # 추가 연결 최대 수
)
```

**세션 관리**
- FastAPI Dependency Injection 사용
- 요청마다 새 세션 생성
- 요청 완료 시 자동 세션 종료
- 예외 발생 시 자동 롤백

#### 2.3.6 S3 통합

**S3 서비스 클래스**
- 싱글톤 패턴
- AWS 자격 증명: 환경 변수 또는 IAM 역할
- 파일 업로드: `upload_file()` (로컬 파일), `upload_fileobj()` (메모리 객체)
- S3 URL 생성: `https://{bucket}.s3.{region}.amazonaws.com/{key}`

**업로드 프로세스**
1. 파일 읽기 (BytesIO)
2. S3 키 생성 (UUID 기반 고유 키)
3. S3 업로드 (Content-Type: audio/wav)
4. S3 URL 반환

---

### 2.4 배포 아키텍처

#### 2.4.1 인프라 구성

**AWS EC2 인스턴스**
- OS: Ubuntu 22.04 LTS
- 인스턴스 타입: t3.micro 이상 (권장)
- Public IP: 54.241.44.26 (현재)
- 보안 그룹:
  - HTTP (80): 0.0.0.0/0 (모든 IP 허용)
  - HTTPS (443): 0.0.0.0/0 (선택사항)
  - SSH (22): 특정 IP 또는 0.0.0.0/0

**AWS RDS PostgreSQL**
- 엔진: PostgreSQL
- 인스턴스 클래스: db.t3.micro 이상
- 엔드포인트: violincoach-db.chmgmu4uiv4k.us-west-1.rds.amazonaws.com
- 포트: 5432
- 데이터베이스: violincoach
- 보안: VPC 내부 통신, 공개 접근 차단

**AWS S3**
- 버킷: violincoach-audio-files (예시)
- 리전: us-west-1
- 접근: IAM 역할 또는 Access Key
- 파일 구조: `sessions/{session_id}/audio_{uuid}.wav`

#### 2.4.2 Nginx 설정

**역할**
- Reverse Proxy: FastAPI 백엔드로 요청 프록시
- Static File Server: 프론트엔드 정적 파일 서빙
- Load Balancer: 향후 확장 시 로드 밸런싱 가능

**설정 파일 위치**: `/etc/nginx/sites-available/violincoach`

**주요 설정**
```nginx
server {
    listen 80;
    server_name _;  # 모든 도메인/IP 허용
    
    # 프론트엔드 정적 파일
    root /var/www/violincoach;
    index index.html;
    
    # API 프록시
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_buffering off;
    }
    
    # SPA 라우팅
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 정적 파일 캐싱
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**파일 경로**
- 프론트엔드: `/var/www/violincoach/`
- 로그: `/var/log/nginx/violincoach_access.log`, `/var/log/nginx/violincoach_error.log`

#### 2.4.3 Systemd 서비스 설정

**서비스 파일 위치**: `/etc/systemd/system/violincoach-api.service`

**설정 내용**
```ini
[Unit]
Description=Violin Coach AI FastAPI Application
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/app/backend
Environment="PATH=/home/ubuntu/app/backend/venv/bin"
ExecStart=/home/ubuntu/app/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**서비스 관리**
- 시작: `sudo systemctl start violincoach-api`
- 중지: `sudo systemctl stop violincoach-api`
- 재시작: `sudo systemctl restart violincoach-api`
- 상태 확인: `sudo systemctl status violincoach-api`
- 부팅 시 자동 시작: `sudo systemctl enable violincoach-api`

#### 2.4.4 배포 프로세스

**1. 프론트엔드 빌드**
```bash
cd violincoachAI
npm install
npm run build
# 결과: dist/ 폴더에 정적 파일 생성
```

**빌드 산출물**
- `dist/index.html`: 메인 HTML 파일
- `dist/assets/index-{hash}.js`: 번들된 JavaScript (약 340KB, gzip: 103KB)
- `dist/assets/index-{hash}.css`: 번들된 CSS (약 22KB, gzip: 4.5KB)

**2. 파일 전송**
```bash
# SCP를 통한 파일 전송
scp -i {key}.pem -r dist/* ubuntu@{ec2-ip}:/var/www/violincoach/
```

**3. Nginx 재시작**
```bash
ssh -i {key}.pem ubuntu@{ec2-ip}
sudo nginx -t  # 설정 검증
sudo systemctl restart nginx
```

**4. 백엔드 재시작 (필요시)**
```bash
sudo systemctl restart violincoach-api
```

#### 2.4.5 CI/CD 파이프라인

**GitHub Actions 워크플로우** (`.github/workflows/deploy.yml`)

**트리거**
- `main` 또는 `master` 브랜치에 푸시
- 수동 실행 (workflow_dispatch)

**프로세스**
1. 코드 체크아웃
2. Node.js 18 설정
3. 의존성 설치 (`npm ci`)
4. 프론트엔드 빌드 (`npm run build`)
5. SSH 키 설정
6. EC2에 파일 업로드
7. Nginx 재시작
8. 배포 검증 (health check)

**필요한 GitHub Secrets**
- `EC2_SSH_KEY`: EC2 접속용 SSH 개인 키
- `EC2_HOST`: EC2 서버 IP 주소
- `EC2_USER`: EC2 사용자 이름 (ubuntu)

#### 2.4.6 환경 변수 설정

**백엔드 환경 변수** (`.env` 파일)
```env
DATABASE_URL=postgresql://postgres:password@violincoach-db.chmgmu4uiv4k.us-west-1.rds.amazonaws.com:5432/violincoach
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-west-1
S3_BUCKET_NAME=violincoach-audio-files
```

**프론트엔드 환경 변수** (선택사항)
```env
VITE_API_BASE_URL=http://54.241.44.26:8000
```

#### 2.4.7 데이터베이스 초기화

**테이블 생성**
```bash
psql -h {rds-endpoint} -U postgres -d violincoach -f create_tables.sql
```

**또는 SQLAlchemy 자동 생성**
- `Base.metadata.create_all(bind=engine)` (앱 시작 시)

#### 2.4.8 보안 설정

**CORS 설정**
- 현재: `allow_origins=["*"]` (개발/테스트용)
- 프로덕션 권장: 특정 도메인만 허용

**HTTPS 설정** (선택사항)
- Let's Encrypt 인증서 발급
- Certbot을 통한 자동 갱신
- HTTP → HTTPS 리다이렉트

**데이터베이스 보안**
- VPC 내부 통신만 허용
- 공개 접근 차단
- SSL/TLS 연결 (선택사항)

---

### 2.5 성능 및 확장성

#### 2.5.1 프론트엔드 최적화

**빌드 최적화**
- 코드 스플리팅: 라우트별 청크 분리
- 트리 쉐이킹: 사용하지 않는 코드 제거
- 압축: Gzip 압축 (약 70% 크기 감소)
- 캐싱: 정적 파일 1년 캐싱

**런타임 최적화**
- RequestAnimationFrame: 60fps 제한
- 메모이제이션: useMemo, useCallback 활용
- 가상화: 대량 리스트 렌더링 최적화 (향후)

#### 2.5.2 백엔드 최적화

**데이터베이스 최적화**
- 인덱싱: 자주 조회되는 컬럼 인덱스
- 연결 풀링: 재사용 가능한 연결 관리
- 쿼리 최적화: N+1 문제 방지 (eager loading)

**API 최적화**
- 비동기 처리: FastAPI의 async/await
- 페이징: 대량 데이터 조회 시 limit/offset
- 캐싱: Redis 통합 (향후)

#### 2.5.3 확장성 전략

**수평 확장**
- 로드 밸런서: 여러 EC2 인스턴스
- 데이터베이스 읽기 복제본
- CDN: CloudFront를 통한 정적 파일 배포

**수직 확장**
- EC2 인스턴스 크기 증가
- RDS 인스턴스 클래스 업그레이드

---

### 2.6 모니터링 및 로깅

#### 2.6.1 로깅

**Nginx 로그**
- Access Log: `/var/log/nginx/violincoach_access.log`
- Error Log: `/var/log/nginx/violincoach_error.log`

**FastAPI 로그**
- Systemd Journal: `journalctl -u violincoach-api`
- 로그 레벨: INFO, ERROR, WARNING

#### 2.6.2 모니터링 (향후)

**권장 도구**
- CloudWatch: AWS 리소스 모니터링
- Sentry: 에러 추적
- New Relic / Datadog: APM (Application Performance Monitoring)

---

### 2.7 기술적 특징 및 혁신

#### 2.7.1 실시간 오디오 처리
- Web Audio API를 통한 브라우저 내 실시간 처리
- 서버 부하 없이 클라이언트 측 처리
- 지연 시간 최소화 (< 50ms)

#### 2.7.2 오프라인 지원
- IndexedDB를 통한 로컬 데이터 저장
- 네트워크 오류 시에도 기능 사용 가능
- 자동 동기화 (네트워크 복구 시)

#### 2.7.3 크로스 플랫폼
- 웹 브라우저 기반 (플랫폼 독립적)
- 데스크톱 및 모바일 지원
- 반응형 디자인

#### 2.7.4 확장 가능한 아키텍처
- 마이크로서비스 준비 (현재 모놀리식, 분리 가능)
- 클라우드 네이티브 설계
- 컨테이너화 가능 (Docker)

#### 2.7.5 마이크 권한 관리
- **앱 시작 시 자동 권한 요청**: 사용자 상호작용 전 권한 요청으로 UX 개선
- **명확한 에러 메시지**: 권한 거부 시 구체적인 안내 및 재시도 옵션 제공
- **스트림 관리**: 페이지 전환 시 자동 스트림 정리로 메모리 누수 방지

---

### 2.8 배포 체크리스트

#### 초기 배포
- [ ] EC2 인스턴스 생성 및 설정
- [ ] RDS PostgreSQL 인스턴스 생성
- [ ] S3 버킷 생성 및 권한 설정
- [ ] 보안 그룹 설정 (HTTP 80 포트 열기)
- [ ] 환경 변수 설정 (.env 파일)
- [ ] 데이터베이스 테이블 생성
- [ ] Python 가상 환경 설정 및 의존성 설치
- [ ] Systemd 서비스 설정 및 시작
- [ ] Nginx 설치 및 설정
- [ ] 프론트엔드 빌드 및 배포
- [ ] Health check 확인

#### 업데이트 배포
- [ ] 코드 변경
- [ ] 프론트엔드 빌드 (`npm run build`)
- [ ] 파일 업로드 (SCP 또는 배포 스크립트)
- [ ] Nginx 재시작 (필요시)
- [ ] 백엔드 재시작 (코드 변경 시)
- [ ] 기능 테스트

---

### 2.9 기술 스택 요약

**Frontend**
- React 18.2.0
- Vite 7.2.4
- Tailwind CSS 3.4.0
- Dexie.js 4.2.1 (IndexedDB)

**Backend**
- FastAPI 0.104.1
- Uvicorn 0.24.0
- SQLAlchemy 2.0.23
- PostgreSQL (AWS RDS)
- boto3 1.29.7 (AWS S3)

**Infrastructure**
- AWS EC2 (Ubuntu 22.04)
- AWS RDS PostgreSQL
- AWS S3
- Nginx (Reverse Proxy)
- Systemd (Service Management)

**DevOps**
- GitHub Actions (CI/CD)
- SSH/SCP (Deployment)
- Let's Encrypt (HTTPS, 선택사항)

---

이 문서는 Violin Coach AI 서비스를 처음부터 다시 구축할 수 있을 정도로 상세하게 작성되었습니다. 각 구성 요소의 역할, 구현 방법, 설정 방법이 포함되어 있습니다.

