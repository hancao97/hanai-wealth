<template>
  <div class="wechat-contact-wrapper">
    <!-- 浮动按钮 -->
    <Transition name="float-button">
      <button 
        v-if="!isModalOpen && !isAIChatOpen"
        class="wechat-float-button"
        @click="openModal"
        :title="buttonTitle"
      >
        <div class="button-content">
          <svg class="wechat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
          <span class="button-text">联系作者</span>
        </div>
        <div class="button-pulse"></div>
      </button>
    </Transition>

    <!-- 二维码弹窗 -->
    <Transition name="modal">
      <div v-if="isModalOpen" class="modal-overlay" @click="closeModal">
        <div class="modal-content" @click.stop>
          <button class="modal-close" @click="closeModal" title="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          
          <div class="modal-header">
            <div class="modal-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
            </div>
            <h3>扫码添加开发者微信</h3>
            <p>欢迎交流投资心得与产品建议</p>
          </div>

          <div class="qrcode-container">
            <div class="qrcode-frame">
              <img 
                :src="qrcodePath" 
                alt="微信二维码" 
                class="qrcode-image"
                @error="handleImageError"
              />
              <div class="qrcode-corners">
                <div class="corner corner-tl"></div>
                <div class="corner corner-tr"></div>
                <div class="corner corner-bl"></div>
                <div class="corner corner-br"></div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <div class="footer-icon">📱</div>
            <p>使用微信扫一扫</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const isModalOpen = ref(false)
const isAIChatOpen = ref(false)
const qrcodePath = computed(() => '/wechat.jpg')
const buttonTitle = computed(() => '点击查看微信二维码')

// 监听 AI Chat 的状态
const checkAIChatStatus = () => {
  // 检查 AI Chat 抽屉是否打开
  const aiChatDialog = document.querySelector('.ai-chat-dialog')
  isAIChatOpen.value = aiChatDialog !== null
}

const openModal = () => {
  isModalOpen.value = true
  // 防止背景滚动
  document.body.style.overflow = 'hidden'
}

const closeModal = () => {
  isModalOpen.value = false
  // 恢复背景滚动
  document.body.style.overflow = ''
}

const handleImageError = (event) => {
  console.error('微信二维码图片加载失败:', qrcodePath.value)
  event.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23f1f5f9" width="200" height="200"/%3E%3Ctext x="100" y="100" text-anchor="middle" fill="%2364748b" font-size="14"%3E图片加载失败%3C/text%3E%3C/svg%3E'
}

// 使用 MutationObserver 监听 DOM 变化
let observer = null

onMounted(() => {
  // 初始检查
  checkAIChatStatus()
  
  // 创建观察器来监听 DOM 变化
  observer = new MutationObserver(() => {
    checkAIChatStatus()
  })
  
  // 观察整个 body 的子节点变化
  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})
</script>

<style scoped>
.wechat-contact-wrapper {
  position: fixed;
  z-index: 9999;
}

/* 浮动按钮样式 */
.wechat-float-button {
  position: fixed;
  bottom: 110px;
  right: 40px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #07c160 0%, #06ae56 100%);
  border: none;
  border-radius: 50px;
  box-shadow: 0 8px 24px rgba(7, 193, 96, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  z-index: 9998;
}

.wechat-float-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.wechat-float-button:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 12px 32px rgba(7, 193, 96, 0.5);
}

.wechat-float-button:hover::before {
  opacity: 1;
}

.wechat-float-button:active {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 20px rgba(7, 193, 96, 0.4);
}

.button-content {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  z-index: 1;
}

.wechat-icon {
  width: 20px;
  height: 20px;
  color: white;
  stroke-width: 2;
  flex-shrink: 0;
}

.button-text {
  font-size: 14px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.3px;
  white-space: nowrap;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.button-pulse {
  position: absolute;
  inset: -4px;
  border: 3px solid rgba(7, 193, 96, 0.6);
  border-radius: 50px;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}

/* 浮动按钮过渡动画 */
.float-button-enter-active {
  animation: floatIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.float-button-leave-active {
  animation: floatOut 0.3s ease-in;
}

@keyframes floatIn {
  0% {
    opacity: 0;
    transform: translateY(100px) scale(0.5) rotate(180deg);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(0deg);
  }
}

@keyframes floatOut {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(20px) scale(0.8);
  }
}

/* 弹窗遮罩层 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

/* 弹窗内容 */
.modal-content {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 24px;
  padding: 40px;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  position: relative;
  animation: modalBreathe 3s ease-in-out infinite;
}

@keyframes modalBreathe {
  0%, 100% {
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  }
  50% {
    box-shadow: 0 30px 60px rgba(7, 193, 96, 0.15), 0 25px 50px rgba(0, 0, 0, 0.25);
  }
}

/* 关闭按钮 */
.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  background: rgba(100, 116, 139, 0.1);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  padding: 0;
}

