<template>
  <div 
    :class="['animated-counter', `counter-${variant}`, { 'counter-loading': loading, 'counter-highlighted': highlighted }]"
    @click="$emit('click')"
  >
    <div class="counter-content">
      <div class="counter-value-wrapper">
        <AnimatedNumber
          :value="value"
          :duration="duration"
          :decimals="decimals"
          :prefix="prefix"
          :suffix="suffix"
          :separator="separator"
          :easing="easing"
          class="counter-value"
        />
        <div class="counter-particles" v-if="showParticles">
          <div 
            v-for="n in 6" 
            :key="n" 
            class="particle" 
            :style="{ 
              '--delay': n * 0.1 + 's',
              '--x': Math.random() * 40 - 20 + 'px',
              '--y': Math.random() * 40 - 20 + 'px'
            }"
          />
        </div>
      </div>
      
      <div class="counter-label">{{ label }}</div>
      <div class="counter-description">{{ description || '' }}</div>
      
      <div class="counter-trend" v-if="trend">
        <span class="trend-indicator" :class="trend.type">
          {{ trend.icon }}
        </span>
        <span class="trend-text">{{ trend.text }}</span>
      </div>
    </div>
    
    <div class="counter-background">
      <div class="bg-pattern"></div>
      <div class="bg-glow"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import AnimatedNumber from './AnimatedNumber.vue'

