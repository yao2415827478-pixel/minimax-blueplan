const express = require('express');
const app = express();
const port = 3000;

// CORS 中间件
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== 内存数据库 ====================
const db = {
  inviteCodes: new Map(),
  users: new Map(),
  orders: new Map(),
  inviteRelations: new Map(),
  rewards: new Map(),
  withdrawals: new Map()
};

// ==================== 邀请码系统配置 ====================
const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 排除 0, O, 1, I, L
const INVITE_CODE_LENGTH = 12;
const ORIGINAL_PRICE = 1290; // 12.9元 = 1290分
const FIRST_ORDER_DISCOUNT = 200; // 首单优惠2元 = 200分

// 生成安全的邀请码
function generateInviteCode() {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += SAFE_CHARS.charAt(Math.floor(Math.random() * SAFE_CHARS.length));
  }
  return code;
}

// 确保邀请码唯一
function generateUniqueInviteCode() {
  let code;
  let attempts = 0;
  do {
    code = generateInviteCode();
    attempts++;
    let exists = false;
    for (const user of db.users.values()) {
      if (user.inviteCode === code) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      for (const codeData of db.inviteCodes.values()) {
        if (codeData.code === code) {
          exists = true;
          break;
        }
      }
    }
    if (!exists) return code;
  } while (attempts < 10);
  return code + Date.now().toString(36).toUpperCase().slice(-4);
}

// 计算返现金额
function calculateRewardAmount(inviteCount) {
  if (inviteCount === 0) return 300;  // 第1个：3元
  if (inviteCount === 1) return 400;  // 第2个：4元
  if (inviteCount === 2) return 500;  // 第3个：5元
  return 400;                          // 第4个及以后：4元
}

// 检查是否自己邀请自己
function isSelfInvite(inviterPhone, inviteePhone) {
  return inviterPhone === inviteePhone;
}

// 检查同设备
function isSameDevice(user1Phone, user2Phone) {
  const user1 = db.users.get(user1Phone);
  const user2 = db.users.get(user2Phone);
  if (!user1 || !user2) return false;
  return user1.deviceId && user2.deviceId && user1.deviceId === user2.deviceId;
}

// 初始化系统邀请码
function initTestData() {
  const publicCodes = [
    { code: 'BLUE2024', maxUses: 1000 },
    { code: 'VIP666', maxUses: 500 },
    { code: 'NEWUSER', maxUses: 2000 },
    { code: 'START99', maxUses: 1000 }
  ];
  
  publicCodes.forEach(({ code, maxUses }) => {
    db.inviteCodes.set(code, {
      code: code,
      type: 'public',
      maxUses: maxUses,
      usedCount: 0,
      discountAmount: FIRST_ORDER_DISCOUNT,
      isActive: true,
      createdAt: new Date().toISOString()
    });
  });
  
  // 内部专属码（全额减免）
  db.inviteCodes.set('YAOLUJIE2024', {
    code: 'YAOLUJIE2024',
    type: 'internal',
    maxUses: 9999,
    usedCount: 0,
    discountAmount: ORIGINAL_PRICE,
    isActive: true,
    skipPayment: true,
    createdAt: new Date().toISOString()
  });
  
  console.log('[数据库] 公开邀请码已初始化:', publicCodes.map(c => c.code));
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

// ==================== 登录API ====================
app.post('/api/auth/login', (req, res) => {
  try {
    const { phone, code, deviceId } = req.body;
    
    if (!phone) {
      return res.json({ success: false, error: { message: '手机号不能为空' } });
    }

    let user = db.users.get(phone);
    if (!user) {
      // 新用户注册，生成固定邀请码
      user = {
        id: 'U' + Date.now(),
        phone: phone,
        nickname: '战士',
        inviteCode: generateUniqueInviteCode(),
        inviteCodeUsed: false,
        invitedBy: null,
        rewardBalance: 0,
        totalReward: 0,
        inviteCount: 0,
        deviceId: deviceId || null,
        createdAt: new Date().toISOString()
      };
      db.users.set(phone, user);
      console.log('[登录] 新用户注册:', phone, '邀请码:', user.inviteCode);
    } else if (deviceId && !user.deviceId) {
      // 更新设备ID
      user.deviceId = deviceId;
    }

    const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2);

    res.json({
      success: true,
      data: {
        token: token,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          inviteCode: user.inviteCode,
          rewardBalance: user.rewardBalance
        }
      }
    });
  } catch (error) {
    console.error('[登录] 失败:', error);
    res.json({ success: false, error: { message: '登录失败' } });
  }
});

