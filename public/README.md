# 布鲁计划官网 - 微信支付审核专用

## 文件说明

| 文件 | 用途 |
|------|------|
| `index.html` | 官网首页，包含应用介绍、功能特点、下载链接 |
| `privacy.html` | 隐私政策页面（微信支付审核必需） |
| `terms.html` | 用户协议页面（微信支付审核必需） |
| `deploy.sh` | 服务器部署脚本 |

## 微信支付审核要求

官网必须包含以下内容：

- ✅ 应用名称和Logo
- ✅ 应用介绍
- ✅ 功能特点
- ✅ 下载链接
- ✅ 隐私政策
- ✅ 用户协议
- ✅ 联系方式

## 部署步骤

### 1. 打包文件

将以下文件打包上传到服务器：
```
public/
├── index.html
├── privacy.html
├── terms.html
├── deploy.sh
└── nginx-config.conf
```

### 2. 上传到服务器

```bash
# 在本地执行
scp -r public/* root@120.27.139.123:~/blueplan-website/
```

### 3. 在服务器执行部署

```bash
ssh root@120.27.139.123
cd ~/blueplan-website
chmod +x deploy.sh
./deploy.sh
```

### 4. 配置HTTPS（推荐）

使用 Certbot 申请免费SSL证书：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d blue-plan1.cn -d www.blue-plan1.cn
```

## 微信支付审核提交信息

- **应用官网**: https://blue-plan1.cn
- **应用下载链接**: https://blue-plan1.cn/app-release.apk （需先上传APK）
- **隐私政策**: https://blue-plan1.cn/privacy.html
- **用户协议**: https://blue-plan1.cn/terms.html

## 注意事项

1. APK文件需要手动上传到 `/var/www/blueplan-website/` 目录
2. 确保域名 `blue-plan1.cn` 已解析到服务器IP `120.27.139.123`
3. 如果已有备案号，请在 `index.html` 底部更新 ICP 备案信息
4. 建议添加真实应用截图替换占位符

## 后续更新

如需更新官网内容：
1. 修改本地 `public/` 目录下的HTML文件
2. 重新上传到服务器
3. 刷新页面查看效果
