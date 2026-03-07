# Client（生字跳跳乐子应用）

`apps/client` 是具体的“生字跳跳乐”游戏前端，实现麦克风音量驱动的汉字弹跳互动。

## 1. 作用说明

- 拉取后端汉字数据并渲染为可交互小球
- 通过麦克风音量驱动物理反馈（音量越大，跳动越明显）
- 支持展示拼音、组词、发音音频与笔顺图
- 在生产环境下配合 Portal 进行授权校验

## 2. 技术栈

- React
- Vite
- Matter.js
- Less

## 3. 启动方式

### 在仓库根目录启动

```bash
pnpm client
```

### 在当前目录启动

```bash
pnpm dev
```

默认地址：`http://localhost:3001`

## 4. 构建与预览

```bash
pnpm build
pnpm preview
```

## 5. 关键环境变量

可在运行环境中设置：

```bash
VITE_PUBLIC_BASE=/bouncy-balls/
VITE_API_PROXY_TARGET=http://localhost:3000
```

说明：

- `VITE_PUBLIC_BASE`：生产构建资源基础路径，默认生产为 `/bouncy-balls/`
- `VITE_API_PROXY_TARGET`：开发环境 `/api` 代理目标，默认 `http://localhost:3000`

## 6. 授权行为说明

- 开发环境（本机 localhost）下会跳过鉴权，便于独立开发
- 生产环境下会优先读取 Portal 传入 token，调用 `/api/portal/auth/verify` 校验
- 校验失败会跳转到 `/login?redirect=...`

## 7. 交互特性

- 点击小球可查看汉字详情
- 可播放对应音频
- 支持全屏、暂停、刷新、灵敏度与球数量调节
- 未授予麦克风权限时无法启动音频驱动模式
