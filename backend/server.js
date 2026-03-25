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

// ==================== 内存数据库（生产环境应使用真实数据库）====================
const db = {
  // 邀请码表
  inviteCodes: new Map(),
  // 用户表
  users: new Map(),
  // 订单表
  orders: new Map(),
  // 邀请关系表
  inviteRelations: new Map(),
  // 奖励记录表
  rewards: new Map(),
  // 提现记录表
  withdrawals: new Map()
};

// 初始化邀请码
function initTestData() {
  // 正式版邀请码（给用户使用）
  const publicCodes = [
    { code: 'BLUE2024', maxUses: 1000 },
    { code: 'VIP666', maxUses: 500 },
    { code: 'NEWUSER', maxUses: 2000 },
    { code: 'START99', maxUses: 1000 }
  ];
  
  publicCodes.forEach(({ code, maxUses }) => {
    db.inviteCodes.set(code, {
      code: code,
      createdBy: 'system',
      maxUses: maxUses,
      usedCount: 0,
      discountAmount: 200, // 2元 = 200分
      isActive: true,
      type: 'public',
      createdAt: new Date().toISOString()
    });
  });
  
  // 内部专属验证码（跳过支付）
  db.inviteCodes.set('YAOLUJIE2024', {
    code: 'YAOLUJIE2024',
    createdBy: 'admin',
    maxUses: 9999,
    usedCount: 0,
    discountAmount: 1290, // 全额减免 = 1290分（12.9元）
    isActive: true,
    type: 'internal',
    skipPayment: true, // 标记为跳过支付
    createdAt: new Date().toISOString()
  });
  
  console.log('[数据库] 公开邀请码已初始化:', publicCodes.map(c => c.code));
  console.log('[数据库] 内部专属验证码已初始化: YAOLUJIE2024');
}

initTestData();

// ==================== 支付宝配置 ====================
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
  privateKey: formatPrivateKey(process.env.ALIPAY_PRIVATE_KEY),
  alipayPublicKey: formatPublicKey(process.env.ALIPAY_PUBLIC_KEY),
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

// ==================== 邀请码API ====================

// 验证邀请码
app.post('/api/invite/validate', (req, res) => {
  try {
    const { inviteCode } = req.body;
    
    if (!inviteCode || inviteCode.length < 4) {
      return res.json({
        success: false,
        error: { message: '邀请码格式不正确' }
      });
    }

    const code = db.inviteCodes.get(inviteCode.toUpperCase());
    
    if (!code) {
      return res.json({
        success: false,
        error: { message: '邀请码不存在' }
      });
    }

    if (!code.isActive) {
      return res.json({
        success: false,
        error: { message: '邀请码已失效' }
      });
    }

    if (code.usedCount >= code.maxUses) {
      return res.json({
        success: false,
        error: { message: '邀请码已达使用上限' }
      });
    }

    res.json({
      success: true,
      data: {
        valid: true,
        inviteCode: code.code,
        discountAmount: code.discountAmount,
        skipPayment: code.skipPayment || false,
        type: code.type || 'public'
      }
    });
  } catch (error) {
    console.error('[邀请码] 验证失败:', error);
    res.json({
      success: false,
      error: { message: '验证失败，请重试' }
    });
  }
});

// ==================== 支付API ====================

