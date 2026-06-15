const env = require('../../config/env')
const trip = require('../../utils/trip')
const history = require('../../utils/history')
const { planTrip } = require('../../utils/request')

Page({
  data: {
    form: {
      city: '', start_date: '', end_date: '',
      transportation: '公共交通', accommodation: '经济型酒店',
      preferences: [], free_text_input: ''
    },
    transportationOptions: env.TRANSPORTATION_OPTIONS,
    accommodationOptions: env.ACCOMMODATION_OPTIONS,
    preferenceOptions: env.PREFERENCE_OPTIONS,
    loading: false
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },
  onDate(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },
  onPickTransportation(e) {
    this.setData({ 'form.transportation': this.data.transportationOptions[e.detail.value] })
  },
  onPickAccommodation(e) {
    this.setData({ 'form.accommodation': this.data.accommodationOptions[e.detail.value] })
  },
  onTogglePref(e) {
    const p = e.currentTarget.dataset.pref
    const cur = this.data.form.preferences
    const next = cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]
    this.setData({ 'form.preferences': next })
  },

  async onSubmit() {
    const check = trip.validateForm(this.data.form)
    if (!check.valid) {
      wx.showToast({ title: check.message, icon: 'none' })
      return
    }
    this.setData({ loading: true })
    try {
      const plan = await planTrip(this.data.form)
      const rec = {
        id: String(Date.now()),
        createdAt: Date.now(),
        city: plan.city,
        travelDays: plan.days.length,
        request: trip.buildRequest(this.data.form),
        plan
      }
      history.add(rec)
      getApp().globalData.lastPlan = plan
      wx.navigateTo({ url: '/pages/result/result' })
    } catch (err) {
      wx.showModal({ title: '生成失败', content: err.message || '请稍后重试', showCancel: false })
    } finally {
      this.setData({ loading: false })
    }
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/history' })
  }
})