// ==================== 邀请码验证API ====================
app.post('/api/invite/validate', (req, res) => {
  try {
    const { inviteCode, phone, deviceId } = req.body;
    
    if (!inviteCode || inviteCode.length < 4) {
      return res.json({ success: false, error: { message: '邀请码格式不正确' } });
    }

    // 检查用户是否已使用过邀请码
    const user = db.users.get(phone);
    if (user && user.inviteCodeUsed) {
      return res.json({ success: false, error: { message: '您已使用过邀请码，每个用户仅限一次' } });
    }

    // 1. 检查是否是系统预设码
    const sysCode = db.inviteCodes.get(inviteCode.toUpperCase());
    if (sysCode && sysCode.isActive) {
      if (sysCode.usedCount >= sysCode.maxUses) {
        return res.json({ success: false, error: { message: '邀请码已达使用上限' } });
      }

      return res.json({
        success: true,
        data: {
          valid: true,
          inviteCode: sysCode.code,
          discountAmount: sysCode.discountAmount,
          finalAmount: ORIGINAL_PRICE - sysCode.discountAmount,
          type: sysCode.type,
          skipPayment: sysCode.skipPayment || false
        }
      });
    }

    // 2. 检查是否是用户邀请码
    let inviter = null;
    for (const u of db.users.values()) {
      if (u.inviteCode === inviteCode.toUpperCase()) {
        inviter = u;
        break;
      }
    }

    if (!inviter) {
      return res.json({ success: false, error: { message: '邀请码不存在' } });
    }

    // 检查是否自己邀请自己
    if (isSelfInvite(inviter.phone, phone)) {
      return res.json({ success: false, error: { message: '不能使用自己的邀请码' } });
    }

    // 检查同设备
    if (deviceId && inviter.deviceId === deviceId) {
      return res.json({ success: false, error: { message: '检测到异常设备，请更换设备重试' } });
    }

    // 返回验证结果
    res.json({
      success: true,
      data: {
        valid: true,
        inviteCode: inviter.inviteCode,
        discountAmount: FIRST_ORDER_DISCOUNT,
        finalAmount: ORIGINAL_PRICE - FIRST_ORDER_DISCOUNT,
        type: 'user',
        inviterPhone: inviter.phone
      }
    });
  } catch (error) {
    console.error('[邀请码] 验证失败:', error);
    res.json({ success: false, error: { message: '验证失败，请重试' } });
  }
});

// ==================== 支付宝支付API ====================

