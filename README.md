# 三年级生字跳跳乐 (Bouncy Balls Monorepo)

这是一个基于 Monorepo 架构的全栈项目，包含游戏前端、后台管理系统和后端服务。

## 项目结构

- **apps/server**: Node.js/Express 后端服务，提供 API 和 MongoDB 数据支持。
- **apps/client**: 游戏前端 (原生 HTML/JS + Vite)，基于 Matter.js 和 Web Audio API。
- **apps/admin**: 后台管理系统 (React + Vite + Antd)，用于管理生字数据。

## 快速开始

### 1. 安装依赖

在根目录运行：
```bash
npm install
```

### 2. 配置环境

确保 `apps/server/.env` 文件已正确配置 (MongoDB URI, DeepSeek API Key, JWT Secret 等)。

### 3. 启动开发环境

你可以分别启动各个子项目：

- **启动后端**:
  ```bash
  npm run server
  ```
  (运行在 http://localhost:3000)

- **启动游戏前端**:
  ```bash
  npm run client
  ```
  (运行在 http://localhost:3001)

- **启动后台管理**:
  ```bash
  npm run admin
  ```
  (运行在 http://localhost:3002)

### 3. 使用 PM2 部署 (推荐)

在生产环境中，建议使用 PM2 来管理 Node.js 服务。

1.  **全局安装 PM2**:
    ```bash
    npm install -g pm2
    ```

2.  **启动服务**:
    ```bash
    npm run pm2:start
    ```

3.  **其他命令**:
    *   停止服务: `npm run pm2:stop`
    *   重启服务: `npm run pm2:restart`
    *   查看日志: `npm run pm2:logs`
    *   监控状态: `pm2 monit`

### 4. Nginx 反向代理配置

如果您希望使用 Nginx 部署，可以参考以下配置：

1.  在 Nginx 配置目录中创建一个新的配置文件（如 `/etc/nginx/sites-available/bouncyballs`）。
2.  将项目根目录下的 `nginx.conf` 内容复制进去。
3.  **修改路径**: 请将配置文件中的 `/path/to/bouncyballs/` 替换为实际的项目路径。
4.  重启 Nginx:
    ```bash
    sudo ln -s /etc/nginx/sites-available/bouncyballs /etc/nginx/sites-enabled/
    sudo systemctl restart nginx
    ```

### 4. 数据导入

如果是首次运行，可以导入初始数据：
```bash
npm run seed
```

## 功能特性

- **游戏**: 物理引擎驱动的生字互动游戏。
- **管理**: 现代化的后台管理界面，支持 AI 自动生成生字拼音和组词。
- **安全**: JWT 身份认证，保护敏感操作。
- **架构**: Monorepo 结构，便于代码管理和扩展。