// 创建支付订单
app.post('/api/payment/create', async (req, res) => {
  try {
    const { phone, inviteCode, productType, channel } = req.body;
    
    console.log('[支付] 创建订单:', { phone, inviteCode, productType, channel });

    if (!phone) {
      return res.json({
        success: false,
        error: { message: '手机号不能为空' }
      });
    }

    // 计算价格
    const ORIGINAL_PRICE = 1290; // 12.9元 = 1290分
    let finalAmount = ORIGINAL_PRICE;
    let discountAmount = 0;
    let usedInviteCode = null;

    // 验证邀请码
    if (inviteCode) {
      const code = db.inviteCodes.get(inviteCode.toUpperCase());
      if (code && code.isActive && code.usedCount < code.maxUses) {
        discountAmount = code.discountAmount;
        finalAmount = ORIGINAL_PRICE - discountAmount;
        usedInviteCode = code.code;
      }
    }

    // 生成订单号
    const orderId = 'BP' + Date.now() + Math.floor(Math.random() * 1000);
    
    // 保存订单
    db.orders.set(orderId, {
      orderId: orderId,
      phone: phone,
      originalAmount: ORIGINAL_PRICE,
      discountAmount: discountAmount,
      finalAmount: finalAmount,
      inviteCode: usedInviteCode,
      productType: productType || 'entry_access',
      channel: channel || 'alipay',
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    // 使用支付宝SDK创建订单
    let payParams = {};
    if (alipaySdk && channel === 'alipay') {
      try {
        const orderStr = alipaySdk.sdkExec('alipay.trade.app.pay', {
          notifyUrl: ALIPAY_CONFIG.notifyUrl,
          bizContent: {
            out_trade_no: orderId,
            total_amount: (finalAmount / 100).toFixed(2),
            subject: '布鲁计划会员',
            product_code: 'QUICK_MSECURITY_PAY',
            timeout_express: '30m'
          }
        });
        payParams = { orderStr };
      } catch (sdkError) {
        console.error('[支付宝] SDK调用失败:', sdkError.message);
        payParams = { orderStr: 'demo_' + orderId };
      }
    } else {
      payParams = { orderStr: 'demo_' + orderId };
    }

    res.json({
      success: true,
      data: {
        orderId: orderId,
        amount: finalAmount,
        originalAmount: ORIGINAL_PRICE,
        discountAmount: discountAmount,
        payParams: payParams
      }
    });
  } catch (error) {
    console.error('[支付] 创建订单失败:', error);
    res.json({
      success: false,
      error: { message: '创建订单失败: ' + error.message }
    });
  }
});

// ==================== 登录API ====================

// 登录/注册
app.post('/api/auth/login', (req, res) => {
  try {
    const { phone, code } = req.body;
    
    // 模拟验证码验证
    if (code !== '123456' && code !== '000000') {
      console.log('[登录] 开发模式：跳过验证码验证');
    }

    // 查找或创建用户
    let user = db.users.get(phone);
    if (!user) {
      user = {
        id: 'U' + Date.now(),
        phone: phone,
        nickname: '战士',
        inviteCode: generateInviteCode(),
        rewardBalance: 0,
        totalReward: 0,
        createdAt: new Date().toISOString()
      };
      db.users.set(phone, user);
      console.log('[登录] 新用户注册:', phone);
    }

    // 生成token
    const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2);

    res.json({
      success: true,
      data: {
        token: token,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          inviteCode: user.inviteCode
        }
      }
    });
  } catch (error) {
    console.error('[登录] 失败:', error);
    res.json({
      success: false,
      error: { message: '登录失败' }
    });
  }
});

// 生成邀请码
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ==================== 邀请关系API ====================

// 绑定邀请关系
app.post('/api/invite/bind', (req, res) => {
  try {
    const { orderId } = req.body;
    
    const order = db.orders.get(orderId);
    if (!order) {
      return res.json({
        success: false,
        error: { message: '订单不存在' }
      });
    }

    if (!order.inviteCode) {
      return res.json({
        success: true,
        data: { message: '无邀请码，跳过绑定' }
      });
    }

    // 查找邀请人
    let inviter = null;
    for (const user of db.users.values()) {
      if (user.inviteCode === order.inviteCode) {
        inviter = user;
        break;
      }
    }

    if (!inviter) {
      return res.json({
        success: false,
        error: { message: '邀请人不存在' }
      });
    }

    // 检查是否已存在邀请关系
    for (const relation of db.inviteRelations.values()) {
      if (relation.inviteePhone === order.phone) {
        return res.json({
          success: true,
          data: { message: '邀请关系已存在' }
        });
      }
    }

    // 创建邀请关系
    const relationId = 'R' + Date.now();
    db.inviteRelations.set(relationId, {
      id: relationId,
      inviterId: inviter.id,
      inviterPhone: inviter.phone,
      inviteePhone: order.phone,
      orderId: orderId,
      status: 'pending_activation',
      rewardAmount: 500, // 5元 = 500分
      createdAt: new Date().toISOString()
    });

    console.log('[邀请] 绑定成功:', relationId, inviter.phone, '->', order.phone);

    res.json({
      success: true,
      data: { message: '邀请关系已建立', relationId }
    });
  } catch (error) {
    console.error('[邀请] 绑定失败:', error);
    res.json({
      success: false,
      error: { message: '绑定失败' }
    });
  }
});

