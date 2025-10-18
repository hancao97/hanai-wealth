# 数据结构优化说明

## 优化概述

将 `business_descrpt`（公司基础信息）从每日数据文件中分离出来，单独存储在 `companies.json` 文件中，以减少数据冗余和文件大小。

## 优化效果

### 存储空间优化
- **单个每日数据文件**：从 16.75 MB 减小到 4.52 MB（节省约 73%）
- **14个文件总共节省**：171.10 MB
- **新增公司信息文件**：12.02 MB（一次性存储，包含 5090 个公司的基础信息）

### 数据结构说明

#### 1. 每日数据文件 (`public/assets/YYYY-MM-DD.json`)
存储每日变化的动态数据：
- 股价、涨跌幅
- 市值
- 估值指标（PE、PB、GF Value等）
- 大师评分
- 财务指标

**不再包含** `business_descrpt` 字段

#### 2. 公司信息文件 (`public/companies.json`)
以 `symbol` 为 key 存储公司基础信息：
```json
{
  "601288": {
    "address": "北京市东城区建国门内大街69号",
    "business_scope": "...",
    "chairman": "谷澍",
    "city": "北京市",
    "descrpt": "...",
    "email": "ir@abchina.com",
    "main_business": "...",
    "manager": "王志恒",
    "province": "北京",
    "reg_capital": 34998303.39,
    "secretary": "刘清",
    "setup_date": "19861218",
    "website": "www.abchina.com.cn"
  },
  ...
}
```

## 代码修改

### 1. 爬虫脚本 (`src/scripts/gurufocus-crawler.js`)
- 在保存数据时自动分离 `business_descrpt`
- 将公司基础信息更新到 `companies.json`
- 合并已有数据，新数据覆盖旧数据

### 2. 数据仓库 (`src/stores/stockData.js`)
- 启动时加载 `companies.json`
- 在加载每日数据后，自动合并公司基础信息
- 对外暴露的数据结构保持不变

### 3. 详情页组件 (`src/components/StockDetail.vue`)
- 并行加载每日数据和公司基础信息
- 在内部合并数据后使用
- 对外展示逻辑保持不变

## 辅助脚本

### 提取公司信息
从现有的每日数据文件中提取公司基础信息：
```bash
npm run extract-companies
```

### 清理旧数据
从现有的每日数据文件中移除 `business_descrpt` 字段：
```bash
npm run remove-business-descrpt
```

## 使用说明

### 日常使用
正常使用爬虫脚本拉取数据即可，脚本会自动处理数据分离：
```bash
npm run fetch
```

### 数据恢复
如果 `companies.json` 文件丢失或需要重建，可以运行：
```bash
npm run extract-companies
```

## 注意事项

1. **向后兼容**：如果某个股票在 `companies.json` 中不存在，应用仍能正常工作，只是不显示公司基础信息
2. **数据更新**：每次拉取新数据时，`companies.json` 会自动更新（新数据覆盖旧数据）
3. **部署**：确保 `public/companies.json` 文件被正确部署到生产环境

## 技术细节

### 数据加载流程
1. 应用启动时加载 `companies.json` 到内存
2. 用户选择日期后加载对应的每日数据文件
3. 在内存中合并两部分数据
4. 渲染界面

### 性能优化
- 使用 `Promise.all` 并行加载数据
- `companies.json` 只加载一次（在应用启动时）
- 内存中的数据合并操作非常快速

## 迁移完成日期
2025-10-18

