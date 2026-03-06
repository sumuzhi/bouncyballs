# 单机部署说明

## 1. 目录约定

- 项目目录：`/var/www/bouncyballs`
- Portal 静态目录：`/var/www/bouncyballs/apps/portal/dist`
- Admin 静态目录：`/var/www/bouncyballs/apps/admin/dist`
- Client 静态目录：`/var/www/bouncyballs/apps/client/dist`

## 2. 安装依赖

```bash
sudo apt update
sudo apt install -y nginx
curl -fsSL https://get.pnpm.io/install.sh | sh -
pnpm -v
node -v
```

## 3. 构建前端

```bash
cd /var/www/bouncyballs
pnpm install
pnpm --filter portal build
pnpm --filter admin build
pnpm --filter client build
```

也可以直接执行一键部署脚本：

```bash
cd /var/www/bouncyballs
./deploy/deploy-frontends.sh --deploy-root /var/www/bouncyballs --reload-nginx
```

常用参数：

- `--deploy-root` 指定部署目录，默认 `/var/www/bouncyballs`
- `--skip-install` 跳过 `pnpm install`
- `--reload-nginx` 部署完成后执行 `nginx -t` 并重载

## 4. 启动后端

```bash
cd /var/www/bouncyballs
pnpm --filter server start:prod
```

建议使用 PM2：

```bash
pnpm pm2:start
pm2 save
pm2 startup
```

## 5. Nginx 配置

```bash
sudo cp /var/www/bouncyballs/deploy/nginx.single-server.conf /etc/nginx/sites-available/bouncyballs
sudo ln -sf /etc/nginx/sites-available/bouncyballs /etc/nginx/sites-enabled/bouncyballs
sudo nginx -t
sudo systemctl reload nginx
```

宝塔面板可直接使用：

```bash
cp /www/wwwroot/bouncyballs/deploy/nginx.btpanel.sumuzhi.site.conf /www/server/panel/vhost/nginx/sumuzhi.site.conf
nginx -t
systemctl reload nginx
```

## 6. 生产环境变量

`apps/server/.env.production` 至少需要：

- `PORT=3000`
- `MONGO_HOST`
- `MONGO_PORT`
- `MONGO_DB`
- `MONGO_USER`
- `MONGO_PASS`
- `MONGO_AUTH_SOURCE`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `DEEPSEEK_API_KEY`
- `CORS_ORIGINS=https://your-domain.com`

`apps/portal/.env.production`：

- `VITE_BOUNCY_BALLS_URL=/bouncy-balls/`

`apps/client/.env.production`：

- `VITE_PUBLIC_BASE=/bouncy-balls/`

## 7. 访问路径

- Portal：`https://your-domain.com/`
- Admin：`https://your-domain.com/admin/`
- Client：`https://your-domain.com/bouncy-balls/`
- API：`https://your-domain.com/api/`

## 8. API 404 排查

- 若使用服务器 IP 访问 API，请确保 Nginx `server_name` 包含该 IP。
- 建议优先使用域名访问：`https://sumuzhi.site/api/...`
- 修改配置后执行：

```bash
nginx -t
systemctl reload nginx
```

## 9. 子应用未授权拦截

- `/bouncy-balls/` 通过 `auth_request /_auth_portal` 做网关鉴权，调用后端 `/api/portal/auth/nginx-verify` 校验 `portalToken`
- 未授权会被网关 302 到 `/login?redirect=原链接`，不会渲染子应用
- `portalToken` 由后端登录/注册接口以 HttpOnly Cookie 下发，前端不可读
- 退出登录会调用 `/api/portal/auth/logout` 清理 HttpOnly Cookie
- client 启动时会调用 `/api/portal/auth/verify` 二次校验，校验失败会再次跳转登录并不渲染子应用
