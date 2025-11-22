<template>
  <Transition name="modal">
    <div v-if="isVisible" class="modal-overlay" @click="handleOverlayClick">
      <div class="modal-container" @click.stop>
        <!-- 头部 -->
        <div class="modal-header">
          <div class="header-content">
            <div class="header-icon">📊</div>
            <div class="header-text">
              <h2>HANAI 价值周报</h2>
              <p v-if="reportData">生成日期：{{ formatDate(reportData.date) }}</p>
            </div>
          </div>
          <button class="close-btn" @click="close" title="关闭">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- 内容区域 -->
        <div class="modal-body">
          <div v-if="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>正在加载周报...</p>
          </div>

          <div v-else-if="error" class="error-state">
            <div class="error-icon">⚠️</div>
            <p>{{ error }}</p>
            <button class="retry-btn" @click="loadReport">重试</button>
          </div>

          <div v-else-if="reportData" class="report-content">
            <!-- AI分析报告 -->
            <div class="analysis-section">
              <div class="analysis-content" v-html="formattedAnalysis"></div>
            </div>

            <!-- Prompt查看区域（折叠面板） -->
            <div class="prompt-section">
              <button 
                class="prompt-toggle" 
                @click="showPrompt = !showPrompt"
                :class="{ active: showPrompt }"
              >
                <span class="toggle-icon">{{ showPrompt ? '▼' : '▶' }}</span>
                <span class="toggle-text">查看分析Prompt</span>
                <span class="toggle-hint">(点击{{ showPrompt ? '收起' : '展开' }})</span>
              </button>
              
              <Transition name="collapse">
                <div v-if="showPrompt" class="prompt-content-wrapper">
                  <div class="prompt-header">
                    <span class="prompt-label">完整 Prompt 内容</span>
                    <button class="copy-btn" @click="copyPrompt" :disabled="copying">
                      <svg v-if="!copied" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>{{ copied ? '已复制' : '复制' }}</span>
                    </button>
                  </div>
                  <div class="prompt-content">
                    <pre>{{ reportData.prompt }}</pre>
                  </div>
                </div>
              </Transition>
            </div>
          </div>

          <div v-else class="empty-state">
            <div class="empty-icon">📭</div>
            <p>暂无价值周报数据</p>
            <p class="empty-hint">周报将在每周五晚上9点自动生成</p>
          </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="modal-footer" v-if="reportData && !loading && !error">
          <button class="action-btn export-btn" @click="exportToPDF" :disabled="exporting">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>{{ exporting ? '导出中...' : '导出PDF' }}</span>
          </button>
          <button class="action-btn close-btn-footer" @click="close">
            关闭
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useStockDataStore } from '@/stores/stockData'
import { storeToRefs } from 'pinia'
import html2pdf from 'html2pdf.js'
import { marked } from 'marked'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'close'])

const stockStore = useStockDataStore()
const { weeklyReport } = storeToRefs(stockStore)
const { loadWeeklyReport } = stockStore

const isVisible = ref(props.visible)
const loading = ref(false)
const error = ref(null)
const showPrompt = ref(false)
const exporting = ref(false)
const copying = ref(false)
const copied = ref(false)

const reportData = computed(() => weeklyReport.value)

// 配置 marked
marked.setOptions({
  breaks: true,        // 支持 GFM 换行（单个 \n 转为 <br>）
  gfm: true,          // 启用 GitHub Flavored Markdown
  headerIds: false,   // 不生成标题 ID
  mangle: false       // 不混淆邮箱地址
})

const formattedAnalysis = computed(() => {
  if (!reportData.value || !reportData.value.analysis) {
    return ''
  }
  
  // 使用 marked 渲染 Markdown
  return marked.parse(reportData.value.analysis)
})

watch(() => props.visible, (newVal) => {
  isVisible.value = newVal
  if (newVal) {
    loadReport()
  }
})

watch(isVisible, (newVal) => {
  emit('update:visible', newVal)
})

