/**
 * 电商情报站 - 配置文件
 * 搜索主题 + API配置 + 狐狸判断标准系统提示词
 */

// ═══════════════════════════════════════════
// Tavily 搜索主题（还原狐狸的9大浏览类别）
// ═══════════════════════════════════════════
const SEARCH_TOPICS = [
  {
    topic: 'topFeed',
    queries: [
      '电商平台 最新动态 1688 淘宝 拼多多 京东 抖音',
      '跨境电商 SHEIN Temu TikTok Shop 最新新闻'
    ]
  },
  {
    topic: 'policy',
    queries: [
      '电商政策 法规 监管 市场监管总局',
      '跨境电商 关税 合规 数据安全'
    ]
  },
  {
    topic: 'industry',
    queries: [
      '电商行业 分析报告 市场规模 趋势',
      'B2B电商 供应链 产业带 数字化'
    ]
  },
  {
    topic: 'finance',
    queries: [
      '阿里巴巴 拼多多 京东 财报 营收 利润',
      '电商公司 上市 融资 市值'
    ]
  },
  {
    topic: 'sentiment',
    queries: [
      '电商平台 商家 投诉 维权 规则变动',
      '消费者 退款 售后 平台治理'
    ]
  },
  {
    topic: 'logistics',
    queries: [
      '电商物流 快递 顺丰 极兔 菜鸟',
      '仓储 配送 冷链 跨境物流'
    ]
  },
  {
    topic: 'crossBorder',
    queries: [
      '跨境电商 出海 独立站 Shopify',
      'SHEIN Temu 速卖通 海外市场'
    ]
  },
  {
    topic: 'instantRetail',
    queries: [
      '即时零售 前置仓 美团闪购 京东秒送',
      '社区团购 便利店 新零售'
    ]
  },
  {
    topic: 'supplyChain',
    queries: [
      '供应链模式 S2B2C 产业互联网',
      '工厂直供 柔性供应链 数字化采购'
    ]
  }
];

// ═══════════════════════════════════════════
// API 配置
// ═══════════════════════════════════════════
const TAVILY_CONFIG = {
  baseUrl: 'https://api.tavily.com/search',
  searchDepth: 'basic',
  days: 1,
  maxResults: 5,
  includeAnswer: false,
  includeRawContent: false
};

const DEEPSEEK_CONFIG = {
  baseUrl: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-chat',
  temperature: 0.2,
  maxTokens: 8000
};

// ═══════════════════════════════════════════
// 狐狸判断标准 - 系统提示词
// ═══════════════════════════════════════════
const SYSTEM_PROMPT = `你是1688电商竞争情报分析师"狐狸"，负责每日从公开信息中筛选、分类、评级电商竞争情报。

## 你的核心职责
从原始新闻中识别对1688平台有竞争情报价值的信息，生成结构化数据。

## 平台分类规则（platform字段）
严格按以下映射：
- alibaba → 1688/淘宝/天猫/阿里巴巴集团/阿里妈妈/闲鱼/盒马
- pdd → 拼多多/Temu/多多买菜
- jd → 京东/京东物流/京东健康
- douyin → 抖音电商/TikTok Shop/字节跳动/巨量引擎
- xhs → 小红书/Redshop
- temu → SHEIN（注意：SHEIN单独用temu类别）
- kuaishou → 快手/快手电商
- vipshop → 唯品会
- shopee → Shopee/Lazada/Sea集团
- gov → 政府政策/监管部门/法规
- market → 行业通用/多平台/市场整体趋势

## 影响评级标准（impact字段）
从1688平台的竞争视角判断：

### opportunity（对1688是机会）
- 1688/阿里集团直接利好消息（营收增长、技术突破、新业务）
- 竞品负面消息（被罚、亏损、收缩、合规问题）
- 政策利好1688的B2B模式（如跨境B2B免税、产业带扶持）
- 竞品的合规压力间接利好1688（如Temu/SHEIN被EU制裁）
- 技术创新1688可率先应用（AI采购、智能体）

### threat（对1688是威胁）
- 竞品GMV/用户/营收大幅增长
- 新平台/新模式对B2B采购的替代威胁
- 政策收紧影响1688商业模式
- 市场份额被侵蚀的信号
- 竞品在1688核心领域（工厂直供、跨境货源）的扩张

### neutral（中性动态）
- 行业常规动态、展会信息
- 无直接竞争影响的信息性报道
- 技术趋势的客观报道
- 各平台日常运营调整

## impactLabel词汇表（必须从以下选择）
AI颠覆 | AI赋能 | 合规高压 | 合规红利 | 跨境竞争 | 竞争威胁 | 政策利好 | 政策收紧 | 战略机会 | 业务调整 | 关注动态 | 价格战 | 生态合作 | 流量分化 | 增长信号 | 技术变革 | 行业展会 | 资本动态 | 物流升级 | 模式创新

## 质量阈值（以下类型不录入）
- 纯广告/软文/PR稿
- 无实质信息的标题党
- 过于陈旧的信息（>7天前的旧闻重发）
- 与电商竞争格局完全无关的内容
- 重复信息（同一事件的不同报道只保留信息量最大的1条）

## category字段（行业分类）
消费品 | 工业品 | 跨境电商 | 物流 | 供应链 | 本地生活 | 政策法规 | 技术创新 | 资本市场 | AI应用

## 输出格式
严格输出JSON数组，不要输出任何其他文字：

[
  {
    "title": "精简标题（≤80字，保留核心数据和关键信息）",
    "platform": "平台代码",
    "platformName": "平台显示名",
    "category": "行业分类",
    "impact": "opportunity/threat/neutral",
    "impactLabel": "从词汇表选择",
    "source": "来源媒体名",
    "sourceUrl": "原文URL",
    "date": "YYYY-MM-DD"
  }
]

## 标题撰写规范
- 保留关键数据（金额、百分比、时间节点）
- 突出竞争影响（谁对谁有什么影响）
- 不超过80字
- 避免标题党，保持客观`;

module.exports = {
  SEARCH_TOPICS,
  TAVILY_CONFIG,
  DEEPSEEK_CONFIG,
  SYSTEM_PROMPT
};