// 创建订单
app.post('/alipay/create-order', async (req, res) => {
  try {
    const { phone, inviteCode, productType, channel, deviceId } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: '手机号不能为空' });
    }

    const user = db.users.get(phone);
    if (!user) {
      return res.status(400).json({ success: false, message: '用户不存在，请先登录' });
    }

    // 计算价格
    let finalAmount = ORIGINAL_PRICE;
    let discountAmount = 0;
    let usedInviteCode = null;
    let inviterPhone = null;

    // 验证邀请码
    if (inviteCode && !user.inviteCodeUsed) {
      // 系统预设码
      const sysCode = db.inviteCodes.get(inviteCode.toUpperCase());
      if (sysCode && sysCode.isActive && sysCode.usedCount < sysCode.maxUses) {
        discountAmount = sysCode.discountAmount;
        finalAmount = ORIGINAL_PRICE - discountAmount;
        usedInviteCode = sysCode.code;
      } else {
        // 用户邀请码
        for (const u of db.users.values()) {
          if (u.inviteCode === inviteCode.toUpperCase()) {
            if (!isSelfInvite(u.phone, phone) && u.deviceId !== deviceId) {
              discountAmount = FIRST_ORDER_DISCOUNT;
              finalAmount = ORIGINAL_PRICE - discountAmount;
              usedInviteCode = u.inviteCode;
              inviterPhone = u.phone;
            }
            break;
          }
        }
      }
    }

    const outTradeNo = 'ALI' + Date.now() + Math.floor(Math.random() * 1000);
    const timestamp = new Date().toISOString();

    // 保存订单
    db.orders.set(outTradeNo, {
      orderId: outTradeNo,
      phone: phone,
      originalAmount: ORIGINAL_PRICE,
      discountAmount: discountAmount,
      finalAmount: finalAmount,
      amount: finalAmount / 100, // 元为单位
      inviteCode: usedInviteCode,
      inviterPhone: inviterPhone,
      inviteCodeSettled: false,
      rewardSettled: false,
      rewardAmount: 0,
      productType: productType || 'standard',
      channel: channel || 'alipay',
      status: 'pending',
      deviceId: deviceId || user.deviceId,
      createdAt: timestamp
    });

    console.log('[支付宝] 订单创建:', outTradeNo, '金额:', finalAmount, '邀请码:', usedInviteCode);

    // 生成支付参数
    let orderStr = '';
    if (alipaySdk) {
      try {
        orderStr = alipaySdk.sdkExec('alipay.trade.app.pay', {
          notifyUrl: ALIPAY_CONFIG.notifyUrl,
          bizContent: {
            out_trade_no: outTradeNo,
            total_amount: (finalAmount / 100).toFixed(2),
            subject: '布鲁计划会员',
            product_code: 'QUICK_MSECURITY_PAY',
            timeout_express: '30m'
          }
        });
      } catch (sdkError) {
        console.error('[支付宝] SDK调用失败:', sdkError.message);
        orderStr = 'demo_' + outTradeNo;
      }
    } else {
      orderStr = 'demo_' + outTradeNo;
    }

    res.json({
      success: true,
      orderId: outTradeNo,
      amount: finalAmount / 100,
      discountAmount: discountAmount / 100,
      payParams: { orderStr: orderStr }
    });

  } catch (error) {
    console.error('[支付宝] 创建订单失败:', error);
    res.status(500).json({ success: false, message: '创建订单失败', error: error.message });
  }
});

// 查询订单状态
app.get('/alipay/query-order', async (req, res) => {
  try {
    const { orderId } = req.query;
    
    if (!orderId) {
      return res.json({ success: false, error: { message: '订单ID不能为空' } });
    }

    const order = db.orders.get(orderId);
    if (!order) {
      return res.json({ success: false, error: { message: '订单不存在' } });
    }

    let responseData = {
      orderId: order.orderId,
      status: order.status,
      amount: order.amount,
      phone: order.phone,
      inviteCode: order.inviteCode,
      channel: order.channel || 'alipay',
      createdAt: order.createdAt,
      canRetry: false
    };

    // 终态直接返回
    if (['paid', 'cancelled', 'closed'].includes(order.status)) {
      responseData.paidAt = order.paidAt;
      responseData.canRetry = order.status !== 'paid';
      return res.json({ success: true, data: responseData });
    }

    // 查询支付宝状态
    if (alipaySdk && ['pending', 'paying'].includes(order.status)) {
      try {
        const result = await alipaySdk.exec('alipay.trade.query', {
          out_trade_no: orderId
        });

        const tradeStatus = result.trade_status;
        const statusMap = {
          'WAIT_BUYER_PAY': 'pending',
          'TRADE_CLOSED': 'closed',
          'TRADE_SUCCESS': 'paid',
          'TRADE_FINISHED': 'paid'
        };

        const mappedStatus = statusMap[tradeStatus] || order.status;
        
        if (mappedStatus !== order.status) {
          order.status = mappedStatus;
          order.updatedAt = new Date().toISOString();
          
          if (mappedStatus === 'paid') {
            order.paidAt = new Date().toISOString();
            order.tradeNo = result.trade_no;
            
            // 支付成功后处理邀请码和返现
            await processOrderPaid(order);
          }
        }

        responseData.status = mappedStatus;
        responseData.paidAt = order.paidAt;
        
      } catch (sdkError) {
        console.error('[支付宝] SDK查单失败:', sdkError.message);
      }
    }

    responseData.canRetry = ['pending', 'paying', 'failed'].includes(responseData.status);

    // 检查超时
    if (['pending', 'paying'].includes(responseData.status)) {
      const createdTime = new Date(order.createdAt).getTime();
      if (Date.now() - createdTime > 30 * 60 * 1000) {
        order.status = 'closed';
        order.closedAt = new Date().toISOString();
        responseData.status = 'closed';
        responseData.canRetry = true;
      }
    }

    res.json({ success: true, data: responseData });

  } catch (error) {
    console.error('[支付宝] 查单接口错误:', error);
    res.json({ success: false, error: { message: '查询订单失败: ' + error.message } });
  }
});

