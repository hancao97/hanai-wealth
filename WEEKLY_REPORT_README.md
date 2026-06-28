# HANAI 价值周报功能说明

## 功能概述

价值周报是 HANAI·WEALTH 系统的一个新功能，每周自动分析A股市场中最被低估的50只股票，并通过AI生成专业的投资分析报告。

## 功能特性

### 1. 自动化生成
- **定时任务**: 每周五晚上9点（北京时间）通过 GitHub Actions 自动执行
- **数据来源**: 读取系统中最新交易日的股票数据
- **智能筛选**: 基于价值大师网（GuruFocus）合理估值，筛选出折扣率最高的50只股票

### 2. AI 智能分析
- **深度分析**: 默认使用 Kimi `kimi-k2.6` 模型进行专业分析
- **多维度**: 包含整体特征、行业分布、投资价值评估和投资建议
- **可追溯**: 保留完整的分析 Prompt，支持查看和审计

### 3. 用户体验
- **便捷入口**: 在股票列表页顶部，紧邻日期选择器
- **美观展示**: 模态框设计，支持折叠查看 Prompt
- **PDF导出**: 一键导出周报为PDF文件，方便保存和分享

## 使用方法

### 前端使用

1. 打开 HANAI·WEALTH 股票列表页
2. 点击顶部的"周报"按钮（紫色按钮）
3. 在弹出的模态框中查看AI分析报告
4. 可选：点击"查看分析Prompt"展开原始数据
5. 可选：点击"导出PDF"保存报告

### 后台生成

#### 手动生成
```bash
npm run weekly-report
```

默认已内置 Kimi/Moonshot API 配置，直接运行即可。需要临时切换 Key 或模型时，可以用环境变量覆盖：

```bash
AI_API_KEY=你的Kimi或OpenAIKey npm run weekly-report
```

也可以在 `.env.local` 中为前端调试覆盖默认配置：

```bash
VITE_AI_API_KEY=你的KimiKey
VITE_AI_MODEL=kimi-k2.6
```

#### 自动生成
- GitHub Actions 工作流会在每周五晚上9点自动运行
- 生成的周报会自动提交到仓库的 `public/weekly-report.json`
- 也可以在 GitHub Actions 页面手动触发
- 默认使用代码内置的 Kimi/Moonshot 配置，不需要额外配置 GitHub Secrets
- 如需临时覆盖，可配置 `AI_API_KEY`（或 `MOONSHOT_API_KEY` / `KIMI_API_KEY` / `OPENAI_API_KEY`）以及 `AI_PROVIDER`、`AI_MODEL`、`AI_API_BASE_URL`

## 技术架构

### 核心文件

1. **工具函数** (`src/utils/weeklyReport.js`)
   - `selectTop50UndervaluedStocks()`: 筛选低估股票
   - `buildAIPrompt()`: 构建AI分析Prompt
   - `formatStocksForDisplay()`: 格式化股票数据

2. **生成脚本** (`src/scripts/generate-weekly-report.js`)
   - 读取最新交易日数据
   - 调用筛选函数
   - 请求可配置的 AI API
   - 保存周报到 JSON 文件

3. **前端组件** (`src/components/WeeklyReport.vue`)
   - 模态框展示
   - Prompt 折叠面板
   - PDF 导出功能

4. **状态管理** (`src/stores/stockData.js`)
   - `weeklyReport` 状态
   - `loadWeeklyReport()` 方法

5. **GitHub Actions** (`.github/workflows/weekly-report.yml`)
   - 定时任务配置
   - 自动化执行流程

### 数据格式

周报数据存储在 `public/weekly-report.json`：

```json
{
  "date": "2025-11-07",
  "generatedAt": "2025-11-08T21:00:00.000Z",
  "aiProvider": "moonshot",
  "aiModel": "kimi-k2.6",
  "analysisStatus": "generated",
  "prompt": "发送给AI的完整Prompt...",
  "analysis": "AI分析报告..."
}
```

## 筛选逻辑

### 低估股票筛选算法

1. **有效性过滤**
   - `gf_value > 0` (有合理估值)
   - `price > 0` (有当前价格)
   - 排除数据异常的股票

2. **折扣率计算**
   ```
   折扣率 = (合理估值 - 当前价格) / 合理估值 × 100%
   ```

3. **排序与筛选**
   - 按折扣率降序排序
   - 取前50名

### AI Prompt 结构

1. 周报标题和日期
2. 背景说明
3. 50只股票详细信息（公司名、行业、价格、估值、折扣率等）
4. 分析要求：
   - 整体特征分析
   - 行业分布分析
   - 投资价值评估
   - 投资建议

## 依赖项

- **html2pdf.js**: PDF 导出功能
- **Kimi/OpenAI API**: AI 分析能力
- **axios**: HTTP 请求
- **pinia**: 状态管理

## 注意事项

1. **API 密钥**: 当前项目按私用场景处理，默认 Kimi/Moonshot Key 写在 `src/utils/aiProvider.js`；环境变量仍可覆盖
2. **数据更新**: 周报基于最新交易日数据，需确保数据已更新
3. **网络依赖**: 生成周报需要网络连接以调用AI API
4. **单文件存储**: 只保留最新一期周报，新周报会覆盖旧周报
5. **模型更新**: `kimi-k2-0905-preview` 已下线，默认模型已更新为 `kimi-k2.6`

## 未来优化

- [ ] 支持周报历史查询
- [ ] 添加周报生成进度提示
- [ ] 支持自定义筛选条件
- [ ] 添加周报订阅通知功能
- [ ] 优化 Prompt 模板
- [ ] 支持多种AI模型选择

## 故障排查

### 前端无法加载周报
- 检查 `public/weekly-report.json` 是否存在
- 查看浏览器控制台错误信息
- 确认网络请求是否成功

### 后台脚本生成失败
- 检查最新交易日数据是否存在
- 验证 AI API Key 是否有效
- 如果出现 404，检查 `AI_MODEL` 是否仍被平台支持
- 查看脚本执行日志

### GitHub Actions 执行失败
- 查看 Actions 运行日志
- 检查权限配置（`FETCH_AND_DEPLOY_TOKEN`）
- 检查内置 AI 配置是否可用，或检查环境变量覆盖值是否正确
- 确认依赖安装是否成功

## 许可证

本功能遵循项目主许可证。
