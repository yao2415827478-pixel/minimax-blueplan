# 布鲁计划 (Blue Plan) - 项目完整报告

## 项目概述

**项目名称**: 布鲁计划 (Blue Plan)  
**项目类型**: 戒色辅助移动应用  
**目标平台**: Android (Capacitor + Vue3)  
**开发状态**: 开发中 / 内测阶段  
**作者**: 姚鹭杰  

---

## 技术架构

### 前端技术栈
| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | ^3.3.0 | 前端框架 |
| Capacitor | ^5.0.0 | 跨平台移动应用 |
| Vite | ^4.4.0 | 构建工具 |
| Vue Router | ^4.2.0 | 路由管理 |

### 后端技术栈
| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | v18+ | 运行环境 |
| Express | ^4.18.0 | Web框架 |
| PM2 | latest | 进程管理 |
| Alipay SDK | ^4.0.0 | 支付宝支付 |

### 服务器信息
| 项目 | 详情 |
|------|------|
| 服务器IP | 120.27.139.123 |
| 域名 | https://blue-plan1.cn |
| 部署路径 | /home/admin/blue-plan-backend |
| 进程管理 | PM2 (blue-plan-api) |
| 端口 | 3000 |

---

## 项目结构

```
布鲁计划/
├── 前端 (github-blueplan/)
│   ├── src/
│   │   ├── pages/           # 页面组件
│   │   │   ├── Welcome.vue      # 欢迎页
│   │   │   ├── Survey.vue       # 评估问卷
│   │   │   ├── ProductIntro.vue # 产品介绍
│   │   │   ├── Payment.vue      # 支付页面
│   │   │   ├── Login.vue        # 登录/注册
│   │   │   ├── Home.vue         # 首页
│   │   │   ├── Plan.vue         # 90天计划
│   │   │   └── Panic.vue        # 紧急求助
│   │   ├── config/
│   │   │   └── api.js           # API配置
│   │   ├── utils/
│   │   │   ├── dateUtils.js     # 日期工具
│   │   │   └── storage.js       # 存储管理
│   │   └── App.vue
│   ├── android/             # Android原生项目
│   └── dist/                # 构建输出
│
├── 后端 (blue-plan-backend/)
│   ├── server.js            # 主服务文件
│   ├── alipay-config.js     # 支付宝配置
│   └── package.json
│
└── 部署文件
    └── DEPLOY.md
```

---

## 功能模块

### 已完成 ✅

#### 1. 用户系统
- [x] 手机号注册/登录
- [x] 短信验证码（阿里云短信服务）
- [x] 用户状态管理

#### 2. 评估系统
- [x] 依赖程度评估问卷
- [x] 评分等级展示

#### 3. 支付系统
- [x] 支付宝支付集成
- [x] 邀请码优惠（减免2元）
- [x] 内部专属验证码（YAOLUJIE2024 - 跳过支付）

#### 4. 核心功能
- [x] 戒色天数追踪
- [x] 里程碑系统（3/7/30/60/90天）
- [x] 进度日历
- [x] 日记记录（心情+主题）
- [x] 紧急求助页面

#### 5. 邀请返现系统（2026-03-25完成）
- [x] 邀请码生成（每位用户唯一）
- [x] 邀请关系绑定
- [x] 首次激活奖励（5元/人）
- [x] 收益概览查询
- [x] 奖励流水记录
- [x] 提现申请（满10元可提现）
- [x] 提现记录查询

### 进行中 🔄
- [ ] 支付宝支付调试（订单参数异常）
- [ ] "我的"页面（个人中心+邀请返现展示）

### 待开发 📋
- [ ] 后端数据持久化（当前使用内存数据库）
- [ ] 社区功能
- [ ] 数据统计分析
- [ ] iOS版本

---

## API接口文档

### 基础信息
- **Base URL**: `http://120.27.139.123:3000`
- **Content-Type**: `application/json`

### 接口列表

#### 1. 用户认证
```
POST /api/auth/login
请求: { phone: string, code: string }
响应: { success: true, data: { token, user: { id, phone, nickname, inviteCode } } }
```

#### 2. 短信验证码
```
POST /send-sms-code
请求: { phone: string }
响应: { success: boolean, message?: string }

POST /verify-sms-code
请求: { phone: string, code: string }
响应: { success: boolean, message?: string }
```

#### 3. 邀请码
```
POST /api/invite/validate
请求: { inviteCode: string }
响应: { success: true, data: { valid: true, discountAmount, type } }

GET /api/invite/summary?phone={phone}
响应: { 
  success: true, 
  data: { 
    inviteCode,      // 用户邀请码
    inviteCount,     // 邀请人数
    activatedCount,  // 已激活人数
    rewardBalance,   // 当前余额（分）
    totalReward,     // 累计收益（分）
    withdrawableAmount, // 可提现金额
    minWithdrawAmount   // 最小提现金额（1000分=10元）
  } 
}

GET /api/invite/reward-ledger?phone={phone}
响应: { success: true, data: { list: [{ id, type, amount, description, source, createdAt }], total } }

POST /api/invite/bind
请求: { orderId: string }
响应: { success: true, data: { message: '邀请关系已建立' } }

POST /api/invite/activate
请求: { phone: string }
响应: { success: true, data: { message: '激活奖励已记录', activatedCount } }
```

