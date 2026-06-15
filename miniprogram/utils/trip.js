const MS_PER_DAY = 86400000
const MAX_TRIP_DAYS = 30

// 手动解析 YYYY-MM-DD 为 UTC 毫秒,规避微信 iOS JavaScriptCore 对 ISO 字符串解析的兼容差异
function parseDateUTC(str) {
  if (typeof str !== 'string') return NaN
  const parts = str.split('-')
  if (parts.length !== 3) return NaN
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return NaN
  return Date.UTC(y, m - 1, d)
}

function computeTravelDays(startDate, endDate) {
  const s = parseDateUTC(startDate)
  const e = parseDateUTC(endDate)
  if (isNaN(s) || isNaN(e) || e < s) return 0
  return Math.round((e - s) / MS_PER_DAY) + 1
}

function validateForm(form) {
  if (!form) {
    return { valid: false, message: '表单数据异常' }
  }
  if (!form.city || !form.city.trim()) {
    return { valid: false, message: '请填写目的地城市' }
  }
  if (!form.start_date || !form.end_date) {
    return { valid: false, message: '请选择出发和返程日期' }
  }
  const days = computeTravelDays(form.start_date, form.end_date)
  if (days <= 0) {
    return { valid: false, message: '返程日期不能早于出发日期' }
  }
  if (days > MAX_TRIP_DAYS) {
    return { valid: false, message: `行程天数不能超过${MAX_TRIP_DAYS}天` }
  }
  return { valid: true, message: '' }
}

// 前提:form 已通过 validateForm 校验(city 非空、日期合法)
function buildRequest(form) {
  return {
    city: form.city.trim(),
    start_date: form.start_date,
    end_date: form.end_date,
    travel_days: computeTravelDays(form.start_date, form.end_date),
    transportation: form.transportation,
    accommodation: form.accommodation,
    preferences: form.preferences || [],
    free_text_input: form.free_text_input || ''
  }
}

function matchWeather(weatherInfo, date) {
  if (!Array.isArray(weatherInfo)) return null
  return weatherInfo.find((w) => w.date === date) || null
}

function parseTripResponse(resp) {
  if (!resp || !resp.success || !resp.data) {
    throw new Error((resp && resp.message) || '行程生成失败,请重试')
  }
  return resp.data
}

module.exports = {
  computeTravelDays, validateForm, buildRequest, matchWeather, parseTripResponse
}
