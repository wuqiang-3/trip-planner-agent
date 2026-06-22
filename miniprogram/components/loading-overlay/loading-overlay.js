/**
 * 加载遮罩层组件
 *
 * 设计说明：
 *  - 线性进度（不循环），步骤与实际后端阶段匹配
 *  - 每个步骤模拟不同的"停留时间"以匹配真实耗时分布
 *  - MCP 调用阶段（步骤0-2）快进，LLM 规划阶段（步骤3-5）慢行
 */
Component({
  properties: {
    show: { type: Boolean, value: false, observer(v) { v ? this._start() : this._stop() } }
  },

  data: {
    step: 0,
    tips: [
      '正在搜索景点…',        // 步骤0 — MCP 并行获取景点
      '正在查询天气…',        // 步骤1 — MCP 获取天气
      '正在搜索酒店…',        // 步骤2 — MCP 获取酒店
      '正在智能编排行程…',    // 步骤3 — LLM 分析数据、规划路线（耗时最长）
      '正在生成行程方案…',    // 步骤4 — LLM 输出结构化 JSON
      '即将为你呈现…'         // 步骤5 — 返回传输、前端渲染
    ],
    // 每个步骤的停留时长（毫秒），与真实后端耗时分布匹配
    hold: [3000, 2000, 2000, 25000, 15000, 10000],
    progress: 0        // 0~100 进度百分比（粗略估算）
  },

  methods: {
    _start() {
      this.setData({ step: 0, progress: 0 })
      this._stepForward()
    },

    _stepForward() {
      const s = this.data.step
      if (s >= this.data.tips.length) return  // 全部播完，保持最后一步

      // 估算进度：已过步骤占满分的比例 + 当前步骤的进度
      const total = this.data.hold.reduce((a, b) => a + b, 0)
      const elapsed = this.data.hold.slice(0, s).reduce((a, b) => a + b, 0)
      const progress = Math.min(95, Math.round((elapsed / total) * 100))
      this.setData({ progress })

      this._timer = setTimeout(() => {
        this.setData({ step: s + 1 })
        this._stepForward()
      }, this.data.hold[s])
    },

    _stop() {
      if (this._timer) clearTimeout(this._timer)
      // 完成时跳到100%
      this.setData({ step: this.data.tips.length - 1, progress: 100 })
    }
  },

  detached() { this._stop() }
})
