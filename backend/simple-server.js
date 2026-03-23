/**
 * 简单支付宝支付测试服务器
 * 端口3000，与前端配置匹配
 */

// 加载环境变量
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');
const AlipaySdk = require('alipay-sdk').default;

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 阿里云短信配置
const ALIYUN_SMS_CONFIG = {
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
  signName: process.env.ALIYUN_SMS_SIGN_NAME || '武汉市洪山区乔乔尼服装店',
  templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || 'SMS_501700483',
  region: 'cn-hangzhou'
};

// 内存存储验证码
const verificationCodes = new Map();

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '布鲁计划后端API服务运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: [
      '/send-sms-code',
      '/verify-sms-code',
      '/alipay/create-order',
      '/alipay/query-order/:orderId'
    ]
  });
});

// 计算阿里云API签名
function computeSignature(parameters, accessKeySecret) {
  const sortedParams = Object.keys(parameters).sort();
  const queryString = sortedParams
    .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(parameters[key]))
    .join('&');

  const stringToSign = 'POST&' + encodeURIComponent('/') + '&' + encodeURIComponent(queryString);

  const signature = crypto
    .createHmac('sha1', accessKeySecret + '&')
    .update(stringToSign)
    .digest('base64');

  return signature;
}

// 发送RPC请求
function requestRPC(host, params) {
  return new Promise((resolve, reject) => {
    const data = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    const options = {
      hostname: host,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 发送阿里云短信
async function sendAliyunSms(phone, code) {
  // 检查是否配置了AccessKey
  if (!ALIYUN_SMS_CONFIG.accessKeyId || !ALIYUN_SMS_CONFIG.accessKeySecret) {
    console.log('[警告] 未配置阿里云AccessKey，使用模拟模式');
    console.log(`[模拟] 短信验证码: ${code}`);
    return { success: true, mock: true };
  }

  try {
    const params = {
      AccessKeyId: ALIYUN_SMS_CONFIG.accessKeyId,
      Action: 'SendSms',
      Format: 'JSON',
      PhoneNumbers: phone,
      SignatureMethod: 'HMAC-SHA1',
      SignatureNonce: Math.random().toString(36).substr(2, 32),
      SignatureVersion: '1.0',
      SignName: ALIYUN_SMS_CONFIG.signName,
      TemplateCode: ALIYUN_SMS_CONFIG.templateCode,
      TemplateParam: JSON.stringify({ code: code }),
      Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      Version: '2017-05-25',
      RegionId: ALIYUN_SMS_CONFIG.region
    };

    const signature = computeSignature(params, ALIYUN_SMS_CONFIG.accessKeySecret);
    params.Signature = signature;

    const result = await requestRPC('dysmsapi.aliyuncs.com', params);
    console.log('阿里云短信发送结果:', result);

    if (result.Code === 'OK') {
      return { success: true, result };
    } else {
      return { success: false, error: result.Message };
    }
  } catch (error) {
    console.error('阿里云短信发送失败:', error);
    return { success: false, error: error.message };
  }
}

// 发送短信验证码
app.post('/send-sms-code', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: '手机号不能为空' });
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: '手机号格式不正确' });
    }

    // 检查是否频繁发送
    const existing = verificationCodes.get(phone);
    if (existing && Date.now() - existing.createdAt < 60000) {
      return res.status(400).json({ success: false, message: '发送太频繁，请稍后再试' });
    }

    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 存储验证码
    verificationCodes.set(phone, {
      code: code,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5分钟有效
      createdAt: Date.now()
    });

    // 调用阿里云短信API
    const smsResult = await sendAliyunSms(phone, code);

    if (smsResult.success) {
      console.log(`验证码已发送至 ${phone}: ${code}`);
      res.json({
        success: true,
        message: '验证码已发送',
        mock: smsResult.mock || false,
        code: smsResult.mock ? code : undefined  // 模拟模式时返回验证码
      });
    } else {
      console.error('短信发送失败:', smsResult.error);
      // 降级到模拟模式
      console.log(`[降级模拟] 验证码: ${code}`);
      res.json({
        success: true,
        message: '验证码已发送 (演示模式)',
        mock: true,
        code: code
      });
    }
  } catch (error) {
    console.error('发送验证码失败:', error);
    res.status(500).json({ success: false, message: '发送失败' });
  }
});

