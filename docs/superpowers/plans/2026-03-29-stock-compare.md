# 股票详情页「对比」功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在详情页同一 `date` 快照下，支持用户选择第二只股票（`stockid`），展示双估值走势（四系列）与快照指标并排表；`compareStockId` 与路由 query 同步；接口失败时按规格降级。

**Architecture:** 纯函数合并两只股票的 GuruFocus `medps`/`price` 序列（与 `ValuationChart` 同源对齐逻辑）；`useCompareValuation` 负责双请求与状态；`CompareValuationChart` 仅渲染 ECharts；`StockComparePanel` 负责选券、指标表与编排子图；`StockDetail` 只做数据加载与 query 同步。

**Tech Stack:** Vue 3 (`<script setup>`)、Vue Router 4、axios、echarts 5、Vite 4；新增 Vitest 用于纯函数单测。

---

## 规格收口（待决清单，本计划已选定）

| 规格章节 | 本计划选定 | 验收 |
|----------|------------|------|
| §4.2 交集过短 | 对齐后交易日交集 **少于 5 个点** 视为「数据不足」，图表区走空态（文案说明），指标表仍展示。 | 单测 + 手测边界数据 |
| §4.4 主标的在对比图侧失败 | **整图错误态**（样式接近 `ValuationChart` 的 `chart-error`），文案说明对比图加载失败；不实现「仅展示对比侧曲线」。指标表在父级 `StockComparePanel`，不受影响。 | 断网/ mock 失败主标的请求 |
| §4.5 与主标的相同 | **选券列表排除**主标的 `stockid`；若 URL 中 `compareStockId === 主 stockid`，`router.replace` 去掉 `compareStockId`。 | 手测 + 单测工具函数可选 |
| 对比面板默认展开 | URL 带合法 `compareStockId` 进入时 **默认展开**对比区；无 query 时折叠，仅显示「股票对比」入口。 | 手测 |

---

## 文件结构（创建 / 修改）

| 路径 | 职责 |
|------|------|
| **Create** `src/utils/valuationAlign.js` | 从 `ValuationChart.vue` **抽出** `alignValueDataToPrice`、`interpolateValue`（行为不变），供单图与对比共用。 |
| **Modify** `src/components/ValuationChart.vue` | 删除内联的上述两函数，改为 `import` from `valuationAlign.js`（避免重复实现）。 |
| **Create** `src/utils/compareValuationMerge.js` | `mergeCompareValuationSeries(rawA, rawB, options)`：对 A/B 各用对齐后的 medps+price，按 **日期键（与现有 `toDateString` 一致）** 做内连接，输出 ECharts 所需的 `categories`（或时间戳数组）与四条 series 数据；交集 `< 5` 点返回 `{ ok: false, code: 'INSUFFICIENT_OVERLAP' }`。 |
| **Create** `src/composables/useCompareValuation.js` | `fetchValuation(stockid)` 封装 GuruFocus URL；`loadCompare(primaryStockid, compareStockid)` 使用 `Promise.allSettled`；调用 `mergeCompareValuationSeries`；暴露 `loading`、`error`、`merged`、`reload`，以及 **`primarySettled` / `compareSettled`**（与 `Promise.allSettled` 结果一致，供文案区分主/对比失败与数据不足）。 |
| **Create** `src/components/CompareValuationChart.vue` | 仅当 **父组件传入有效 `compareStock`（非 null）** 时挂载并请求；`watch` 中若 `compareStockid` 缺失则 **不调用** `loadCompare`。Props：`primaryStock`、`compareStock`、可选标签。内部 `useCompareValuation` + `echarts` 四线；resize/dispose 与 `ValuationChart` 同模式；主请求失败 → 整图 `chart-error` 类 UI。 |
| **Create** `src/components/StockComparePanel.vue` | 使用 **`v-if="compareStock"`**（或等价）包裹 `CompareValuationChart`，无对比标的时 **不挂载**对比图、不发起 GuruFocus 请求；折叠入口、选券、快照表逻辑同前；样式类名前缀 **`stock-compare-`**。 |
| **Modify** `src/components/StockDetail.vue` | `compareStockId` ref；`onMounted`/`watch`：`route.query.compareStockId` 校验是否在 `allStocksData` 中且 `!== stockData.stockid`，否则 `router.replace` 清除；选券/清除时同步 query；在 `ValuationChart` 与 `FinancialMetrics` 之间（或规格更顺眼的位置）插入 `StockComparePanel`。 |
| **Create** `vitest.config.js` | `environment: 'node'`，`include: ['src/**/*.test.js']`。 |
| **Modify** `package.json` | 增加 `devDependencies`: `vitest`；`scripts.test`: `vitest run`。 |

**不修改** `src/router/index.js`（仍用 `/detail` + query，无需新路由）。

**任务顺序说明：** 必须先完成 **Task 1（抽出 `valuationAlign`）**，再以该文件为**唯一真源**写合并逻辑与单测，避免「复制一份对齐函数再剪切」导致双份漂移。

---

### Task 1: 抽出 valuationAlign 并接通 ValuationChart

