import { describe, expect, it } from 'vitest'
import { buildBullMarketReview, parseStockPrice } from './bullMarketReview.js'

describe('parseStockPrice', () => {
  it('parses number and currency-like strings', () => {
    expect(parseStockPrice(12.3)).toBe(12.3)
    expect(parseStockPrice('¥12.30')).toBe(12.3)
    expect(parseStockPrice('$1,234.50')).toBe(1234.5)
    expect(Number.isNaN(parseStockPrice('N/A'))).toBe(true)
  })
})

describe('buildBullMarketReview', () => {
  const baselineData = [
    { symbol: '000001', company: '平安银行', price: '¥10.00' },
    { symbol: '000002', company: '万科A', price: '¥20.00' },
    { symbol: '000003', company: '测试A', price: '¥5.00' },
    { symbol: '000004', company: '测试B', price: '¥8.00' },
    { symbol: '000005', company: '无效基准', price: '¥0.00' },
  ]

  const currentData = [
    { symbol: '000001', stockid: 'CN001', company: '平安银行', price: '¥15.00', industry: '银行' },
    { symbol: '000002', stockid: 'CN002', company: '万科A', price: '¥10.00', industry: '地产' },
    { symbol: '000003', stockid: 'CN003', company: '测试A', price: '¥10.00', industry: '制造' },
    { symbol: '000004', stockid: 'CN004', company: '测试B', price: '¥4.00', industry: '制造' },
    { symbol: '000005', stockid: 'CN005', company: '无效基准', price: '¥9.00' },
    { symbol: '000006', stockid: 'CN006', company: '缺基准', price: '¥9.00' },
    { symbol: '000007', stockid: 'CN007', company: '无效现价', price: 'N/A' },
  ]

  it('matches stocks by symbol and calculates bull-market performance', () => {
    const out = buildBullMarketReview({
      baselineData,
      currentData,
      currentDate: '2026-06-26',
    })

    expect(out.summary.totalCount).toBe(7)
    expect(out.summary.sampleCount).toBe(4)
    expect(out.missingCount).toBe(3)
    expect(out.rows.find(row => row.symbol === '000001')).toMatchObject({
      baselinePrice: 10,
      currentPrice: 15,
      performance: 50,
      stockid: 'CN001',
      industry: '银行',
    })
  })

  it('calculates summary statistics', () => {
    const out = buildBullMarketReview({
      baselineData,
      currentData,
      currentDate: '2026-06-26',
    })

    expect(out.summary.upCount).toBe(2)
    expect(out.summary.upRatio).toBe(50)
    expect(out.summary.averagePerformance).toBe(12.5)
    expect(out.summary.medianPerformance).toBe(0)
    expect(out.summary.doubleCount).toBe(1)
    expect(out.summary.deepDropCount).toBe(2)
  })

  it('returns stable top gainers and decliners', () => {
    const out = buildBullMarketReview({
      baselineData,
      currentData,
      currentDate: '2026-06-26',
    })

    expect(out.leaders.map(row => row.symbol)).toEqual(['000003', '000001', '000002', '000004'])
    expect(out.laggards.map(row => row.symbol)).toEqual(['000002', '000004', '000001', '000003'])
  })

  it('returns an empty review before the bull market start range', () => {
    const out = buildBullMarketReview({
      baselineData,
      currentData,
      currentDate: '2024-09-23',
    })

    expect(out.reason).toBe('before-baseline')
    expect(out.summary.sampleCount).toBe(0)
    expect(out.missingCount).toBe(currentData.length)
  })
})
