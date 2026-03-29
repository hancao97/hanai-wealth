# 股票详情页「对比」功能 — 设计说明

**日期：** 2026-03-29  
**状态：** 已通过产品侧对话定稿，待实现计划（writing-plans）

## 1. 背景与目标

在单只股票详情页增加**股票对比**能力：在同一数据快照下，对比两只股票的**估值走势（价格 vs 内在价值）**与**市盈率等快照指标**，辅助用户决策。

## 2. 已定决策（需求约束）

| 项 | 结论 |
|----|------|
| 数据日期 | 仅支持**当前详情页的同一 `date`**，与 `assets/${date}.json` 快照一致。 |
| 第二只股票来源 | 从**当日 JSON 全市场列表**中搜索/选择（与列表页同源）。 |
| MVP 范围 | **双估值曲线**（两只各含价格/价值类信息）+ **快照指标并排表**。 |
| 估值接口不可用 | **不阻断**对比面板：保留**指标表**；图表区展示明确说明（第二只无走势数据）。 |
| 架构取向 | **独立子组件 + composable**；`StockDetail` 仅编排；可选 **`compareStockId` query** 同步状态。 |

## 3. 模块边界与页面结构

### 3.1 `StockDetail.vue`（编排）

- 继续负责：加载当日 JSON、`stockData`、`allStocksData`、现有区块（含现有 `ValuationChart`、`FinancialMetrics` 等）。
- 新增：维护「对比标的」`compareStockId`，与 **`route.query.compareStockId`** 同步（进入时读 query；用户选/清空时用 `router.replace` 更新 query）。
- 向对比子树传入：`compareStockId`、主标的 `stockData`、当日 `allStocksData`（或等价列表）。不在此文件内实现 ECharts 双曲线细节。

### 3.2 `StockComparePanel.vue`（对比 UI 容器）

- 入口：如「添加对比」/「股票对比」；展开后为选券区 + 指标表（布局细节属实现，要求在同一详情流内可见）。
- **选券**：在 `allStocksData` 上本地过滤（名称、代码、`stockid`），**排除当前主标的**；选中后更新 `compareStockId`。
- **快照指标表**：两列（主标的 vs 对比标的）；字段与现有详情/列表对齐（至少含市盈率 `pettm`、市值等核心列；列定义可与 `FinancialMetrics` 对齐或抽共享常量）。
- 挂载 **`CompareValuationChart`**。

### 3.3 `CompareValuationChart.vue`（双序列估值图）

- 入参：`primary` / `compare` 标的解析结果（或 `stockid` 对 + 父级已解析行）。
- 数据：对两只各请求 GuruFocus 估值接口，模式与现有 `ValuationChart` 一致：  
  `https://www.gurufocus.cn/_api/chart/{stockid}/valuation?locale=zh-hans`
- 无第二只走势或请求失败：本组件空态/说明；不阻塞面板内指标表。

### 3.4 `useCompareValuation`（或同名 composable，建议）

- 封装：双请求、`Promise.allSettled`、日期对齐、输出图表所需 series。
- `CompareValuationChart` 主要消费「已对齐的 series + 元信息」。

### 3.5 路由

- Query：`compareStockId=<与 JSON 一致的 id>`。非法或不在当日列表：清除对比相关 query，可选轻提示。

## 4. 数据流、对齐与错误处理

### 4.1 数据流

1. 进入详情：加载 `assets/${date}.json` → `allStocksData`、`stockData`；主图仍由现有 `ValuationChart` 处理。
2. 若 URL 含 `compareStockId`：在 `allStocksData` 中解析；不存在则清除该 query。
3. 用户选定对比标的：更新 `compareStockId` 并同步 query。
4. 对比图：对主标的与对比标的**各请求一次**估值接口。**MVP 允许**与主图对主标的请求重复（后续可加缓存优化，非本版必做）。

### 4.2 时间轴对齐

- 对两条返回序列取**日期交集**作为公共 X 轴。
- 交集过短或为空：图表区「数据不足」空态；**指标表仍展示**（来自当日 JSON）。

### 4.3 图表展示

- 默认：**四系列**（A 股价、A 价值、B 股价、B 价值），图例区分股票与线型。
- 若可读性不足，实现阶段允许改为**上下两个子图**（每只股票一个小图），不改变「同一面板内完成对比」的产品范围。

### 4.4 错误与降级

- **对比标的**接口失败或无序列：说明文案；指标表保留。
- **主标的**在对比图侧请求失败：优先策略为实现时选更简单且一致的一种（例如整图降级说明，或仅展示对比侧 + 说明）；不得导致未捕获异常。
- **清空对比**：清除 `compareStockId` 并移除 query。

### 4.5 边界行为（实现时定一种并写进实现计划）

- 选中对比标的与主标的相同：应禁止或自动清空（二选一）。

## 5. 测试要点

- 带合法/非法 `compareStockId` 进入详情的行为。
- 两只均在当日 JSON 中时，快照表与列表/详情字段一致。
- 第二只估值接口失败时：表仍在、图区有说明。
- 日期交集为空/过短时：图区空态、无白屏崩溃。

## 6. 明确不做（本版）

- 三只及以上同时对比。
- 跨 `date` 对比或非当日快照选券。
- 自选/最近浏览作为选券来源。
- 新增后端聚合接口或服务端缓存。
- 导出图、PDF 等（除非产品另有统一能力）。

## 7. 代码库参考

- 详情页：`src/components/StockDetail.vue`（加载 `assets/${date}.json`）。
- 估值图与接口：`src/components/ValuationChart.vue`。
- 路由：`src/router/index.js`（`/detail`）。

---

## 8. 审批与后续

- 设计章节（模块边界、数据流与错误、测试与范围）已在对话中确认。
- 下一步：经用户审阅本文档后，使用 **writing-plans** 技能生成实现计划；**勿**在未批准计划前直接大规模改代码。
