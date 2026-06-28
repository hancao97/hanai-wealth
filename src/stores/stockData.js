import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import {
  BULL_MARKET_BASELINE_DATE,
  BULL_MARKET_BASELINE_PATH,
  buildBullMarketReview,
} from '@/utils/bullMarketReview.js'

export const useStockDataStore = defineStore('stockData', () => {
  // 状态
  const allData = ref([])
  const filteredData = ref([])
  const availableDates = ref([])
  const currentDate = ref(null)
  const currentPage = ref(1)
  const pageSize = ref(100)
  const loading = ref(false)
  const error = ref(null)
  const companiesInfo = ref({}) // 存储公司基础信息
  const historicalData = ref({}) // 存储历史数据 { date: data[] }
  const marketSentiment = ref([]) // 市场情绪数据
  const weeklyReport = ref(null) // 价值周报数据
  const bullMarketReview = ref(null) // 牛市复盘数据
  const bullMarketLoading = ref(false)
  const bullMarketError = ref(null)
  const bullMarketBaselineData = ref(null)
  const yearPerformanceSummary = ref({
    startDate: null,
    endDate: null,
    leader: null,
    laggard: null
  })

  // 筛选条件
  const filters = ref({
    company: '',
    valuation: '',
    industry: '',
    board: '',
    dividend: ''
  })

  // 计算属性
  const totalPages = computed(() => Math.ceil(filteredData.value.length / pageSize.value))
  
  const currentPageData = computed(() => {
    const startIndex = (currentPage.value - 1) * pageSize.value
    const endIndex = startIndex + pageSize.value
    return filteredData.value.slice(startIndex, endIndex)
  })

  const industries = computed(() => {
    if (!Array.isArray(allData.value) || allData.value.length === 0) {
      return []
    }
    const uniqueIndustries = [...new Set(allData.value.map(item => item.industry).filter(Boolean))]
    return uniqueIndustries.sort()
  })

  // 获取估值分布统计
  const valuationStats = computed(() => {
    if (!Array.isArray(allData.value) || allData.value.length === 0) {
      return {}
    }
    
    const stats = {}
    const labels = {
      0: '数据不足',
      1: '数据长久未更新',
      2: '价值陷阱嫌疑',
      3: '严重低估',
      4: '低估',
      5: '合理范围',
      6: '高估',
      7: '严重高估'
    }
    
    allData.value.forEach(item => {
      const val = item.gf_valuation
      if (!stats[val]) {
        stats[val] = {
          count: 0,
          label: labels[val] || '未知'
        }
      }
      stats[val].count++
    })
    
    return stats
  })

  // 获取股息率统计
  const dividendStats = computed(() => {
    if (!Array.isArray(allData.value) || allData.value.length === 0) {
      return {
        low: 0,
        medium: 0,
        high: 0,
        superHigh: 0,
        abnormal: 0,
        noData: 0
      }
    }
    
    let lowDividend = 0         // < 1%
    let mediumDividend = 0      // 1% - 3%
    let highDividend = 0        // 3% - 5%
    let superHighDividend = 0   // 5% - 8%
    let abnormalDividend = 0    // > 8%
    let noDividendData = 0      // 无数据
    
    allData.value.forEach(item => {
      const yieldValue = item.yield
      
      if (yieldValue === null || yieldValue === undefined || yieldValue === '' || yieldValue === 0) {
        noDividendData++
        return
      }
      
      const numYield = parseFloat(yieldValue)
      
      if (isNaN(numYield) || numYield < 0) {
        noDividendData++
      } else if (numYield < 1) {
        lowDividend++
      } else if (numYield < 3) {
        mediumDividend++
      } else if (numYield < 5) {
        highDividend++
      } else if (numYield <= 8) {
        superHighDividend++
      } else {
        abnormalDividend++
      }
    })
    
    return {
      low: lowDividend,
      medium: mediumDividend,
      high: highDividend,
      superHigh: superHighDividend,
      abnormal: abnormalDividend,
      noData: noDividendData
    }
  })

  // 市场概览统计
  const marketOverview = computed(() => {
    if (allData.value.length === 0) {
      return { 
        avgPrice: 0, 
        avgPE: 0,
        priceLevel: { icon: '📊', text: '暂无数据' },
        peLevel: { icon: '⚖️', text: '暂无数据' }
      }
    }
    
    let totalPrice = 0
    let priceCount = 0
    let totalPE = 0
    let peCount = 0
    
    allData.value.forEach(item => {
      // 计算平均股价
      const price = parseFloat(item.price?.toString().replace('¥', ''))
      if (!isNaN(price) && price > 0) {
        totalPrice += price
        priceCount++
      }
      
      // 计算平均市盈率
      const pe = parseFloat(item.pettm)
      if (!isNaN(pe) && pe > 0) {
        totalPE += pe
        peCount++
      }
    })
    
    const avgPrice = priceCount > 0 ? totalPrice / priceCount : 0
    const avgPE = peCount > 0 ? totalPE / peCount : 0
    
    return {
      avgPrice,
      avgPE,
      priceLevel: getPriceLevel(avgPrice),
      peLevel: getPELevel(avgPE)
    }
  })

  // 获取股价水平描述
  function getPriceLevel(price) {
    if (price < 10) return { icon: '📉', text: '较低价位' }
    if (price < 30) return { icon: '📊', text: '中等价位' }
    if (price < 100) return { icon: '📈', text: '较高价位' }
    return { icon: '💎', text: '超高价位' }
  }

  // 获取市盈率水平描述
  function getPELevel(pe) {
    if (pe < 15) return { icon: '💰', text: '低估值' }
    if (pe < 25) return { icon: '⚖️', text: '合理估值' }
    if (pe < 50) return { icon: '⚡', text: '较高估值' }
    return { icon: '🔥', text: '高估值' }
  }

  // 筛选条件持久化（使用 sessionStorage，仅在当前会话中保留）
  function saveFiltersToStorage() {
    try {
      const filtersData = {
        filters: filters.value,
        currentDate: currentDate.value,
        currentPage: currentPage.value
      }
      sessionStorage.setItem('stockFilters', JSON.stringify(filtersData))
    } catch (error) {
      console.warn('无法保存筛选条件到会话存储:', error)
    }
  }

  function loadFiltersFromStorage() {
    try {
      const saved = sessionStorage.getItem('stockFilters')
      if (saved) {
        const filtersData = JSON.parse(saved)
        
        // 恢复筛选条件
        filters.value = { ...filters.value, ...filtersData.filters }
        
        // 恢复页码
        if (filtersData.currentPage) {
          currentPage.value = filtersData.currentPage
        }
        
        return filtersData
      }
    } catch (error) {
      console.warn('无法从会话存储加载筛选条件:', error)
    }
    return null
  }

  function clearFiltersStorage() {
    try {
      sessionStorage.removeItem('stockFilters')
    } catch (error) {
      console.warn('无法清除会话存储的筛选条件:', error)
    }
  }

  // 方法
  async function loadCompaniesInfo() {
    try {
      const response = await axios.get('./companies.json')
      companiesInfo.value = response.data
      console.log(`加载了 ${Object.keys(companiesInfo.value).length} 个公司的基础信息`)
    } catch (err) {
      console.warn('无法加载公司基础信息:', err.message)
      companiesInfo.value = {}
    }
  }

  async function loadDatesConfig() {
    try {
      loading.value = true
      error.value = null
      
      // 先加载公司基础信息
      await loadCompaniesInfo()
      
      const response = await axios.get('./dates.json')
      availableDates.value = response.data.sort().reverse() // 最新日期在前
      
      if (availableDates.value.length > 0) {
        // 先尝试从本地存储恢复筛选条件
        const savedFilters = loadFiltersFromStorage()
        
        // 检查URL参数中是否有指定日期
        const urlParams = new URLSearchParams(window.location.search)
        const urlDate = urlParams.get('date')
        
        let selectedDate
        if (urlDate && availableDates.value.includes(urlDate)) {
          selectedDate = urlDate
        } else if (savedFilters && savedFilters.currentDate && availableDates.value.includes(savedFilters.currentDate)) {
          selectedDate = savedFilters.currentDate
        } else {
          selectedDate = availableDates.value[0]
        }
        
        currentDate.value = selectedDate
        await loadDataForDate(selectedDate)
      }
    } catch (err) {
      error.value = '无法加载日期配置: ' + err.message
      console.error('加载日期配置失败:', err)
    } finally {
      loading.value = false
    }
  }

  async function loadDataForDate(selectedDate) {
    if (!selectedDate) return
    
    try {
      loading.value = true
      error.value = null
      currentDate.value = selectedDate
      
      const dailyData = await getHistoricalDataByDate(selectedDate)
      
      // 合并公司基础信息
      allData.value = dailyData.map(item => {
        const companyInfo = companiesInfo.value[item.symbol]
        return companyInfo ? { ...item, business_descrpt: companyInfo } : item
      })
      
      applyFilters()
      await calculateYearPerformanceSummary(selectedDate)
      await loadBullMarketReview(selectedDate)
      
      // 加载历史数据并计算市场情绪（不阻塞主流程）
      loadMarketSentimentData(selectedDate).catch(err => {
        console.warn('加载市场情绪数据失败:', err)
      })
    } catch (err) {
      error.value = `无法加载 ${selectedDate} 的数据: ${err.message}`
      allData.value = []
      yearPerformanceSummary.value = {
        startDate: null,
        endDate: selectedDate,
        leader: null,
        laggard: null
      }
      bullMarketReview.value = null
      bullMarketError.value = null
      applyFilters()
    } finally {
      loading.value = false
    }
  }

  async function getHistoricalDataByDate(date) {
    if (!date) {
      return []
    }

    if (historicalData.value[date]) {
      return historicalData.value[date]
    }

    const response = await axios.get(`./assets/${date}.json`)
    historicalData.value[date] = response.data
    return historicalData.value[date]
  }

  async function loadBullMarketBaselineData() {
    if (bullMarketBaselineData.value) {
      return bullMarketBaselineData.value
    }

    const response = await axios.get(BULL_MARKET_BASELINE_PATH)
    bullMarketBaselineData.value = response.data
    return bullMarketBaselineData.value
  }

  async function loadBullMarketReview(selectedDate) {
    bullMarketLoading.value = true
    bullMarketError.value = null

    try {
      if (!selectedDate || selectedDate <= BULL_MARKET_BASELINE_DATE) {
        bullMarketReview.value = buildBullMarketReview({
          baselineData: [],
          currentData: allData.value,
          currentDate: selectedDate,
        })
        return bullMarketReview.value
      }

      const baselineData = await loadBullMarketBaselineData()
      bullMarketReview.value = buildBullMarketReview({
        baselineData,
        currentData: allData.value,
        currentDate: selectedDate,
      })
      return bullMarketReview.value
    } catch (err) {
      console.warn('加载牛市复盘数据失败:', err.message)
      bullMarketReview.value = null
      bullMarketError.value = `缺少 ${BULL_MARKET_BASELINE_DATE} 基准数据`
      return null
    } finally {
      bullMarketLoading.value = false
    }
  }

  function parsePriceValue(price) {
    if (price === null || price === undefined || price === '') {
      return NaN
    }

    if (typeof price === 'number') {
      return price
    }

    if (typeof price === 'string') {
      return parseFloat(price.replace(/[^\d.-]/g, ''))
    }

    return NaN
  }

  async function calculateYearPerformanceSummary(selectedDate) {
    const summary = {
      startDate: null,
      endDate: selectedDate,
      leader: null,
      laggard: null
    }

    if (!selectedDate || !Array.isArray(availableDates.value) || availableDates.value.length === 0) {
      yearPerformanceSummary.value = summary
      return
    }

    const currentYear = selectedDate.slice(0, 4)
    const yearDates = availableDates.value
      .filter(date => date.startsWith(currentYear) && date <= selectedDate)
      .sort()

    if (yearDates.length === 0) {
      yearPerformanceSummary.value = summary
      return
    }

    const startDate = yearDates[0]
    summary.startDate = startDate

    const [startData, endData] = await Promise.all([
      getHistoricalDataByDate(startDate),
      getHistoricalDataByDate(selectedDate)
    ])

    if (!Array.isArray(startData) || !Array.isArray(endData) || startData.length === 0 || endData.length === 0) {
      yearPerformanceSummary.value = summary
      return
    }

    const startPriceMap = new Map()
    startData.forEach(item => {
      const symbol = item?.symbol
      const price = parsePriceValue(item?.price)
      if (!symbol || !Number.isFinite(price) || price <= 0) {
        return
      }
      startPriceMap.set(symbol, {
        company: item.company,
        price
      })
    })

    const performances = endData.reduce((list, item) => {
      const symbol = item?.symbol
      const startInfo = startPriceMap.get(symbol)
      const currentPrice = parsePriceValue(item?.price)

      if (!symbol || !startInfo || !Number.isFinite(currentPrice) || currentPrice <= 0) {
        return list
      }

      const performance = ((currentPrice - startInfo.price) / startInfo.price) * 100
      if (!Number.isFinite(performance)) {
        return list
      }

      list.push({
        symbol,
        company: item.company || startInfo.company || '未知公司',
        startPrice: startInfo.price,
        currentPrice,
        performance
      })
      return list
    }, [])

    if (performances.length === 0) {
      yearPerformanceSummary.value = summary
      return
    }

    performances.sort((a, b) => b.performance - a.performance)
    summary.leader = performances[0]
    summary.laggard = performances[performances.length - 1]
    yearPerformanceSummary.value = summary
  }

  // 加载市场情绪数据（近20个交易日）
  async function loadMarketSentimentData(selectedDate) {
    try {
      const currentIndex = availableDates.value.indexOf(selectedDate)
      if (currentIndex === -1) return
      
      // 获取近20个交易日
      const dates = availableDates.value.slice(currentIndex, currentIndex + 20).reverse()
      
      if (dates.length < 2) {
        marketSentiment.value = []
        return
      }
      
      // 加载所有需要的历史数据
      const sentimentData = []
      
      for (const date of dates) {
        // 如果已经缓存，直接使用
        if (!historicalData.value[date]) {
          try {
            await getHistoricalDataByDate(date)
          } catch (err) {
            console.warn(`无法加载 ${date} 的数据:`, err.message)
            continue
          }
        }
        
        // 计算市场情绪指数
        const data = historicalData.value[date]
        if (data && data.length > 0) {
          const sentiment = calculateMarketSentiment(data)
          sentimentData.push({
            date,
            value: sentiment,
            count: data.length
          })
        }
      }
      
      marketSentiment.value = sentimentData
    } catch (err) {
      console.error('加载市场情绪数据失败:', err)
      marketSentiment.value = []
    }
  }

  // 计算市场情绪指数：(上涨 + 平盘) / 总数 * 100
  function calculateMarketSentiment(data) {
    if (!data || data.length === 0) return 0
    
    let upOrFlatCount = 0
    let totalCount = 0
    
    data.forEach(item => {
      const change = item.p_pct_change
      if (change !== undefined && change !== null && !isNaN(change)) {
        totalCount++
        if (change >= 0) {
          upOrFlatCount++
        }
      }
    })
    
    if (totalCount === 0) return 0
    return Math.round((upOrFlatCount / totalCount) * 100 * 100) / 100 // 保留两位小数
  }

  function applyFilters() {
    let filtered = [...allData.value]
    
    // 公司名称筛选
    if (filters.value.company) {
      const companyQuery = filters.value.company.trim().toLowerCase()
      filtered = filtered.filter(item => 
        item.company && item.company.toLowerCase().includes(companyQuery)
      )
    }
    
    // 价值评估筛选
    if (filters.value.valuation) {
      const targetValuation = Number(filters.value.valuation)
      filtered = filtered.filter(item => item.gf_valuation === targetValuation)
    }
    
    // 行业筛选
    if (filters.value.industry) {
      filtered = filtered.filter(item => item.industry === filters.value.industry)
    }
    
    // 板块筛选
    if (filters.value.board) {
      filtered = filtered.filter(item => {
        const board = item.board || detectStockBoard(item.symbol)
        return board === filters.value.board
      })
    }
    
    // 股息率筛选
    if (filters.value.dividend) {
      filtered = filtered.filter(item => {
        const yieldValue = item.yield
        const category = getDividendCategory(yieldValue)
        return category === filters.value.dividend
      })
    }
    
    filteredData.value = filtered
    currentPage.value = 1 // 重置到第一页
  }

  function updateFilter(key, value) {
    filters.value[key] = value
    applyFilters()
    // 保存筛选条件到本地存储
    saveFiltersToStorage()
  }

  function clearFilters() {
    filters.value = {
      company: '',
      valuation: '',
      industry: '',
      board: '',
      dividend: ''
    }
    applyFilters()
    // 清除本地存储的筛选条件
    clearFiltersStorage()
  }

  function goToPage(page) {
    if (page < 1 || page > totalPages.value || page === currentPage.value) {
      return
    }
    currentPage.value = page
    // 保存页码变化到本地存储
    saveFiltersToStorage()
  }

  // 工具函数
  function detectStockBoard(symbol) {
    if (!symbol || typeof symbol !== 'string') {
      return '主板'
    }
    
    const code = symbol.trim()
    
    if (/^(000|001|002|003|600|601|603|605)/.test(code)) {
      return '主板'
    }
    
    if (/^(300|301)/.test(code)) {
      return '创业板'
    }
    
    if (/^688/.test(code)) {
      return '科创板'
    }
    
    if (/^(43|83|87|92)/.test(code)) {
      return '北证'
    }
    
    return '主板'
  }

  function getDividendCategory(yieldValue) {
    if (yieldValue === null || yieldValue === undefined || yieldValue === '' || yieldValue === 0) {
      return 'no-data'
    }
    
    const numYield = parseFloat(yieldValue)
    
    if (isNaN(numYield) || numYield < 0) {
      return 'no-data'
    } else if (numYield < 1) {
      return 'low'
    } else if (numYield < 3) {
      return 'medium'
    } else if (numYield < 5) {
      return 'high'
    } else if (numYield <= 8) {
      return 'super-high'
    } else {
      return 'abnormal'
    }
  }

  // 加载价值周报
  async function loadWeeklyReport() {
    try {
      const response = await axios.get('./weekly-report.json')
      weeklyReport.value = response.data
      console.log('✅ 价值周报加载成功')
      return weeklyReport.value
    } catch (err) {
      console.warn('价值周报加载失败:', err.message)
      weeklyReport.value = null
      throw err
    }
  }

  return {
    // 状态
    allData,
    filteredData,
    availableDates,
    currentDate,
    currentPage,
    pageSize,
    loading,
    error,
    filters,
    marketSentiment,
    weeklyReport,
    bullMarketReview,
    bullMarketLoading,
    bullMarketError,
    yearPerformanceSummary,
    
    // 计算属性
    totalPages,
    currentPageData,
    industries,
    valuationStats,
    dividendStats,
    marketOverview,
    
    // 方法
    loadDatesConfig,
    loadDataForDate,
    loadMarketSentimentData,
    loadWeeklyReport,
    loadBullMarketReview,
    applyFilters,
    updateFilter,
    clearFilters,
    goToPage,
    detectStockBoard,
    getDividendCategory,
    getPriceLevel,
    getPELevel,
    saveFiltersToStorage,
    loadFiltersFromStorage,
    clearFiltersStorage
  }
})
