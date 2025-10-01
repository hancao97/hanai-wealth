# GitHub Pages 部署指南

本项目已配置好 GitHub Pages 自动部署。

## 🚀 部署方式

### 方式一：自动部署（推荐）✅

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "配置 GitHub Pages 部署"
   git push origin feature/vue
   ```

2. **GitHub Actions 自动构建**
   - 推送后会自动触发 GitHub Actions
   - 构建完成后会自动部署到 `gh-pages` 分支

3. **启用 GitHub Pages**
   - 进入仓库设置：`Settings` → `Pages`
   - Source 选择：`gh-pages` 分支
   - 点击 `Save`

4. **访问你的网站**
   ```
   https://你的用户名.github.io/hanai-wealth/
   ```

### 方式二：手动部署

如果你想手动部署，可以使用以下命令：

```bash
# 1. 安装 gh-pages 工具（首次使用）
yarn add -D gh-pages

# 2. 构建并部署
yarn deploy
```

## 📋 配置说明

### 已完成的配置

✅ `vite.config.js` - base 路径设置为 `/hanai-wealth/`
✅ `package.json` - 添加了 deploy 脚本
✅ `.github/workflows/deploy.yml` - GitHub Actions 自动部署配置
✅ `public/404.html` - SPA 路由支持
✅ `index.html` - 添加了路由恢复脚本

### 仓库信息

- **仓库名**：hanai-wealth
- **部署分支**：gh-pages
- **访问路径**：/hanai-wealth/

## 🔍 常见问题

### 1. 部署后页面显示 404

**解决方案**：
- 检查 GitHub Pages 是否已启用
- 确认 Source 选择了 `gh-pages` 分支
- 等待几分钟，GitHub Pages 需要时间来构建

### 2. 页面样式或资源加载失败

**原因**：base 路径配置不正确

**解决方案**：
- 确认 `vite.config.js` 中 base 是 `/hanai-wealth/`
- 重新构建并部署

### 3. 路由跳转后刷新页面 404

**原因**：GitHub Pages 不支持 SPA 路由

**解决方案**：
- 已配置 `404.html` 和路由恢复脚本
- 如果还有问题，检查 Vue Router 是否使用 hash 模式

### 4. GitHub Actions 构建失败

**常见原因**：
- yarn.lock 文件不存在
- Node 版本不兼容
- 依赖安装失败

**解决方案**：
- 检查 Actions 日志查看具体错误
- 确保本地可以正常 `yarn build`
- 查看 `.github/workflows/deploy.yml` 配置

## 📝 更新网站

每次想更新网站内容时：

```bash
# 1. 修改代码
# 2. 提交并推送
git add .
git commit -m "更新内容"
git push origin feature/vue

# 3. GitHub Actions 会自动部署
```

或者使用手动部署：

```bash
yarn deploy
```

## 🔗 相关链接

- GitHub Actions: https://github.com/你的用户名/hanai-wealth/actions
- GitHub Pages 设置: https://github.com/你的用户名/hanai-wealth/settings/pages
- 网站地址: https://你的用户名.github.io/hanai-wealth/

## 💡 提示

- 首次部署需要在 GitHub 仓库设置中启用 Pages
- 每次推送代码都会触发自动部署
- 部署通常需要 1-3 分钟完成
- 可以在 Actions 标签页查看部署进度

