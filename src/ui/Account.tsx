import { useEffect, useState } from 'react'
import { captureLevel, LEVEL_LABEL, SENSORS, SENSOR_LABEL, type Level } from '../config'
import * as db from '../state/db'
import { captures } from '../state/series'
import { store } from '../state/store'

/** Settings dialog: the ESP32 address, saved devices, demo mode and the account. */
export function Settings({ connected, onClose }: { connected: boolean; onClose: () => void }) {
  const s = store
  const [name, setName] = useState('')
  const devices = s.user?.devices ?? []

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal wide settings" role="dialog" aria-modal="true" aria-labelledby="set-title" onClick={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <h2 id="set-title">Settings</h2>
          <button onClick={onClose} aria-label="Close settings">Close</button>
        </div>

        <section>
          <h3>Device address</h3>
          <label className="field">
            <span>ESP32 address</span>
            <input value={s.url} onChange={(e) => s.setUrl(e.target.value)} disabled={connected || s.demo} spellCheck={false} placeholder="ws://192.168.4.1:81" />
          </label>
          <p className="muted small">
            {s.demo ? 'Turn off demo mode to use a real device.' : connected ? 'Disconnect to change the address.' : 'Use the IP shown on the device screen, like ws://10.0.0.5:81.'}
          </p>
          {devices.length > 0 && (
            <ul className="devices">
              {devices.map((d) => (
                <li key={d.id} className={d.url === s.url.trim() ? 'current' : undefined}>
                  <span><b>{d.name}</b><small className="muted mono">{d.url}</small></span>
                  <button onClick={() => s.setUrl(d.url)} disabled={connected || s.demo}>Use</button>
                  <button onClick={() => void s.removeDevice(d.id)} aria-label={`Remove ${d.name}`}>Remove</button>
                </li>
              ))}
            </ul>
          )}
          {!s.demo && (
            <form className="add-device" onSubmit={(e) => { e.preventDefault(); void s.addDevice(name, s.url); setName('') }}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this address, e.g. Home sensor" aria-label="Device name" />
              <button disabled={!name.trim() || !s.url.trim()}>Save</button>
            </form>
          )}
        </section>

        <section>
          <h3>Demo mode</h3>
          <label className="switch">
            <input type="checkbox" role="switch" checked={s.demo} onChange={(e) => void s.setDemo(e.target.checked)} />
            <span>Use simulated data instead of a device</span>
          </label>
        </section>
      </div>
    </div>
  )
}

type Row = { t: number; session: string; device: string; n: number; ratio: Record<(typeof SENSORS)[number], number>; level: Level }

/** Every capture across this user's sessions, newest first. */
export function History({ sessions }: { sessions: db.SessionMeta[] }) {
  const [rows, setRows] = useState<Row[] | null>(null)
  useEffect(() => {
    let live = true
    void Promise.all(
      sessions.map(async (m) => {
        const { events } = await db.loadSession(m.id)
        return captures(events).map((c) => ({ t: c.t, session: m.name, device: m.source === 'simulated' ? 'Demo' : m.deviceName ?? 'Device', n: c.n, ratio: c.ratio, level: captureLevel(SENSORS.map((k) => c.ratio[k]), SENSORS.map((k) => c.v[k])) }))
      }),
    ).then((all) => live && setRows(all.flat().sort((a, b) => b.t - a.t)))
    return () => { live = false }
  }, [sessions])

  if (!rows) return <p className="empty">Loading history…</p>
  if (!rows.length) return <p className="empty">No captures yet. Record a session and take a capture, and it will show up here.</p>
  return (
    <table className="data">
      <thead>
        <tr><th>When</th><th>Device</th><th>Session</th><th className="num">#</th>
          {SENSORS.map((k) => <th key={k} className="num">{SENSOR_LABEL[k]}</th>)}<th>Result</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={`${r.t}-${r.session}`}>
            <td className="num">{new Date(r.t).toLocaleString()}</td>
            <td>{r.device}</td>
            <td>{r.session}</td>
            <td className="num">{r.n}</td>
            {SENSORS.map((k) => <td key={k} className="num">×{r.ratio[k].toFixed(2)}</td>)}
            <td className={`lvl lvl-${r.level}`}>{LEVEL_LABEL[r.level]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
