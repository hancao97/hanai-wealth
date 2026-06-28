/**
 * 生成价值周报
 * 每周五晚上9点通过GitHub Actions自动执行
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import axios from 'axios'
import { selectTop50UndervaluedStocks, buildAIPrompt } from '../utils/weeklyReport.js'
import {
  assertAIConfig,
  buildChatCompletionPayload,
  extractAIMessage,
  getAPIErrorMessage,
  getAuthHeaders,
  getChatCompletionUrl,
  resolveAIConfig,
} from '../utils/aiProvider.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 调用AI API生成分析报告
 * @param {string} prompt - 发送给AI的prompt
 * @returns {Promise<string>} AI生成的分析内容
 */
async function callAIAPI(prompt) {
  const aiConfig = resolveAIConfig()

  try {
    assertAIConfig(aiConfig)
    console.log(`正在调用AI生成分析... provider=${aiConfig.provider}, model=${aiConfig.model}`)

    const response = await axios.post(
      getChatCompletionUrl(aiConfig),
      buildChatCompletionPayload(aiConfig, {
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false,
        temperature: 0.7,
        maxTokens: 8000
      }),
      {
        headers: getAuthHeaders(aiConfig)
      }
    )

    const analysis = extractAIMessage(response.data)
    console.log('✅ AI分析生成成功')
    
    return analysis
  } catch (error) {
    if (error.response) {
      const message = getAPIErrorMessage(
        error.response.status,
        error.response.statusText,
        error.response.data,
        aiConfig
      )
      console.error('❌ 调用AI API失败:', message)
      throw new Error(message)
    } else {
      console.error('❌ 调用AI API失败:', error.message)
      throw error
    }
  }
}

/**
 * 读取最新交易日数据
 * @returns {Promise<{date: string, data: Array}>} 最新交易日的日期和数据
 */
async function loadLatestTradingData() {
  try {
    const projectRoot = path.resolve(__dirname, '../../')
    const datesFilePath = path.join(projectRoot, 'public/dates.json')
    
    console.log('正在读取日期配置...')
    const datesContent = fs.readFileSync(datesFilePath, 'utf-8')
    const dates = JSON.parse(datesContent)
    
    if (!Array.isArray(dates) || dates.length === 0) {
      throw new Error('日期配置为空')
    }
    
    // 获取最新日期（数组已按日期排序，取最后一个）
    const latestDate = dates.sort().reverse()[0]
    console.log(`📅 最新交易日: ${latestDate}`)
    
    // 读取对应的数据文件
    const dataFilePath = path.join(projectRoot, `public/assets/${latestDate}.json`)
    console.log('正在读取股票数据...')
    const dataContent = fs.readFileSync(dataFilePath, 'utf-8')
    const stockData = JSON.parse(dataContent)
    
    console.log(`✅ 成功加载 ${stockData.length} 条股票数据`)
    
    return {
      date: latestDate,
      data: stockData
    }
  } catch (error) {
    console.error('❌ 读取交易数据失败:', error.message)
    throw error
  }
}

/**
 * 保存周报到文件
 * @param {Object} reportData - 周报数据
 */
function saveWeeklyReport(reportData) {
  try {
    const projectRoot = path.resolve(__dirname, '../../')
    const outputPath = process.env.WEEKLY_REPORT_OUTPUT_PATH || path.join(projectRoot, 'public/weekly-report.json')
    
    console.log('正在保存周报...')
    fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2), 'utf-8')
    
    console.log(`✅ 周报已保存到: ${outputPath}`)
  } catch (error) {
    console.error('❌ 保存周报失败:', error.message)
    throw error
  }
}

/**
 * 读取上一期周报，用于CI中AI服务异常时保留可展示内容
 * @returns {Object|null}
 */
function loadPreviousWeeklyReport() {
  try {
    const projectRoot = path.resolve(__dirname, '../../')
    const reportPath = path.join(projectRoot, 'public/weekly-report.json')
    if (!fs.existsSync(reportPath)) return null
    return JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
  } catch (error) {
    console.warn('⚠️ 读取上一期周报失败:', error.message)
    return null
  }
}

function shouldAllowStaleAnalysis() {
  return process.env.WEEKLY_REPORT_ALLOW_STALE_ANALYSIS === 'true'
}

function buildFallbackAnalysis(previousReport, error, date) {
  const previousDate = previousReport?.date || '上一期'
  const previousAnalysis = previousReport?.analysis || ''

  return `# HANAI 价值周报

> 本次（${date}）AI 分析暂未生成成功：${error.message}
>
> 以下保留 ${previousDate} 的旧分析内容，仅供临时参考。请检查内置 AI 配置或环境变量覆盖值后重新运行周报任务。

${previousAnalysis || '暂无上一期分析内容。'}`
}

/**
 * 主函数：生成价值周报
 */
async function generateWeeklyReport() {
  console.log('========================================')
  console.log('🚀 开始生成HANAI价值周报')
  console.log('========================================\n')
  
  try {
    // 1. 读取最新交易日数据
    const { date, data } = await loadLatestTradingData()
    
    // 2. 筛选前50只低估股票
    console.log('\n正在筛选低估股票...')
    const top50Stocks = selectTop50UndervaluedStocks(data)
    
    if (top50Stocks.length === 0) {
      throw new Error('未找到符合条件的低估股票')
    }
    
    console.log(`✅ 成功筛选出 ${top50Stocks.length} 只低估股票`)
    console.log(`   平均折扣率: ${(top50Stocks.reduce((sum, s) => sum + s.discountRate, 0) / top50Stocks.length).toFixed(2)}%`)
    
    // 3. 构建AI prompt
    console.log('\n正在构建AI分析prompt...')
    const prompt = buildAIPrompt(top50Stocks, date)
    console.log(`✅ Prompt构建完成 (${prompt.length} 字符)`)
    
    // 4. 调用AI生成分析
    console.log('\n')
    let analysis
    let analysisStatus = 'generated'
    try {
      analysis = await callAIAPI(prompt)
    } catch (error) {
      if (!shouldAllowStaleAnalysis()) {
        throw error
      }

      console.warn('⚠️ AI分析生成失败，CI将保留旧分析内容继续输出周报:', error.message)
      analysisStatus = 'fallback'
      analysis = buildFallbackAnalysis(loadPreviousWeeklyReport(), error, date)
    }
    
    // 5. 构建周报数据
    const reportData = {
      date: date,
      generatedAt: new Date().toISOString(),
      aiProvider: resolveAIConfig().provider,
      aiModel: resolveAIConfig().model,
      analysisStatus,
      prompt: prompt,
      analysis: analysis
    }
    
    // 6. 保存周报
    console.log('\n')
    saveWeeklyReport(reportData)
    
    console.log('\n========================================')
    console.log('🎉 价值周报生成完成！')
    console.log('========================================')
    
  } catch (error) {
    console.error('\n========================================')
    console.error('❌ 生成周报失败')
    console.error('========================================')
    console.error(error)
    process.exit(1)
  }
}

// 执行主函数
generateWeeklyReport()
