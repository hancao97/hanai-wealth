import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

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
  async function loadDatesConfig() {
    try {
      loading.value = true
      error.value = null
      
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
      
      const response = await axios.get(`./assets/${selectedDate}.json`)
      allData.value = response.data
      
      applyFilters()
    } catch (err) {
      error.value = `无法加载 ${selectedDate} 的数据: ${err.message}`
      allData.value = []
      applyFilters()
    } finally {
      loading.value = false
    }
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
