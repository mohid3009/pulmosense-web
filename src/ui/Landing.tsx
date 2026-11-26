import { useEffect, useRef, useState, type ReactNode } from 'react'

const CTA = 'Open the dashboard'
const openDashboard = () => { location.hash = '#app' }

const BENEFITS = [
  ['Your own baseline', 'Every capture is compared with clean room air measured minutes earlier, not with a generic chart.'],
  ['Plain language results', 'Four calm levels from normal to well above baseline, with next steps when it matters.'],
  ['Three sensors, one picture', 'Alcohol, VOC and carbon monoxide sensitive sensors, shown as ratios and estimated ppm side by side.'],
  ['Yours to keep', 'Sessions are stored in your browser and exported as CSV whenever you want them.'],
  ['Try before you build', 'Demo mode runs a simulated device, so you can see the whole flow without any hardware.'],
] as const

const STEPS = [
  ['Switch on and let it warm up', 'The sensors heat for a short time, then the device measures clean room air as your baseline.'],
  ['Breathe toward the sensors for 30 seconds', 'Press the button on the device, or Start capture in the dashboard, and breathe gently.'],
  ['Read your result', 'A friendly face on the device, and the full breakdown with next steps on your screen.'],
] as const

const SENSORS = [
  ['MQ-3', 'Alcohol sensitive', 'Picks up alcohol vapour and similar compounds.'],
  ['MQ-135', 'VOC and NH₃ sensitive', 'Responds to air quality changes such as fumes and sprays.'],
  ['MQ-7', 'CO sensitive', 'Responds to carbon monoxide and some other gases.'],
] as const

const FAQ = [
  ['Is PulmoSense a medical device?', 'No. It is a prototype that reads sensor voltages. Results describe change against your baseline and are never a diagnosis. If you feel unwell, contact a medical professional.'],
  ['What does it measure?', 'Three gas sensors react to alcohol, volatile organic compounds and carbon monoxide. Each capture is a 30 second average compared with the baseline taken in clean air.'],
  ['Do I need the hardware to try it?', 'No. Open the dashboard and choose demo mode to run a simulated device through warm up, baseline and capture.'],
  ['How does it connect?', 'The device serves live data over WiFi on port 81. Join its PulmoSense network or put it on your own WiFi, then enter its address in Settings.'],
  ['Where is my data stored?', 'In your browser on the computer you use. Nothing is sent to a server, and other browsers or laptops will not see it.'],
  ['Why are the ppm numbers called estimates?', 'These sensors react to several gases and drift with temperature and humidity. The ppm figure comes from datasheet curves anchored to your baseline, so it shows change, not a calibrated measurement.'],
  ['What should I do if a result is high?', 'Move to fresh air, check for sprays, smoke or alcohol near the device, wait a few minutes and capture again. One reading is not a trend.'],
  ['Can I export my readings?', 'Yes. Each saved session exports readings and captures as CSV files.'],
] as const

/** Fades and rises into view once. */
function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current!
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setShown(true); io.disconnect() }
    }, { rootMargin: '0px 0px -10% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} className={`lp-reveal ${shown ? 'is-shown' : ''} ${className}`}>{children}</div>
}

/** Each word goes from muted to full colour as it crosses the trigger line. */
function TaglineReveal({ text }: { text: string }) {
  const box = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    const words = Array.from(box.current!.querySelectorAll<HTMLElement>('.lp-word'))
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) e.target.classList.toggle('on', e.isIntersecting || e.boundingClientRect.top < 0)
    }, { rootMargin: '0px 0px -40% 0px' })
    words.forEach((w) => io.observe(w))
    return () => io.disconnect()
  }, [])
  return (
    <p ref={box} className="heading-2 lp-tagline">
      {text.split(' ').map((w, i) => <span key={i} className="lp-word">{w} </span>)}
    </p>
  )
}

function SampleResult() {
  const rows = [['MQ-3', 1.04], ['MQ-135', 0.98], ['MQ-7', 1.07]] as const
  return (
    <div className="lp-sample" role="img" aria-label="Example result card showing a normal capture">
      <svg viewBox="0 0 120 120" className="lp-face" aria-hidden="true">
        <circle cx="60" cy="60" r="54" className="lp-face-ring" />
        <circle cx="44" cy="50" r="5" className="lp-face-fill" />
        <circle cx="76" cy="50" r="5" className="lp-face-fill" />
        <path d="M40 74q20 18 40 0" className="lp-face-line" />
      </svg>
      <p className="caption-3 lp-kicker">Capture 3 · Normal</p>
      <p className="heading-5">Looking good</p>
      <div className="lp-bars">
        {rows.map(([name, r]) => (
          <div key={name} className="lp-bar">
            <span className="body-5">{name}</span>
            <div className="lp-track"><i className="lp-base" /><i className="lp-fill" style={{ width: `${((r - 0.8) / 1.2) * 100}%` }} /></div>
            <b className="body-5">×{r.toFixed(2)}</b>
          </div>
        ))}
      </div>
      <p className="caption-5 lp-muted">Example result. Your readings will differ.</p>
    </div>
  )
}