// 支付成功后处理邀请码和返现
async function processOrderPaid(order) {
  try {
    console.log('[订单] 处理支付成功:', order.orderId);
    
    const user = db.users.get(order.phone);
    if (!user) return;

    // 1. 处理首单优惠标记
    if (order.inviteCode && !order.inviteCodeSettled) {
      user.inviteCodeUsed = true;
      user.invitedBy = order.inviterPhone;
      order.inviteCodeSettled = true;
      
      // 增加系统码使用次数
      const sysCode = db.inviteCodes.get(order.inviteCode);
      if (sysCode) {
        sysCode.usedCount++;
      }
      
      console.log('[邀请码] 首单优惠已结算:', order.phone, '使用:', order.inviteCode);
    }

    // 2. 处理邀请人返现（幂等）
    if (order.inviterPhone && !order.rewardSettled) {
      const inviter = db.users.get(order.inviterPhone);
      if (inviter && !isSelfInvite(inviter.phone, order.phone)) {
        // 检查是否同设备
        if (order.deviceId && inviter.deviceId === order.deviceId) {
          console.log('[返现] 同设备，跳过:', order.phone);
          order.rewardSettled = true;
          order.rewardAmount = 0;
          return;
        }

        // 检查是否已结算过
        let relation = null;
        for (const r of db.inviteRelations.values()) {
          if (r.inviteePhone === order.phone && r.inviterPhone === order.inviterPhone) {
            relation = r;
            break;
          }
        }

        if (!relation) {
          // 创建邀请关系
          const rewardAmount = calculateRewardAmount(inviter.inviteCount);
          const relationId = 'R' + Date.now();
          
          relation = {
            id: relationId,
            inviterPhone: order.inviterPhone,
            inviteePhone: order.phone,
            inviteeOrderId: order.orderId,
            status: 'settled',
            rewardAmount: rewardAmount,
            settledAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          };
          db.inviteRelations.set(relationId, relation);

          // 发放返现
          inviter.rewardBalance += rewardAmount;
          inviter.totalReward += rewardAmount;
          inviter.inviteCount++;

          // 记录奖励
          const rewardId = 'RW' + Date.now();
          db.rewards.set(rewardId, {
            id: rewardId,
            userPhone: inviter.phone,
            type: 'invite',
            amount: rewardAmount,
            source: order.phone,
            description: `邀请好友奖励（第${inviter.inviteCount}位）`,
            createdAt: new Date().toISOString()
          });

          order.rewardSettled = true;
          order.rewardAmount = rewardAmount;

          console.log('[返现] 已发放:', inviter.phone, '+', rewardAmount, '分', '第', inviter.inviteCount, '位');
        }
      }
    }
  } catch (error) {
    console.error('[订单] 处理支付成功失败:', error);
  }
}

