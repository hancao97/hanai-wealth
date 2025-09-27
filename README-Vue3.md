# HANAI · WEALTH - Vue3 版本

## 🚀 Vue3 迁移完成

项目已成功从原生HTML/JS迁移到Vue3 + Vite架构，提供更好的开发体验和性能。

## 📦 技术栈升级

### 新技术栈
- **Vue 3.4+** - 最新的Vue框架，使用Composition API
- **Vite 5.0+** - 现代化构建工具，快速热重载
- **Vue Router 4.2+** - 官方路由管理
- **Pinia 2.1+** - 现代化状态管理
- **ECharts 5.4+** - 数据可视化图表库
- **Axios 1.12+** - HTTP请求库

### 原有功能保持
- ✅ 股票数据爬取和存储
- ✅ 股票列表展示与筛选
- ✅ 估值分析和图表展示
- ✅ 股票详情页面
- ✅ 五维评级雷达图
- ✅ 响应式设计
- ✅ 所有原有业务逻辑

## 🛠️ 开发指南

### 环境要求
- Node.js 16.0+
- npm 8.0+

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
# 启动开发服务器
npm run dev

# 获取最新数据并启动开发服务器
npm run serve:today
```

### 生产构建
```bash
# 构建生产版本
npm run build

# 获取数据并构建
npm run fetch:build

# 预览构建结果
npm run preview
```

### 数据管理
```bash
# 仅获取股票数据
npm run fetch
```

## 📁 新项目结构

```
hc/
├── index.html                 # Vite入口文件
├── vite.config.js            # Vite配置
├── package.json              # 依赖配置
├── public/                   # 静态资源
│   ├── assets/              # 股票数据文件
│   ├── dates.json           # 可用日期配置
│   └── favicon.svg          # 网站图标
├── src/                     # 源代码
│   ├── main.js             # Vue应用入口
│   ├── App.vue             # 根组件
│   ├── components/         # Vue组件
│   │   ├── StockList.vue   # 股票列表页面
│   │   └── StockDetail.vue # 股票详情页面
│   ├── stores/             # Pinia状态管理
│   │   └── stockData.js    # 股票数据状态
│   ├── styles/             # 样式文件
│   │   ├── main.css        # 主页面样式
│   │   └── detail.css      # 详情页面样式
│   ├── configs/            # 配置文件
│   ├── scripts/            # 数据爬取脚本
│   ├── utils/              # 工具函数
│   └── views/              # 原有静态文件（保留兼容）
└── dist/                   # 构建输出目录
```

## 🔄 迁移改进

### 架构优势
1. **组件化开发** - 使用Vue组件，代码更模块化
2. **状态管理** - 使用Pinia管理全局状态，数据流更清晰
3. **路由管理** - 使用Vue Router，支持SPA导航
4. **开发体验** - Vite提供快速热重载和构建
5. **类型安全** - 更好的开发时错误检查

### 性能优化
1. **按需加载** - 路由和组件懒加载
2. **构建优化** - Vite的现代化构建优化
3. **缓存策略** - 更好的浏览器缓存控制
4. **资源压缩** - 自动代码分割和压缩

### 兼容性
- 保持所有原有功能
- 数据格式完全兼容
- API接口无变化
- 样式和交互体验一致

## 🌐 访问地址

### 开发环境
- 主页面：http://localhost:5173
- 股票详情：http://localhost:5173/detail?stockid=xxx&date=2025-09-26

### 生产环境
构建后可部署到任何静态文件服务器

## 🔧 配置说明

### Vite配置 (vite.config.js)
- 别名配置：`@` 指向 `src` 目录
- 开发服务器：端口5173，自动打开浏览器
- 构建优化：代码分割、资源优化

### 路由配置 (src/main.js)
- `/` - 股票列表页面
- `/detail` - 股票详情页面，支持query参数

### 状态管理 (src/stores/stockData.js)
- 股票数据管理
- 筛选条件管理
- 分页逻辑管理
- 统计数据计算

## 📱 响应式设计

完全保持原有的响应式设计：
- 桌面端：完整功能展示
- 平板端：自适应布局调整
- 移动端：优化的触摸体验

## 🚦 开发工作流

1. **数据获取**：`npm run fetch`
2. **开发调试**：`npm run dev`
3. **功能测试**：访问 http://localhost:5173
4. **生产构建**：`npm run build`
5. **部署预览**：`npm run preview`

## 🔍 故障排除

### 常见问题

1. **端口占用**
   ```bash
   # 修改vite.config.js中的port配置
   server: { port: 3000 }
   ```

2. **依赖问题**
   ```bash
   # 清除node_modules重新安装
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **数据加载失败**
   ```bash
   # 确保public目录有数据文件
   npm run fetch
   ```

4. **构建错误**
   ```bash
   # 检查代码语法和依赖
   npm run build
   ```

## 📞 技术支持

如遇到Vue3相关问题，请检查：
1. Node.js版本是否满足要求
2. 依赖是否正确安装
3. 端口是否被占用
4. 数据文件是否存在

---

**注意**：原有的HTML版本仍然保留在 `src/views/` 目录中，可以继续使用 `http-server` 访问。Vue3版本是完全独立的实现，两个版本可以并存使用。