export function Landing() {
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    document.title = 'PulmoSense: breath checks against your own baseline'
    const meta = document.querySelector('meta[name="description"]')
    meta?.setAttribute('content', 'PulmoSense is an ESP32 device with three gas sensors. Take a 30 second breath capture and see how it compares with your own clean air baseline.')
  }, [])

  const nav = [['How it works', '#how'], ['What it measures', '#sensors'], ['FAQ', '#faq']] as const

  return (
    <div className="landing">
      <video className="bg-video" autoPlay muted loop playsInline aria-hidden="true">
        <source src="/309619_medium.mp4" type="video/mp4" />
      </video>
      <div className="bg-shade" />
      <a className="lp-skip" href="#lp-main">Skip to content</a>

      <header className={`lp-nav ${menu ? 'open' : ''}`}>
        <a className="title-3 lp-brand" href="#">PulmoSense</a>
        <nav className="lp-links" aria-label="Page sections">
          {nav.map(([l, h], i) => <a key={h} className="body-5" href={h} style={{ transitionDelay: `${Math.min(i * 60, 400)}ms` }} onClick={() => setMenu(false)}>{l}</a>)}
        </nav>
        <button className="lp-btn button-sm" onClick={openDashboard}>{CTA}</button>
        <button className="lp-toggle" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}>
          <i /><i />
        </button>
      </header>

      <main id="lp-main">
        <section className="lp-hero">
          <h1 className="heading-1 lp-grad">See how your breath changes against your own baseline</h1>
          <p className="body-3 lp-lead">PulmoSense is a small ESP32 device with three gas sensors. It takes a 30 second breath capture, compares it with clean room air, and tells you in plain words whether anything looks different.</p>
          <button className="lp-btn button-md" onClick={openDashboard}>{CTA}</button>
          <p className="caption-2 lp-muted">Three gas sensors. A 30 second capture. Runs on your own WiFi, no account needed.</p>
          <SampleResult />
        </section>

        <section className="lp-section">
          <Reveal>
            <h2 className="heading-3">A single reading means little without context</h2>
            <p className="body-3 lp-lead">Rooms, weather and sensor warm up all move the numbers. PulmoSense takes a baseline in clean air first, then judges every capture against it, so you see change instead of noise.</p>
          </Reveal>
        </section>

        <section className="lp-tagline-section" aria-label="Tagline">
          <TaglineReveal text="Your breath, measured against your own clean air. Small changes, shown plainly, every time you check." />
        </section>

        <section className="lp-section" id="benefits">
          <Reveal><h2 className="heading-3">What you get</h2></Reveal>
          <div className="lp-grid">
            {BENEFITS.map(([t, d]) => (
              <Reveal key={t} className="lp-card"><h3 className="title-2">{t}</h3><p className="body-6 lp-muted">{d}</p></Reveal>
            ))}
          </div>
        </section>

        <section className="lp-section" id="how">
          <Reveal><h2 className="heading-3">How it works</h2></Reveal>
          <ol className="lp-grid lp-steps">
            {STEPS.map(([t, d], i) => (
              <li key={t}><Reveal className="lp-card"><span className="caption-3 lp-kicker">Step {i + 1}</span><h3 className="title-2">{t}</h3><p className="body-6 lp-muted">{d}</p></Reveal></li>
            ))}
          </ol>
        </section>

        <section className="lp-section" id="sensors">
          <Reveal>
            <h2 className="heading-3">Honest about what it measures</h2>
            <p className="body-3 lp-lead">Each sensor responds most to one group of gases but reacts to others too. That is why PulmoSense reports change against your baseline first, and ppm only as an estimate.</p>
          </Reveal>
          <div className="lp-grid">
            {SENSORS.map(([n, h, d]) => (
              <Reveal key={n} className="lp-card"><span className="caption-3 lp-kicker">{h}</span><h3 className="title-2">{n}</h3><p className="body-6 lp-muted">{d}</p></Reveal>
            ))}
          </div>
          <Reveal><p className="body-5 lp-note">Not a medical device. Values are sensor readings, not a diagnosis.</p></Reveal>
        </section>

        <section className="lp-section lp-faq" id="faq">
          <Reveal><h2 className="heading-3">Questions, answered</h2></Reveal>
          <Reveal>
            {FAQ.map(([q, a]) => (
              <details key={q}><summary className="title-3">{q}</summary><p className="body-6 lp-muted">{a}</p></details>
            ))}
          </Reveal>
        </section>

        <section className="lp-section lp-final">
          <Reveal>
            <h2 className="heading-3">See your first capture in a few minutes</h2>
            <p className="body-3 lp-lead">No account, no payment, nothing to install. Start in demo mode, and connect a device when you are ready.</p>
            <button className="lp-btn button-md" onClick={openDashboard}>{CTA}</button>
          </Reveal>
        </section>
      </main>

      <footer className="lp-footer">
        <p className="caption-2 lp-muted">PulmoSense is a prototype and not a medical device. Your data stays in your browser.</p>
      </footer>
    </div>
  )
}
