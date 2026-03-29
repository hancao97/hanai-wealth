import { ref } from 'vue'
import axios from 'axios'
import { mergeCompareValuationSeries } from '@/utils/compareValuationMerge.js'

function valuationUrl(stockid) {
  return `https://www.gurufocus.cn/_api/chart/${stockid}/valuation?locale=zh-hans`
}

export function useCompareValuation() {
  const loading = ref(false)
  const error = ref(null)
  const merged = ref(null)
  const primarySettled = ref(null)
  const compareSettled = ref(null)
  const lastPrimaryStockid = ref('')
  const lastCompareStockid = ref('')

  async function fetchValuation(stockid) {
    const { data } = await axios.get(valuationUrl(stockid))
    return data
  }

  async function loadCompare(primaryStockid, compareStockid) {
    lastPrimaryStockid.value = primaryStockid
    lastCompareStockid.value = compareStockid

    loading.value = true
    error.value = null
    merged.value = null
    primarySettled.value = null
    compareSettled.value = null

    try {
      const results = await Promise.allSettled([
        fetchValuation(primaryStockid),
        fetchValuation(compareStockid),
      ])
      primarySettled.value = results[0]
      compareSettled.value = results[1]

      if (results[0].status === 'rejected') {
        error.value = 'PRIMARY_CHART_FAILED'
        return
      }

      if (results[1].status === 'rejected') {
        error.value = 'COMPARE_CHART_FAILED'
        return
      }

      const rawA = results[0].value
      const rawB = results[1].value
      merged.value = mergeCompareValuationSeries(rawA, rawB)
    } catch {
      error.value = 'PRIMARY_CHART_FAILED'
    } finally {
      loading.value = false
    }
  }

  function reload() {
    if (!lastPrimaryStockid.value || !lastCompareStockid.value) return
    return loadCompare(lastPrimaryStockid.value, lastCompareStockid.value)
  }

  return {
    loading,
    error,
    merged,
    primarySettled,
    compareSettled,
    loadCompare,
    reload,
    fetchValuation,
  }
}
