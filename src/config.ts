export const SENSORS = ['mq3', 'mq135', 'mq7'] as const
export type Sensor = (typeof SENSORS)[number]
export const SENSOR_LABEL: Record<Sensor, string> = { mq3: 'MQ-3', mq135: 'MQ-135', mq7: 'MQ-7' }
// What each sensor responds to most, per its datasheet. Cross-sensitive; not a measurement of that gas.
export const SENSOR_HINT: Record<Sensor, string> = { mq3: 'alcohol-sensitive', mq135: 'VOC / NH₃-sensitive', mq7: 'CO-sensitive' }

// Rough ppm estimate. MQ sensors are resistance sensors: Rs = RL (VCC - V) / V, and the datasheet curve is
// ppm = a (Rs/R0)^b. R0 is taken from the baseline, assuming the baseline was clean air, so Rs/R0 = (Rs/Rs_baseline) x clean.
// RL cancels out. Constants are the common MQ datasheet fits (MQSensorsLib); real accuracy needs calibration against a
// known gas, so treat the result as an estimate of change, not a measurement.
export const VCC = 5 // sensor module supply
const CURVE: Record<Sensor, { gas: string; a: number; b: number; clean: number }> = {
  mq3: { gas: 'alcohol', a: 0.3934 * 522, b: -1.504, clean: 60 }, // curve is mg/L; x522 gives ppm of ethanol vapour
  mq135: { gas: 'NH₃', a: 102.2, b: -2.473, clean: 3.6 },
  mq7: { gas: 'CO', a: 99.042, b: -1.518, clean: 27.5 },
}
export const PPM_GAS: Record<Sensor, string> = { mq3: CURVE.mq3.gas, mq135: CURVE.mq135.gas, mq7: CURVE.mq7.gas }

/** ppm estimate from a reading and its ratio vs baseline (baseline volts = volts / ratio). null when it cannot be computed. */
export function estimatePpm(k: Sensor, volts: number, ratio: number): number | null {
  const base = volts / ratio
  if (!(volts > 0 && volts < VCC && ratio > 0 && base < VCC)) return null
  const rsOverBase = (VCC - volts) / volts / ((VCC - base) / base)
  const { a, b, clean } = CURVE[k]
  return a * (rsOverBase * clean) ** b
}

export const fmtPpm = (p: number | null) => (p == null ? '–' : p < 10 ? p.toFixed(2) : p < 100 ? p.toFixed(1) : p.toFixed(0))

// Display bins for the change in sensor voltage vs baseline. Not clinical thresholds.
export const RATIO_LOW = 0.9
export const RATIO_HIGH = 1.1

export function describeRatio(r: number): string {
  if (!(r > 0)) return 'No ratio (baseline near 0 V)' // firmware sends 0 when baseline <= 0.01 V
  if (r < RATIO_LOW) return 'Below baseline'
  if (r > RATIO_HIGH) return 'Above baseline'
  return 'Near baseline'
}

// Capture result levels, from the largest ratio across the sensors. Display bins, not clinical thresholds.
// Keep RATIO_MID / RATIO_TOP in step with the firmware (RATIO_MID, RATIO_TOP).
export const RATIO_MID = 1.3
export const RATIO_TOP = 1.6
export type Level = 0 | 1 | 2 | 3
export const LEVEL_LABEL = ['Normal', 'Mildly above baseline', 'Noticeably above baseline', 'Well above baseline'] as const

export const NOISE_V = 0.03 // a sensor must move at least this far from baseline to count. Keep in step with firmware NOISE_V

/**
 * Level from ratio vs baseline, judged per sensor against the baseline itself:
 * - a sensor whose voltage moved less than NOISE_V is treated as unchanged (a tiny baseline inflates ratios);
 * - the top level needs two sensors above RATIO_HIGH, so one drifting sensor alone tops out at "noticeably".
 * `volts` are the capture averages, in the same order as `ratios`.
 */
export function captureLevel(ratios: number[], volts: number[]): Level {
  const r = ratios.map((x, i) => (x > 0 && Math.abs(volts[i] - volts[i] / x) >= NOISE_V ? x : 1))
  const top = Math.max(...r)
  const level = top > RATIO_TOP ? 3 : top > RATIO_MID ? 2 : top > RATIO_HIGH ? 1 : 0
  return level === 3 && r.filter((x) => x > RATIO_HIGH).length < 2 ? 2 : level
}

/** Calm wording at every level: it says what changed and what to do, never a diagnosis. */
const SUMMARY = [
  'VOC levels are normal, close to your baseline.',
  'VOC levels are mildly above your baseline. This is common.',
  'VOC levels are noticeably above your baseline. Try some fresh air, then capture again to compare.',
  'VOC levels are well above your baseline. Check for nearby fumes or sprays, get some fresh air and retake. This is a sensor reading, not a diagnosis.',
] as const

export const summarizeCapture = (ratios: number[], volts: number[]) => SUMMARY[captureLevel(ratios, volts)]

export const CAPTURE_S = 30 // capture window; keep in step with CAPTURE_MS in the firmware
export const MAX_VOLTS = 5.5
export const GAP_MS = 2000 // break the chart line across dropouts longer than this
export const STALE_MS = 3000 // "No data for 3 s"
export const DEAD_MS = 5000 // no frames this long: drop the socket and reconnect
export const RETRY_MS = [1000, 2000, 5000] // then every 5 s
export const FLUSH_MS = 2000 // recording batch interval
export const DEFAULT_URL = 'ws://192.168.4.1:81'