async function loadReport() {
  loading.value = true
  error.value = null
  
  try {
    await loadWeeklyReport()
  } catch (err) {
    error.value = '周报加载失败，请稍后重试'
    console.error('加载周报失败:', err)
  } finally {
    loading.value = false
  }
}

function handleOverlayClick() {
  close()
}

function close() {
  isVisible.value = false
  emit('close')
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  })
}

async function copyPrompt() {
  if (copying.value || !reportData.value || !reportData.value.prompt) return
  
  copying.value = true
  
  try {
    await navigator.clipboard.writeText(reportData.value.prompt)
    copied.value = true
    
    // 2秒后恢复按钮状态
    setTimeout(() => {
      copied.value = false
    }, 2000)
    
    console.log('✅ Prompt已复制到剪贴板')
  } catch (err) {
    console.error('❌ 复制失败:', err)
    
    // 降级方案：使用旧的 execCommand 方法
    try {
      const textarea = document.createElement('textarea')
      textarea.value = reportData.value.prompt
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 2000)
      
      console.log('✅ Prompt已复制到剪贴板（降级方案）')
    } catch (fallbackErr) {
      console.error('❌ 降级复制方案也失败:', fallbackErr)
      alert('复制失败，请手动选择文本复制')
    }
  } finally {
    copying.value = false
  }
}

