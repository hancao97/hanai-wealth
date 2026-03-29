/**
 * 将价值线（medps）对齐到价格线每个日期，并延伸到价值线最后日期。
 * 与 GuruFocus valuation 接口返回的 medps/price 数组格式一致：[[timestamp, value], ...]
 */

// 线性插值函数
export function interpolateValue(medpsData, targetDate) {
  const targetTime = targetDate.getTime()

  let beforePoint = null
  let afterPoint = null

  for (let i = 0; i < medpsData.length; i++) {
    const currentTime = new Date(medpsData[i][0]).getTime()

    if (currentTime <= targetTime) {
      beforePoint = medpsData[i]
    }

    if (currentTime >= targetTime && !afterPoint) {
      afterPoint = medpsData[i]
      break
    }
  }

  if (!beforePoint && !afterPoint) return null
  if (!beforePoint) return afterPoint[1]
  if (!afterPoint) return beforePoint[1]

  const beforeTime = new Date(beforePoint[0]).getTime()
  const afterTime = new Date(afterPoint[0]).getTime()

  if (beforeTime === targetTime) return beforePoint[1]
  if (afterTime === targetTime) return afterPoint[1]

  const ratio = (targetTime - beforeTime) / (afterTime - beforeTime)
  const interpolatedValue = beforePoint[1] + (afterPoint[1] - beforePoint[1]) * ratio

  return interpolatedValue
}

export function alignValueDataToPrice(medpsData, priceData) {
  if (!medpsData.length || !priceData.length) return medpsData

  const medpsMap = new Map()
  medpsData.forEach((item) => {
    const dateKey = new Date(item[0]).toDateString()
    medpsMap.set(dateKey, item[1])
  })

  const lastPriceDate = new Date(priceData[priceData.length - 1][0])
  const lastMedpsDate = new Date(medpsData[medpsData.length - 1][0])

  const result = []

  for (let i = 0; i < priceData.length; i++) {
    const priceDate = new Date(priceData[i][0])
    const dateKey = priceDate.toDateString()

    if (medpsMap.has(dateKey)) {
      result.push([priceData[i][0], medpsMap.get(dateKey)])
    } else {
      const interpolatedValue = interpolateValue(medpsData, priceDate)
      if (interpolatedValue !== null) {
        result.push([priceData[i][0], interpolatedValue])
      }
    }
  }

  if (lastMedpsDate > lastPriceDate) {
    for (let i = 0; i < medpsData.length; i++) {
      const medpsDate = new Date(medpsData[i][0])

      if (medpsDate > lastPriceDate) {
        result.push([medpsData[i][0], medpsData[i][1]])
      }
    }
  }

  return result
}
