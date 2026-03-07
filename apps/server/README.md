# Server（后端 API）

`apps/server` 是本项目的后端服务，负责用户认证、汉字数据管理、AI 补全能力以及与 MongoDB 交互。

## 1. 作用说明

- 提供 Portal/Admin 登录与注册接口
- 提供汉字数据查询、新增、修改、删除接口
- 提供 AI 自动生成拼音和组词接口（管理员权限）
- 提供 Nginx 网关鉴权接口（用于生产环境 `auth_request`）

## 2. 技术栈

- Node.js
- Express
- Mongoose
- JWT
- Axios

## 3. 启动方式

### 在仓库根目录启动

```bash
pnpm server
```

### 在当前目录启动

```bash
pnpm start:dev
```

默认端口：`3000`（可通过 `PORT` 修改）

## 4. 环境变量

服务会根据 `NODE_ENV` 自动读取：

- `NODE_ENV=development` → `.env.development`
- `NODE_ENV=production` → `.env.production`

建议至少配置以下变量（请自行填写安全值）：

```bash
PORT=3000
MONGO_HOST=127.0.0.1
MONGO_PORT=27017
MONGO_DB=bouncyballs
MONGO_USER=
MONGO_PASS=
MONGO_AUTH_SOURCE=admin
JWT_SECRET=replace_me
DEEPSEEK_API_KEY=replace_me
CORS_ORIGINS=http://localhost:3001,http://localhost:3002,http://localhost:3003
```

## 5. 主要 API

认证：

- `POST /api/admin/auth/register`
- `POST /api/admin/auth/login`
- `GET /api/admin/auth/verify`
- `POST /api/portal/auth/register`
- `POST /api/portal/auth/login`
- `GET /api/portal/auth/verify`
- `POST /api/portal/auth/logout`
- `GET /api/portal/auth/nginx-verify`

汉字数据：

- `GET /api/characters?page=1&limit=20`（portal/admin 可访问）
- `POST /api/characters`（admin）
- `PUT /api/characters/:id`（admin）
- `DELETE /api/characters/:id`（admin）

AI：

- `GET /api/ai-generate?char=汉`（admin）

## 6. 数据初始化

在仓库根目录执行：

```bash
pnpm seed
```

说明：

- 实际执行脚本为 `apps/server/seed.js`
- 该脚本会清空 `Character` 集合再重新导入
- 脚本依赖 `primary school-third.json` 数据文件，请确保文件路径正确后再执行

## 7. 生产运行

### 直接运行

```bash
pnpm start:prod
```

### 使用 PM2（推荐在根目录执行）

```bash
pnpm pm2:start
pnpm pm2:logs
```
