# 三年级生字跳跳乐 Monorepo

一个基于 `pnpm workspace` 的全栈项目，包含：

- 游戏大厅（Portal）
- 子游戏（Client，当前为“生字跳跳乐”）
- 管理后台（Admin）
- 后端 API（Server）

项目核心目标是：通过互动游戏帮助三年级生字学习，同时提供后台数据管理与 AI 辅助录入能力。

## 1. 仓库结构

```text
bouncyballs-monorepo
├─ apps
│  ├─ server   # Node.js + Express + MongoDB API
│  ├─ portal   # 游戏大厅（主应用）
│  ├─ client   # 生字跳跳乐子应用（被 portal 嵌入）
│  └─ admin    # 生字管理后台
├─ deploy      # 单机部署脚本与 Nginx 配置示例
├─ package.json
└─ pnpm-workspace.yaml
```

## 2. 子项目作用

- `apps/server`：提供认证、汉字 CRUD、AI 生成拼音/组词等 API，连接 MongoDB。
- `apps/portal`：用户登录、游戏大厅、子游戏加载容器（通过 Wujie 微前端）。
- `apps/client`：具体游戏实现（Matter.js 物理引擎 + 麦克风音量驱动互动）。
- `apps/admin`：管理员登录、汉字录入与编辑、音频与笔顺预览。

每个子项目均有独立 `README.md`，见各目录。

## 3. 技术栈

- Monorepo：`pnpm workspace`
- 前端：`React + Vite + Less`
- Portal/Admin UI：`Ant Design`
- 微前端容器：`wujie-react`（Portal 嵌入 Client）
- 游戏引擎：`matter-js`
- 后端：`Node.js + Express + Mongoose + JWT`
- 数据库：`MongoDB`

## 4. 环境要求

- Node.js 18+
- pnpm 8+
- MongoDB 6+（或兼容版本）

## 5. 快速开始（开发）

### 5.1 安装依赖

```bash
pnpm install
```

### 5.2 配置环境变量

后端按 `NODE_ENV` 自动加载：

- 开发：`apps/server/.env.development`
- 生产：`apps/server/.env.production`

关键变量（仅列变量名，不要提交真实密钥）：

- `PORT`
- `MONGO_HOST`
- `MONGO_PORT`
- `MONGO_DB`
- `MONGO_USER`
- `MONGO_PASS`
- `MONGO_AUTH_SOURCE`
- `JWT_SECRET`
- `DEEPSEEK_API_KEY`
- `CORS_ORIGINS`

Portal 生产可选变量：

- `apps/portal/.env.production`：`VITE_BOUNCY_BALLS_URL=/bouncy-balls/`

Client 生产可选变量：

- `VITE_PUBLIC_BASE=/bouncy-balls/`
- `VITE_API_PROXY_TARGET=http://localhost:3000`

### 5.3 分别启动各服务

```bash
pnpm server   # http://localhost:3000
pnpm portal   # http://localhost:3003
pnpm client   # http://localhost:3001
pnpm admin    # http://localhost:3002
```

## 6. 根目录可用脚本

```bash
pnpm install:all     # 安装依赖
pnpm seed            # 执行后端数据初始化脚本
pnpm build:client    # 构建 client
pnpm build:admin     # 构建 admin
pnpm build:portal    # 构建 portal
pnpm build:all       # 构建所有子项目
pnpm start:prod      # 构建全部并启动 server
pnpm pm2:start       # 使用 PM2 启动 server
pnpm pm2:stop
pnpm pm2:restart
pnpm pm2:delete
pnpm pm2:logs
```

## 7. 默认端口与访问地址

- API Server：`http://localhost:3000`
- Client（生字跳跳乐）：`http://localhost:3001`
- Admin（管理后台）：`http://localhost:3002`
- Portal（游戏大厅）：`http://localhost:3003`

## 8. 生产部署说明

请优先参考：

- `deploy/README.md`
- `deploy/nginx.single-server.conf`
- `deploy/deploy-frontends.sh`

典型线上路径：

- Portal：`/`
- Admin：`/admin/`
- Client：`/bouncy-balls/`
- API：`/api/`

## 9. 认证与访问控制概览

- Admin 登录态：`adminToken`（localStorage）
- Portal 登录态：`playerToken`（localStorage）+ `portalToken`（HttpOnly Cookie）
- Client 在生产环境启动时会校验 `/api/portal/auth/verify`，未授权自动跳转 `/login`
- Nginx 可通过 `auth_request` 调用 `/api/portal/auth/nginx-verify` 做网关拦截

## 10. 常见问题

### Q1：页面 404 或 API 404

- 检查前端 `base` 路径与 Nginx `location` 是否匹配（尤其 `/admin/`、`/bouncy-balls/`）。
- 检查前端代理目标 `VITE_API_PROXY_TARGET` 与后端端口是否一致。

### Q2：登录后仍被踢回登录页

- 检查 `JWT_SECRET` 是否一致、Token 是否过期。
- 检查 `CORS_ORIGINS` 是否包含当前访问域名。
- 生产环境检查 Nginx 是否正确转发并保留 Cookie。

### Q3：AI 自动生成失败

- 检查 `DEEPSEEK_API_KEY` 是否有效。
- 检查后端访问外网能力（请求 `api.deepseek.com`）。
