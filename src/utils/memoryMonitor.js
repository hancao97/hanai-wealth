/**
 * 内存监控工具
 * 用于检测和分析应用的内存使用情况
 */

export class MemoryMonitor {
  constructor(options = {}) {
    this.samples = []
    this.maxSamples = options.maxSamples || 50
    this.warningThreshold = options.warningThreshold || 20 // 增长超过20%时警告
    this.enabled = options.enabled !== false
    this.logInterval = options.logInterval || 30000 // 默认30秒
    this.intervalId = null
  }
  
  /**
   * 记录当前内存使用情况
   */
  recordMemory() {
    if (!this.enabled || !performance.memory) {
      return null
    }
    
    const memory = {
      timestamp: Date.now(),
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      usedMB: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
      totalMB: (performance.memory.totalJSHeapSize / 1048576).toFixed(2),
      limitMB: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2)
    }
    
    this.samples.push(memory)
    
    // 保持样本数量在限制内
    if (this.samples.length > this.maxSamples) {
      this.samples.shift()
    }
    
    return memory
  }
  
  /**
   * 获取内存使用趋势
   */
  getMemoryTrend() {
    if (this.samples.length < 2) {
      return { status: 'insufficient_data', message: '数据不足，需要更多样本' }
    }
    
    const first = this.samples[0].usedJSHeapSize
    const last = this.samples[this.samples.length - 1].usedJSHeapSize
    const increase = last - first
    const percentIncrease = (increase / first) * 100
    
    let status = 'normal'
    let message = '内存使用正常'
    
    if (percentIncrease > this.warningThreshold) {
      status = 'warning'
      message = `⚠️ 内存增长过快: ${percentIncrease.toFixed(2)}%`
    } else if (percentIncrease > this.warningThreshold * 2) {
      status = 'critical'
      message = `🚨 严重内存泄露: ${percentIncrease.toFixed(2)}%`
    }
    
    return {
      status,
      message,
      increase,
      percentIncrease: percentIncrease.toFixed(2),
      firstSample: this.samples[0],
      lastSample: this.samples[this.samples.length - 1],
      sampleCount: this.samples.length
    }
  }
  
  /**
   * 打印内存状态到控制台
   */
  logMemoryStatus() {
    const current = this.recordMemory()
    
    if (!current) {
      console.log('%c[Memory Monitor] Memory API not available in this browser', 'color: #999')
      return
    }
    
    const trend = this.getMemoryTrend()
    
    console.group('%c[Memory Monitor] 内存状态报告', 'color: #3b82f6; font-weight: bold')
    console.log(`📊 当前使用: ${current.usedMB} MB / ${current.totalMB} MB`)
    console.log(`📈 内存限制: ${current.limitMB} MB`)
    console.log(`🔢 样本数量: ${this.samples.length}`)
    
    if (trend.status !== 'insufficient_data') {
      const color = trend.status === 'critical' ? '#ef4444' : 
                    trend.status === 'warning' ? '#f59e0b' : '#10b981'
      console.log(`%c${trend.message}`, `color: ${color}; font-weight: bold`)
      console.log(`增长量: ${(trend.increase / 1048576).toFixed(2)} MB (${trend.percentIncrease}%)`)
    } else {
      console.log(`ℹ️ ${trend.message}`)
    }
    
    console.groupEnd()
    
    // 如果是严重泄露，额外警告
    if (trend.status === 'critical') {
      console.warn('🚨 检测到严重内存泄露！建议立即检查：')
      console.warn('1. ECharts 实例是否正确销毁')
      console.warn('2. 事件监听器是否已移除')
      console.warn('3. 大型数据缓存是否清理')
      console.warn('4. 定时器是否已清除')
    }
    
    return { current, trend }
  }
  
  /**
   * 获取详细的内存统计信息
   */
  getDetailedStats() {
    if (this.samples.length === 0) {
      return null
    }
    
    const usedSizes = this.samples.map(s => s.usedJSHeapSize)
    const min = Math.min(...usedSizes)
    const max = Math.max(...usedSizes)
    const avg = usedSizes.reduce((a, b) => a + b, 0) / usedSizes.length
    
    return {
      minMB: (min / 1048576).toFixed(2),
      maxMB: (max / 1048576).toFixed(2),
      avgMB: (avg / 1048576).toFixed(2),
      rangeMB: ((max - min) / 1048576).toFixed(2),
      samples: this.samples.length,
      duration: this.samples.length > 1 
        ? ((this.samples[this.samples.length - 1].timestamp - this.samples[0].timestamp) / 1000).toFixed(0) + 's'
        : '0s'
    }
  }
  
  /**
   * 打印详细统计信息
   */
  logDetailedStats() {
    const stats = this.getDetailedStats()
    
    if (!stats) {
      console.log('[Memory Monitor] 暂无统计数据')
      return
    }
    
    console.group('%c[Memory Monitor] 详细统计', 'color: #8b5cf6; font-weight: bold')
    console.log(`最小值: ${stats.minMB} MB`)
    console.log(`最大值: ${stats.maxMB} MB`)
    console.log(`平均值: ${stats.avgMB} MB`)
    console.log(`波动范围: ${stats.rangeMB} MB`)
    console.log(`监控时长: ${stats.duration}`)
    console.log(`样本数: ${stats.samples}`)
    console.groupEnd()
    
    return stats
  }
  
  /**
   * 开始自动监控
   */
  startAutoMonitoring() {
    if (this.intervalId) {
      console.warn('[Memory Monitor] 自动监控已在运行')
      return
    }
    
    console.log(`[Memory Monitor] 开始自动监控 (间隔: ${this.logInterval / 1000}s)`)
    
    // 立即记录一次
    this.logMemoryStatus()
    
    // 设置定时器
    this.intervalId = setInterval(() => {
      this.logMemoryStatus()
    }, this.logInterval)
  }
  
  /**
   * 停止自动监控
   */
  stopAutoMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[Memory Monitor] 已停止自动监控')
    }
  }
  
  /**
   * 重置所有数据
   */
  reset() {
    this.samples = []
    console.log('[Memory Monitor] 已重置所有数据')
  }
  
  /**
   * 导出数据（用于分析）
   */
  exportData() {
    return {
      samples: this.samples,
      stats: this.getDetailedStats(),
      trend: this.getMemoryTrend(),
      timestamp: Date.now()
    }
  }
  
  /**
   * 销毁监控器
   */
  destroy() {
    this.stopAutoMonitoring()
    this.reset()
    this.enabled = false
  }
}

