const history = require('../utils/history')

beforeEach(() => { global.__resetWxStore() })

function rec(id) {
  return { id: String(id), createdAt: id, city: '杭州', travelDays: 3, request: {}, plan: {} }
}

describe('history', () => {
  test('初始为空', () => {
    expect(history.list()).toEqual([])
  })
  test('add后能list与get', () => {
    history.add(rec(1))
    expect(history.list().length).toBe(1)
    expect(history.get('1').city).toBe('杭州')
  })
  test('新记录排在最前', () => {
    history.add(rec(1))
    history.add(rec(2))
    expect(history.list()[0].id).toBe('2')
  })
  test('上限30,超出截断最旧', () => {
    for (let i = 1; i <= 31; i++) history.add(rec(i))
    const list = history.list()
    expect(list.length).toBe(30)
    expect(list[0].id).toBe('31')
    expect(history.get('1')).toBeNull()
  })
  test('remove删除指定', () => {
    history.add(rec(1))
    history.add(rec(2))
    history.remove('1')
    expect(history.get('1')).toBeNull()
    expect(history.list().length).toBe(1)
  })
})
