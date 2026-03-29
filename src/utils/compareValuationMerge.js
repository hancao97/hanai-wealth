import { alignValueDataToPrice } from './valuationAlign.js'

/** 对齐后两股共同交易日交集的最小可展示点数（规格 §4.2） */
export const MIN_COMPARE_OVERLAP_POINTS = 5

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
    valueByDate.set(new Date(ts).toDateString(), { ts, value: v })
  }
  const map = new Map()
  for (const [ts, p] of priceData) {
    const key = new Date(ts).toDateString()
    const va = valueByDate.get(key)
    if (va == null) continue
    map.set(key, { ts, price: p, value: va.value })
  }
  return map
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

  for (const k of keys) {
    const a = mapA.get(k)
    const b = mapB.get(k)
    times.push(a.ts)
    primaryPrice.push([a.ts, a.price])
    primaryValue.push([a.ts, a.value])
    comparePrice.push([b.ts, b.price])
    compareValue.push([b.ts, b.value])
  }

  return {
    ok: true,
    times,
    primaryPrice,
    primaryValue,
    comparePrice,
    compareValue,
  }
}