const props = defineProps({
  value: {
    type: Number,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'default',
    validator: value => ['default', 'primary', 'success', 'warning', 'error', 'info'].includes(value)
  },
  duration: {
    type: Number,
    default: 1000
  },
  decimals: {
    type: Number,
    default: 0
  },
  prefix: {
    type: String,
    default: ''
  },
  suffix: {
    type: String,
    default: ''
  },
  separator: {
    type: String,
    default: ','
  },
  easing: {
    type: String,
    default: 'easeOutCubic'
  },
  trend: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  clickable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const highlighted = ref(false)
const showParticles = ref(false)

// 图标组件映射
const iconComponents = {
  chart: () => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"></polyline>
  </svg>`,
  trending: () => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="23,6 13.5,15.5 8.5,10.5 1,18"></polyline>
    <polyline points="17,6 23,6 23,12"></polyline>
  </svg>`,
  dollar: () => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>`,
  users: () => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>`,
  percent: () => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="19" y1="5" x2="5" y2="19"></line>
    <circle cx="6.5" cy="6.5" r="2.5"></circle>
    <circle cx="17.5" cy="17.5" r="2.5"></circle>
  </svg>`
}

const iconComponent = computed(() => {
  if (!props.icon || !iconComponents[props.icon]) return null
  return {
    template: iconComponents[props.icon]()
  }
})

// 监听值变化，触发高亮效果
watch(() => props.value, (newVal, oldVal) => {
  if (newVal !== oldVal && oldVal !== undefined) {
    highlighted.value = true
    showParticles.value = true
    
    setTimeout(() => {
      highlighted.value = false
      showParticles.value = false
    }, 1500)
  }
})

onMounted(() => {
  // 初始化时的进入动画
  setTimeout(() => {
    highlighted.value = true
    showParticles.value = true
    
    setTimeout(() => {
      highlighted.value = false
      showParticles.value = false
    }, 1000)
  }, 200)
})
</script>

<style scoped>
.animated-counter {
  position: relative;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-height: 160px;
  height: 100%; /* 使用父容器的高度 */
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  overflow: hidden;
  cursor: default;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  justify-content: flex-start; /* 从顶部开始布局 */
}

.animated-counter.clickable {
  cursor: pointer;
}

.animated-counter::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(59, 130, 246, 0.05) 60deg, transparent 120deg);
  animation: rotate 20s linear infinite;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.animated-counter:hover::before,
.animated-counter.counter-highlighted::before {
  opacity: 1;
}

.animated-counter:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
}

.animated-counter.counter-highlighted {
  transform: translateY(-6px) scale(1.03);
  box-shadow: 0 20px 60px rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
}

/* 加载状态 */
.animated-counter.counter-loading {
  opacity: 0.7;
  pointer-events: none;
}

.animated-counter.counter-loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  margin: -10px 0 0 -10px;
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 图标样式 */
.counter-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
  position: relative;
  z-index: 2;
  margin-bottom: 16px; /* 增加底部间距 */
  margin-top: 0; /* 确保顶部对齐 */
}

.counter-icon svg {
  width: 28px;
  height: 28px;
}

/* 内容区域 */
.counter-content {
  flex: 1;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: flex-start; /* 从顶部开始布局内容 */
  align-items: center;
  width: 100%;
  min-height: 0; /* 允许内容收缩 */
}

.counter-value-wrapper {
  position: relative;
  margin-bottom: 12px; /* 增加数值区域底部间距 */
}

.counter-value {
  font-size: 28px;
  font-weight: 800;
  line-height: 1.1;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0; /* 移除数值的底部边距 */
}

.counter-label {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px; /* 增加标签底部间距 */
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1.2; /* 确保文本行高一致 */
}

.counter-description {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.4;
  margin-bottom: 12px; /* 增加描述底部间距 */
  min-height: 1.4em; /* 确保即使没有描述也占用空间 */
}

.counter-trend {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 20px; /* 确保趋势区域有最小高度 */
  font-size: 12px;
  font-weight: 500;
}

.trend-indicator {
  font-size: 14px;
  transition: transform 0.3s ease;
}

.trend-indicator.up {
  color: #10b981;
}

.trend-indicator.down {
  color: #ef4444;
}

.trend-indicator.neutral {
  color: #64748b;
}

.trend-text {
  color: #6b7280;
}

/* 粒子效果 */
.counter-particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: #3b82f6;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  opacity: 0;
  animation: particleFloat 1.5s ease-out var(--delay, 0s) both;
}

@keyframes particleFloat {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(var(--x, 0), var(--y, 0)) scale(0);
  }
}

/* 背景效果 */
.counter-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  opacity: 0.5;
}

.bg-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                    radial-gradient(circle at 75% 75%, rgba(16, 185, 129, 0.1) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.animated-counter:hover .bg-pattern,
.animated-counter.counter-highlighted .bg-pattern {
  opacity: 1;
}

.bg-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 120%;
  height: 120%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.animated-counter.counter-highlighted .bg-glow {
  opacity: 1;
  animation: glow 1.5s ease-in-out;
}

/* 选中状态 */
.animated-counter.counter-active {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important;
  border-color: #1d4ed8 !important;
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 16px 48px rgba(59, 130, 246, 0.3) !important;
}

.animated-counter.counter-active .counter-value {
  color: white !important;
  -webkit-text-fill-color: white !important;
}

.animated-counter.counter-active .counter-label {
  color: rgba(255, 255, 255, 0.95) !important;
}

.animated-counter.counter-active .counter-description {
  color: rgba(255, 255, 255, 0.8) !important;
}

.animated-counter.counter-active .trend-text {
  color: rgba(255, 255, 255, 0.9) !important;
}

.animated-counter.counter-active .counter-icon {
  background: rgba(255, 255, 255, 0.2) !important;
  color: white !important;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2) !important;
}

/* 变体样式 */
.animated-counter.counter-primary .counter-icon {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
}

.animated-counter.counter-success .counter-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);
}

.animated-counter.counter-warning .counter-icon {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  box-shadow: 0 8px 16px rgba(245, 158, 11, 0.3);
}

.animated-counter.counter-error .counter-icon {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3);
}

.animated-counter.counter-info .counter-icon {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
  box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
}

.animated-counter.counter-default .counter-icon {
  background: linear-gradient(135deg, #64748b 0%, #475569 100%);
  color: white;
  box-shadow: 0 8px 16px rgba(100, 116, 139, 0.3);
}

/* 动画 */
@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes glow {
  0%, 100% { 
    opacity: 0.1;
    transform: translate(-50%, -50%) scale(1);
  }
  50% { 
    opacity: 0.3;
    transform: translate(-50%, -50%) scale(1.1);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .animated-counter {
    padding: 16px 12px;
    min-height: 140px;
  }
  
  .counter-icon {
    width: 40px;
    height: 40px;
    margin-bottom: 8px;
  }
  
  .counter-icon svg {
    width: 20px;
    height: 20px;
  }
  
  .counter-value {
    font-size: 24px;
  }
  
  .counter-label {
    font-size: 12px;
  }
  
  .counter-description {
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .animated-counter {
    padding: 14px 10px;
    min-height: 120px;
  }
  
  .counter-icon {
    width: 36px;
    height: 36px;
    margin-bottom: 6px;
  }
  
  .counter-icon svg {
    width: 18px;
    height: 18px;
  }
  
  .counter-value {
    font-size: 20px;
  }
  
  .counter-label {
    font-size: 11px;
  }
  
  .counter-description {
    font-size: 9px;
  }
}
</style>
