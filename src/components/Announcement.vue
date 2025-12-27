<template>
  <div class="announcement-wrapper" :class="{ 'inline-mode': inline }">
    <!-- 公告按钮 -->
    <button 
      class="announcement-btn" 
      :class="{ 'has-unread': hasUnread, 'inline-btn': inline }"
      @click="toggleAnnouncement"
      :title="inline ? '查看站内公告' : '站内公告'"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      <span v-if="inline" class="btn-text">公告</span>
      <span v-if="hasUnread" class="unread-dot"></span>
    </button>

    <!-- 公告弹窗 -->
    <transition name="announcement-fade">
      <div v-if="showAnnouncement" class="announcement-overlay" @click.self="closeAnnouncement">
        <div class="announcement-modal">
          <div class="announcement-header">
            <h2>站内公告</h2>
            <button class="close-btn" @click="closeAnnouncement">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="announcement-content" v-html="renderedContent"></div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { marked } from 'marked'

// Props
const props = defineProps({
  inline: {
    type: Boolean,
    default: false
  }
})

const showAnnouncement = ref(false)
const rawContent = ref('')
const hasUnread = ref(false)
const STORAGE_KEY = 'announcement_last_read'

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true
})

const renderedContent = computed(() => {
  return marked(rawContent.value)
})

const toggleAnnouncement = () => {
  showAnnouncement.value = !showAnnouncement.value
  if (showAnnouncement.value) {
    markAsRead()
  }
}

const closeAnnouncement = () => {
  showAnnouncement.value = false
}

const markAsRead = () => {
  const currentTime = new Date().getTime()
  localStorage.setItem(STORAGE_KEY, currentTime.toString())
  hasUnread.value = false
}

const checkUnread = () => {
  const lastRead = localStorage.getItem(STORAGE_KEY)
  if (!lastRead) {
    hasUnread.value = true
    return
  }
  
  // 这里可以根据公告文件的修改时间来判断是否有新公告
  // 暂时简化处理：24小时内显示未读标记
  const lastReadTime = parseInt(lastRead)
  const now = new Date().getTime()
  const hoursPassed = (now - lastReadTime) / (1000 * 60 * 60)
  
  hasUnread.value = hoursPassed > 24
}

const loadAnnouncement = async () => {
  try {
    // 使用 Vite 的 base 路径，兼容 GitHub Pages 子路径部署
    const basePath = import.meta.env.BASE_URL || '/'
    const response = await fetch(`${basePath}announcement.md`)
    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`)
    }
    rawContent.value = await response.text()
    checkUnread()
  } catch (error) {
    console.error('加载公告失败:', error)
    rawContent.value = '# 加载失败\n\n无法加载公告内容，请稍后再试。'
  }
}

onMounted(() => {
  loadAnnouncement()
})

// 监听 ESC 键关闭弹窗
const handleKeydown = (e) => {
  if (e.key === 'Escape' && showAnnouncement.value) {
    closeAnnouncement()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
/* 包装器 */
.announcement-wrapper {
  position: relative;
}

.announcement-wrapper:not(.inline-mode) {
  position: fixed;
  z-index: 1000;
}

/* 公告按钮基础样式 */
.announcement-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #fbbf24;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(251, 191, 36, 0.2);
  transition: all 0.3s ease;
  color: #92400e;
  position: relative;
  font-weight: 600;
  font-size: 13px;
  flex-shrink: 0;
}

.announcement-btn:hover {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: white;
  border-color: #f59e0b;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}

.announcement-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
}

/* 内联模式样式 */
.announcement-btn.inline-btn {
  padding: 0 12px;
  border-radius: 10px;
  height: 44px;
  min-width: 72px;
}

/* 悬浮模式样式 */
.announcement-wrapper:not(.inline-mode) .announcement-btn {
  position: fixed;
  bottom: 200px;
  right: 30px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  padding: 0;
}

.announcement-wrapper:not(.inline-mode) .announcement-btn:hover {
  transform: translateY(-3px);
}

.announcement-btn.has-unread {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
  50% {
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.6);
  }
}

.unread-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
}

/* 内联模式的未读标记 */
.inline-btn .unread-dot {
  top: 4px;
  right: 4px;
}

/* 悬浮模式的未读标记 */
.announcement-wrapper:not(.inline-mode) .unread-dot {
  top: 8px;
  right: 8px;
}

/* 按钮文字 */
.btn-text {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

/* 按钮图标 */
.announcement-btn svg {
  flex-shrink: 0;
}

/* 弹窗遮罩 */
.announcement-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1001;
  backdrop-filter: blur(4px);
}

/* 弹窗主体 */
.announcement-modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 弹窗头部 */
.announcement-header {
  padding: 24px 28px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.announcement-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;
  color: #666;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #333;
}

/* 弹窗内容 */
.announcement-content {
  padding: 28px;
  overflow-y: auto;
  flex: 1;
  color: #2c3e50;
  line-height: 1.8;
}

/* Markdown 样式 */
.announcement-content :deep(h1) {
  font-size: 28px;
  margin-bottom: 20px;
  color: #2c3e50;
  border-bottom: 2px solid #667eea;
  padding-bottom: 12px;
}

.announcement-content :deep(h2) {
  font-size: 22px;
  margin-top: 32px;
  margin-bottom: 16px;
  color: #34495e;
}

.announcement-content :deep(h3) {
  font-size: 18px;
  margin-top: 24px;
  margin-bottom: 12px;
  color: #34495e;
}

.announcement-content :deep(p) {
  margin-bottom: 16px;
  color: #555;
}

.announcement-content :deep(ul),
.announcement-content :deep(ol) {
  margin-bottom: 16px;
  padding-left: 28px;
}

.announcement-content :deep(li) {
  margin-bottom: 8px;
  color: #555;
}

.announcement-content :deep(strong) {
  color: #2c3e50;
  font-weight: 600;
}

.announcement-content :deep(hr) {
  border: none;
  border-top: 1px solid #e8e8e8;
  margin: 24px 0;
}

.announcement-content :deep(a) {
  color: #667eea;
  text-decoration: none;
}

.announcement-content :deep(a:hover) {
  text-decoration: underline;
}

/* 动画效果 */
.announcement-fade-enter-active,
.announcement-fade-leave-active {
  transition: opacity 0.3s ease;
}

.announcement-fade-enter-from,
.announcement-fade-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  /* 悬浮模式响应式 */
  .announcement-wrapper:not(.inline-mode) .announcement-btn {
    bottom: 180px;
    right: 20px;
    width: 50px;
    height: 50px;
  }

  /* 内联模式响应式 */
  .announcement-btn.inline-btn {
    padding: 0 10px;
    height: 40px;
    min-width: 66px;
    font-size: 12px;
  }

  .announcement-btn.inline-btn svg {
    width: 16px;
    height: 16px;
  }
  
  .btn-text {
    font-size: 12px;
  }

  .announcement-modal {
    max-height: 85vh;
    border-radius: 12px;
  }

  .announcement-header {
    padding: 20px;
  }

  .announcement-header h2 {
    font-size: 20px;
  }

  .announcement-content {
    padding: 20px;
  }

  .announcement-content :deep(h1) {
    font-size: 24px;
  }

  .announcement-content :deep(h2) {
    font-size: 20px;
  }
}
</style>
