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

describe('validateForm', () => {
  const base = { city: '杭州', start_date: '2026-06-20', end_date: '2026-06-22' }

  test('合法表单通过', () => {
    expect(trip.validateForm(base)).toEqual({ valid: true, message: '' })
  })
  test('城市为空报错', () => {
    const r = trip.validateForm({ ...base, city: '' })
    expect(r.valid).toBe(false)
    expect(r.message).toContain('城市')
  })
  test('结束早于开始报错', () => {
    const r = trip.validateForm({ ...base, end_date: '2026-06-19' })
    expect(r.valid).toBe(false)
    expect(r.message).toContain('日期')
  })
  test('超过30天报错', () => {
    const r = trip.validateForm({ city: '杭州', start_date: '2026-01-01', end_date: '2026-03-01' })
    expect(r.valid).toBe(false)
    expect(r.message).toContain('30')
  })
})

describe('buildRequest', () => {
  test('补齐travel_days与默认值', () => {
    const form = {
      city: '杭州', start_date: '2026-06-20', end_date: '2026-06-22',
      transportation: '公共交通', accommodation: '经济型酒店',
      preferences: ['美食']
    }
    expect(trip.buildRequest(form)).toEqual({
      city: '杭州',
      start_date: '2026-06-20',
      end_date: '2026-06-22',
      travel_days: 3,
      transportation: '公共交通',
      accommodation: '经济型酒店',
      preferences: ['美食'],
      free_text_input: ''
    })
  })
  test('preferences与free_text_input缺省', () => {
    const form = {
      city: '北京', start_date: '2026-07-01', end_date: '2026-07-01',
      transportation: '自驾', accommodation: '民宿'
    }
    const r = trip.buildRequest(form)
    expect(r.preferences).toEqual([])
    expect(r.free_text_input).toBe('')
    expect(r.travel_days).toBe(1)
  })
})

describe('matchWeather', () => {
  const weather = [
    { date: '2026-06-20', day_weather: '晴', day_temp: 28, night_temp: 22 },
    { date: '2026-06-21', day_weather: '多云', day_temp: 27, night_temp: 21 }
  ]
  test('按日期匹配', () => {
    expect(trip.matchWeather(weather, '2026-06-21').day_weather).toBe('多云')
  })
  test('无匹配返回null', () => {
    expect(trip.matchWeather(weather, '2026-06-30')).toBeNull()
  })
  test('空数组返回null', () => {
    expect(trip.matchWeather([], '2026-06-20')).toBeNull()
  })
})

describe('parseTripResponse', () => {
  test('success取data', () => {
    const data = { city: '杭州', days: [] }
    expect(trip.parseTripResponse({ success: true, message: 'ok', data })).toBe(data)
  })
  test('success=false抛错带message', () => {
    expect(() => trip.parseTripResponse({ success: false, message: '生成失败', data: null }))
      .toThrow('生成失败')
  })
  test('data为空抛错', () => {
    expect(() => trip.parseTripResponse({ success: true, message: '', data: null }))
      .toThrow()
  })
})

describe('边界场景', () => {
  test('全空格城市名被拦截', () => {
    const r = trip.validateForm({ city: '   ', start_date: '2026-06-20', end_date: '2026-06-22' })
    expect(r.valid).toBe(false)
    expect(r.message).toContain('城市')
  })
  test('form为null返回校验失败而非抛错', () => {
    expect(() => trip.validateForm(null)).not.toThrow()
    expect(trip.validateForm(null).valid).toBe(false)
  })
  test('非法日期字符串computeTravelDays返回0', () => {
    expect(trip.computeTravelDays('not-a-date', '2026-06-20')).toBe(0)
  })
})