**Files:**
- Create: `src/utils/valuationAlign.js`
- Modify: `src/components/ValuationChart.vue`（删除重复函数，增加 import）

- [ ] **Step 1: 剪切** `alignValueDataToPrice`、`interpolateValue` **及**其仅被二者使用的辅助逻辑到 `valuationAlign.js`，并 **export**（此为全项目对齐逻辑的**唯一实现**）。

- [ ] **Step 2:** 在 `ValuationChart.vue` 中 `import { alignValueDataToPrice } from '@/utils/valuationAlign.js'`（若无 `@` 别名则用相对路径 `../utils/valuationAlign.js`）。

- [ ] **Step 3:** `npm run build` 确认无语法错误。

- [ ] **Step 4: Commit**

```bash
git add src/utils/valuationAlign.js src/components/ValuationChart.vue
git commit -m "refactor: extract valuationAlign for reuse in stock compare"
```

---

### Task 2: 测试基建 + 合并逻辑单测（TDD）

**Files:**
- Create: `vitest.config.js`
- Create: `src/utils/compareValuationMerge.test.js`
- Create: `src/utils/compareValuationMerge.js`（先空实现或抛错）
- Modify: `package.json`

- [ ] **Step 1: 安装 Vitest 并配置**

```bash
cd /Users/gepingli/Documents/hancao2025/hc && npm install -D vitest@^2
```

在 `package.json` 的 `scripts` 增加：`"test": "vitest run"`。

创建 `vitest.config.js`（单测仅引用相对路径即可；若日后测试需 `@/`，再在 `vitest.config` 中配置与 Vite 一致的 `resolve.alias`）：

```javascript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
```

- [ ] **Step 2: 写失败用例（合并交集与阈值）**

创建 `src/utils/compareValuationMerge.test.js`，用**合成数据**：两段 `medps`/`price` 时间序列，重叠日期 ≥5 点时期望 `ok: true` 且四条 series 长度一致；重叠 <5 点时期望 `ok: false` 且 `code === 'INSUFFICIENT_OVERLAP'`。`import { mergeCompareValuationSeries } from './compareValuationMerge.js'`；`import { alignValueDataToPrice } from './valuationAlign.js'`（由合并实现内部使用）。实现体可暂时 `throw new Error('todo')`。

- [ ] **Step 3: 运行测试确认失败**

```bash
npm run test
```

预期：FAIL（未实现或抛错）。

- [ ] **Step 4: 实现最小合并逻辑**

实现 `mergeCompareValuationSeries`：**仅** `import` Task 1 的 `alignValueDataToPrice`。内连接规则：对每只标的先得到 `alignedMedps` 与 `priceData`，再按 `new Date(ts).toDateString()` 建 Map，取两 Map 的日期键交集，排序后生成四个 `[ts, y]` 序列。少于 5 个交点则返回 `INSUFFICIENT_OVERLAP`。

- [ ] **Step 5: 测试通过并提交**

```bash
npm run test
```

预期：PASS。

```bash
git add vitest.config.js package.json package-lock.json src/utils/compareValuationMerge.js src/utils/compareValuationMerge.test.js
git commit -m "test: add vitest and compare valuation merge helpers"
```

---

### Task 3: useCompareValuation 组合式函数

**Files:**
- Create: `src/composables/useCompareValuation.js`
- Modify: `src/utils/compareValuationMerge.js`（若需导出常量 `MIN_COMPARE_POINTS = 5`）

- [ ] **Step 1:** 实现 `fetchValuation(stockid)`：`axios.get(\`https://www.gurufocus.cn/_api/chart/${stockid}/valuation?locale=zh-hans\`)`，返回 `data`。

- [ ] **Step 2:** 实现 `loadCompare(primaryStockid, compareStockid)`：`Promise.allSettled([fetchValuation(primaryStockid), fetchValuation(compareStockid)])`。若 primary **rejected** → 设置 `error` 为可区分文案（如 `PRIMARY_CHART_FAILED`），`merged` 为空。若 primary fulfilled 且 compare rejected → `error`=`COMPARE_CHART_FAILED`。若两者 fulfilled 但 `mergeCompareValuationSeries` 返回 `ok: false` → 不视为 axios 错误，图表走「数据不足」空态（组件内分支）。**将 `allSettled` 的原始结果暴露为 `primarySettled`、`compareSettled`**，与上文 Architecture/文件表一致。

- [ ] **Step 3:** 对外返回 `loading`、`error`、`merged`、`reload`、`primarySettled`、`compareSettled`。

- [ ] **Step 4: Commit**

```bash
git add src/composables/useCompareValuation.js src/utils/compareValuationMerge.js
git commit -m "feat: add useCompareValuation composable"
```

---

### Task 4: CompareValuationChart 组件

**Files:**
- Create: `src/components/CompareValuationChart.vue`

- [ ] **Step 1:** Template：`v-if loading` 加载；`v-else-if error === 'PRIMARY_CHART_FAILED'`（或统一 error 字符串）显示错误块；`v-else-if merged && !merged.ok && merged.code === 'INSUFFICIENT_OVERLAP'` 显示空态；`v-else-if merged && merged.ok` 显示 `div` + `echarts`。

