/**
 * 电商情报站 - DeepSeek分析器
 * 读取搜索结果，用狐狸判断标准系统提示词进行分类、评级、摘要
 */

const fs = require('fs');
const path = require('path');
const { DEEPSEEK_CONFIG, SYSTEM_PROMPT } = require('./config');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
if (!DEEPSEEK_API_KEY) {
  console.error('错误: 未设置 DEEPSEEK_API_KEY 环境变量');
  process.exit(1);
}

/**
 * 调用DeepSeek API
 */
async function callDeepSeek(userPrompt) {
  const body = {
    model: DEEPSEEK_CONFIG.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
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
    throw new Error(`DeepSeek API错误 (${response.status}): ${err}`);
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
 * 构建用户prompt（按主题组织搜索结果）
 */
function buildUserPrompt(topicResults) {
  let prompt = '以下是今日搜索到的电商相关新闻，请按照系统提示词的规则进行分析和结构化。\n\n';
  prompt += '只输出有情报价值的条目，低质量/重复/无关内容直接过滤不输出。\n\n';

  topicResults.forEach(({ topic, results }) => {
    if (results.length === 0) return;
    prompt += `### 【${topic}】\n`;
    results.forEach((item, i) => {
      prompt += `${i + 1}. ${item.title}\n`;
      prompt += `   URL: ${item.url}\n`;
      if (item.content) {
        prompt += `   摘要: ${item.content}\n`;
      }
      prompt += '\n';
    });
  });

  return prompt;
}

/**
 * 分批处理（DeepSeek单次限制，每批不超过30条）
 */
function splitIntoBatches(topicResults, maxPerBatch = 30) {
  const allItems = [];
  topicResults.forEach(({ topic, results }) => {
    results.forEach(item => allItems.push({ ...item, _topic: topic }));
  });

  const batches = [];
  for (let i = 0; i < allItems.length; i += maxPerBatch) {
    const batch = allItems.slice(i, i + maxPerBatch);
    // 重组为topic结构
    const grouped = {};
    batch.forEach(item => {
      const t = item._topic;
      if (!grouped[t]) grouped[t] = [];
      grouped[t].push(item);
    });
    batches.push(Object.entries(grouped).map(([topic, results]) => ({ topic, results })));
  }
  return batches;
}

/**
 * 主流程
 */
async function main() {
  console.log('=== DeepSeek 情报分析开始 ===');

  // 读取搜索结果
  const searchPath = path.join(__dirname, '..', 'data', 'search-results.json');
  if (!fs.existsSync(searchPath)) {
    console.log('未找到 search-results.json，跳过分析');
    const outputPath = path.join(__dirname, '..', 'data', 'analyzed.json');
    fs.writeFileSync(outputPath, '[]', 'utf-8');
    return;
  }

  const topicResults = JSON.parse(fs.readFileSync(searchPath, 'utf-8'));
  const totalItems = topicResults.reduce((sum, t) => sum + t.results.length, 0);
  console.log(`输入: ${totalItems} 条搜索结果`);

  if (totalItems === 0) {
    console.log('无搜索结果，跳过分析');
    const outputPath = path.join(__dirname, '..', 'data', 'analyzed.json');
    fs.writeFileSync(outputPath, '[]', 'utf-8');
    return;
  }

  // 分批
  const batches = splitIntoBatches(topicResults);
  console.log(`分 ${batches.length} 批处理\n`);

  const allResults = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchSize = batch.reduce((s, t) => s + t.results.length, 0);
    console.log(`[批次 ${i + 1}/${batches.length}] 分析 ${batchSize} 条...`);

    try {
      const userPrompt = buildUserPrompt(batch);
      const results = await callDeepSeek(userPrompt);
      if (Array.isArray(results)) {
        allResults.push(...results);
        console.log(`[批次 ${i + 1}] 完成: ${results.length} 条结构化情报`);
      } else {
        console.warn(`[批次 ${i + 1}] 返回格式异常，跳过`);
      }
    } catch (err) {
      console.error(`[批次 ${i + 1}] 失败: ${err.message}`);
    }

    // 批次间间隔1秒
    if (i < batches.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // 写入 data/analyzed.json
  const outputPath = path.join(__dirname, '..', 'data', 'analyzed.json');
  fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2), 'utf-8');

  console.log(`\n[输出] ${outputPath}`);
  console.log(`=== 分析完成: ${allResults.length} 条结构化情报 ===`);

  // 统计
  const stats = allResults.reduce((acc, item) => {
    acc[item.impact] = (acc[item.impact] || 0) + 1;
    return acc;
  }, {});
  console.log(`  机会: ${stats.opportunity || 0} | 威胁: ${stats.threat || 0} | 中性: ${stats.neutral || 0}`);
}

main().catch(err => {
  console.error('分析失败:', err);
  process.exit(1);
});
