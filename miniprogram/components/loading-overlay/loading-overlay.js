Component({
  properties: {
    show: { type: Boolean, value: false, observer(v) { v ? this._start() : this._stop() } }
  },
  data: {
    step: 0,
    tips: ['正在理解你的需求…', '正在搜索景点…', '正在查询天气…', '正在规划路线…', '正在编排行程…']
  },
  methods: {
    _start() {
      this.setData({ step: 0 })
      this._timer = setInterval(() => {
        const next = (this.data.step + 1) % this.data.tips.length
        this.setData({ step: next })
      }, 1500)
    },
    _stop() { if (this._timer) clearInterval(this._timer) }
  },
  detached() { this._stop() }
})
