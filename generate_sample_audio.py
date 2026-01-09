#!/usr/bin/env python3
"""
Generate a G Major Scale audio file for sample analysis.
Creates: public/sample-audio/g-major-scale-beginner.wav
"""

import numpy as np
import wave
import os

# G Major Scale 주파수 (Hz) - G3부터 G4까지 한 옥타브
notes = {
    'G3': 196.00,
    'A3': 220.00,
    'B3': 246.94,
    'C4': 261.63,
    'D4': 293.66,
    'E4': 329.63,
    'F#4': 369.99,
    'G4': 392.00
}

sample_rate = 44100
duration_per_note = 1.5  # 각 음표 1.5초
amplitude = 0.3

def generate_sine_wave(frequency, duration, sample_rate):
    """Generate a sine wave with attack/decay envelope for more natural sound."""
    t = np.linspace(0, duration, int(sample_rate * duration))
    # 기본 사인파
    wave = np.sin(2 * np.pi * frequency * t)
    
    # Attack/Decay 엔벨로프 (부드러운 시작/끝)
    envelope = np.ones_like(wave)
    attack_samples = int(sample_rate * 0.1)  # 0.1초 attack
    decay_samples = int(sample_rate * 0.3)   # 0.3초 decay
    
    if attack_samples > 0:
        envelope[:attack_samples] = np.linspace(0, 1, attack_samples)
    if decay_samples > 0:
        envelope[-decay_samples:] = np.linspace(1, 0, decay_samples)
    
    return wave * envelope * amplitude

# 모든 음표 생성
audio_data = []
print("Generating G Major Scale audio...")
for i, (note_name, freq) in enumerate(notes.items(), 1):
    print(f"  {i}/{len(notes)}: {note_name} ({freq:.2f} Hz)")
    note_wave = generate_sine_wave(freq, duration_per_note, sample_rate)
    audio_data.extend(note_wave)

# NumPy 배열로 변환
audio_array = np.array(audio_data, dtype=np.float32)
audio_int16 = (audio_array * 32767).astype(np.int16)

# 출력 디렉토리 확인
output_dir = 'public/sample-audio'
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, 'g-major-scale-beginner.wav')

# WAV 파일로 저장
with wave.open(output_path, 'w') as wav_file:
    wav_file.setnchannels(1)  # Mono
    wav_file.setsampwidth(2)  # 16-bit
    wav_file.setframerate(sample_rate)
    wav_file.writeframes(audio_int16.tobytes())

file_size = os.path.getsize(output_path) / 1024  # KB
print(f"\n✓ Generated: {output_path}")
print(f"  Duration: {len(audio_data) / sample_rate:.1f} seconds")
print(f"  File size: {file_size:.1f} KB")
print(f"  Sample rate: {sample_rate} Hz")
print(f"  Format: 16-bit mono WAV")

