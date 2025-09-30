<template>
  <span 
    :class="['animated-number', { 'animating': isAnimating }]"
    :style="computedStyle"
  >
    {{ displayValue }}
  </span>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'

const props = defineProps({
  value: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    default: 800
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
    default: ''
  },
  easing: {
    type: String,
    default: 'easeOutCubic',
    validator: value => ['linear', 'easeOutQuad', 'easeOutCubic', 'easeOutQuart', 'easeOutExpo', 'easeOutBounce'].includes(value)
  },
  color: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: ''
  },
  weight: {
    type: String,
    default: ''
  }
})

const displayValue = ref('')
const isAnimating = ref(false)
const currentValue = ref(0)

// 缓动函数
const easingFunctions = {
  linear: t => t,
  easeOutQuad: t => t * (2 - t),
  easeOutCubic: t => (--t) * t * t + 1,
  easeOutQuart: t => 1 - (--t) * t * t * t,
  easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeOutBounce: t => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
    }
  }
}

// 计算样式
const computedStyle = computed(() => {
  const style = {}
  if (props.color) style.color = props.color
  if (props.size) style.fontSize = props.size
  if (props.weight) style.fontWeight = props.weight
  return style
})

// 格式化数字
const formatNumber = (num) => {
  let formattedNum = Number(num).toFixed(props.decimals)
  
  if (props.separator && formattedNum.length > 3) {
    // 添加千分位分隔符
    const parts = formattedNum.split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, props.separator)
    formattedNum = parts.join('.')
  }
  
  return props.prefix + formattedNum + props.suffix
}

// 数字动画函数
const animateToValue = (targetValue) => {
  const startValue = currentValue.value
  const difference = targetValue - startValue
  const startTime = Date.now()
  
  if (Math.abs(difference) < 0.01) {
    currentValue.value = targetValue
    displayValue.value = formatNumber(targetValue)
    return
  }
  
  isAnimating.value = true
  
  const animate = () => {
    const currentTime = Date.now()
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / props.duration, 1)
    
    // 应用缓动函数
    const easedProgress = easingFunctions[props.easing](progress)
    const newValue = startValue + (difference * easedProgress)
    
    currentValue.value = newValue
    displayValue.value = formatNumber(newValue)
    
    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      currentValue.value = targetValue
      displayValue.value = formatNumber(targetValue)
      isAnimating.value = false
    }
  }
  
  animate()
}

// 监听值变化
watch(() => props.value, (newValue) => {
  animateToValue(newValue)
}, { immediate: false })

// 初始化
onMounted(() => {
  currentValue.value = props.value
  displayValue.value = formatNumber(props.value)
})
</script>

<style scoped>
.animated-number {
  display: inline-block;
  font-variant-numeric: tabular-nums;
  transition: all 0.3s ease;
  position: relative;
}

.animated-number.animating {
  transform: scale(1.02);
}

.animated-number::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.1), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.animated-number.animating::after {
  opacity: 1;
  animation: shimmer 0.8s ease-in-out;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* 数字滚动效果 */
.animated-number {
  overflow: hidden;
  white-space: nowrap;
}

/* 发光效果 */
.animated-number.animating {
  text-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
}
</style>
