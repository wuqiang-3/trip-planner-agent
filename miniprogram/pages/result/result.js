const history = require('../../utils/history')
const mockPlan = require('../../mock/trip-plan')

Page({
  data: { plan: null, weatherMap: {} },

  onLoad(query) {
    let plan = null
    if (query.mock === '1') {
      plan = mockPlan
    } else if (query.historyId) {
      const rec = history.get(query.historyId)
      plan = rec && rec.plan
    } else if (getApp().globalData.lastPlan) {
      plan = getApp().globalData.lastPlan
    }
    if (!plan) {
      wx.showToast({ title: '行程数据缺失', icon: 'none' })
      return
    }
    const weatherMap = {}
    ;(plan.weather_info || []).forEach((w) => { weatherMap[w.date] = w })
    this.setData({ plan, weatherMap })
  },

  onShareAppMessage() {
    const p = this.data.plan
    const days = p && p.days ? p.days.length : ''
    return {
      title: `我的${p ? p.city : ''}${days}日游行程 🧳`,
      path: '/pages/index/index'
    }
  }
})
