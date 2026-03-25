# 后端部署说明

## 服务器信息
- **IP**: 120.27.139.123
- **域名**: https://blue-plan1.cn
- **部署路径**: /home/admin/blue-plan-backend
- **端口**: 3000
- **进程管理**: PM2

## 部署步骤

### 1. 安装依赖
```bash
cd /home/admin/blue-plan-backend
npm install
```

### 2. 配置环境变量（可选）
```bash
export ALIPAY_APP_ID=你的支付宝AppID
export ALIPAY_PRIVATE_KEY=你的私钥
export ALIPAY_PUBLIC_KEY=支付宝公钥
export ALIPAY_NOTIFY_URL=https://blue-plan1.cn/alipay-notify
```

### 3. 启动服务
```bash
# 使用PM2启动
pm2 start server.js --name blue-plan-api

# 或直接使用Node
node server.js
```

### 4. 查看日志
```bash
pm2 logs blue-plan-api
```

### 5. 重启服务
```bash
pm2 restart blue-plan-api
```

## API文档

详见项目根目录的 PROJECT_REPORT.md

## 注意事项

1. 当前使用内存数据库，重启后数据会丢失
2. 生产环境建议迁移到 MongoDB 或 MySQL
3. 支付宝配置需要替换为真实密钥
