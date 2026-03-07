# Portal（游戏大厅主应用）

`apps/portal` 是用户入口应用，负责登录、游戏大厅展示和子游戏加载。

## 1. 作用说明

- 提供玩家登录/注册页面
- 展示游戏大厅与游戏卡片
- 作为主应用加载子游戏（当前为 `bouncy-balls`）
- 管理玩家会话并向子应用传递 token

## 2. 技术栈

- React
- Vite
- Ant Design
- React Router
- Wujie（`wujie-react`）

## 3. 启动方式

### 在仓库根目录启动

```bash
pnpm portal
```

### 在当前目录启动

```bash
pnpm dev
```

默认地址：`http://localhost:3003`

## 4. 构建与预览

```bash
pnpm build
pnpm preview
```

## 5. 关键环境变量

生产环境可配置：

```bash
VITE_BOUNCY_BALLS_URL=/bouncy-balls/
VITE_API_PROXY_TARGET=http://localhost:3000
```

说明：

- `VITE_BOUNCY_BALLS_URL`：子应用访问地址，未配置时开发默认 `http://localhost:3001/`
- `VITE_API_PROXY_TARGET`：开发环境 `/api` 代理目标

## 6. 路由说明

- `/login`：玩家登录/注册
- `/`：游戏大厅
- `/game/:gameId`：游戏容器页（加载对应子应用）

## 7. 与子应用联动

- `gameId=bouncy-balls` 时加载 Client 子应用
- Portal 通过 Wujie props 向子应用传递：
  - `token`
  - `user`
  - `closeLoading` 回调
- 子应用可基于 token 发起后端鉴权请求

## 8. 认证说明

- 登录后保存 `playerToken` 与 `playerUser`
- 请求 `/api/portal/auth/verify` 验证登录态
- 退出时调用 `/api/portal/auth/logout`，并清理本地存储
