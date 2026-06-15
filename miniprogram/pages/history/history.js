const history = require('../../utils/history')

Page({
  data: { records: [] },

  onShow() {
    const records = history.list().map((r) => ({
      id: r.id,
      city: r.city,
      travelDays: r.travelDays,
      dateText: new Date(r.createdAt).toLocaleString()
    }))
    this.setData({ records })
  },

  openRecord(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/result/result?historyId=${id}` })
  },

  deleteRecord(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除', content: '确定删除这条历史行程?',
      success: (res) => {
        if (res.confirm) {
          history.remove(id)
          this.onShow()
        }
      }
    })
  }
})
