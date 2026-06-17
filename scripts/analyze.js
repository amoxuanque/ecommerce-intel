/**
 * 电商情报站 - DeepSeek分析器
 * 读取raw-feeds.json，调用DeepSeek API进行分类、评级、摘要
 */

const fs = require('fs');
const path = require('path');
const { ANALYSIS_PROMPT, DEEPSEEK_CONFIG } = require('./config');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
if (!DEEPSEEK_API_KEY) {
  console.error('错误: 未设置 DEEPSEEK_API_KEY 环境变量');
  process.exit(1);
}

/**
 * 调用DeepSeek API
 */
async function callDeepSeek(newsItems) {
  const newsText = newsItems.map((item, i) =>
    `${i + 1}. 【${item.source}】${item.title}\n   链接: ${item.link}\n   摘要: ${item.snippet || '无'}`
  ).join('\n\n');

  const body = {
    model: DEEPSEEK_CONFIG.model,
    messages: [
      {
        role: 'system',
        content: '你是电商行业情报分析师，只输出JSON，不输出任何其他内容。'
      },
      {
        role: 'user',
        content: ANALYSIS_PROMPT + newsText
      }
    ],
    temperature: DEEPSEEK_CONFIG.temperature,
    max_tokens: DEEPSEEK_CONFIG.maxTokens
  };

  const response = await fetch(DEEPSEEK_CONFIG.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API 错误 (${response.status}): ${err}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();

  // 提取JSON（处理可能的markdown代码块包裹）
  let jsonStr = content;
  const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    jsonStr = match[1].trim();
  }

  return JSON.parse(jsonStr);
}

/**
 * 分批处理（每批10-15条）
 */
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * 主流程
 */
async function main() {
  console.log('=== DeepSeek 情报分析开始 ===');

  // 读取采集数据
  const rawPath = path.join(__dirname, '..', 'data', 'raw-feeds.json');
  if (!fs.existsSync(rawPath)) {
    console.log('未找到 raw-feeds.json，跳过分析（无新数据）');
    // 创建空的analyzed文件
    const outputPath = path.join(__dirname, '..', 'data', 'analyzed.json');
    fs.writeFileSync(outputPath, '[]', 'utf-8');
    return;
  }

  const rawFeeds = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
  console.log(`输入条目: ${rawFeeds.length}`);

  if (rawFeeds.length === 0) {
    console.log('无新闻条目，跳过分析');
    const outputPath = path.join(__dirname, '..', 'data', 'analyzed.json');
    fs.writeFileSync(outputPath, '[]', 'utf-8');
    return;
  }

  // 分批调用API（每批12条）
  const BATCH_SIZE = 12;
  const batches = chunkArray(rawFeeds, BATCH_SIZE);
  console.log(`分 ${batches.length} 批处理\n`);

  const allResults = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`[批次 ${i + 1}/${batches.length}] 分析 ${batch.length} 条...`);

    try {
      const results = await callDeepSeek(batch);
      allResults.push(...results);
      console.log(`[批次 ${i + 1}] 完成: ${results.length} 条结构化情报`);
    } catch (err) {
      console.error(`[批次 ${i + 1}] 失败: ${err.message}`);
      // 单批失败不中断整体流程
    }

    // 批次间间隔1秒避免限流
    if (i < batches.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // 添加日期字段
  const today = new Date().toISOString().slice(0, 10);
  const finalResults = allResults.map(item => ({
    ...item,
    date: today
  }));

  // 写入 data/analyzed.json
  const outputPath = path.join(__dirname, '..', 'data', 'analyzed.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalResults, null, 2), 'utf-8');

  console.log(`\n[输出] ${outputPath}`);
  console.log(`=== 分析完成: ${finalResults.length} 条结构化情报 ===`);

  // 打印统计
  const stats = finalResults.reduce((acc, item) => {
    acc[item.impact] = (acc[item.impact] || 0) + 1;
    return acc;
  }, {});
  console.log(`  机会: ${stats.opportunity || 0} | 威胁: ${stats.threat || 0} | 中性: ${stats.neutral || 0}`);
}

main().catch(err => {
  console.error('分析失败:', err);
  process.exit(1);
});
