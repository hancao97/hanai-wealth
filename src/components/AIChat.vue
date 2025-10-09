<template>
  <div class="ai-chat-container">
    <!-- 浮动按钮 -->
    <div v-if="!isOpen" class="fab-wrapper">
      <!-- 外层脉冲波纹 -->
      <div class="pulse-ring pulse-ring-1"></div>
      <div class="pulse-ring pulse-ring-2"></div>
      <div class="pulse-ring pulse-ring-3"></div>
      
      <!-- 粒子特效 -->
      <div class="particles">
        <span class="particle" v-for="i in 8" :key="i" :style="getParticleStyle(i)"></span>
      </div>
      
      <!-- 主按钮 -->
      <button 
        @click="toggleChat" 
        class="ai-chat-fab"
      >
        <!-- 内部光芒 -->
        <div class="fab-glow"></div>
        <div class="fab-shine"></div>
        
        <!-- 内容 -->
        <div class="fab-content">
          <span class="fab-icon">🤖</span>
          <span class="fab-text">问问 HANAI</span>
        </div>
      </button>
    </div>

    <!-- 遮罩层 -->
    <transition name="backdrop-fade">
      <div v-if="isOpen" class="chat-backdrop" @click="toggleChat"></div>
    </transition>

    <!-- 聊天抽屉 -->
    <transition name="chat-slide">
      <div v-if="isOpen" class="ai-chat-dialog">
        <!-- 抽屉头部 -->
        <div class="chat-header">
          <div class="header-left">
            <div class="header-icon-wrapper">
              <span class="header-bot-icon">🤖</span>
            </div>
            <div class="header-info">
              <div class="header-title">HANAI</div>
              <div class="header-status">
                <span class="status-dot"></span>
                <span class="status-text">在线</span>
              </div>
            </div>
          </div>
          <button @click="toggleChat" class="close-btn">
            <span class="close-icon">✕</span>
          </button>
        </div>

        <!-- 消息列表 -->
        <div class="chat-messages" ref="messagesContainer">
          <div 
            v-for="(message, index) in messages" 
            :key="index"
            class="message-wrapper"
            :class="message.role"
          >
            <div class="message-bubble">
              <div class="message-content" v-html="formatMessage(message.content)"></div>
              <div class="message-time">{{ message.timestamp }}</div>
            </div>
          </div>

          <!-- 加载动画 -->
          <div v-if="isLoading" class="message-wrapper assistant">
            <div class="message-bubble loading-bubble">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>

          <!-- 欢迎消息 -->
          <div v-if="messages.length === 0 && !isLoading" class="welcome-message">
            <div class="welcome-icon">👋</div>
            <h4>您好！我是 HANAI 投资助手</h4>
            <p>可以帮您分析 <span style="color: #667eea;font-weight: 700;">{{stockData.company}}</span> 的价值潜力</p>
          </div>
        </div>

        <!-- 分析按钮区域 -->
        <div class="analysis-actions">
          <button 
            @click="startValueAnalysis" 
            class="analysis-btn"
            :disabled="isLoading"
          >
            <span class="btn-icon">💎</span>
            <span class="btn-content">
              <span class="btn-text">价值分析</span>
              <span class="btn-subtitle">深度解读投资价值</span>
            </span>
            <span class="btn-arrow">→</span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'

const props = defineProps({
  stockData: {
    type: Object,
    default: null
  }
})

const isOpen = ref(false)
const inputMessage = ref('')
const messages = ref([])
const isLoading = ref(false)
const messagesContainer = ref(null)
const inputTextarea = ref(null)
const showPulse = ref(true)

// 快捷问题（可自定义）
const quickQuestions = ref([
  // 在这里添加你的快捷问题
])

// 切换聊天窗口
const toggleChat = () => {
  isOpen.value = !isOpen.value
  showPulse.value = false
  
  if (isOpen.value) {
    nextTick(() => {
      inputTextarea.value?.focus()
    })
  }
}

// 发送消息
const handleSend = () => {
  if (!inputMessage.value.trim() || isLoading.value) return
  
  const userMessage = {
    role: 'user',
    content: inputMessage.value.trim(),
    timestamp: getCurrentTime()
  }
  
  messages.value.push(userMessage)
  inputMessage.value = ''
  
  // 滚动到底部
  nextTick(() => {
    scrollToBottom()
  })
  
  // 模拟AI回复
  simulateAIResponse(userMessage.content)
}

