const history = require('../../utils/history')
const mockPlan = require('../../mock/trip-plan')
const { generateTripPlanImage } = require('../../utils/image-generator')

Page({
  data: {
    plan: null,
    weatherMap: {},
    generating: false,
    showPreview: false,
    previewImage: ''
  },

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
  },

  /** 生成长图 */
  onGenerateImage() {
    if (this.data.generating) return
    const plan = this.data.plan
    if (!plan) {
      wx.showToast({ title: '行程数据缺失', icon: 'none' })
      return
    }

    this.setData({ generating: true })
    wx.showLoading({ title: '生成中...' })

    generateTripPlanImage(plan, 'trip-canvas')
      .then((tempPath) => {
        wx.hideLoading()
        this.setData({
          generating: false,
          showPreview: true,
          previewImage: tempPath
        })
      })
      .catch((err) => {
        wx.hideLoading()
        this.setData({ generating: false })
        console.error('长图生成失败:', err)
        wx.showToast({ title: '生成失败，请重试', icon: 'none' })
      })
  },

  /** 保存到相册 */
  onSaveImage() {
    const filePath = this.data.previewImage
    if (!filePath) return

    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => {
        wx.showToast({ title: '已保存到相册', icon: 'success' })
        this.setData({ showPreview: false })
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          // 用户拒绝授权，引导开启
          wx.showModal({
            title: '需要权限',
            content: '保存图片需要相册权限，请前往设置开启',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting()
              }
            }
          })
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  },

  /** 关闭预览 */
  onClosePreview() {
    this.setData({ showPreview: false })
  },

  stopPropagation() {
    // 阻止事件冒泡
  }
})
