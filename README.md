# 🎻 Violin Practice Assistant, Violin Pitch

By Jian Lee
Oct – Nov 2025, Irvine, CA
more detail: https://www.linkedin.com/posts/jianleee_i-studied-the-violin-for-seven-years-through-activity-7409539165589168131-Gpvg?utm_source=share&utm_medium=member_desktop&rcm=ACoAAEuJUtMBpdDPXXm7UTo9Z0abB5vcvXUFdxA

## 📎 Links

- 🌐 **Live Demo**: [https://violinpitch.com](https://violinpitch.com)
- 📧 **Contact**: jianlee.mail@gmail.com
- 💼 **LinkedIn**: https://www.linkedin.com/in/jianleee/


## Features

### 📱 Four Main Pages

1. **🎵 Tuner** - Real-time pitch detection tuner with visual feedback
   - Detects pitches in the range G3 (196 Hz) ~ E7 (2637 Hz)
   - Shows current note, frequency, and cents deviation
   - Provides instant feedback on tuning accuracy

2. **🎼 Metronome** - Visual and audio metronome
   - Set target BPM
   - Real-time BPM detection from your playing
   - Visual feedback with background color changes

3. **🎻 Record & Analysis** - Audio recording and analysis
   - Record your violin playing in real-time
   - Live waveform visualization
   - Tracks current notes with pitch detection
   - Saves recorded notes for later analysis

4. **📊 Analysis & Report** - Performance analysis with pattern detection
   - Detailed analysis of recorded notes
   - Identifies consistent tuning errors (flat/sharp tendencies)
   - Octave-specific accuracy breakdown
   - Pattern analysis based on previous notes
   - Provides personalized feedback and suggestions
   - Comprehensive practice reports


### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn
- A microphone for audio input
- **HTTPS required for microphone access** (localhost works for development)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`)

4. **Important**: Allow microphone access when prompted

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

### Deploy

```bash
./deploy.sh
```

See [DEPLOY.md](DEPLOY.md) for detailed deployment instructions.

## Tech Stack

| 영역 | 기술 |
|------|------|
| **Frontend** | React, Vite, Tailwind CSS |
| **Backend** | FastAPI, SQLAlchemy, Pydantic |
| **Database** | PostgreSQL (Supabase) |
| **Auth** | Supabase Auth, JWT |
| **Storage** | AWS S3 |
| **Infra** | AWS EC2, Nginx, Let's Encrypt (HTTPS) |
| **AI 협업** | Cursor AI (Claude) |


## 🚀 주요 개발 과정

### 1️⃣ 실시간 음정 감지 구현
- Web Audio API + FFT 분석
- 주파수 → 음계 변환 알고리즘

### 2️⃣ 사용자 인증 시스템
- Supabase Auth (이메일/Google OAuth)
- JWT 토큰 기반 API 인증

### 3️⃣ AWS 인프라 구축
- EC2 + Nginx 리버스 프록시
- Let's Encrypt SSL (HTTPS 필수 - 마이크 권한)
- RDS → Supabase 마이그레이션 (비용 최적화) (**AWS RDS → Supabase 마이그레이션으로 월 비용 절감**)


## License

MIT License
