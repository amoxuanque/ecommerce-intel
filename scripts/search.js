/**
 * 电商情报站 - Tavily搜索引擎
 * 按9大主题并行搜索最近24小时电商新闻
 */

const fs = require('fs');
const path = require('path');
const { SEARCH_TOPICS, TAVILY_CONFIG } = require('./config');

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
if (!TAVILY_API_KEY) {
  console.error('错误: 未设置 TAVILY_API_KEY 环境变量');
  process.exit(1);
}

/**
 * 调用Tavily搜索API
 */
async function tavilySearch(query) {
  const body = {
    api_key: TAVILY_API_KEY,
    query: query,
    search_depth: TAVILY_CONFIG.searchDepth,
    days: TAVILY_CONFIG.days,
    max_results: TAVILY_CONFIG.maxResults,
    include_answer: TAVILY_CONFIG.includeAnswer,
    include_raw_content: TAVILY_CONFIG.includeRawContent
  };

  const response = await fetch(TAVILY_CONFIG.baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Tavily API错误 (${response.status}): ${err}`);
  }

  const data = await response.json();
  return (data.results || []).map(r => ({
    title: r.title || '',
    url: r.url || '',
    content: (r.content || '').slice(0, 300),
    score: r.score || 0
  }));
}

/**
 * 按主题搜索
 */
async function searchTopic(topicConfig) {
  const { topic, queries } = topicConfig;
  const allResults = [];

  for (const query of queries) {
    try {
      console.log(`  [搜索] ${topic}: "${query}"`);
      const results = await tavilySearch(query);
      allResults.push(...results);
      console.log(`         → ${results.length} 条结果`);
    } catch (err) {
      console.warn(`  [失败] ${topic}/${query}: ${err.message}`);
    }
    // 请求间隔200ms避免限流
    await new Promise(r => setTimeout(r, 200));
  }

  return { topic, results: allResults };
}

/**
 * 去重（同URL或高度相似标题）
 */
function deduplicateResults(topicResults) {
  const seenUrls = new Set();
  const seenTitles = new Set();

  return topicResults.map(({ topic, results }) => {
    const unique = results.filter(item => {
      const urlKey = item.url.replace(/[?#].*/, '');
      const titleKey = item.title.replace(/\s+/g, '').slice(0, 30);
      if (seenUrls.has(urlKey) || seenTitles.has(titleKey)) return false;
      seenUrls.add(urlKey);
      seenTitles.add(titleKey);
      return true;
    });
    return { topic, results: unique };
  });
}

/**
 * 主流程
 */
async function main() {
  console.log('=== Tavily 电商情报搜索开始 ===');
  console.log(`主题数: ${SEARCH_TOPICS.length}`);
  console.log(`搜索范围: 最近 ${TAVILY_CONFIG.days} 天`);
  console.log('');

  // 逐主题搜索（避免并发限流）
  const topicResults = [];
  for (const topicConfig of SEARCH_TOPICS) {
    const result = await searchTopic(topicConfig);
    topicResults.push(result);
  }

  // 去重
  const deduplicated = deduplicateResults(topicResults);

  // 统计
  const totalCount = deduplicated.reduce((sum, t) => sum + t.results.length, 0);
  console.log(`\n[汇总] 去重后总计: ${totalCount} 条`);
  deduplicated.forEach(({ topic, results }) => {
    console.log(`  ${topic}: ${results.length} 条`);
  });

  // 写入 data/search-results.json
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const outputPath = path.join(dataDir, 'search-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(deduplicated, null, 2), 'utf-8');
  console.log(`\n[输出] ${outputPath}`);
  console.log(`=== 搜索完成 ===`);
}

main().catch(err => {
  console.error('搜索失败:', err);
  process.exit(1);
});
