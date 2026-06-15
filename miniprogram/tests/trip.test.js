const trip = require('../utils/trip')

describe('computeTravelDays', () => {
  test('同一天为1天', () => {
    expect(trip.computeTravelDays('2026-06-20', '2026-06-20')).toBe(1)
  })
  test('06-20到06-22为3天(含首尾)', () => {
    expect(trip.computeTravelDays('2026-06-20', '2026-06-22')).toBe(3)
  })
  test('结束早于开始返回0', () => {
    expect(trip.computeTravelDays('2026-06-22', '2026-06-20')).toBe(0)
  })
})
