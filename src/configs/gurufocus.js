const guruFocusFetchApiBasicParams = {
  "exchanges": [
    "SZSE",
    "SHSE"
  ],
  "fields": [
    "symbol",
    "company",
    "price",
    "p_change",
    "p_pct_change",
    "mktcap_norm_currency",
    "industry",
    "sector",
    "group",
    "total_netincome_growth_10y",
    "pchange_10y",
    "price10ylow",
    "price10yhigh",
    "total_free_cash_flow",
    "sma_20",
    "sma_50",
    "sma_200",
    "yield",
    "grossmargin",
    "net_margain",
    "pettm",
    "pettmlow",
    "pettmhigh",
    "ev_norm_currency",
    "gf_value",
    "rank_gf_value",
    "gf_score",
    "rank_balancesheet",
    "rank_profitability",
    "rank_growth",
    "rank_momentum",
    "pb",
    "gf_valuation"
  ],
  "filters": [
    {
      "left": "use_in_region",
      "operator": "=",
      "right": false
    }
  ],
  "guru_filters": [],
  "inst_holding_filters": [],
  "insider_filters": [],
  "insider_trading_filters": [],
  "sorts": "mktcap_norm|DESC",
  "rank_by": "",
  "use_in_screener": true
};

const fiedConfig = {
  symbol: '股票代码',
  stockid: '股票id',
  business_descrpt: '业务说明',
  company: '公司',
  exchange_: '交易所',
  board: '上市市场', // 主板、创业板、科创板、北证

  price: '今日股价',
  p_pct_change: '今日涨跌幅百分比',
  p_change: '今日涨跌金额',
  mktcap_norm_currency: '市值',

  price10ylow: '近10年最低股价',
  price10yhigh: '近10年最高股价',

  industry: '行业',
  industrycode: '行业代码',
  sector: '行业（一级）',
  sectorcode: '行业（一级）代码',
  group: '行业（二级）',
  groupcode: '行业（二级）代码',

  total_netincome_growth_10y: '近10年净利润增长率',
  pchange_10y: '近10年年化回报率',
  total_free_cash_flow: '自由现金流', // 单位：百万，需要换算

  sma_20: '20日移动平均线',
  sma_50: '50日移动平均线',
  sma_200: '200日移动平均线',

  yield: '股息率',
  grossmargin: '毛利率',
  net_margain: '净利率',

  pettm: '市盈率',
  pettmhigh: '近10年最高市盈率',
  pettmlow: '近10年最低市盈率',

  pb: '市净率',

  gf_value: '大师合理估值', // 推测合理股价
  gf_valuation: '大师估值评价', // 严重低估 3 -> 低估 4 -> 合理范围 5 -> 高估 6 -> 严重高估 7 -> 价值陷阱嫌疑 2 -> 数据长久未更新，谨慎使用 1 -> 数据不足 0
  gf_score: '大师价值评分', // 0-100

  rank_gf_value: '价值大师评级', // 0-10
  rank_growth: '成长能力评级', // 0-10
  rank_momentum: '价值动量评级', // 0-10
  rank_profitability: '盈利能力评级', // 0-10
  rank_balancesheet: '财务实力评级', // 0-10
}

const gf_valuation_map = {
  3: '严重低估',
  4: '低估',
  5: '合理范围',
  6: '高估',
  7: '严重高估',
  2: '价值陷阱嫌疑',
  1: '数据长久未更新，谨慎使用',
  0: '数据不足',
} 

export {
  guruFocusFetchApiBasicParams,
  fiedConfig,
  gf_valuation_map
};