// 价值分析
const startValueAnalysis = () => {
  if (isLoading.value) return
  
  const analysisQuestion = `请对 ${props.stockData?.company || '该股票'} 进行全面的价值分析，包括：
1. 财务状况评估
2. 估值水平分析
3. 投资价值判断
4. 风险提示`
  
  const userMessage = {
    role: 'user',
    content: '价值分析',
    timestamp: getCurrentTime()
  }
  
  messages.value.push(userMessage)
  
  // 滚动到底部
  nextTick(() => {
    scrollToBottom()
  })
  
  // 模拟AI回复
  simulateAIResponse(analysisQuestion)
}

// 模拟AI响应
const simulateAIResponse = async (question) => {
  isLoading.value = true
  
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  const response = generateAIResponse(question)
  
  messages.value.push({
    role: 'assistant',
    content: response,
    timestamp: getCurrentTime()
  })
  
  isLoading.value = false
  
  nextTick(() => {
    scrollToBottom()
  })
}

// 生成AI响应（可自定义问答逻辑）
const generateAIResponse = (question) => {
  if (!props.stockData) {
    return '抱歉，当前没有股票数据可供分析。'
  }

  const stock = props.stockData
  
  // TODO: 在这里添加你自己的问答逻辑
  // 示例：根据 question 内容判断并返回相应的回答
  // 可以使用 stock 对象中的数据来生成个性化回答
  
  // 默认响应
  return `您好，您问到：<strong>"${question}"</strong>\n\n` +
    `当前正在分析 <strong>${stock.company}</strong> 的数据...\n\n` +
    `💡 请根据您的需求自定义 AI 问答逻辑。`
}

// 格式化消息（支持换行和加粗）
const formatMessage = (content) => {
  return content
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
}

// 获取当前时间
const getCurrentTime = () => {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 监听输入框高度变化
watch(inputMessage, () => {
  nextTick(() => {
    if (inputTextarea.value) {
      inputTextarea.value.style.height = 'auto'
      inputTextarea.value.style.height = inputTextarea.value.scrollHeight + 'px'
    }
  })
})

// 生成粒子样式
const getParticleStyle = (index) => {
  const angle = (360 / 8) * index
  const delay = index * 0.15
  return {
    '--angle': `${angle}deg`,
    '--delay': `${delay}s`
  }
}

onMounted(() => {
  // 3秒后隐藏脉冲动画
  setTimeout(() => {
    showPulse.value = false
  }, 3000)
})
</script>

<style scoped>
.ai-chat-container {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 9999;
}

/* 遮罩层 */
.chat-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 9997;
  cursor: pointer;
}

/* 遮罩层动画 */
.backdrop-fade-enter-active,
.backdrop-fade-leave-active {
  transition: all 0.3s ease;
}

.backdrop-fade-enter-from,
.backdrop-fade-leave-to {
  opacity: 0;
}

.backdrop-fade-enter-to,
.backdrop-fade-leave-from {
  opacity: 1;
}

/* 浮动按钮容器 */
.fab-wrapper {
  position: relative;
  display: inline-block;
}

/* 脉冲波纹动画 */
.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50px;
  border: 2px solid rgba(102, 126, 234, 0.3);
  animation: pulseRing 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  pointer-events: none;
}

.pulse-ring-1 {
  animation-delay: 0s;
}

.pulse-ring-2 {
  animation-delay: 1.5s;
}

.pulse-ring-3 {
  animation-delay: 3s;
}

@keyframes pulseRing {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.4;
  }
  50% {
    opacity: 0.15;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }
}

/* 粒子容器 */
.particles {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 140%;
  height: 140%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* 单个粒子 */
.particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 4px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, rgba(102, 126, 234, 0.4) 50%, transparent 100%);
  border-radius: 50%;
  transform-origin: 0 0;
  animation: particleFloat 5s ease-in-out infinite;
  animation-delay: var(--delay);
  filter: blur(0.5px);
}

@keyframes particleFloat {
  0%, 100% {
    transform: translate(-50%, -50%) rotate(var(--angle)) translateX(60px) scale(0);
    opacity: 0;
  }
  50% {
    transform: translate(-50%, -50%) rotate(var(--angle)) translateX(75px) scale(1);
    opacity: 0.8;
  }
}

