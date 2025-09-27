import { fiedConfig } from '../configs/gurufocus.js';

function detectStockBoard(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    console.warn(`警告: 未知股票代码格式: ${symbol}, 计入主板`);
    return '主板';
  }
  
  const code = symbol.trim();
  
  // 主板：000/001/002/003/600/601/603/605 开头
  if (/^(000|001|002|003|600|601|603|605)/.test(code)) {
    return '主板';
  }
  
  // 创业板：300/301 开头  
  if (/^(300|301)/.test(code)) {
    return '创业板';
  }
  
  // 科创板：688 开头
  if (/^68/.test(code)) {
    return '科创板';
  }
  
  // 北证：43/83/87/92 开头
  if (/^(43|83|87|92)/.test(code)) {
    return '北证';
  }
  
  // 未知情况，记录警告并计入主板
  console.warn(`警告: 未知股票代码规则: ${code}, 计入主板`);
  return '主板';
}

function formatAsset(asset) {
  return {
    ...Object.keys(fiedConfig).reduce((acc, key) => {
      acc[key] = asset[key];
      return acc;
    }, {}),
    board: detectStockBoard(asset.symbol),
    total_free_cash_flow: (asset.total_free_cash_flow ?? 0) * 1000000,
    rank_gf_value: asset.rank_gf_value?.value ?? 0, // 0-10
    rank_growth: asset.rank_growth?.value ?? 0, // 0-10
    rank_momentum: asset.rank_momentum?.value ?? 0, // 0-10
    rank_profitability: asset.rank_profitability?.value ?? 0, // 0-10
    rank_balancesheet: asset.rank_balancesheet?.value ?? 0, // 0-10
  }
}

export {
  formatAsset
};