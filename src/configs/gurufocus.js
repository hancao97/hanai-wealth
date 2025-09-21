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

module.exports = {
  guruFocusFetchApiBasicParams
};