/* 浮动按钮主体 */
.ai-chat-fab {
  position: relative;
  display: flex;
  align-items: center;
  border: none;
  border-radius: 50px;
  padding: 12px 20px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  
  /* 3D效果 */
  transform-style: preserve-3d;
  perspective: 1000px;
  
  /* 渐变背景 */
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  background-size: 200% 200%;
  
  /* 阴影效果 */
  box-shadow: 
    0 8px 24px rgba(102, 126, 234, 0.35),
    0 4px 12px rgba(118, 75, 162, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  
  /* 过渡动画 */
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  
  /* 背景动画 */
  animation: gradientShift 6s ease infinite;
}

@keyframes gradientShift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* 内部光晕 */
.fab-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.25) 0%, transparent 70%);
  animation: glowPulse 4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes glowPulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(0.9);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

/* 光线扫过效果 */
.fab-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.4) 50%, 
    transparent 100%);
  animation: shine 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes shine {
  0% {
    left: -100%;
  }
  50%, 100% {
    left: 200%;
  }
}

/* 按钮内容 */
.fab-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  z-index: 1;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.fab-icon {
  font-size: 20px;
  line-height: 1;
  animation: iconBounce 3s ease-in-out infinite;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  transition: transform 0.3s ease;
}

@keyframes iconBounce {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-2px) rotate(0deg);
  }
}

.fab-text {
  font-size: 14px;
  letter-spacing: 0.3px;
  font-weight: 700;
}

/* 悬停效果 */
.ai-chat-fab:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 
    0 16px 40px rgba(102, 126, 234, 0.5),
    0 8px 20px rgba(118, 75, 162, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    0 0 30px rgba(240, 147, 251, 0.3);
}

.ai-chat-fab:hover .fab-icon {
  animation: iconExcited 1.2s ease-in-out infinite;
  transform: scale(1.08);
}

@keyframes iconExcited {
  0%, 100% {
    transform: scale(1.08) rotate(0deg);
  }
  25% {
    transform: scale(1.1) rotate(-3deg);
  }
  50% {
    transform: scale(1.08) rotate(0deg);
  }
  75% {
    transform: scale(1.1) rotate(3deg);
  }
}

.ai-chat-fab:hover .fab-glow {
  animation: glowPulseHover 2s ease-in-out infinite;
}

@keyframes glowPulseHover {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.3);
  }
}

/* 按下效果 */
.ai-chat-fab:active {
  transform: translateY(-2px) scale(0.98);
  box-shadow: 
    0 8px 20px rgba(102, 126, 234, 0.4),
    0 4px 10px rgba(118, 75, 162, 0.3);
}

/* 聊天抽屉 */
.ai-chat-dialog {
  position: fixed;
  top: 0;
  right: 0;
  width: 480px;
  height: 100vh;
  background: white;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid rgba(148, 163, 184, 0.2);
  z-index: 9998;
}

/* 抽屉头部 - 紧凑设计 */
.chat-header {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  color: #1e293b;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
  position: relative;
  overflow: hidden;
}

/* 动态渐变底边 */
.chat-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, 
    transparent 0%,
    #667eea 20%,
    #764ba2 50%,
    #f093fb 80%,
    transparent 100%);
  background-size: 200% 100%;
  animation: headerLineFlow 3s linear infinite;
}

@keyframes headerLineFlow {
  0% {
    background-position: 0% 0%;
  }
  100% {
    background-position: 200% 0%;
  }
}

/* 左侧内容 */
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 1;
}

/* 图标容器 */
.header-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 4px 12px rgba(102, 126, 234, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  position: relative;
  overflow: hidden;
  animation: iconBreath 3s ease-in-out infinite;
}

@keyframes iconBreath {
  0%, 100% {
    transform: scale(1);
    box-shadow: 
      0 4px 12px rgba(102, 126, 234, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 
      0 6px 16px rgba(102, 126, 234, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.4);
  }
}

/* 图标光晕 */
.header-icon-wrapper::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
  animation: iconGlow 2s ease-in-out infinite;
}

