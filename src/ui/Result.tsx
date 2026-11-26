import { LEVEL_LABEL, SENSORS, SENSOR_LABEL, type Level } from '../config'

const HEADLINE = ['Looking good', 'A small change', 'Worth a closer look', 'Well above usual'] as const

// Calm, practical steps. Levels 2 and 3 are the concerning ones.
const NEXT_STEPS: Record<Level, string[]> = {
  0: [],
  1: ['Take a few slow breaths of fresh air, then capture again to compare.'],
  2: [
    'Move to fresh air for a few minutes and let the sensors settle.',
    'Check for nearby sprays, cleaning products, perfume, smoke or food.',
    'Capture again and compare it with this one.',
    'If it stays high across several captures, mention it to a doctor or pharmacist.',
  ],
  3: [
    'Move to fresh air right away and ventilate the room.',
    'Check for fumes, sprays, smoke or alcohol close to the device.',
    'Wait a few minutes, then capture again. One reading is not a trend.',
    'If you feel unwell, short of breath or worried, contact a medical professional.',
    'This is a sensor voltage reading, not a diagnosis.',
  ],
}

const SCALE_MIN = 0.8
const SCALE_MAX = 2
const pct = (r: number) => `${Math.min(1, Math.max(0, (r - SCALE_MIN) / (SCALE_MAX - SCALE_MIN))) * 100}%`

function Face({ level }: { level: Level }) {
  return (
    <svg className="result-face" viewBox="0 0 120 120" aria-hidden="true">
      <circle className="result-ring" cx="60" cy="60" r="54" />
      <circle cx="44" cy="50" r="5" className="result-eye" />
      {level === 1 ? <path d="M68 50h14" className="result-line" /> : <circle cx="76" cy="50" r="5" className="result-eye" />}
      {level <= 1 ? <path d="M40 74q20 18 40 0" className="result-line" /> : <path d="M42 80h36" className="result-line" />}
    </svg>
  )
}

export function Result({ n, level, text, ratios, onClose }: { n: number; level: Level; text: string; ratios: number[]; onClose: () => void }) {
  const steps = NEXT_STEPS[level]
  return (
    <div className="modal-back" onClick={onClose}>
      <div className={`modal result level-${level}`} role="dialog" aria-modal="true" aria-labelledby="res-title" onClick={(e) => e.stopPropagation()}>
        <Face level={level} />
        <p className="result-kicker">Capture {n} · {LEVEL_LABEL[level]}</p>
        <h2 id="res-title">{HEADLINE[level]}</h2>
        <p className="result-text">{text}</p>

        <div className="result-bars" aria-label="Change from baseline per sensor">
          {SENSORS.map((k, i) => (
            <div key={k} className="result-bar">
              <span>{SENSOR_LABEL[k]}</span>
              <div className="result-track">
                <i className="result-base" style={{ left: pct(1) }} />
                <i className={`result-fill s${i + 1}`} style={{ width: pct(ratios[i]) }} />
              </div>
              <b className="mono">×{ratios[i].toFixed(2)}</b>
            </div>
          ))}
          <small className="muted">Bars show each sensor against your baseline. The line marks ×1.00.</small>
        </div>

        {steps.length > 0 && (
          <div className="result-steps">
            <h3>{level === 1 ? 'Tip' : 'Next steps'}</h3>
            <ol>{steps.map((t) => <li key={t}>{t}</li>)}</ol>
          </div>
        )}

        <button className="primary" autoFocus onClick={onClose}>Done</button>
      </div>
    </div>
  )
}
