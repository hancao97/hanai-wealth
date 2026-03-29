import { describe, it, expect } from 'vitest'
import {
  mergeCompareValuationSeries,
  MIN_COMPARE_OVERLAP_POINTS,
} from './compareValuationMerge.js'

function utcDay(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day)).getTime()
}

/** 生成连续 n 天的 medps/price，价格与价值略不同以便断言 */
function seriesFromStart(startTs, n, priceBase, valueBase) {
  const medps = []
  const price = []
  for (let i = 0; i < n; i++) {
    const ts = startTs + i * 86400000
    medps.push([ts, valueBase + i * 0.5])
    price.push([ts, priceBase + i])
  }
  return { medps, price }
}

describe('mergeCompareValuationSeries', () => {
  it('returns ok when overlap >= MIN_COMPARE_OVERLAP_POINTS', () => {
    const t0 = utcDay(2020, 0, 1)
    const rawA = seriesFromStart(t0, 10, 100, 90)
    const rawB = seriesFromStart(t0, 10, 200, 180)
    const out = mergeCompareValuationSeries(rawA, rawB)
    expect(out.ok).toBe(true)
    expect(out.times.length).toBe(10)
    expect(out.primaryPrice.length).toBe(10)
    expect(out.primaryValue.length).toBe(10)
    expect(out.comparePrice.length).toBe(10)
    expect(out.compareValue.length).toBe(10)
    expect(out.primaryPrice[0][1]).toBe(100)
    expect(out.comparePrice[0][1]).toBe(200)
  })

  it('returns INSUFFICIENT_OVERLAP when overlap < threshold', () => {
    const t0 = utcDay(2020, 0, 1)
    const rawA = seriesFromStart(t0, 5, 100, 90)
    const rawB = seriesFromStart(t0 + 3 * 86400000, 5, 200, 180)
    const out = mergeCompareValuationSeries(rawA, rawB)
    expect(out.ok).toBe(false)
    expect(out.code).toBe('INSUFFICIENT_OVERLAP')
    expect(out.overlapCount).toBeLessThan(MIN_COMPARE_OVERLAP_POINTS)
  })

  it('returns ok with exactly MIN_COMPARE_OVERLAP_POINTS overlapping days', () => {
    const t0 = utcDay(2021, 5, 1)
    const rawA = seriesFromStart(t0, 7, 10, 9)
    const rawB = seriesFromStart(t0, 7, 20, 18)
    const out = mergeCompareValuationSeries(rawA, rawB)
    expect(out.ok).toBe(true)
    expect(out.times.length).toBe(7)
  })
})