@keyframes iconGlow {
  0%, 100% {
    opacity: 0.5;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

.header-bot-icon {
  font-size: 22px;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

/* 头部信息 */
.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: 0.5px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 在线状态 */
.header-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
  animation: statusPulse 2s ease-in-out infinite;
}

@keyframes statusPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
}

.status-text {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

.close-btn {
  background: rgba(148, 163, 184, 0.1);
  border: none;
  color: #64748b;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  z-index: 1;
  overflow: hidden;
}

.close-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.close-icon {
  position: relative;
  z-index: 1;
  transition: transform 0.3s ease;
}

.close-btn:hover {
  color: white;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.close-btn:hover::before {
  opacity: 1;
}

.close-btn:hover .close-icon {
  transform: rotate(90deg);
}

.close-btn:active {
  transform: scale(0.95);
}

/* 消息列表 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: 
    radial-gradient(circle at 20% 30%, rgba(102, 126, 234, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(118, 75, 162, 0.03) 0%, transparent 50%),
    linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
}

/* 消息列表装饰背景 */
.chat-messages::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: linear-gradient(180deg, rgba(102, 126, 234, 0.05) 0%, transparent 100%);
  pointer-events: none;
}

.chat-messages::-webkit-scrollbar {
  width: 8px;
}

.chat-messages::-webkit-scrollbar-track {
  background: rgba(148, 163, 184, 0.05);
  border-radius: 4px;
  margin: 8px 0;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.4), rgba(118, 75, 162, 0.4));
  border-radius: 4px;
  transition: all 0.3s ease;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.6), rgba(118, 75, 162, 0.6));
  box-shadow: 0 0 6px rgba(102, 126, 234, 0.3);
}

/* 消息气泡 */
.message-wrapper {
  display: flex;
  animation: messageSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.message-wrapper.user {
  justify-content: flex-end;
}

.message-wrapper.assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 75%;
  padding: 12px 16px;
  border-radius: 16px;
  position: relative;
  transition: all 0.3s ease;
}

.message-wrapper.user .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-size: 200% 200%;
  color: white;
  border-bottom-right-radius: 4px;
  box-shadow: 
    0 4px 12px rgba(102, 126, 234, 0.3),
    0 2px 6px rgba(118, 75, 162, 0.2);
  animation: messageGradient 3s ease infinite;
}

@keyframes messageGradient {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.message-wrapper.user .message-bubble:hover {
  transform: translateX(-4px);
  box-shadow: 
    0 6px 16px rgba(102, 126, 234, 0.4),
    0 3px 8px rgba(118, 75, 162, 0.3);
}

.message-wrapper.assistant .message-bubble {
  background: white;
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #334155;
  border-bottom-left-radius: 4px;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.05),
    0 1px 3px rgba(0, 0, 0, 0.03);
}

.message-wrapper.assistant .message-bubble:hover {
  transform: translateX(4px);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 2px 6px rgba(0, 0, 0, 0.05);
  border-color: rgba(102, 126, 234, 0.3);
}

.message-content {
  font-size: 14px;
  line-height: 1.6;
  word-wrap: break-word;
}

.message-content :deep(strong) {
  font-weight: 700;
}

.message-content :deep(em) {
  font-style: italic;
  opacity: 0.8;
}

.message-time {
  font-size: 11px;
  margin-top: 6px;
  opacity: 0.7;
  text-align: right;
}

/* 加载动画 */
.loading-bubble {
  padding: 16px 20px;
  background: linear-gradient(135deg, 
    rgba(102, 126, 234, 0.05) 0%, 
    rgba(118, 75, 162, 0.05) 100%);
  animation: loadingPulse 2s ease-in-out infinite;
}

@keyframes loadingPulse {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  50% {
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
  }
}

.typing-indicator {
  display: flex;
  gap: 6px;
  align-items: center;
}

.typing-indicator span {
  width: 10px;
  height: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  animation: typingBounce 1.4s infinite ease-in-out;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typingBounce {
  0%, 80%, 100% {
    transform: scale(0.6) translateY(0);
    opacity: 0.4;
  }
  40% {
    transform: scale(1.2) translateY(-6px);
    opacity: 1;
  }
}

/* 欢迎消息 */
.welcome-message {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
  animation: welcomeFadeIn 0.8s ease;
}

@keyframes welcomeFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.welcome-logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
  margin: 0 auto 20px;
  background: white;
  border-radius: 16px;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 16px;
  animation: welcomeIconFloat 3s ease-in-out infinite;
  display: inline-block;
}

