# Violin Coach AI Backend

FastAPI 기반 백엔드 서버

## 설치 및 설정

### 1. 의존성 설치

```bash
cd backend
pip install -r requirements.txt
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
nano .env
```

`.env` 파일에 다음 내용을 입력:
```
DATABASE_URL=postgresql://postgres:비밀번호@violincoach-db.chmgmu4uiv4k.us-west-1.rds.amazonaws.com:5432/violincoach

# S3 설정 (옵션)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-west-1
S3_BUCKET_NAME=violincoach-audio-files
```

### 3. 데이터베이스 테이블 생성

RDS PostgreSQL에 연결하여 테이블 생성:

```bash
psql -h violincoach-db.chmgmu4uiv4k.us-west-1.rds.amazonaws.com -U postgres -d violincoach -f create_tables.sql
```

또는 psql에서 직접:

```bash
psql -h violincoach-db.chmgmu4uiv4k.us-west-1.rds.amazonaws.com -U postgres -d violincoach
\i create_tables.sql
```

### 4. 서버 실행

**개발 모드:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**프로덕션 모드 (직접 실행):**
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**프로덕션 모드 (Nginx + Systemd):**
- Nginx 설정: [nginx/README.md](nginx/README.md)
- Systemd 서비스 설정: [systemd/README.md](systemd/README.md)

## API 엔드포인트

### Health Check
- `GET /health` - 서버 상태 확인

### 분석 세션
- `POST /api/analysis/sessions` - 분석 세션 생성
- `GET /api/analysis/sessions` - 세션 목록 조회
- `GET /api/analysis/sessions/{session_id}` - 특정 세션 조회
- `POST /api/analysis/sessions/{session_id}/upload-audio` - 오디오 파일 업로드

## API 문서

서버 실행 후 다음 URL에서 API 문서 확인:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 프로젝트 구조

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 앱 진입점
│   ├── database.py          # DB 연결 설정
│   ├── models.py            # SQLAlchemy 모델
│   ├── schemas.py           # Pydantic 스키마
│   ├── s3_service.py        # S3 업로드 서비스
│   └── routers/
│       ├── __init__.py
│       └── analysis.py      # 분석 API 라우터
├── nginx/
│   ├── violincoach.conf     # Nginx 설정 파일
│   └── README.md            # Nginx 설정 가이드
├── systemd/
│   ├── violincoach-api.service  # Systemd 서비스 파일
│   └── README.md            # Systemd 설정 가이드
├── requirements.txt
├── env.example
├── create_tables.sql
└── README.md
```

## 프로덕션 배포

프로덕션 환경에서는 Nginx reverse proxy와 systemd 서비스를 사용하는 것을 권장합니다.

1. **Nginx 설정**: [nginx/README.md](nginx/README.md) 참조
2. **Systemd 서비스**: [systemd/README.md](systemd/README.md) 참조

