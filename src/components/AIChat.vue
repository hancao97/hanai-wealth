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

    <!-- 聊天对话框 -->
    <transition name="chat-slide">
      <div v-if="isOpen" class="ai-chat-dialog">
        <!-- 对话框头部 -->
        <div class="chat-header">
          <div class="header-content">
            <div class="header-text">
              <h3>HANAI AI 投资助手</h3>
            </div>
          </div>
          <button @click="toggleChat" class="close-btn">✕</button>
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
            <h4>您好！我是AI投资助手</h4>
            <p>我可以帮您分析这只股票，回答您的投资疑问。</p>
            <div v-if="quickQuestions.length > 0" class="quick-questions">
              <button 
                v-for="(question, index) in quickQuestions" 
                :key="index"
                @click="askQuestion(question)"
                class="quick-question-btn"
              >
                {{ question }}
              </button>
            </div>
          </div>
        </div>

        <!-- 输入框 -->
        <div class="chat-input-container">
          <textarea
            v-model="inputMessage"
            @keydown.enter.prevent="handleSend"
            placeholder="输入您的问题..."
            class="chat-input"
            rows="1"
            ref="inputTextarea"
          ></textarea>
          <button 
            @click="handleSend" 
            class="send-btn"
            :disabled="!inputMessage.trim() || isLoading"
          >
            <span class="send-icon">📤</span>
          </button>
        </div>

        <!-- 提示信息 -->
        <div class="chat-footer">
          <span class="footer-hint">💡 提示：AI助手基于股票数据提供参考意见，投资需谨慎</span>
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

// 快速提问
const askQuestion = (question) => {
  inputMessage.value = question
  handleSend()
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

/* 聊天对话框 */
.ai-chat-dialog {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 420px;
  height: 600px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.2);
}

/* 对话框头部 */
.chat-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 24px 24px 0 0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
  background: white;
  border-radius: 8px;
  padding: 4px;
}

.header-icon {
  font-size: 32px;
  line-height: 1;
}

.header-text h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.header-text p {
  margin: 4px 0 0 0;
  font-size: 12px;
  opacity: 0.9;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

/* 消息列表 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}

/* 消息气泡 */
.message-wrapper {
  display: flex;
  animation: messageSlideIn 0.3s ease;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
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
}

.message-wrapper.user .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.message-wrapper.assistant .message-bubble {
  background: white;
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #334155;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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
}

.typing-indicator {
  display: flex;
  gap: 6px;
  align-items: center;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #94a3b8;
  border-radius: 50%;
  animation: typingBounce 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typingBounce {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 欢迎消息 */
.welcome-message {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
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
  border: 1px solid rgba(102, 126, 234, 0.3);
  color: #667eea;
  padding: 10px 16px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.quick-question-btn:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: translateX(4px);
  border-color: transparent;
}

/* 输入框容器 */
.chat-input-container {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: white;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  align-items: flex-end;
}

.chat-input {
  flex: 1;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  max-height: 100px;
  overflow-y: auto;
  transition: all 0.3s ease;
}

.chat-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.chat-input::placeholder {
  color: #94a3b8;
}

.send-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-icon {
  font-size: 18px;
  line-height: 1;
}

/* 底部提示 */
.chat-footer {
  padding: 12px 20px;
  background: #f8fafc;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  text-align: center;
}

.footer-hint {
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
}

/* 过渡动画 */
.chat-slide-enter-active,
.chat-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.chat-slide-enter-from,
.chat-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
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
    width: calc(100vw - 40px);
    height: calc(100vh - 100px);
    max-width: 400px;
    bottom: 20px;
    right: 20px;
  }

  .chat-header {
    padding: 16px;
  }

  .header-logo {
    width: 32px;
    height: 32px;
    padding: 3px;
  }

  .header-text h3 {
    font-size: 16px;
  }

  .header-text p {
    font-size: 11px;
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

  .chat-input-container {
    padding: 12px 16px;
  }

  .chat-input {
    font-size: 13px;
    padding: 8px 12px;
  }

  .send-btn {
    width: 40px;
    height: 40px;
  }

  .send-icon {
    font-size: 16px;
  }

  .welcome-logo {
    width: 56px;
    height: 56px;
    padding: 6px;
    margin-bottom: 16px;
  }

  .chat-footer {
    padding: 10px 16px;
  }

  .footer-hint {
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .ai-chat-dialog {
    width: calc(100vw - 20px);
    height: calc(100vh - 60px);
    max-width: none;
    bottom: 10px;
    right: 10px;
    border-radius: 20px;
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