@keyframes welcomeIconFloat {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-8px) rotate(-5deg);
  }
  50% {
    transform: translateY(0) rotate(0deg);
  }
  75% {
    transform: translateY(-8px) rotate(5deg);
  }
}

.welcome-message h4 {
  font-size: 18px;
  font-weight: 700;
  color: #334155;
  margin: 0 0 8px 0;
}

.welcome-message p {
  font-size: 14px;
  margin: 0 0 20px 0;
  line-height: 1.6;
}

.quick-questions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
}

.quick-question-btn {
  background: white;
  border: 2px solid rgba(102, 126, 234, 0.3);
  color: #667eea;
  padding: 10px 16px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
}

.quick-question-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: left 0.4s ease;
  z-index: -1;
}

.quick-question-btn:hover {
  color: white;
  transform: translateX(4px) scale(1.02);
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.quick-question-btn:hover::before {
  left: 0;
}

/* 分析按钮区域 */
.analysis-actions {
  padding: 16px 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

/* 主分析按钮 */
.analysis-btn {
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-size: 200% 200%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 
    0 6px 18px rgba(102, 126, 234, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

/* 按钮背景动画 */
.analysis-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%);
  transition: left 0.6s ease;
}

.analysis-btn:hover:not(:disabled)::before {
  left: 100%;
}

.analysis-btn:hover:not(:disabled) {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 
    0 12px 32px rgba(102, 126, 234, 0.4),
    0 6px 16px rgba(118, 75, 162, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  animation: btnGradientFlow 3s ease infinite;
}

@keyframes btnGradientFlow {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.analysis-btn:active:not(:disabled) {
  transform: translateY(-2px) scale(0.99);
}

.analysis-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-icon {
  font-size: 20px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  animation: iconFloat 3s ease-in-out infinite;
}

@keyframes iconFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

.btn-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.btn-text {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.btn-subtitle {
  font-size: 11px;
  opacity: 0.85;
  font-weight: 400;
}

.btn-arrow {
  font-size: 18px;
  font-weight: 700;
  transition: transform 0.3s ease;
}

.analysis-btn:hover:not(:disabled) .btn-arrow {
  transform: translateX(4px);
}

/* 抽屉滑入滑出动画 */
.chat-slide-enter-active,
.chat-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.chat-slide-enter-from,
.chat-slide-leave-to {
  transform: translateX(100%);
}

.chat-slide-enter-to,
.chat-slide-leave-from {
  transform: translateX(0);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .ai-chat-container {
    bottom: 20px;
    right: 20px;
  }

  .ai-chat-fab {
    padding: 10px 18px;
    font-size: 13px;
  }

  .fab-content .fab-icon {
    font-size: 18px;
  }

  .fab-content .fab-text {
    font-size: 13px;
  }

  .ai-chat-dialog {
    width: 400px;
    max-width: calc(100vw - 40px);
  }

  .chat-header {
    padding: 14px 16px;
  }

  .header-icon-wrapper {
    width: 36px;
    height: 36px;
  }

  .header-bot-icon {
    font-size: 20px;
  }

  .header-title {
    font-size: 15px;
  }

  .status-text {
    font-size: 10px;
  }

  .chat-messages {
    padding: 16px;
  }

  .message-bubble {
    max-width: 85%;
    padding: 10px 14px;
  }

  .message-content {
    font-size: 13px;
  }

  .analysis-actions {
    padding: 14px 16px;
  }

  .analysis-btn {
    padding: 10px 14px;
  }

  .btn-icon {
    font-size: 18px;
  }

  .btn-text {
    font-size: 14px;
  }

  .btn-subtitle {
    font-size: 10px;
  }

  .btn-arrow {
    font-size: 16px;
  }

  .welcome-logo {
    width: 56px;
    height: 56px;
    padding: 6px;
    margin-bottom: 16px;
  }

}

@media (max-width: 480px) {
  .ai-chat-dialog {
    width: 100vw;
    max-width: none;
  }

  .ai-chat-fab {
    padding: 12px 16px;
  }

  .fab-content .fab-text {
    display: none;
  }
  
  .fab-content .fab-icon {
    font-size: 22px;
  }
}
</style>

