/**
 * 电商情报站 - 配置文件
 * RSS源 + DeepSeek Prompt模板
 */

// RSS 电商垂直媒体源
const RSS_SOURCES = [
  {
    name: '亿邦动力',
    url: 'https://www.ebrun.com/rss.xml',
    category: 'ecommerce'
  },
  {
    name: '36氪',
    url: 'https://36kr.com/feed',
    category: 'tech'
  },
  {
    name: '虎嗅',
    url: 'https://www.huxiu.com/rss/0.xml',
    category: 'tech'
  },
  {
    name: '雨果跨境',
    url: 'https://www.cifnews.com/rss',
    category: 'crossborder'
  }
];

// 电商相关关键词过滤
const KEYWORDS_FILTER = [
  '电商', '跨境', '1688', '阿里巴巴', '阿里', '淘宝', '天猫',
  '拼多多', 'Temu', '京东', '抖音', 'TikTok', 'SHEIN', '小红书',
  '物流', '供应链', '直播带货', '社交电商', 'B2B', 'B2C',
  '出海', '独立站', 'Shopify', '亚马逊', 'Amazon',
  '新零售', '即时零售', '社区团购', '会员店',
  '反垄断', '数据安全', '个人信息保护', '跨境支付',
  '唯品会', '快手', '美团', '盒马', '山姆'
];

// DeepSeek 分析 Prompt
const ANALYSIS_PROMPT = `你是一位资深电商行业分析师，专注于中国电商竞争格局研究。

请分析以下新闻条目，为每条生成结构化情报数据。

## 输出要求
请严格按照以下JSON数组格式输出，不要包含任何其他文字：

[
  {
    "title": "精简后标题（≤80字，保留核心信息）",
    "platform": "平台代码",
    "platformName": "平台显示名",
    "category": "分类",
    "impact": "影响评级",
    "impactLabel": "2-4字影响标签",
    "source": "来源媒体名",
    "sourceUrl": "原文链接"
  }
]

## 字段规则
- platform 取值: alibaba / pdd / jd / douyin / xhs / temu / gov / market / vipshop / kuaishou
- platformName: 1688/淘宝/天猫/拼多多/Temu/京东/抖音/TikTok Shop/小红书/SHEIN/唯品会/快手/政策/行业
- category 取值: 消费品 / 工业品 / 跨境电商 / 物流 / 供应链 / 本地生活 / 政策法规 / 技术创新 / 资本市场
- impact 取值: opportunity(对1688是机会) / threat(对1688是威胁) / neutral(中性动态)
- impactLabel 示例: AI颠覆 / 合规高压 / 跨境竞争 / 流量分化 / 业务调整 / 增长信号 / 政策利好 / 价格战 / 生态合作

## 判断视角
从1688平台视角判断impact：
- opportunity: 对1688有利的市场变化、竞品负面、政策利好、技术突破
- threat: 竞品增长、替代威胁、政策收紧、市场份额被侵蚀
- neutral: 行业常规动态、无明显影响的信息

## 输入新闻
`;

// DeepSeek API 配置
const DEEPSEEK_CONFIG = {
  baseUrl: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-chat',
  temperature: 0.3,
  maxTokens: 4000
};

module.exports = {
  RSS_SOURCES,
  KEYWORDS_FILTER,
  ANALYSIS_PROMPT,
  DEEPSEEK_CONFIG
};
