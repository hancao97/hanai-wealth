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
    expect(out.scaleMode).toBe('current-price-index')
    expect(out.baselines.primaryPrice).toBe(109)
    expect(out.baselines.comparePrice).toBe(209)
    expect(out.primaryPrice.at(-1)[1]).toBe(100)
    expect(out.comparePrice.at(-1)[1]).toBe(100)
    expect(out.primaryPriceRaw[0][1]).toBe(100)
    expect(out.comparePriceRaw[0][1]).toBe(200)
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
    expect(out.primaryPrice.at(-1)[1]).toBe(100)
    expect(out.comparePrice.at(-1)[1]).toBe(100)
  })

  it('normalizes value lines by each stock latest common price while preserving raw values', () => {
    const t0 = utcDay(2022, 0, 1)
    const rawA = seriesFromStart(t0, 5, 100, 150)
    const rawB = seriesFromStart(t0, 5, 20, 40)
    const out = mergeCompareValuationSeries(rawA, rawB)

    expect(out.ok).toBe(true)
    expect(out.baselines.primaryPrice).toBe(104)
    expect(out.baselines.comparePrice).toBe(24)
    expect(out.primaryPrice.at(-1)).toEqual([utcDay(2022, 0, 5), 100, 104])
    expect(out.comparePrice.at(-1)).toEqual([utcDay(2022, 0, 5), 100, 24])
    expect(out.primaryValueRaw.at(-1)[1]).toBe(152)
    expect(out.compareValueRaw.at(-1)[1]).toBe(42)
    expect(out.primaryValue.at(-1)[1]).toBeCloseTo(146.1538, 4)
    expect(out.compareValue.at(-1)[1]).toBe(175)
  })

  it('keeps future valuation points after the latest common price date', () => {
    const t0 = utcDay(2026, 5, 24)
    const future1 = utcDay(2026, 11, 31)
    const future2 = utcDay(2027, 11, 31)
    const rawA = {
      price: [
        [t0, 100],
        [t0 + 86400000, 105],
        [t0 + 2 * 86400000, 110],
        [t0 + 3 * 86400000, 115],
        [t0 + 4 * 86400000, 120],
      ],
      medps: [
        [t0, 130],
        [future1, 150],
        [future2, 170],
      ],
    }
    const rawB = {
      price: [
        [t0, 20],
        [t0 + 86400000, 22],
        [t0 + 2 * 86400000, 24],
        [t0 + 3 * 86400000, 26],
        [t0 + 4 * 86400000, 28],
      ],
      medps: [
        [t0, 30],
        [future1, 36],
        [future2, 42],
      ],
    }
    const out = mergeCompareValuationSeries(rawA, rawB)

    expect(out.ok).toBe(true)
    expect(out.baselineTime).toBe(t0 + 4 * 86400000)
    expect(out.maxTime).toBe(future2)
    expect(out.futurePointCount).toBe(4)
    expect(out.primaryPrice.at(-1)[0]).toBe(t0 + 4 * 86400000)
    expect(out.comparePrice.at(-1)[0]).toBe(t0 + 4 * 86400000)
    expect(out.primaryValue.at(-1)).toEqual([future2, Number(((170 / 120) * 100).toFixed(4)), 170])
    expect(out.compareValue.at(-1)).toEqual([future2, 150, 42])
  })
})
