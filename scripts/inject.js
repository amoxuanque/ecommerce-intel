/**
 * 电商情报站 - HTML注入器
 * 读取analyzed.json，将新情报合并到index.html的INTEL_DATA中
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const ANALYZED_PATH = path.join(__dirname, '..', 'data', 'analyzed.json');

const START_MARKER = '/* === INTEL_DATA_START === */';
const END_MARKER = '/* === INTEL_DATA_END === */';

// topFeed最大保留条数
const MAX_TOP_FEED = 50;

/**
 * 从HTML中提取INTEL_DATA对象
 */
function extractIntelData(html) {
  const startIdx = html.indexOf(START_MARKER);
  const endIdx = html.indexOf(END_MARKER);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error('未找到 INTEL_DATA 标记');
  }

  // 提取标记之间的JS代码
  let jsBlock = html.slice(startIdx + START_MARKER.length, endIdx).trim();

  // const不会挂载到sandbox，改为赋值到this
  jsBlock = jsBlock.replace(/^const INTEL_DATA\s*=/, 'this.INTEL_DATA =');

  // 用vm安全执行，获取INTEL_DATA对象
  const sandbox = {};
  vm.runInNewContext(jsBlock, sandbox);
  return sandbox.INTEL_DATA;
}

/**
 * 将INTEL_DATA对象序列化为格式化的JS代码
 */
function serializeIntelData(data) {
  const json = JSON.stringify(data, null, 2);
  return `const INTEL_DATA = ${json};`;
}

/**
 * 主流程
 */
function main() {
  console.log('=== 情报注入开始 ===');

  // 读取分析结果
  if (!fs.existsSync(ANALYZED_PATH)) {
    console.log('未找到 analyzed.json，跳过注入');
    return;
  }

  const newItems = JSON.parse(fs.readFileSync(ANALYZED_PATH, 'utf-8'));
  console.log(`新增情报: ${newItems.length} 条`);

  if (newItems.length === 0) {
    console.log('无新情报，跳过注入');
    return;
  }

  // 读取HTML
  const html = fs.readFileSync(HTML_PATH, 'utf-8');

  // 提取当前数据
  const intelData = extractIntelData(html);
  console.log(`现有 topFeed: ${intelData.topFeed ? intelData.topFeed.length : 0} 条`);

  // 合并新数据到topFeed（新的在前，去重）
  const existingTitles = new Set((intelData.topFeed || []).map(i => i.title));
  const uniqueNewItems = newItems.filter(item => !existingTitles.has(item.title));
  console.log(`去重后新增: ${uniqueNewItems.length} 条`);

  intelData.topFeed = [...uniqueNewItems, ...(intelData.topFeed || [])].slice(0, MAX_TOP_FEED);

  // 更新时间戳
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  intelData.lastUpdated = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // 更新统计
  if (intelData.stats && intelData.stats[0]) {
    intelData.stats[0].value = String(intelData.topFeed.length);
    intelData.stats[0].change = `↑ ${uniqueNewItems.length} 条新增`;
  }

  // 生成新的JS块
  const newJsBlock = serializeIntelData(intelData);

  // 替换HTML中的数据块
  const startIdx = html.indexOf(START_MARKER);
  const endIdx = html.indexOf(END_MARKER);
  const newHtml = html.slice(0, startIdx + START_MARKER.length) +
    '\n' + newJsBlock + '\n' +
    html.slice(endIdx);

  // 写回
  fs.writeFileSync(HTML_PATH, newHtml, 'utf-8');

  console.log(`\n[完成] index.html 已更新`);
  console.log(`  topFeed: ${intelData.topFeed.length} 条`);
  console.log(`  lastUpdated: ${intelData.lastUpdated}`);
  console.log('=== 注入完成 ===');
}

main();
