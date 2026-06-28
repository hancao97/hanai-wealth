export const BULL_MARKET_START_DATE = '2024-09-24'
export const BULL_MARKET_BASELINE_DATE = '2024-09-23'
export const BULL_MARKET_BASELINE_PATH = './baselines/bull-market-2024-09-23.json'
export const BULL_MARKET_TOP_LIMIT = 50

export function parseStockPrice(price) {
  if (price === null || price === undefined || price === '') return NaN
  if (typeof price === 'number') return price
  if (typeof price === 'string') {
    return parseFloat(price.replace(/[^\d.-]/g, ''))
  }
  return NaN
}

function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]
  return (sorted[mid - 1] + sorted[mid]) / 2
}

function createEmptyReview({ baselineDate, currentDate, totalCount = 0, reason = '' }) {
  return {
    baselineDate,
    currentDate,
    reason,
    summary: {
      totalCount,
      sampleCount: 0,
      upCount: 0,
      upRatio: 0,
      averagePerformance: 0,
      medianPerformance: 0,
      doubleCount: 0,
      deepDropCount: 0,
    },
    rows: [],
    leaders: [],
    laggards: [],
    missingCount: totalCount,
  }
}

export function buildBullMarketReview({
  baselineData,
  currentData,
  baselineDate = BULL_MARKET_BASELINE_DATE,
  currentDate,
}) {
  const baselineRows = Array.isArray(baselineData) ? baselineData : []
  const currentRows = Array.isArray(currentData) ? currentData : []

  if (!currentDate || currentDate <= baselineDate) {
    return createEmptyReview({
      baselineDate,
      currentDate,
      totalCount: currentRows.length,
      reason: 'before-baseline',
    })
  }

  const baselinePriceMap = new Map()
  baselineRows.forEach((item) => {
    const symbol = String(item?.symbol || '').trim()
    const price = parseStockPrice(item?.price)
    if (!symbol || !Number.isFinite(price) || price <= 0) return
    baselinePriceMap.set(symbol, {
      price,
      company: item.company,
    })
  })

  const rows = []

  currentRows.forEach((item, index) => {
    const symbol = String(item?.symbol || '').trim()
    const baseline = baselinePriceMap.get(symbol)
    const currentPrice = parseStockPrice(item?.price)

    if (!symbol || !baseline || !Number.isFinite(currentPrice) || currentPrice <= 0) {
      return
    }

    const performance = ((currentPrice - baseline.price) / baseline.price) * 100
    if (!Number.isFinite(performance)) return

    rows.push({
      ...item,
      symbol,
      company: item.company || baseline.company || '未知公司',
      baselinePrice: baseline.price,
      currentPrice,
      performance,
      originalIndex: index,
    })
  })

  if (!rows.length) {
    return createEmptyReview({
      baselineDate,
      currentDate,
      totalCount: currentRows.length,
      reason: 'no-match',
    })
  }

  const performances = rows.map(row => row.performance)
  const upCount = rows.filter(row => row.performance > 0).length
  const averagePerformance = performances.reduce((sum, value) => sum + value, 0) / performances.length

  const stableSort = (direction) => [...rows].sort((a, b) => {
    const diff = direction === 'desc'
      ? b.performance - a.performance
      : a.performance - b.performance
    if (diff !== 0) return diff
    return a.originalIndex - b.originalIndex
  })

  return {
    baselineDate,
    currentDate,
    reason: '',
    summary: {
      totalCount: currentRows.length,
      sampleCount: rows.length,
      upCount,
      upRatio: (upCount / rows.length) * 100,
      averagePerformance,
      medianPerformance: median(performances),
      doubleCount: rows.filter(row => row.performance >= 100).length,
      deepDropCount: rows.filter(row => row.performance <= -30).length,
    },
    rows,
    leaders: stableSort('desc').slice(0, BULL_MARKET_TOP_LIMIT),
    laggards: stableSort('asc').slice(0, BULL_MARKET_TOP_LIMIT),
    missingCount: currentRows.length - rows.length,
  }
}