// 首次激活奖励结算
app.post('/api/invite/activate', (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.json({
        success: false,
        error: { message: '手机号不能为空' }
      });
    }

    let activatedCount = 0;
    for (const relation of db.inviteRelations.values()) {
      if (relation.inviteePhone === phone && relation.status === 'pending_activation') {
        relation.status = 'activated';
        relation.activatedAt = new Date().toISOString();
        
        const inviter = db.users.get(relation.inviterPhone);
        if (inviter) {
          inviter.rewardBalance = (inviter.rewardBalance || 0) + relation.rewardAmount;
          inviter.totalReward = (inviter.totalReward || 0) + relation.rewardAmount;
          
          const rewardId = 'RW' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
          db.rewards.set(rewardId, {
            id: rewardId,
            userPhone: inviter.phone,
            type: 'invite',
            amount: relation.rewardAmount,
            source: relation.inviteePhone,
            description: '邀请好友奖励',
            createdAt: new Date().toISOString()
          });
          
          console.log('[邀请] 奖励发放:', inviter.phone, '+', relation.rewardAmount, '分');
          activatedCount++;
        }
      }
    }

    res.json({
      success: true,
      data: { 
        message: '激活奖励已记录',
        activatedCount
      }
    });
  } catch (error) {
    console.error('[邀请] 激活失败:', error);
    res.json({
      success: false,
      error: { message: '激活失败' }
    });
  }
});

// ==================== 收益API ====================

// 获取收益概览
app.get('/api/invite/summary', (req, res) => {
  try {
    const { phone } = req.query;
    
    if (!phone) {
      return res.json({
        success: false,
        error: { message: '手机号不能为空' }
      });
    }

    const user = db.users.get(phone);
    if (!user) {
      return res.json({
        success: false,
        error: { message: '用户不存在' }
      });
    }

    let inviteCount = 0;
    let activatedCount = 0;
    for (const relation of db.inviteRelations.values()) {
      if (relation.inviterPhone === phone) {
        inviteCount++;
        if (relation.status === 'activated') {
          activatedCount++;
        }
      }
    }

    const rewardBalance = user.rewardBalance || 0;
    const withdrawableAmount = rewardBalance >= 1000 ? rewardBalance : 0;

    res.json({
      success: true,
      data: {
        inviteCode: user.inviteCode,
        inviteCount: inviteCount,
        activatedCount: activatedCount,
        rewardBalance: rewardBalance,
        totalReward: user.totalReward || 0,
        withdrawableAmount: withdrawableAmount,
        minWithdrawAmount: 1000
      }
    });
  } catch (error) {
    console.error('[收益] 获取失败:', error);
    res.json({
      success: false,
      error: { message: '获取失败' }
    });
  }
});

// 获取奖励流水
app.get('/api/invite/reward-ledger', (req, res) => {
  try {
    const { phone } = req.query;
    
    if (!phone) {
      return res.json({
        success: false,
        error: { message: '手机号不能为空' }
      });
    }

    const list = [];
    for (const reward of db.rewards.values()) {
      if (reward.userPhone === phone) {
        list.push({
          id: reward.id,
          type: reward.type,
          amount: reward.amount,
          description: reward.description,
          source: reward.source,
          createdAt: reward.createdAt
        });
      }
    }

    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: {
        list: list,
        total: list.length
      }
    });
  } catch (error) {
    console.error('[收益] 获取流水失败:', error);
    res.json({
      success: false,
      error: { message: '获取失败' }
    });
  }
});

// ==================== 提现API ====================

