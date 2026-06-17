/**
 * 电商情报站 - RSS采集引擎
 * 从配置的RSS源抓取最新电商新闻，过滤并输出结构化数据
 */

const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');
const { RSS_SOURCES, KEYWORDS_FILTER } = require('./config');

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; IntelBot/1.0)'
  }
});

// 24小时前的时间戳
const HOURS_LOOKBACK = 48; // 用48小时确保不漏数据
const cutoffTime = Date.now() - HOURS_LOOKBACK * 60 * 60 * 1000;

/**
 * 抓取单个RSS源
 */
async function fetchFeed(source) {
  try {
    console.log(`  [采集] ${source.name} ...`);
    const feed = await parser.parseURL(source.url);
    const items = (feed.items || [])
      .filter(item => {
        const pubDate = new Date(item.pubDate || item.isoDate || 0).getTime();
        return pubDate > cutoffTime;
      })
      .map(item => ({
        title: (item.title || '').trim(),
        link: item.link || '',
        source: source.name,
        pubDate: item.pubDate || item.isoDate || '',
        snippet: (item.contentSnippet || item.content || '').slice(0, 200).trim()
      }));
    console.log(`  [完成] ${source.name}: ${items.length} 条`);
    return items;
  } catch (err) {
    console.warn(`  [失败] ${source.name}: ${err.message}`);
    return [];
  }
}

/**
 * 关键词过滤：标题或摘要中包含电商相关关键词
 */
function filterByKeywords(items) {
  const regex = new RegExp(KEYWORDS_FILTER.join('|'), 'i');
  return items.filter(item => regex.test(item.title) || regex.test(item.snippet));
}

/**
 * 简单去重：完全相同标题去重
 */
function deduplicate(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item.title.replace(/\s+/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 主流程
 */
async function main() {
  console.log('=== 电商情报采集开始 ===');
  console.log(`时间范围: 最近 ${HOURS_LOOKBACK} 小时`);
  console.log(`RSS源数量: ${RSS_SOURCES.length}`);
  console.log('');

  // 并行抓取所有RSS源
  const results = await Promise.all(RSS_SOURCES.map(fetchFeed));
  const allItems = results.flat();
  console.log(`\n[汇总] 原始条目: ${allItems.length}`);

  // 关键词过滤
  const filtered = filterByKeywords(allItems);
  console.log(`[过滤] 电商相关: ${filtered.length}`);

  // 去重
  const unique = deduplicate(filtered);
  console.log(`[去重] 最终条目: ${unique.length}`);

  // 写入 data/raw-feeds.json
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const outputPath = path.join(dataDir, 'raw-feeds.json');
  fs.writeFileSync(outputPath, JSON.stringify(unique, null, 2), 'utf-8');
  console.log(`\n[输出] ${outputPath}`);
  console.log(`=== 采集完成: ${unique.length} 条情报 ===`);

  return unique;
}

main().catch(err => {
  console.error('采集失败:', err);
  process.exit(1);
});