// 支付宝回调
app.post('/alipay-notify', (req, res) => {
  console.log('[支付宝] 支付回调:', req.body.trade_status, req.body.out_trade_no);

  if (req.body.trade_status === 'TRADE_SUCCESS') {
    const order = db.orders.get(req.body.out_trade_no);
    if (order && order.status !== 'paid') {
      order.status = 'paid';
      order.paidAt = new Date().toISOString();
      order.tradeNo = req.body.trade_no;
      processOrderPaid(order);
    }
  }

  res.send('success');
});

// ==================== 收益API ====================
app.get('/api/invite/summary', (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.json({ success: false, error: { message: '手机号不能为空' } });
    }

    const user = db.users.get(phone);
    if (!user) {
      return res.json({ success: false, error: { message: '用户不存在' } });
    }

    // 统计邀请人数
    let inviteCount = 0;
    let pendingCount = 0;
    for (const relation of db.inviteRelations.values()) {
      if (relation.inviterPhone === phone) {
        inviteCount++;
        if (relation.status === 'pending') pendingCount++;
      }
    }

    const rewardBalance = user.rewardBalance || 0;

    res.json({
      success: true,
      data: {
        inviteCode: user.inviteCode,
        inviteCount: inviteCount,
        activatedCount: inviteCount,
        pendingCount: pendingCount,
        rewardBalance: rewardBalance,
        totalReward: user.totalReward || 0,
        withdrawableAmount: rewardBalance >= 1000 ? rewardBalance : 0,
        minWithdrawAmount: 1000
      }
    });
  } catch (error) {
    console.error('[收益] 获取失败:', error);
    res.json({ success: false, error: { message: '获取失败' } });
  }
});

app.get('/api/invite/reward-ledger', (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.json({ success: false, error: { message: '手机号不能为空' } });
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

    res.json({ success: true, data: { list: list, total: list.length } });
  } catch (error) {
    console.error('[收益] 获取流水失败:', error);
    res.json({ success: false, error: { message: '获取失败' } });
  }
});

// ==================== 提现API ====================
app.post('/api/withdraw/apply', (req, res) => {
  try {
    const { phone, amount, channel, account, accountName } = req.body;
    
    if (!phone || !amount || !channel || !account) {
      return res.json({ success: false, error: { message: '参数不完整' } });
    }

    const user = db.users.get(phone);
    if (!user) {
      return res.json({ success: false, error: { message: '用户不存在' } });
    }

    if ((user.rewardBalance || 0) < amount) {
      return res.json({ success: false, error: { message: '余额不足' } });
    }

    if (amount < 1000) {
      return res.json({ success: false, error: { message: '最小提现金额为10元' } });
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

    res.json({ success: true, data: { withdrawId: withdrawId } });
  } catch (error) {
    console.error('[提现] 申请失败:', error);
    res.json({ success: false, error: { message: '申请失败' } });
  }
});

app.get('/api/withdraw/records', (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.json({ success: false, error: { message: '手机号不能为空' } });
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

    res.json({ success: true, data: { list: list, total: list.length } });
  } catch (error) {
    console.error('[提现] 获取记录失败:', error);
    res.json({ success: false, error: { message: '获取失败' } });
  }
});

// ==================== 基础路由 ====================
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: '布鲁计划后端API',
    version: '3.0.0',
    features: ['alipay', 'invite_code', 'payment', 'withdraw', 'query_order', 'reward'],
    alipay: alipaySdk ? '已配置真实支付' : '模拟模式',
    server_time: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    alipay_sdk: alipaySdk ? 'initialized' : 'not_initialized'
  });
});

// 启动服务
app.listen(port, '0.0.0.0', () => {
  console.log(`布鲁计划后端运行在 http://0.0.0.0:${port}`);
  console.log(`邀请码系统: 已启用（12位安全码）`);
  console.log(`返现规则: 3/4/5/4元递增`);
});