.modal-close svg {
  width: 20px;
  height: 20px;
  color: #64748b;
  transition: all 0.3s ease;
}

.modal-close:hover {
  background: rgba(239, 68, 68, 0.1);
  transform: rotate(90deg);
}

.modal-close:hover svg {
  color: #ef4444;
}

/* 弹窗头部 */
.modal-header {
  text-align: center;
  margin-bottom: 32px;
}

.modal-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, #07c160 0%, #06ae56 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 24px rgba(7, 193, 96, 0.3);
  animation: iconPulse 2s ease-in-out infinite;
}

@keyframes iconPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.modal-icon svg {
  width: 40px;
  height: 40px;
  color: white;
  stroke-width: 2;
}

.modal-header h3 {
  margin: 0 0 12px;
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, #1e293b 0%, #07c160 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.modal-header p {
  margin: 0;
  color: #64748b;
  font-size: 15px;
  font-weight: 500;
}

/* 二维码容器 */
.qrcode-container {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}

.qrcode-frame {
  position: relative;
  padding: 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.qrcode-image {
  display: block;
  width: 240px;
  height: 240px;
  border-radius: 8px;
  object-fit: cover;
}

/* 二维码四角装饰 */
.qrcode-corners {
  position: absolute;
  inset: 12px;
  pointer-events: none;
}

.corner {
  position: absolute;
  width: 24px;
  height: 24px;
  border: 3px solid #07c160;
}

.corner-tl {
  top: 0;
  left: 0;
  border-right: none;
  border-bottom: none;
  border-top-left-radius: 8px;
}

.corner-tr {
  top: 0;
  right: 0;
  border-left: none;
  border-bottom: none;
  border-top-right-radius: 8px;
}

.corner-bl {
  bottom: 0;
  left: 0;
  border-right: none;
  border-top: none;
  border-bottom-left-radius: 8px;
}

.corner-br {
  bottom: 0;
  right: 0;
  border-left: none;
  border-top: none;
  border-bottom-right-radius: 8px;
}

.corner {
  animation: cornerScan 3s ease-in-out infinite;
}

.corner-tl { animation-delay: 0s; }
.corner-tr { animation-delay: 0.2s; }
.corner-br { animation-delay: 0.4s; }
.corner-bl { animation-delay: 0.6s; }

@keyframes cornerScan {
  0%, 100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

/* 弹窗底部 */
.modal-footer {
  text-align: center;
  padding-top: 24px;
  border-top: 2px dashed rgba(148, 163, 184, 0.2);
}

.footer-icon {
  font-size: 32px;
  margin-bottom: 12px;
  animation: phoneShake 2s ease-in-out infinite;
}

@keyframes phoneShake {
  0%, 100% { transform: rotate(0deg); }
  10%, 30% { transform: rotate(-5deg); }
  20%, 40% { transform: rotate(5deg); }
  50% { transform: rotate(0deg); }
}

.modal-footer p {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 700;
  color: #334155;
}

.footer-hint {
  display: block;
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}

/* 弹窗过渡动画 */
.modal-enter-active {
  animation: modalIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-leave-active {
  animation: modalOut 0.3s ease-in;
}

@keyframes modalIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.modal-enter-active .modal-content {
  animation: modalContentIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-leave-active .modal-content {
  animation: modalContentOut 0.3s ease-in;
}

@keyframes modalContentIn {
  0% {
    opacity: 0;
    transform: scale(0.7) translateY(50px) rotate(-5deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0) rotate(0deg);
  }
}

@keyframes modalContentOut {
  0% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  100% {
    opacity: 0;
    transform: scale(0.8) translateY(30px);
  }
}

@keyframes modalOut {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .wechat-float-button {
    bottom: 92px;
    right: 24px;
    padding: 10px 18px;
  }

  .button-content {
    gap: 6px;
  }

  .wechat-icon {
    width: 18px;
    height: 18px;
  }

  .button-text {
    font-size: 13px;
  }

  .modal-content {
    padding: 32px 24px;
    margin: 16px;
  }

  .modal-header h3 {
    font-size: 24px;
  }

  .modal-icon {
    width: 64px;
    height: 64px;
  }

  .modal-icon svg {
    width: 36px;
    height: 36px;
  }

  .qrcode-image {
    width: 200px;
    height: 200px;
  }
}

@media (max-width: 480px) {
  .wechat-float-button {
    bottom: 84px;
    right: 20px;
    padding: 10px 16px;
  }

  .button-content {
    gap: 6px;
  }

  .wechat-icon {
    width: 16px;
    height: 16px;
  }

  .button-text {
    font-size: 12px;
  }

  .modal-content {
    padding: 24px 20px;
  }

  .modal-header h3 {
    font-size: 20px;
  }

  .modal-header p {
    font-size: 13px;
  }

  .qrcode-image {
    width: 180px;
    height: 180px;
  }

  .qrcode-frame {
    padding: 16px;
  }
}
</style>