// 验证短信验证码
app.post('/verify-sms-code', (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const stored = verificationCodes.get(phone);

    if (!stored) {
      return res.status(400).json({ success: false, message: '请先获取验证码' });
    }

    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(phone);
      return res.status(400).json({ success: false, message: '验证码已过期' });
    }

    if (stored.code !== code) {
      return res.status(400).json({ success: false, message: '验证码错误' });
    }

    // 验证成功，删除验证码
    verificationCodes.delete(phone);

    res.json({ success: true, message: '验证成功' });
  } catch (error) {
    console.error('验证失败:', error);
    res.status(500).json({ success: false, message: '验证失败' });
  }
});

// 读取应用私钥
function loadPrivateKey() {
  const keyPath = path.join(__dirname, 'app_private_key.pem');
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf8');
  }
  console.error('[错误] 找不到私钥文件:', keyPath);
  return null;
}

// 初始化支付宝 SDK
const privateKey = loadPrivateKey();
const alipaySdk = new AlipaySdk({
  appId: '9021000159665986',
  privateKey: privateKey,
  gateway: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do', // 沙盒网关
  signType: 'RSA2',
  charset: 'utf-8',
  version: '1.0'
});

console.log('[支付宝] SDK 初始化完成，使用沙盒环境');

// 支付宝创建订单接口 - 使用官方 SDK
app.post('/alipay/create-order', async (req, res) => {
  console.log('[支付宝] 收到创建订单请求:', req.body);

  const { amount, subject, description, userId } = req.body;

  if (!amount || !subject) {
    return res.status(400).json({
      success: false,
      message: '缺少必要参数'
    });
  }

  // 生成订单ID
  const orderId = 'ALIPAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  // 确保金额是字符串格式，保留2位小数
  const amountStr = parseFloat(amount).toFixed(2);

  try {
    // 使用 SDK 生成订单字符串
    const orderStr = alipaySdk.sdkExec('alipay.trade.app.pay', {
      notifyUrl: 'https://blue-plan1.cn/alipay-notify',
      bizContent: {
        outTradeNo: orderId,
        totalAmount: amountStr,
        subject: subject,
        productCode: 'QUICK_MSECURITY_PAY'
      }
    });

    console.log('[支付宝] SDK 生成订单字符串成功');
    console.log('[支付宝] orderStr 前100字符:', orderStr.substring(0, 100));

    const orderInfo = {
      success: true,
      message: '订单创建成功',
      orderId: orderId,
      payParams: {
        orderStr: orderStr
      },
      data: {
        amount: amount,
        subject: subject,
        description: description || '',
        userId: userId || '',
        createTime: new Date().toISOString(),
        env: 'sandbox'
      }
    };

    console.log('[支付宝] 订单创建成功:', orderInfo.orderId);
    res.json(orderInfo);
    
  } catch (error) {
    console.error('[支付宝] 创建订单失败:', error);
    res.status(500).json({
      success: false,
      message: '创建订单失败: ' + error.message
    });
  }
});

// 订单查询接口
app.get('/alipay/query-order/:orderId', (req, res) => {
  const { orderId } = req.params;
  console.log('[支付宝] 查询订单:', orderId);

  res.json({
    success: true,
    message: '订单查询成功',
    data: {
      orderId: orderId,
      status: 'WAIT_BUYER_PAY',
      amount: '9.90',
      subject: '布鲁计划',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    }
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '布鲁计划后端API服务',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log('=====================================');
  console.log('  布鲁计划后端服务已启动');
  console.log('=====================================');
  console.log(`  地址: http://localhost:${PORT}`);
  console.log('  接口列表:');
  console.log('  - POST /send-sms-code (发送短信验证码)');
  console.log('  - POST /verify-sms-code (验证短信验证码)');
  console.log('  - POST /alipay/create-order (支付宝创建订单)');
  console.log('  - GET  /alipay/query-order/:orderId');
  console.log('=====================================');
});