/**
 * 创建全局监控实例
 */
export function createGlobalMonitor(options = {}) {
  const monitor = new MemoryMonitor(options)
  
  // 挂载到 window 供调试使用
  if (typeof window !== 'undefined') {
    window.__memoryMonitor = monitor
    
    // 添加便捷方法
    window.__checkMemory = () => monitor.logMemoryStatus()
    window.__memoryStats = () => monitor.logDetailedStats()
    
    console.log('%c[Memory Monitor] 已初始化', 'color: #10b981; font-weight: bold')
    console.log('使用 window.__checkMemory() 检查内存')
    console.log('使用 window.__memoryStats() 查看统计')
  }
  
  return monitor
}

/**
 * 快速内存检查（不需要实例化）
 */
export function quickMemoryCheck() {
  if (!performance.memory) {
    console.warn('Memory API 不可用')
    return null
  }
  
  const used = (performance.memory.usedJSHeapSize / 1048576).toFixed(2)
  const total = (performance.memory.totalJSHeapSize / 1048576).toFixed(2)
  const limit = (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2)
  const percentage = ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(2)
  
  console.log(`%c💾 内存快照: ${used} MB / ${limit} MB (${percentage}%)`, 'color: #3b82f6; font-size: 14px; font-weight: bold')
  
  return { used, total, limit, percentage }
}

