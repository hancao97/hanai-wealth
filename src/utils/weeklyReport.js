/**
 * 价值周报工具函数
 * 用于筛选低估股票和构建AI分析prompt
 */

/**
 * 从股票数据中筛选出距离合理估值最低的50只股票
 * @param {Array} stockData - 股票数据数组
 * @returns {Array} 排序后的前50只低估股票
 */
export function selectTop50UndervaluedStocks(stockData) {
  if (!Array.isArray(stockData) || stockData.length === 0) {
    return []
  }

  // 筛选有效数据：gf_value > 0 且 price > 0
  const validStocks = stockData.filter(stock => {
    const gfValue = parseFloat(stock.gf_value)
    const price = parseFloat(stock.price?.toString().replace('¥', ''))
    
    return gfValue > 0 && price > 0 && !isNaN(gfValue) && !isNaN(price)
  })

  // 计算折扣率并排序
  const stocksWithDiscount = validStocks.map(stock => {
    const gfValue = parseFloat(stock.gf_value)
    const price = parseFloat(stock.price?.toString().replace('¥', ''))
    
    // 折扣率：(合理估值 - 当前价格) / 合理估值 * 100
    const discountRate = ((gfValue - price) / gfValue) * 100
    
    return {
      symbol: stock.symbol,
      company: stock.company,
      industry: stock.industry,
      price: price,
      gf_value: gfValue,
      discountRate: discountRate,
      pettm: stock.pettm,
      yield: stock.yield,
      gf_score: stock.gf_score,
      gf_valuation: stock.gf_valuation
    }
  })

  // 按折扣率降序排序（折扣率越高，低估程度越大）
  stocksWithDiscount.sort((a, b) => b.discountRate - a.discountRate)

  // 返回前50名
  return stocksWithDiscount.slice(0, 50)
}

/**
 * 构建发送给AI的prompt
 * @param {Array} top50Stocks - 前50只低估股票
 * @param {string} date - 数据日期
 * @returns {string} 完整的prompt文本
 */
export function buildAIPrompt(top50Stocks, date) {
  if (!Array.isArray(top50Stocks) || top50Stocks.length === 0) {
    return ''
  }

  // 构建股票列表文本
  let stockListText = ''
  top50Stocks.forEach((stock, index) => {
    stockListText += `${index + 1}. ${stock.company}（${stock.symbol}）\n`
    stockListText += `   行业：${stock.industry || '未知'}\n`
    stockListText += `   当前价格：¥${stock.price.toFixed(2)}\n`
    stockListText += `   价值大师网合理估值：¥${stock.gf_value.toFixed(2)}\n`
    stockListText += `   折扣率：${stock.discountRate.toFixed(2)}%\n`
    stockListText += '\n'
  })

  // 构建完整prompt
  const prompt = `# HANAI 价值周报

## 分析日期
${date}

## 背景说明
以下是从A股市场中筛选出的距离合理估值最低的50只股票。这些股票的当前价格显著低于价值大师网（GuruFocus）给出的合理估值，可能存在投资价值。

## 股票清单

${stockListText}

## 您是专业的价值投资分析师，对以上50只低估股票进行深度分析：

**行业分布分析**
   - 这些低估股票是否集中在某些特定行业？
   - 结合 ${date} 的A股市场情况，分析哪些行业可能具有更好的投资机会？

**投资建议**
   - 针对以上数据，严格过滤价值陷阱（例如：ST股、退市风险、财务造假等），并给出10只最值得关注的股票，并给出较为具体的理由。

请以专业、客观、低风险偏好的角度进行分析，提供有价值的投资洞察。分析内容应该结构清晰、逻辑严密、通俗易懂。输出结果美观、排版整洁。`

  return prompt
}

/**
 * 格式化股票数据为简洁版本（用于展示）
 * @param {Array} stocks - 股票数据数组
 * @returns {Array} 格式化后的股票数据
 */
export function formatStocksForDisplay(stocks) {
  return stocks.map((stock, index) => ({
    rank: index + 1,
    company: stock.company,
    symbol: stock.symbol,
    industry: stock.industry || '未知',
    price: `¥${stock.price.toFixed(2)}`,
    gfValue: `¥${stock.gf_value.toFixed(2)}`,
    discount: `${stock.discountRate.toFixed(2)}%`,
    pe: stock.pettm ? parseFloat(stock.pettm).toFixed(2) : 'N/A',
    yield: stock.yield ? `${parseFloat(stock.yield).toFixed(2)}%` : 'N/A'
  }))
}

