/**
 * 生成价值周报
 * 每周五晚上9点通过GitHub Actions自动执行
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import axios from 'axios'
import { selectTop50UndervaluedStocks, buildAIPrompt } from '../utils/weeklyReport.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Kimi API 配置
const KIMI_API_KEY = 'sk-PALcY0I0t5SfU9aqnooUcF0Ue83lkmbuZORH02683QhvG8ii'
const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions'

/**
 * 调用Kimi API生成分析报告
 * @param {string} prompt - 发送给AI的prompt
 * @returns {Promise<string>} AI生成的分析内容
 */
async function callKimiAPI(prompt) {
  try {
    console.log('正在调用Kimi API生成分析...')
    
    const response = await axios.post(KIMI_API_URL, {
      model: 'kimi-k2-0905-preview',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: false,
      temperature: 0.7,
      max_tokens: 8000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIMI_API_KEY}`
      }
    })

    if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
      throw new Error('API 返回数据格式错误')
    }

    const analysis = response.data.choices[0].message.content
    console.log('✅ AI分析生成成功')
    
    return analysis
  } catch (error) {
    if (error.response) {
      console.error('❌ 调用Kimi API失败:', error.response.status, error.response.data)
      throw new Error(`API 请求失败: ${error.response.status} ${JSON.stringify(error.response.data)}`)
    } else {
      console.error('❌ 调用Kimi API失败:', error.message)
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
    const outputPath = path.join(projectRoot, 'public/weekly-report.json')
    
    console.log('正在保存周报...')
    fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2), 'utf-8')
    
    console.log(`✅ 周报已保存到: ${outputPath}`)
  } catch (error) {
    console.error('❌ 保存周报失败:', error.message)
    throw error
  }
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
    const analysis = await callKimiAPI(prompt)
    
    // 5. 构建周报数据
    const reportData = {
      date: date,
      generatedAt: new Date().toISOString(),
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

