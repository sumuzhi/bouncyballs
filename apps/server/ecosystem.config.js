module.exports = {
  apps: [
    {
      name: 'bouncyballs-server',
      cwd: __dirname,
      script: 'server.js', // 相对于 cwd 的路径
      instances: 1, // 或者 'max' 利用多核
      autorestart: true,
      exec_mode: 'fork',
      watch: false, // 生产环境通常关闭 watch
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      env_prod: {
        NODE_ENV: 'production'
      },
      error_file: '../../logs/err.log', // 日志路径建议保持在外层，或者放到 ./logs
      out_file: '../../logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
