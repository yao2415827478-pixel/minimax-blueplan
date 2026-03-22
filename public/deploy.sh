#!/bin/bash
# 布鲁计划官网部署脚本
# 在服务器上执行此脚本

echo "=== 布鲁计划官网部署 ==="

# 创建网站目录
sudo mkdir -p /var/www/blueplan-website

# 设置权限
sudo chown -R $USER:$USER /var/www/blueplan-website

# 复制静态文件（假设文件已通过SCP上传到 ~/blueplan-website/）
if [ -d "$HOME/blueplan-website" ]; then
    cp -r $HOME/blueplan-website/* /var/www/blueplan-website/
    echo "✅ 静态文件已复制"
else
    echo "⚠️ 未找到 ~/blueplan-website 目录，请先将文件上传到该目录"
    exit 1
fi

# 复制Nginx配置
if [ -f "$HOME/blueplan-website/nginx-config.conf" ]; then
    sudo cp $HOME/blueplan-website/nginx-config.conf /etc/nginx/sites-available/blueplan
    
    # 启用配置
    sudo ln -sf /etc/nginx/sites-available/blueplan /etc/nginx/sites-enabled/
    
    # 测试配置
    sudo nginx -t
    
    if [ $? -eq 0 ]; then
        sudo systemctl reload nginx
        echo "✅ Nginx配置已更新"
    else
        echo "❌ Nginx配置测试失败"
        exit 1
    fi
else
    echo "⚠️ 未找到Nginx配置文件"
fi

echo ""
echo "=== 部署完成 ==="
echo "官网地址: http://blue-plan1.cn"
echo "隐私政策: http://blue-plan1.cn/privacy.html"
echo "用户协议: http://blue-plan1.cn/terms.html"
