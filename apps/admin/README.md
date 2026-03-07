# Admin（管理后台）

`apps/admin` 是生字数据管理后台，用于维护汉字、拼音、组词、音频与笔顺信息。

## 1. 作用说明

- 管理员登录/注册
- 汉字列表展示（列表视图与卡片视图）
- 新增、编辑、删除汉字数据
- 预览音频与笔顺图
- 支持调用后端 AI 能力自动补全拼音与组词

## 2. 技术栈

- React
- Vite
- Ant Design
- React Router
- Axios

## 3. 启动方式

### 在仓库根目录启动

```bash
pnpm admin
```

### 在当前目录启动

```bash
pnpm dev
```

默认地址：`http://localhost:3002`

## 4. 构建与预览

```bash
pnpm build
pnpm preview
```

## 5. 路由与认证

- 登录页：`/login`
- 后台主页：`/`
- 未登录访问主页会被重定向到登录页
- 登录后 token 存储在 `localStorage.adminToken`

## 6. 与后端联调说明

开发时通过 Vite 代理将 `/api` 转发到后端：

```bash
VITE_API_PROXY_TARGET=http://localhost:3000
```

未设置时默认目标也是 `http://localhost:3000`。

## 7. 常用操作流程

- 启动后进入登录/注册
- 进入后台后点击“添加汉字”
- 可手动录入，或触发 AI 自动生成
- 提交后在列表中编辑、删除或预览
