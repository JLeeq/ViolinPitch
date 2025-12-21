// Simple pitch detection using autocorrelation method
export function detectPitch(buffer, sampleRate) {
  // Only process if we have enough data
  if (buffer.length < 2) return null;

  // Find the period of the signal using autocorrelation
  const minPeriod = Math.floor(sampleRate / 3000); // Max frequency: 3000 Hz
  const maxPeriod = Math.floor(sampleRate / 150);  // Min frequency: 150 Hz
  
  let maxCorrelation = -1;
  let bestPeriod = 0;
  
  // Check a range of possible periods
  for (let period = minPeriod; period < maxPeriod && period < buffer.length / 2; period++) {
    let correlation = 0;
    
    // Calculate autocorrelation for this period
    for (let i = 0; i < buffer.length - period; i++) {
      correlation += buffer[i] * buffer[i + period];
    }
    
    // Normalize by period length
    correlation /= (buffer.length - period);
    
    if (correlation > maxCorrelation) {
      maxCorrelation = correlation;
      bestPeriod = period;
    }
  }
  
  // Convert period to frequency
  if (bestPeriod === 0 || maxCorrelation < 0.1) return null;
  
  const frequency = sampleRate / bestPeriod;
  
  // Only return if frequency is in valid range
  if (frequency > 150 && frequency < 3000) {
    return frequency;
  }
  
  return null;
}


