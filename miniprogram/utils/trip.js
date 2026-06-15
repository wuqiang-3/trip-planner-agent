function computeTravelDays(startDate, endDate) {
  const s = new Date(startDate + 'T00:00:00Z').getTime()
  const e = new Date(endDate + 'T00:00:00Z').getTime()
  if (isNaN(s) || isNaN(e) || e < s) return 0
  return Math.round((e - s) / 86400000) + 1
}

function validateForm(form) {
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
  if (days > 30) {
    return { valid: false, message: '行程天数不能超过30天' }
  }
  return { valid: true, message: '' }
}

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

module.exports = { computeTravelDays, validateForm, buildRequest }