// 申请提现
app.post('/api/withdraw/apply', (req, res) => {
  try {
    const { phone, amount, channel, account, accountName } = req.body;
    
    if (!phone || !amount || !channel || !account) {
      return res.json({
        success: false,
        error: { message: '参数不完整' }
      });
    }

    const user = db.users.get(phone);
    if (!user) {
      return res.json({
        success: false,
        error: { message: '用户不存在' }
      });
    }

    if ((user.rewardBalance || 0) < amount) {
      return res.json({
        success: false,
        error: { message: '余额不足' }
      });
    }

    if (amount < 1000) {
      return res.json({
        success: false,
        error: { message: '最小提现金额为10元' }
      });
    }

    user.rewardBalance -= amount;

    const withdrawId = 'W' + Date.now();
    db.withdrawals.set(withdrawId, {
      id: withdrawId,
      userPhone: phone,
      amount: amount,
      channel: channel,
      account: account,
      accountName: accountName,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    console.log('[提现] 申请成功:', withdrawId, phone, amount);

    res.json({
      success: true,
      data: { withdrawId: withdrawId }
    });
  } catch (error) {
    console.error('[提现] 申请失败:', error);
    res.json({
      success: false,
      error: { message: '申请失败' }
    });
  }
});

// 获取提现记录
app.get('/api/withdraw/records', (req, res) => {
  try {
    const { phone } = req.query;
    
    if (!phone) {
      return res.json({
        success: false,
        error: { message: '手机号不能为空' }
      });
    }

    const list = [];
    for (const record of db.withdrawals.values()) {
      if (record.userPhone === phone) {
        list.push({
          id: record.id,
          amount: record.amount,
          channel: record.channel,
          status: record.status,
          createdAt: record.createdAt
        });
      }
    }

    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: {
        list: list,
        total: list.length
      }
    });
  } catch (error) {
    console.error('[提现] 获取记录失败:', error);
    res.json({
      success: false,
      error: { message: '获取失败' }
    });
  }
});

// ==================== 支付宝API ====================

// 创建支付宝订单
app.post('/alipay/create-order', async (req, res) => {
  try {
    console.log('[支付宝] 收到创建订单请求');
    console.log('[支付宝] 请求体:', JSON.stringify(req.body));

    const { amount = 9.9, subject = '布鲁计划会员', description, phone, inviteCode, productType, channel = 'alipay' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: '金额不正确' });
    }

    const outTradeNo = 'ALI' + Date.now() + Math.floor(Math.random() * 1000);
    const timestamp = new Date().toISOString();

    db.orders.set(outTradeNo, {
      orderId: outTradeNo,
      phone: phone,
      amount: amount,
      inviteCode: inviteCode || null,
      productType: productType || 'standard',
      channel: channel,
      status: 'pending',
      createdAt: timestamp
    });
    console.log('[支付宝] 订单已保存:', outTradeNo);

    let orderStr = '';

    if (alipaySdk) {
      try {
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
        
        console.log('[支付宝] SDK生成订单成功:', outTradeNo);
      } catch (sdkError) {
        console.error('[支付宝] SDK调用失败:', sdkError.message);
        return res.status(500).json({
          success: false,
          message: '支付宝SDK调用失败: ' + sdkError.message
        });
      }
    } else {
      orderStr = 'demo_order_str_' + outTradeNo;
      console.log('[支付宝] SDK未初始化，使用模拟模式:', outTradeNo);
    }

    console.log('[支付宝] 订单创建成功:', outTradeNo, '金额:', amount);

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

  if (req.body.trade_status === 'TRADE_SUCCESS') {
    console.log('[支付宝] 支付成功，处理业务逻辑');
    const order = db.orders.get(req.body.out_trade_no);
    if (order) {
      order.status = 'paid';
      order.paidAt = new Date().toISOString();
    }
  }

  res.send('success');
});

// 支付返回页面
app.get('/alipay-return', (req, res) => {
  res.json({
    status: 'return_success',
    message: '支付完成，正在返回应用...',
    timestamp: new Date().toISOString(),
    query: req.query
  });
});

// 基础路由
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: '布鲁计划后端API',
    version: '2.1.0',
    features: ['alipay', 'invite_code', 'payment', 'withdraw'],
    alipay: alipaySdk ? '已配置真实支付' : '模拟模式',
    server_time: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    alipay_app_id: ALIPAY_CONFIG.appId,
    alipay_sdk: alipaySdk ? 'initialized' : 'not_initialized'
  });
});

// 启动服务
app.listen(port, '0.0.0.0', () => {
  console.log(`布鲁计划后端运行在 http://0.0.0.0:${port}`);
  console.log(`支付宝AppID: ${ALIPAY_CONFIG.appId}`);
  console.log(`SDK状态: ${alipaySdk ? '已初始化' : '未初始化'}`);
  console.log(`邀请码系统: 已启用`);
});
