import { expect, it } from 'vitest'
import { captureLevel, describeRatio, estimatePpm } from '../config'
import { readingsCsv } from './csv'
import { baselineSegs, captureSpans, lastBaseline, seriesFrom, type Event, type Reading } from './series'

const T0 = 1_700_000_000_000
const r = (sec: number, state = 'ready'): Reading => ({ t: T0 + sec * 1000, mq3: 0.8, mq135: 1, mq7: 0.6, state })
const v = { mq3: 0.8, mq135: 1, mq7: 0.6 }

it('breaks the line across a dropout longer than 2 s, not across the usual 0.5 s spacing', () => {
  const s = seriesFrom(T0, [r(0), r(0.5), r(1), r(9), r(9.5)], [])
  expect(s.y.mq3).toEqual([0.8, 0.8, 0.8, null, 0.8, 0.8])
  expect(s.x[3]).toBeCloseTo(1.001)
})

it('pairs capture_start with capture into a labelled span', () => {
  const ev: Event[] = [
    { t: T0 + 10_000, kind: 'capture_start' },
    { t: T0 + 15_000, kind: 'capture', n: 1, v, ratio: v },
    { t: T0 + 30_000, kind: 'capture', n: 2, v, ratio: v }, // start missed
    { t: T0 + 40_000, kind: 'capture_start' }, // still open
  ]
  expect(captureSpans(seriesFrom(T0, [], ev))).toEqual([
    { start: 10, end: 15, n: 1 },
    { start: 0, end: 30, n: 2 },
    { start: 40, end: null, n: null },
  ])
})

it('a warm-up restart ends the baseline until the next one', () => {
  const ev: Event[] = [
    { t: T0 + 10_000, kind: 'baseline', v },
    { t: T0 + 20_000, kind: 'restart' },
  ]
  expect(lastBaseline(ev)).toBeUndefined()
  expect(baselineSegs(seriesFrom(T0, [], ev))).toEqual([{ start: 10, end: 20, v }])
  ev.push({ t: T0 + 40_000, kind: 'baseline', v })
  expect(lastBaseline(ev)?.t).toBe(T0 + 40_000)
  expect(baselineSegs(seriesFrom(T0, [], ev)).map((s) => [s.start, s.end])).toEqual([[10, 20], [40, null]])
})

it('CSV puts each event on the next reading and keeps the columns', () => {
  const meta = { id: 1, name: 'x', start: T0, end: T0 + 2000, source: 'simulated' as const }
  const ev: Event[] = [{ t: T0 + 600, kind: 'baseline', v }, { t: T0 + 5000, kind: 'capture', n: 1, v, ratio: v }]
  const lines = readingsCsv(meta, [r(0), r(0.5), r(1, 'capturing')], ev).replace('﻿', '').trim().split('\r\n')
  expect(lines[0]).toBe('iso_time,elapsed_s,mq3_v,mq135_v,mq7_v,state,event,source')
  expect(lines[1]).toBe(`${new Date(T0).toISOString()},0.000,0.800,1.000,0.600,ready,,simulated`)
  expect(lines[3].split(',').slice(5)).toEqual(['capturing', 'baseline', 'simulated'])
  expect(lines[4].split(',').slice(2)).toEqual(['', '', '', '', 'capture 1', 'simulated'])
})

it('descriptor bins, including the firmware 0 ratio when baseline is near 0 V', () => {
  expect([0.5, 0.9, 1.1, 1.2, 0].map(describeRatio)).toEqual([
    'Below baseline', 'Near baseline', 'Near baseline', 'Above baseline', 'No ratio (baseline near 0 V)',
  ])
})

it('capture level follows the largest ratio across sensors', () => {
  const big = [1, 1, 1] // volts large enough that every ratio change clears the noise floor
  expect([[1, 1, 1], [0.8, 1.1, 1], [1, 1.2, 1], [1, 1, 1.4], [1.7, 1.7, 1], [1.6, 1, 1]].map((r) => captureLevel(r, big))).toEqual([0, 0, 1, 2, 3, 2])
})

it('ppm estimate is the clean-air value at baseline, rises with voltage, and is null when impossible', () => {
  const base = estimatePpm('mq135', 1, 1)! // 102.2 * 3.6^-2.473
  expect(base).toBeCloseTo(4.4, 0)
  expect(estimatePpm('mq135', 1.5, 1.5)!).toBeGreaterThan(base)
  expect(estimatePpm('mq7', 5.2, 1)).toBeNull() // at or above the supply
  expect(estimatePpm('mq3', 1, 0)).toBeNull() // firmware sends ratio 0 when the baseline is near 0 V
})

it('ignores movement under the noise floor and needs two sensors for the top level', () => {
  expect(captureLevel([2, 1, 1], [0.05, 1, 1])).toBe(0) // 0.025 V change on a tiny baseline is noise
  expect(captureLevel([2, 1, 1], [1, 1, 1])).toBe(2) // one sensor alone tops out at noticeably
  expect(captureLevel([2, 1.8, 1], [1, 1, 1])).toBe(3)
})
