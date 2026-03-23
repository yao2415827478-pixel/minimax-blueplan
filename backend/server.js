const express = require('express');
const app = express();
const port = 3000;

// CORS 中间件 - 允许所有来源
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== 支付宝配置 ====================
// 格式化私钥为PEM格式
function formatPrivateKey(key) {
  if (!key) return key;
  if (key.includes('-----BEGIN')) return key;
  return `-----BEGIN RSA PRIVATE KEY-----\n${key.match(/.{1,64}/g).join('\n')}\n-----END RSA PRIVATE KEY-----`;
}

function formatPublicKey(key) {
  if (!key) return key;
  if (key.includes('-----BEGIN')) return key;
  return `-----BEGIN PUBLIC KEY-----\n${key.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
}

const ALIPAY_CONFIG = {
  appId: process.env.ALIPAY_APP_ID || '2021006132651155',
  privateKey: formatPrivateKey(process.env.ALIPAY_PRIVATE_KEY) || formatPrivateKey('MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCPwujDmGR6kan5ywxkC5lUoMBIxQ9XIXXN/QXnmH/17N5XCZqlIEqoAT+ixYFqfiqYKfjJxsfdRG6+nS7HDkwUiHm9sZqwK3nzL/8icNFYCliIe5/f/fFmnj11QcEVP1iH7N6jyUWucwDqmu/muwQqmkCzizmVBskA2lUBwIZaXbN7nRq1eWcX5uqWohsvnDfK0+UC01a5Jjal5ZsfSi6xLh3Id4XQ6rOUSNx24FsEWfTRNf7FTMdqsL+RtnAIYxP/h0fypFZk5dXoZHcOHZJsY2gcRZuB5YkQ2pMXg5cVs2xdlyW4mRZBNU2/RUXm76zfpAwyj2LpHhtEMiTmCDJTAgMBAAECggEAG0Ffsd2NhzNgn2wgkEMmscW8Ts+VhfZhCEmlOfBOqkhbKvM2L4I8xTdfYjPBwnfjCXBDq7WVJN0Zhef0+2Y5hFcPhahLZIUJnNKHs3biKafkexO9DtFtWAA+NKHfwnB9D2AYIcNCA73n+ZKgUwU31//grmmB5EAiEZhTL37Zuf3q9Pq9NZFAxte0E0MlqSWqVO0IE4egLkUCV4k0hr01ucpbIoeKrsZ0Rc1hhTOx1Y98JJ31jqa/b0C+1s3o/ZytyRGpIn86nOFFqhC1FNGG5xoCbYcno9P6AickU/V1tYHa/I24PktSj045+BoG+DaZw918DB4sirtXj+gvVyZaSQKBgQDKgogUTNuIlgFuA9p2vKBvwgk3A9aXhdPJkL/U7pZzp4bMWCVToITUygzfexJfsQeMatn4dOZ+8y2bAMTQbji0QAxm4+2fSUpiryiHeFgjbQmG5ht7I6vElL/0M0FYkkkFTPOpsTae6StzKtrWDoEv2gLrbfGW3VMTi8nx+9FnrwKBgQC1u+ACDhMok1E0PBiIphgpzpQ5aMB3dfiFGF79OUINBP7YBiL9INGbCjx/JTFfdC2YYjIH6JebO0jAEizH2dZn9BJk2whIYblF3jhjl9w6GFMR0zbGCsn0fRG7CLtG1n+X8u8qcC8AWFTTIpSxhlsJ+3y+ah7oBxkMzebdZykknQKBgQCpIbGjOrmTbq0NBBzeVBWuoSDvGL6N2FCUpNcCcK2pND5pxiiOmp611XZA49npn8HNLaSUVJX5awIo1dCKv7OOH3v8Jtrb0OtWVjIESqdaFwQA7YgAJT+dNBrJSlGGNs7TpXxPulkDCXyneCBC7ORKYctUc4N1W625wmNMPeObswKBgQCDULTlZzwqtoAXqVDk9HdDRjTOYsWnzEN+EIUanlP+ylxGxfBkTWGHkNbz3HEXkwAbOuEB2+woS6ceukNHST1msfLUk3whqRNRy+ec9y83fzoPCDps0YDqO7EjH4ULA5UAu5ZbaOJdcnYgdb1RpU6FIQYbJN0eNXrBSMqHsrIE9QKBgEIgWGRUh42AkD7lmkvEUlthK5CbCdpuL5sDUBpGegXiKbmoB6ZtdAug6hPdA9d1GVXp/CjVBkHGyD2yL+bLZ1UPoUysN8ifR857wDyebe0zAq/dbvw/jKfRiFgejLH++NTrJzhbFqv0swFLgCpzfXDZ/GsePL84oNg5ekaFp+5f'),
  alipayPublicKey: formatPublicKey(process.env.ALIPAY_PUBLIC_KEY) || formatPublicKey('MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAj8Low5hkepGp+csMZAuZVKDASMUPVyF1zf0F55h/9ezeVwmapSBKqAE/osWBan4qmCn4ycbH3URuvp0uxw5MFIh5vbGasCt58y//InDRWApYiHuf3/3xZp49dUHBFT9Yh+zeo8lFrnMA6prv5rsEKppAs4s5lQbJANpVAcCGWl2ze50atXlnF+bqlqIbL5w3ytPlAtNWuSY2peWbH0ousS4dyHeF0OqzlEjcduBbBFn00TX+xUzHarC/kbZwCGMT/4dH8qRWZOXV6GR3Dh2SbGNoHEWbgeWJENqTF4OXFbNsXZcluJkWQTVNv0VF5u+s36QMMo9i6R4bRDIk5ggyUwIDAQAB'),
  gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
  notifyUrl: process.env.ALIPAY_NOTIFY_URL || 'https://blue-plan1.cn/alipay-notify',
  returnUrl: process.env.ALIPAY_RETURN_URL || 'https://blue-plan1.cn/alipay-return'
};

// ==================== 支付宝SDK初始化 ====================
let alipaySdk = null;
try {
  const { AlipaySdk } = require('alipay-sdk');
  alipaySdk = new AlipaySdk({
    appId: ALIPAY_CONFIG.appId,
    privateKey: ALIPAY_CONFIG.privateKey,
    alipayPublicKey: ALIPAY_CONFIG.alipayPublicKey,
    gateway: ALIPAY_CONFIG.gateway,
    signType: 'RSA2'
  });
  console.log('[支付宝] SDK初始化成功');
} catch (error) {
  console.error('[支付宝] SDK初始化失败:', error.message);
}

// 基础路由
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: '布鲁计划后端API',
    version: '2.0.0',
    alipay: alipaySdk ? '已配置真实支付' : '模拟模式',
    server_time: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    alipay_app_id: ALIPAY_CONFIG.appId,
    alipay_sdk: alipaySdk ? 'initialized' : 'not_initialized',
    server: '120.27.139.123:3000'
  });
});

// 支付宝配置信息
app.get('/alipay/config', (req, res) => {
  res.json({
    app_id: ALIPAY_CONFIG.appId,
    public_key_preview: ALIPAY_CONFIG.alipayPublicKey.substring(0, 50) + '...',
    notify_url: ALIPAY_CONFIG.notifyUrl,
    return_url: ALIPAY_CONFIG.returnUrl,
    gateway: ALIPAY_CONFIG.gateway,
    sdk_status: alipaySdk ? '已初始化' : '未初始化',
    status: '配置完成'
  });
});

// 真实支付宝支付API
app.post('/alipay/create-order', async (req, res) => {
  try {
    console.log('[支付宝] 收到创建订单请求');
    console.log('[支付宝] 请求体:', JSON.stringify(req.body));

    const { amount = 9.9, subject = '布鲁计划会员', description, userId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: '金额不正确' });
    }

    // 生成订单号
    const outTradeNo = 'ALI' + Date.now() + Math.floor(Math.random() * 1000);
    const timestamp = new Date().toISOString();

    let orderStr = '';

    // 使用官方SDK生成支付参数
    if (alipaySdk) {
      try {
        // 使用 sdkExec 生成APP支付参数字符串（本地签名，不发送请求）
        orderStr = alipaySdk.sdkExec('alipay.trade.app.pay', {
          notifyUrl: ALIPAY_CONFIG.notifyUrl,
          bizContent: {
            out_trade_no: outTradeNo,
            total_amount: String(amount),
            subject: subject,
            product_code: 'QUICK_MSECURITY_PAY',
            timeout_express: '30m'
          }
        });
        
        console.log(`[支付宝] SDK生成订单成功: ${outTradeNo}`);
        console.log(`[支付宝] orderStr:`, orderStr);
      } catch (sdkError) {
        console.error('[支付宝] SDK调用失败:', sdkError.message);
        console.error('[支付宝] SDK错误详情:', sdkError);
        // 返回错误而不是模拟模式
        return res.status(500).json({
          success: false,
          message: '支付宝SDK调用失败: ' + sdkError.message
        });
      }
    } else {
      // SDK未初始化，使用模拟模式
      orderStr = 'demo_order_str_' + outTradeNo;
      console.log(`[支付宝] SDK未初始化，使用模拟模式: ${outTradeNo}`);
    }

    console.log(`[支付宝] 订单创建成功: ${outTradeNo}, 金额: ${amount}`);

    res.json({
      success: true,
      orderId: outTradeNo,
      payParams: {
        orderStr: orderStr
      }
    });

  } catch (error) {
    console.error('[支付宝] 创建订单失败:', error);
    res.status(500).json({
      success: false,
      message: '创建订单失败',
      error: error.message
    });
  }
});

// 支付宝回调
app.post('/alipay-notify', (req, res) => {
  console.log('[支付宝] 支付回调:', JSON.stringify(req.body, null, 2));
  console.log('[支付宝] 支付状态:', req.body.trade_status);
  console.log('[支付宝] 订单号:', req.body.out_trade_no);
  console.log('[支付宝] 金额:', req.body.total_amount);

  // 实际应该验证签名
  if (req.body.trade_status === 'TRADE_SUCCESS') {
    console.log('[支付宝] 支付成功，处理业务逻辑');
    // 更新订单状态、发货等
  }

  res.send('success'); // 必须返回success
});

// 支付返回页面
app.get('/alipay-return', (req, res) => {
  res.json({
    status: 'return_success',
    message: '支付完成，正在返回应用...',
    timestamp: new Date().toISOString(),
    query: req.query,
    next: '关闭页面返回应用'
  });
});

// 启动服务
app.listen(port, '0.0.0.0', () => {
  console.log(`布鲁计划后端运行在 http://0.0.0.0:${port}`);
  console.log(`支付宝AppID: ${ALIPAY_CONFIG.appId}`);
  console.log(`SDK状态: ${alipaySdk ? '已初始化' : '未初始化'}`);
  console.log(`回调地址: ${ALIPAY_CONFIG.notifyUrl}`);
  console.log(`返回地址: ${ALIPAY_CONFIG.returnUrl}`);
});