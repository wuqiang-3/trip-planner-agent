const { BASE_URL } = require('../config/env')
const trip = require('./trip')

function wxRequest({ url, method = 'GET', data }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      data,
      timeout: 120000,
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data)
        else reject(new Error('服务异常 HTTP ' + res.statusCode))
      },
      fail: (err) => reject(new Error((err && err.errMsg) || '网络请求失败'))
    })
  })
}

// 输入表单对象 → 返回 TripPlan(失败抛错)
async function planTrip(form) {
  const body = trip.buildRequest(form)
  const resp = await wxRequest({
    url: BASE_URL + '/api/trip/plan',
    method: 'POST',
    data: body
  })
  return trip.parseTripResponse(resp)
}

module.exports = { wxRequest, planTrip }