#### 4. 提现
```
POST /api/withdraw/apply
请求: { phone, amount, channel, account, accountName }
响应: { success: true, data: { withdrawId } }

GET /api/withdraw/records?phone={phone}
响应: { success: true, data: { list: [{ id, amount, channel, status, createdAt }], total } }
```

#### 5. 支付宝支付
```
POST /alipay/create-order
请求: { phone, inviteCode?, productType, channel, amount? }
响应: { success: true, orderId, payParams: { orderStr } }

POST /alipay/query-order
请求: { orderId }
响应: { success: boolean, data: { status, tradeNo?, amount? } }

POST /alipay-notify  # 支付宝回调（服务器端）
```

---

## 邀请返现规则

### 奖励机制
- **邀请奖励**: 每成功邀请1位好友，奖励 **5元**
- **激活条件**: 被邀请人完成首次激活（调用 `/api/invite/activate`）
- **最小提现**: **10元**（余额满10元方可提现）

### 邀请流程
```
1. 用户A获取自己的邀请码（如：YP6UBY）
   ↓
2. 用户B在支付时填写邀请码 YP6UBY
   ↓
3. 系统创建订单时记录 inviteCode
   ↓
4. 调用 /api/invite/bind 绑定邀请关系
   ↓
5. 用户B完成首次激活（登录后调用 /api/invite/activate）
   ↓
6. 用户A获得5元奖励，计入 rewardBalance
```

### 测试邀请码
| 邀请码 | 类型 | 说明 |
|--------|------|------|
| YAOLUJIE2024 | 内部专属 | 跳过支付，直接全额减免 |
| TEST01 | 测试码 | 可用测试 |
| TEST02 | 测试码 | 可用测试 |
| BLUE99 | 测试码 | 可用测试 |
| VIP888 | 测试码 | 可用测试 |
| BLUE2024 | 公开码 | 减免2元 |
| VIP666 | 公开码 | 减免2元 |

---

## UI设计规范

### 色彩方案
| 用途 | 颜色值 | 说明 |
|------|--------|------|
| 主背景 | `#0F172A` | 深蓝黑色 |
| 卡片背景 | `rgba(255,255,255,0.05)` | 玻璃态 |
| 主强调色 | `#8B5CF6` | 紫色（里程碑） |
| 次强调色 | `#10B981` | 绿色（成功/完成） |
| 紧急色 | `#EF4444` | 红色（紧急求助） |
| 文字主色 | `#F8FAFC` | 白色 |
| 文字次色 | `#94A3B8` | 灰色 |

### 字体规范
- 标题: 24-32px, font-weight: 700
- 正文: 14-16px, font-weight: 400
- 辅助文字: 12-13px

### 组件风格
- **玻璃态卡片**: `background: rgba(255,255,255,0.05)`, `backdrop-filter: blur(10px)`
- **圆角**: 12-16px
- **渐变文字**: `background: linear-gradient(135deg, #8B5CF6, #EC4899)`

---

## 数据库结构（内存数据库）

### 数据表
```javascript
// 用户表
users: Map<phone, {
  id, phone, nickname, inviteCode,
  rewardBalance, totalReward, createdAt
}>

// 邀请码表
inviteCodes: Map<code, {
  code, createdBy, maxUses, usedCount,
  discountAmount, isActive, type, skipPayment?
}>

// 订单表
orders: Map<orderId, {
  orderId, phone, amount, inviteCode,
  productType, channel, status, createdAt
}>

// 邀请关系表
inviteRelations: Map<relationId, {
  id, inviterId, inviterPhone, inviteePhone,
  orderId, status, rewardAmount, createdAt, activatedAt?
}>

// 奖励记录表
rewards: Map<rewardId, {
  id, userPhone, type, amount, source,
  description, createdAt
}>

// 提现记录表
withdrawals: Map<withdrawId, {
  id, userPhone, amount, channel, account,
  accountName, status, createdAt
}>
```

---

## 已知问题

1. **支付宝支付**: 订单参数偶尔异常，需要进一步调试
2. **数据持久化**: 当前使用内存数据库，重启后数据丢失
3. **iOS支持**: 尚未适配

---

## 下一步计划

### 短期（1-2周）
- [ ] 完成"我的"页面开发
- [ ] 修复支付宝支付问题
- [ ] 添加数据持久化（MongoDB/MySQL）

### 中期（1个月）
- [ ] 社区功能开发
- [ ] 数据统计分析
- [ ] iOS版本适配

### 长期
- [ ] 上线运营
- [ ] 用户反馈迭代

---

## 联系方式

- **开发者**: 姚鹭杰
- **GitHub**: https://github.com/yao2415827478-pixel/Yblueplan
- **服务器**: 120.27.139.123
- **域名**: https://blue-plan1.cn

---

*报告生成时间: 2026-03-25*
*版本: v0.9.0-beta*