- [ ] **Step 2:** `watch` `primaryStock`、`compareStock`（或二者 `stockid`）：若 **`compareStock` 为空或 `compareStock.stockid` 缺失**，则 **不调用** `loadCompare`，并重置内部 chart 状态；仅在两只都有效时调用 `loadCompare(primary, compare)`。

- [ ] **Step 3:** ECharts `option`：四线，图例区分；tooltip 可简化，不必复制 `ValuationChart` 全部装饰；`onUnmounted` dispose。

- [ ] **Step 4:** `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/components/CompareValuationChart.vue
git commit -m "feat: add CompareValuationChart for dual stock valuation"
```

---

### Task 5: StockComparePanel 组件

**Files:**
- Create: `src/components/StockComparePanel.vue`

- [ ] **Step 1:** Props：`primaryStock`、`allStocksData`、`compareStockId`（`v-model` 或 `:modelValue` + `@update:modelValue`）。

- [ ] **Step 2:** 计算 `compareStock`：`allStocksData.find(s => s.stockid === compareStockId) || null`。无 `compareStockId` 时只显示入口按钮。

- [ ] **Step 3:** 搜索：对 `company`、`symbol`、`stockid` 字符串包含匹配（`toLowerCase()`），列表项点击 `emit('update:compareStockId', stockid)`。

- [ ] **Step 4:** 快照表：两列表头「当前」「对比」，行：名称代码、市盈率 `pettm`、市净率 `pb`、总市值（与列表一致格式化）。

- [ ] **Step 5:** 嵌入 `CompareValuationChart`，**仅当** `compareStock` 存在时 `<CompareValuationChart v-if="compareStock" ... />`，传入两只行数据；无对比标的时不挂载、不请求。

- [ ] **Step 6:** `npm run build` + commit

```bash
git add src/components/StockComparePanel.vue
git commit -m "feat: add StockComparePanel with search and metrics table"
```

---

### Task 6: StockDetail 集成与 query 同步

**Files:**
- Modify: `src/components/StockDetail.vue`

- [ ] **Step 1:** `import StockComparePanel`，`compareStockId = ref(null)`。

- [ ] **Step 2:** `watch([() => route.query.compareStockId, allStocksData, stockData], ...)`：当 `allStocksData` 与 `stockData` 已就绪时，若 query 中有 `compareStockId`，校验存在于列表且 **不等于** `stockData.stockid`；否则 `router.replace({ query: { ...route.query, compareStockId: undefined } })`（或删除该键）。合法则 `compareStockId.value = query`。

- [ ] **Step 3:** 子组件 `@update:compareStockId`：`router.replace({ query: { ...route.query, compareStockId: id || undefined } })` 并更新本地 ref。

- [ ] **Step 4:** 折叠状态 `panelExpanded`：**初始值** = 当前 URL 是否带有**合法** `compareStockId`（存在且不等于主 `stockid`）→ `true`，否则 `false`（与「无 query 时折叠」一致）。用户可手动展开/折叠，不强制每次路由变化重置（除非实现时选择简化）。

- [ ] **Step 5:** 非法 `compareStockId` 清除 query 时，规格允许「可选轻提示」：实现可选用 `console.warn` 或轻量 toast，手测一步确认即可。

- [ ] **Step 6:** 模板插入位置建议：`ValuationChart` 下方、`FinancialMetrics` 上方。

- [ ] **Step 7:** `npm run build` + commit

```bash
git add src/components/StockDetail.vue
git commit -m "feat: wire stock compare query and StockComparePanel on detail page"
```

---

### Task 7: 手测清单与收尾

- [ ] **Step 1:** `npm run dev`，打开 `/detail?stockid=<主>&date=<资产文件日期>`，点对比、选第二只，确认四线、表、刷新保留（query）。

- [ ] **Step 2:** 故意错误 `compareStockId`，确认被清除（可选观察轻提示）。

- [ ] **Step 3:** 在 DevTools 模拟对比接口失败（可选），确认表仍在、图区说明符合 §4.4。

- [ ] **Step 4:** 最终 `npm run build` 通过。

- [ ] **Step 5:** Commit（若有文档或小修）

```bash
git commit --allow-empty -m "chore: stock compare manual QA done" || true
```

---

## 参考与技能

- 规格：`@docs/superpowers/specs/2026-03-29-stock-compare-design.md`
- 现有估值图：`@src/components/ValuationChart.vue`（GuruFocus 字段 `medps`、`price`）
- 列表格式化参考：`@src/components/StockList.vue`（`formatPE` 等）

---

## Plan Review Loop

计划完成后应使用 **plan-document-reviewer** 子代理对照规格评审；若有 Issues Found，由作者修订计划并最多三轮。

---

## Execution Handoff

计划保存路径：`docs/superpowers/plans/2026-03-29-stock-compare.md`。

**执行方式（二选一）：**

1. **Subagent-Driven（推荐）** — 每任务派生子代理实现，任务间评审；需 **superpowers:subagent-driven-development**。
2. **Inline Execution** — 本会话按任务批量执行并设检查点；需 **superpowers:executing-plans**。

实现前请确认选用哪种方式。
