<template>
  <div class="financial-metrics-container">
    <!-- 毛利率卡片 -->
    <div class="metric-card">
      <h3 class="metric-title">
        <span class="metric-icon">📊</span>
        <span>毛利率分析</span>
      </h3>
      <MetricContent 
        :current-value="stockData.grossmargin"
        :all-stocks-data="allStocksData"
        :industry-name="stockData.industry"
        :current-stock-id="stockData.stockid"
        :current-date="currentDate"
        :field-name="'grossmargin'"
        :unit="'%'"
        :metric-name="'毛利率'"
      />
    </div>

    <!-- 净利率卡片 -->
    <div class="metric-card">
      <h3 class="metric-title">
        <span class="metric-icon">💵</span>
        <span>净利率分析</span>
      </h3>
      <MetricContent 
        :current-value="stockData.net_margain"
        :all-stocks-data="allStocksData"
        :industry-name="stockData.industry"
        :current-stock-id="stockData.stockid"
        :current-date="currentDate"
        :field-name="'net_margain'"
        :unit="'%'"
        :metric-name="'净利率'"
      />
    </div>

    <!-- 市盈率卡片 -->
    <div class="metric-card">
      <h3 class="metric-title">
        <span class="metric-icon">💹</span>
        <span>市盈率分析</span>
      </h3>
      <MetricContent 
        :current-value="stockData.pettm"
        :all-stocks-data="allStocksData"
        :industry-name="stockData.industry"
        :current-stock-id="stockData.stockid"
        :current-date="currentDate"
        :field-name="'pettm'"
        :unit="''"
        :metric-name="'市盈率'"
        :higher-is-better="false"
      />
    </div>

    <!-- 市净率卡片 -->
    <div class="metric-card">
      <h3 class="metric-title">
        <span class="metric-icon">📐</span>
        <span>市净率分析</span>
      </h3>
      <MetricContent 
        :current-value="stockData.pb"
        :all-stocks-data="allStocksData"
        :industry-name="stockData.industry"
        :current-stock-id="stockData.stockid"
        :current-date="currentDate"
        :field-name="'pb'"
        :unit="''"
        :metric-name="'市净率'"
        :higher-is-better="false"
      />
    </div>

    <!-- 股息率卡片 -->
    <div class="metric-card">
      <h3 class="metric-title">
        <span class="metric-icon">💰</span>
        <span>股息率分析</span>
      </h3>
      <MetricContent 
        :current-value="stockData.yield"
        :all-stocks-data="allStocksData"
        :industry-name="stockData.industry"
        :current-stock-id="stockData.stockid"
        :current-date="currentDate"
        :field-name="'yield'"
        :unit="'%'"
        :metric-name="'股息率'"
      />
    </div>
  </div>
</template>

<script setup>
import MetricContent from './MetricContent.vue'

const props = defineProps({
  stockData: {
    type: Object,
    required: true
  },
  allStocksData: {
    type: Array,
    default: () => []
  },
  currentDate: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.financial-metrics-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 40px;
}

.metric-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(226, 232, 240, 0.8);
  transition: all 0.3s ease;
}

.metric-card:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.metric-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e2e8f0;
}

.metric-icon {
  font-size: 18px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .financial-metrics-container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .financial-metrics-container {
    gap: 16px;
  }

  .metric-card {
    padding: 12px 16px;
  }

  .metric-title {
    font-size: 15px;
  }
}
</style>
