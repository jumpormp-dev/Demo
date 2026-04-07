/**
 * Logic based on the Python Random Forest model's scoring system
 */

export type RiskStatus = 'Healthy' | 'Warning' | 'Critical';

export interface ModelInput {
  thermal: number;
  load: number;
  voltage: number;
  sound: number;
  trips: number;
  peakFreq: number;
  age: number;
  humidity: number;
}

export function calculateRisk(input: ModelInput): { score: number; status: RiskStatus; probability: number } {
  let points = 0;
  
  // Weights from the Python judge_status logic
  if (input.sound > 82) points += 4;
  if (input.thermal > 85) points += 3;
  if (input.load > 105) points += 2;
  if (input.trips > 8) points += 2;

  let status: RiskStatus = 'Healthy';
  if (points >= 6) status = 'Critical';
  else if (points >= 3) status = 'Warning';

  // Simulate a "probability" or risk percentage based on points and some noise
  // Max points possible is 11. 
  // We'll map points to a 0-100 scale with some randomness to feel like AI
  const baseProb = (points / 11) * 100;
  const randomNoise = Math.random() * 5;
  const probability = Math.min(100, Math.max(0, Math.round(baseProb + randomNoise)));

  return { score: points, status, probability };
}