async function exportToPDF() {
  if (exporting.value || !reportData.value) return
  
  exporting.value = true
  
  try {
    // 创建一个独立的、不在DOM中的容器
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.top = '0'
    container.style.width = '210mm' // A4 宽度
    container.style.backgroundColor = '#ffffff'
    document.body.appendChild(container)
    
    // 创建PDF内容
    const content = document.createElement('div')
    content.style.padding = '20px'
    content.style.fontFamily = '"Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif'
    content.style.lineHeight = '1.6'
    content.style.color = '#333'
    content.style.fontSize = '12px'
    
    // 标题
    const title = document.createElement('h1')
    title.textContent = 'HANAI 价值周报'
    title.style.textAlign = 'center'
    title.style.marginBottom = '10px'
    title.style.fontSize = '24px'
    title.style.color = '#667eea'
    title.style.fontWeight = 'bold'
    content.appendChild(title)
    
    // 日期
    const dateInfo = document.createElement('p')
    dateInfo.textContent = `生成日期：${formatDate(reportData.value.date)}`
    dateInfo.style.textAlign = 'center'
    dateInfo.style.marginBottom = '20px'
    dateInfo.style.color = '#666'
    dateInfo.style.fontSize = '14px'
    content.appendChild(dateInfo)
    
    // 分隔线
    const hr = document.createElement('hr')
    hr.style.border = 'none'
    hr.style.borderTop = '1px solid #e2e8f0'
    hr.style.margin = '20px 0'
    content.appendChild(hr)
    
    // AI分析内容
    const analysisDiv = document.createElement('div')
    analysisDiv.innerHTML = formattedAnalysis.value
    
    // 为分析内容添加样式
    analysisDiv.style.fontSize = '11px'
    analysisDiv.style.lineHeight = '1.6'
    
    // 为所有子元素设置适当的样式
    const styleAnalysisContent = (element) => {
      const h1s = element.querySelectorAll('h1')
      h1s.forEach(h => {
        h.style.fontSize = '18px'
        h.style.marginTop = '16px'
        h.style.marginBottom = '12px'
        h.style.fontWeight = 'bold'
        h.style.color = '#1e293b'
      })
      
      const h2s = element.querySelectorAll('h2')
      h2s.forEach(h => {
        h.style.fontSize = '16px'
        h.style.marginTop = '14px'
        h.style.marginBottom = '10px'
        h.style.fontWeight = 'bold'
        h.style.color = '#334155'
      })
      
      const h3s = element.querySelectorAll('h3')
      h3s.forEach(h => {
        h.style.fontSize = '14px'
        h.style.marginTop = '12px'
        h.style.marginBottom = '8px'
        h.style.fontWeight = '600'
        h.style.color = '#475569'
      })
      
      const ps = element.querySelectorAll('p')
      ps.forEach(p => {
        p.style.marginTop = '8px'
        p.style.marginBottom = '8px'
      })
      
      const uls = element.querySelectorAll('ul, ol')
      uls.forEach(ul => {
        ul.style.marginTop = '8px'
        ul.style.marginBottom = '8px'
        ul.style.paddingLeft = '20px'
      })
      
      const lis = element.querySelectorAll('li')
      lis.forEach(li => {
        li.style.marginTop = '4px'
        li.style.marginBottom = '4px'
      })
      
      const strongs = element.querySelectorAll('strong')
      strongs.forEach(s => {
        s.style.fontWeight = 'bold'
        s.style.color = '#1e293b'
      })
    }
    
    styleAnalysisContent(analysisDiv)
    content.appendChild(analysisDiv)
    
    // 如果Prompt展开了，也包含进去
    if (showPrompt.value) {
      const promptHr = document.createElement('hr')
      promptHr.style.border = 'none'
      promptHr.style.borderTop = '2px solid #e2e8f0'
      promptHr.style.margin = '30px 0 20px 0'
      content.appendChild(promptHr)
      
      const promptTitle = document.createElement('h2')
      promptTitle.textContent = '分析 Prompt'
      promptTitle.style.fontSize = '16px'
      promptTitle.style.marginBottom = '12px'
      promptTitle.style.fontWeight = 'bold'
      promptTitle.style.color = '#334155'
      content.appendChild(promptTitle)
      
      const promptPre = document.createElement('pre')
      promptPre.textContent = reportData.value.prompt
      promptPre.style.whiteSpace = 'pre-wrap'
      promptPre.style.backgroundColor = '#f8fafc'
      promptPre.style.padding = '12px'
      promptPre.style.borderRadius = '4px'
      promptPre.style.fontSize = '10px'
      promptPre.style.lineHeight = '1.5'
      promptPre.style.color = '#475569'
      promptPre.style.border = '1px solid #e2e8f0'
      content.appendChild(promptPre)
    }
    
    container.appendChild(content)
    
    // 配置PDF选项
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `HANAI价值周报_${reportData.value.date}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    }
    
    // 生成PDF
    await html2pdf().set(opt).from(content).save()
    
    // 清理临时元素
    document.body.removeChild(container)
    
    console.log('✅ PDF导出成功')
  } catch (err) {
    console.error('❌ PDF导出失败:', err)
    alert('PDF导出失败，请稍后重试')
  } finally {
    exporting.value = false
  }
}

// 组件挂载时加载周报
if (props.visible) {
  loadReport()
}
</script>

<style scoped>
/* 模态框动画 */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9) translateY(-20px);
}

/* 折叠动画 */
.collapse-enter-active, .collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.collapse-enter-from, .collapse-leave-to {
  max-height: 0;
  opacity: 0;
}

.collapse-enter-to, .collapse-leave-from {
  max-height: 1000px;
  opacity: 1;
}

/* 模态框覆盖层 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

/* 模态框容器 */
.modal-container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  max-width: 1280px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

/* 头部 */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-bottom: 1px solid #e2e8f0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  font-size: 32px;
  line-height: 1;
}

.header-text h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

.header-text p {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #64748b;
}

.close-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

/* 内容区域 */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  margin-top: 16px;
  color: #64748b;
  font-size: 14px;
}

/* 错误状态 */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-state p {
  color: #ef4444;
  font-size: 16px;
  margin-bottom: 24px;
}

.retry-btn {
  padding: 10px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: #5568d3;
  transform: translateY(-1px);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  color: #64748b;
  font-size: 16px;
  margin: 4px 0;
}

.empty-hint {
  font-size: 14px !important;
  color: #94a3b8 !important;
}

/* 报告内容 */
.report-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* AI分析部分 */
.analysis-section h3 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.section-icon {
  font-size: 24px;
}

.analysis-content {
  background: #f8fafc;
  border-radius: 12px;
  padding: 24px;
  line-height: 1.8;
  color: #334155;
}

.analysis-content :deep(h2) {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 24px 0 16px 0;
}

.analysis-content :deep(h3) {
  font-size: 18px;
  font-weight: 600;
  color: #334155;
  margin: 20px 0 12px 0;
}

.analysis-content :deep(h4) {
  font-size: 16px;
  font-weight: 600;
  color: #475569;
  margin: 16px 0 10px 0;
}

.analysis-content :deep(p) {
  margin: 12px 0;
  line-height: 1.8;
}

.analysis-content :deep(ul) {
  margin: 12px 0;
  padding-left: 24px;
  list-style-type: disc;
}

.analysis-content :deep(ol) {
  margin: 12px 0;
  padding-left: 24px;
  list-style-type: decimal;
}

.analysis-content :deep(li) {
  margin: 6px 0;
  line-height: 1.6;
}

.analysis-content :deep(strong) {
  font-weight: 600;
  color: #1e293b;
}

.analysis-content :deep(em) {
  font-style: italic;
  color: #475569;
}

.analysis-content :deep(code) {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 0.9em;
  color: #e11d48;
}

.analysis-content :deep(pre) {
  background: #1e293b;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
}

.analysis-content :deep(pre code) {
  background: transparent;
  color: #e2e8f0;
  padding: 0;
}

.analysis-content :deep(blockquote) {
  border-left: 4px solid #667eea;
  padding-left: 16px;
  margin: 16px 0;
  color: #64748b;
  font-style: italic;
}

.analysis-content :deep(hr) {
  border: none;
  border-top: 2px solid #e2e8f0;
  margin: 24px 0;
}

.analysis-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

.analysis-content :deep(th),
.analysis-content :deep(td) {
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  text-align: left;
}

.analysis-content :deep(th) {
  background: #f8fafc;
  font-weight: 600;
}

.analysis-content :deep(a) {
  color: #667eea;
  text-decoration: none;
}

.analysis-content :deep(a:hover) {
  text-decoration: underline;
}

/* Prompt部分 */
.prompt-section {
  border-top: 1px solid #e2e8f0;
  padding-top: 24px;
}

.prompt-toggle {
  width: 100%;
  padding: 16px 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 15px;
  font-weight: 600;
  color: #475569;
}

.prompt-toggle:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.prompt-toggle.active {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.toggle-icon {
  font-size: 12px;
  transition: transform 0.2s;
}

.toggle-text {
  flex: 1;
  text-align: left;
}

.toggle-hint {
  font-size: 13px;
  font-weight: 400;
  opacity: 0.7;
}

.prompt-content-wrapper {
  margin-top: 16px;
}

.prompt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
}

.prompt-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #667eea;
  color: #667eea;
}

.copy-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.copy-btn svg {
  width: 16px;
  height: 16px;
}

.copy-btn:hover:not(:disabled) svg {
  stroke: #667eea;
}

.prompt-content {
  background: #1e293b;
  border: 1px solid #e2e8f0;
  border-radius: 0 0 8px 8px;
  padding: 20px;
  overflow-x: auto;
}

.prompt-content pre {
  margin: 0;
  color: #e2e8f0;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 底部操作栏 */
.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px 32px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 0 0 16px 16px;
}

.action-btn {
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.export-btn {
  background: #667eea;
  color: white;
}

.export-btn:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.close-btn-footer {
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.close-btn-footer:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #475569;
}

/* 响应式 */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 0;
  }
  
  .modal-container {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
  
  .modal-header {
    padding: 20px;
  }
  
  .header-text h2 {
    font-size: 20px;
  }
  
  .modal-body {
    padding: 20px;
  }
  
  .modal-footer {
    padding: 16px 20px;
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
  }
}
</style>

