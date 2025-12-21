// Simple pitch detection using autocorrelation method
export function detectPitch(buffer, sampleRate) {
  // Only process if we have enough data
  if (buffer.length < 2) return null;

  // 신호 강도 체크 및 증폭
  let maxAmplitude = 0
  for (let i = 0; i < buffer.length; i++) {
    maxAmplitude = Math.max(maxAmplitude, Math.abs(buffer[i]))
  }
  
  // 너무 작은 신호는 무시 (노이즈)
  if (maxAmplitude < 0.001) return null
  
  // 신호 정규화 (작은 신호도 감지 가능하도록 증폭)
  // 최대 2배까지 증폭하여 작은 볼륨의 음도 감지
  const amplificationFactor = Math.min(2.0, 0.5 / maxAmplitude)
  const amplifiedBuffer = buffer.map(sample => sample * amplificationFactor)

  // Find the period of the signal using autocorrelation
  const minPeriod = Math.floor(sampleRate / 3000); // Max frequency: 3000 Hz
  const maxPeriod = Math.floor(sampleRate / 150);  // Min frequency: 150 Hz
  
  let maxCorrelation = -1;
  let bestPeriod = 0;
  
  // Check a range of possible periods
  for (let period = minPeriod; period < maxPeriod && period < amplifiedBuffer.length / 2; period++) {
    let correlation = 0;
    
    // Calculate autocorrelation for this period
    for (let i = 0; i < amplifiedBuffer.length - period; i++) {
      correlation += amplifiedBuffer[i] * amplifiedBuffer[i + period];
    }
    
    // Normalize by period length
    correlation /= (amplifiedBuffer.length - period);
    
    if (correlation > maxCorrelation) {
      maxCorrelation = correlation;
      bestPeriod = period;
    }
  }
  
  // Convert period to frequency
  // threshold를 낮춰서 작은 볼륨도 감지 (0.1 -> 0.05)
  if (bestPeriod === 0 || maxCorrelation < 0.05) return null;
  
  const frequency = sampleRate / bestPeriod;
  
  // Only return if frequency is in valid range
  if (frequency > 150 && frequency < 3000) {
    return frequency;
  }
  
  return null;
}


