# 🎻 Violin Pitch

A fully functional violin tuning and coaching application with real-time pitch detection, recording, and analysis features.

**Website**: [violinpitch.com](https://violinpitch.com)

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

## Design

- **Wood texture background**: Natural, warm aesthetic
- **Clean white cards**: Easy-to-read content
- **Trajan-style typography**: Classic, elegant fonts (Cinzel)
- **Responsive**: Works on desktop and mobile devices

## Getting Started

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

- **React** - UI framework
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **pitchfinder** - Pitch detection library (YIN algorithm)
- **Cinzel** - Google Fonts (Trajan-style typography)

## How to Use

### 🎵 Tuner
1. Open the Tuner tab
2. Allow microphone access
3. Play a note on your violin
4. See real-time pitch detection and tuning feedback

### 🎼 Metronome
1. Set your target BPM
2. Click Start to hear the metronome
3. Play along - the background color indicates if you're on tempo

### 🎻 Record & Analysis
1. Click "Start Recording"
2. Play your violin piece
3. Watch the waveform and note detection in real-time
4. Click "Stop Recording" when finished
5. Click "Analyze" to see detailed results

### 📊 Analysis
1. Record your playing first
2. Navigate to Analysis tab
3. View detailed analysis with:
   - Individual note accuracy
   - Pattern analysis (consistent flatness/sharpness)
   - Octave-specific performance
   - Personalized feedback and recommendations

## Note Range

The application analyzes the violin range: **G3 (196 Hz) ~ E7 (2637 Hz)**

## Browser Support

- ✅ Chrome (Recommended)
- ✅ Safari
- ✅ Firefox
- ✅ Edge
- ✅ Mobile browsers (HTTPS required for microphone)

## License

MIT License
