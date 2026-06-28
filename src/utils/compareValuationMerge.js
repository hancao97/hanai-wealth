import { alignValueDataToPrice } from './valuationAlign.js'

/** 对齐后两股共同交易日交集的最小可展示点数（规格 §4.2） */
export const MIN_COMPARE_OVERLAP_POINTS = 5

function toTime(value) {
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : NaN
}

function toDateKey(value) {
  const time = toTime(value)
  if (!Number.isFinite(time)) return ''
  return new Date(time).toDateString()
}

/**
 * 将单只股票的 medps/price 转为按交易日（toDateString）索引的 { ts, price, value }。
 * value 为对齐到该日收盘价的价值（与 ValuationChart 同源 align 逻辑）。
 */
function buildAlignedByPriceDate(medps, price) {
  const medpsData = medps || []
  const priceData = price || []
  if (!medpsData.length || !priceData.length) {
    return new Map()
  }
  const aligned = alignValueDataToPrice(medpsData, priceData)
  const valueByDate = new Map()
  for (const [ts, v] of aligned) {
    const value = Number(v)
    const time = toTime(ts)
    if (Number.isFinite(value) && Number.isFinite(time)) {
      valueByDate.set(toDateKey(ts), { ts: time, value })
    }
  }
  const map = new Map()
  for (const [ts, p] of priceData) {
    const price = Number(p)
    const time = toTime(ts)
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(time)) continue

    const key = toDateKey(ts)
    const va = valueByDate.get(key)
    if (va == null) continue
    map.set(key, { ts: time, price, value: va.value })
  }
  return map
}

function buildFutureValuePoints(medps, price, baselineTime, baselinePrice) {
  const medpsData = medps || []
  const priceData = price || []
  if (!medpsData.length || !priceData.length) return []

  return alignValueDataToPrice(medpsData, priceData)
    .map(([ts, value]) => ({ ts: toTime(ts), value: Number(value) }))
    .filter((point) => (
      Number.isFinite(point.ts) &&
      Number.isFinite(point.value) &&
      point.ts > baselineTime
    ))
    .map((point) => indexedPoint(point.ts, point.value, baselinePrice))
}

function toCurrentPriceIndex(value, baselinePrice) {
  if (!Number.isFinite(value) || !Number.isFinite(baselinePrice) || baselinePrice <= 0) {
    return null
  }
  return Number(((value / baselinePrice) * 100).toFixed(4))
}

function indexedPoint(ts, value, baselinePrice) {
  return [ts, toCurrentPriceIndex(value, baselinePrice), value]
}

/**
 * @param {object} rawA - GuruFocus valuation API 形态 { medps, price }
 * @param {object} rawB - 同上
 * @returns 合并结果供 ECharts 四线使用，或 INSUFFICIENT_OVERLAP
 */
export function mergeCompareValuationSeries(rawA, rawB) {
  const mapA = buildAlignedByPriceDate(rawA?.medps, rawA?.price)
  const mapB = buildAlignedByPriceDate(rawB?.medps, rawB?.price)
  const keys = [...mapA.keys()].filter((k) => mapB.has(k))
  keys.sort((a, b) => mapA.get(a).ts - mapA.get(b).ts)

  if (keys.length < MIN_COMPARE_OVERLAP_POINTS) {
    return { ok: false, code: 'INSUFFICIENT_OVERLAP', overlapCount: keys.length }
  }

  const times = []
  const primaryPrice = []
  const primaryValue = []
  const comparePrice = []
  const compareValue = []
  const primaryPriceRaw = []
  const primaryValueRaw = []
  const comparePriceRaw = []
  const compareValueRaw = []

  const baselineKey = keys[keys.length - 1]
  const primaryBaseline = mapA.get(baselineKey)
  const compareBaseline = mapB.get(baselineKey)

  for (const k of keys) {
    const a = mapA.get(k)
    const b = mapB.get(k)
    times.push(a.ts)
    primaryPrice.push(indexedPoint(a.ts, a.price, primaryBaseline.price))
    primaryValue.push(indexedPoint(a.ts, a.value, primaryBaseline.price))
    comparePrice.push(indexedPoint(b.ts, b.price, compareBaseline.price))
    compareValue.push(indexedPoint(b.ts, b.value, compareBaseline.price))
    primaryPriceRaw.push([a.ts, a.price])
    primaryValueRaw.push([a.ts, a.value])
    comparePriceRaw.push([b.ts, b.price])
    compareValueRaw.push([b.ts, b.value])
  }

  const primaryFutureValue = buildFutureValuePoints(
    rawA?.medps,
    rawA?.price,
    primaryBaseline.ts,
    primaryBaseline.price
  )
  const compareFutureValue = buildFutureValuePoints(
    rawB?.medps,
    rawB?.price,
    compareBaseline.ts,
    compareBaseline.price
  )

  primaryValue.push(...primaryFutureValue)
  compareValue.push(...compareFutureValue)

  const maxTime = Math.max(
    ...times,
    ...primaryFutureValue.map(([ts]) => ts),
    ...compareFutureValue.map(([ts]) => ts)
  )

  return {
    ok: true,
    scaleMode: 'current-price-index',
    baselineTime: primaryBaseline.ts,
    baselineDate: new Date(primaryBaseline.ts).toISOString().slice(0, 10),
    maxTime,
    futurePointCount: primaryFutureValue.length + compareFutureValue.length,
    baselines: {
      primaryPrice: primaryBaseline.price,
      comparePrice: compareBaseline.price,
    },
    times,
    primaryPrice,
    primaryValue,
    comparePrice,
    compareValue,
    primaryPriceRaw,
    primaryValueRaw,
    comparePriceRaw,
    compareValueRaw,
  }
}
