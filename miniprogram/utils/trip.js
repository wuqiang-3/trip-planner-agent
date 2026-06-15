function computeTravelDays(startDate, endDate) {
  const s = new Date(startDate + 'T00:00:00Z').getTime()
  const e = new Date(endDate + 'T00:00:00Z').getTime()
  if (isNaN(s) || isNaN(e) || e < s) return 0
  return Math.round((e - s) / 86400000) + 1
}

module.exports = { computeTravelDays }
