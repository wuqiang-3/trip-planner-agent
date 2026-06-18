/**
 * 行程长图生成器
 * 将 TripPlan 渲染为 Canvas 长图，支持保存到相册
 */

// 画布常量
const CANVAS_WIDTH = 320           // px
const MARGIN = 16                  // 页边距
const COL_WIDTH = CANVAS_WIDTH - MARGIN * 2  // 内容区宽度
const LINE_HEIGHT = 18             // 行高
const SECTION_GAP = 12             // 段落间距

/**
 * 截断文本，超出最大宽度时加省略号
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @returns {string}
 */
function truncateText(ctx, text, maxWidth) {
  if (!text) return text
  if (ctx.measureText(text).width <= maxWidth) return text
  let truncated = text
  while (truncated.length > 0) {
    if (ctx.measureText(truncated + '...').width <= maxWidth) break
    truncated = truncated.slice(0, -1)
  }
  return truncated + '...'
}

/**
 * 在指定宽度内绘制左对齐单行文本，超出自动截断加省略号
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} maxWidth
 */
function fillSingleLine(ctx, text, x, y, maxWidth) {
  const display = truncateText(ctx, text, maxWidth)
  ctx.fillText(display, x, y)
}

// 颜色
const COLORS = {
  bg: '#ffffff',
  headerBg: '#2b6cb0',
  headerText: '#ffffff',
  title: '#1a202c',
  body: '#4a5568',
  meta: '#718096',
  light: '#a0aec0',
  accent: '#2b6cb0',
  cardBg: '#f7fafc',
  border: '#e2e8f0',
  tagBg: '#ebf4ff',
  tagText: '#2b6cb0',
  suggestBg: '#fffaf0',
  suggestBorder: '#dd6b20',
  suggestText: '#4a5568',
  divider: '#e2e8f0',
  footer: '#a0aec0',
}

/**
 * 绘制自动换行文本
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y - 起始 y(基线)
 * @param {number} maxWidth
 * @param {number} lineHeight
 * @param {number} maxLines - 最多行数，0 表示不限
 * @returns {number} 下一个元素的 y 位置
 */
function fillWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 0) {
  if (!text) return y
  let line = ''
  let lineY = y
  let linesCount = 0
  const chars = String(text).split('')

  for (const char of chars) {
    const testLine = line + char
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, lineY)
      linesCount++
      lineY += lineHeight
      line = char
      if (maxLines > 0 && linesCount >= maxLines) {
        // 截断，最后加省略号
        return lineY
      }
    } else {
      line = testLine
    }
  }
  if (line) {
    ctx.fillText(line, x, lineY)
    lineY += lineHeight
  }
  return lineY
}

/**
 * 绘制标题（居左/居中）
 */
function drawHeading(ctx, text, x, y, fontSize, color, align = 'left') {
  const prevAlign = ctx.textAlign
  const prevFont = ctx.font
  ctx.font = 'bold ' + fontSize + 'px PingFang SC, sans-serif'
  ctx.textAlign = align
  ctx.fillStyle = color
  const drawX = align === 'center' ? CANVAS_WIDTH / 2 : x
  ctx.fillText(text, drawX, y)
  ctx.font = prevFont
  ctx.textAlign = prevAlign
  // 返回下一个元素 y
  return y + fontSize + 4
}

/**
 * 绘制分割线
 */
function drawDivider(ctx, x, y) {
  ctx.strokeStyle = COLORS.divider
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + COL_WIDTH, y)
  ctx.stroke()
  return y + SECTION_GAP
}

/**
 * 生成行程长图（主入口）
 * @param {any} plan - TripPlan 对象
 * @param {string} canvasId - canvas 的 id
 * @returns {Promise<string>} 临时图片路径
 */
function generateTripPlanImage(plan, canvasId) {
  return new Promise((resolve, reject) => {
    const query = wx.createSelectorQuery()
    query.select('#' + canvasId)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) {
          reject(new Error('找不到 canvas 节点'))
          return
        }

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getSystemInfoSync().pixelRatio

        // 第一步：估算总高度（先绘制一次用于测量）
        const estimatedHeight = estimateHeight(plan, ctx) + 40
        const finalHeight = Math.max(estimatedHeight, 400)

        // 设置 canvas 实际尺寸（物理像素）
        canvas.width = CANVAS_WIDTH * dpr
        canvas.height = finalHeight * dpr
        ctx.scale(dpr, dpr)

        // 白色背景
        ctx.fillStyle = COLORS.bg
        ctx.fillRect(0, 0, CANVAS_WIDTH, finalHeight)

        let y = MARGIN + 10

        // === 2. 绘制内容 ===
        y = drawHeader(ctx, plan, y)
        y += SECTION_GAP

        // 每天
        if (plan.days && plan.days.length) {
          for (let i = 0; i < plan.days.length; i++) {
            y = drawDayCard(ctx, plan.days[i], i, y, plan)
            y += SECTION_GAP
          }
        }

        // 总体建议
        if (plan.overall_suggestions) {
          y = drawSuggestions(ctx, plan.overall_suggestions, y)
          y += SECTION_GAP
        }

        // 页脚
        y = drawFooter(ctx, y, finalHeight)

        // 导出
        wx.canvasToTempFilePath({
          canvas,
          x: 0,
          y: 0,
          width: CANVAS_WIDTH * dpr,
          height: Math.min(finalHeight * dpr, canvas.height),
          fileType: 'png',
          quality: 1,
        }).then((res2) => {
          resolve(res2.tempFilePath)
        }).catch((err) => {
          reject(err)
        })
      })
  })
}

/**
 * 估算总高度
 */
function estimateHeight(plan, ctx) {
  const fSize = 13
  ctx.font = fSize + 'px PingFang SC, sans-serif'
  let h = MARGIN + 10

  // header
  h += 60
  // 每个 day
  if (plan.days) {
    for (const day of plan.days) {
      h += 30 // card head
      if (day.description) h += calcWrapHeight(ctx, day.description, COL_WIDTH - 8, fSize, LINE_HEIGHT, 3)
      h += 26 // tags (实际渲染 22px + 4px 间距)
      if (day.attractions && day.attractions.length) {
        h += 26 // section title (实际渲染 4px + 22px)
        for (const a of day.attractions) {
          h += 18 // poi row (实际渲染 y += 18)
          if (a.address) h += 16 // address 行
          if (a.description) h += calcWrapHeight(ctx, a.description, COL_WIDTH - 8, fSize, LINE_HEIGHT, 2)
        }
      }
      if (day.meals && day.meals.length) {
        h += 24 // section title (实际渲染 2px + 22px)
        h += day.meals.length * 20 // meal row (实际渲染 y += 20)
      }
      if (day.hotel) {
        h += 24 + 24 // section title + hotel row (实际渲染 2px+22px + 24px)
      }
      h += 12
    }
  }
  // suggestions
  if (plan.overall_suggestions) {
    h += 50 + calcWrapHeight(ctx, plan.overall_suggestions, COL_WIDTH - 24, fSize, LINE_HEIGHT, 8)
  }
  // footer
  h += 60
  return h
}

function calcWrapHeight(ctx, text, maxWidth, fontSize, lineHeight, maxLines) {
  ctx.font = fontSize + 'px PingFang SC, sans-serif'
  let lines = 0
  let line = ''
  for (const char of String(text)) {
    const testLine = line + char
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines++
      if (maxLines && lines >= maxLines) return lines * lineHeight
      line = char
    } else {
      line = testLine
    }
  }
  if (line) lines++
  return lines * lineHeight
}

/**
 * 绘制头部
 */
function drawHeader(ctx, plan, y) {
  const h = 90
  // 蓝色背景块
  ctx.fillStyle = COLORS.headerBg
  roundRect(ctx, MARGIN, y, COL_WIDTH, h, 10)
  ctx.fill()

  ctx.fillStyle = COLORS.headerText
  ctx.font = 'bold 22px PingFang SC, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(plan.city, MARGIN + 14, y + 32)

  ctx.font = '13px PingFang SC, sans-serif'
  const dateText = plan.start_date + ' ~ ' + plan.end_date + ' · ' + plan.days.length + '日游'
  ctx.fillText(dateText, MARGIN + 14, y + 56)

  if (plan.budget && plan.budget.total) {
    ctx.font = '14px PingFang SC, sans-serif'
    ctx.fillText('预算合计 ¥' + plan.budget.total, MARGIN + 14, y + 80)
  }

  return y + h + 6
}

/**
 * 绘制单日卡片
 */
function drawDayCard(ctx, day, index, y, plan) {
  const cardX = MARGIN
  const cardW = COL_WIDTH

  // 卡片背景
  ctx.fillStyle = COLORS.cardBg
  roundRect(ctx, cardX, y, cardW, 8, 8)
  ctx.fill()
  y += 6

  // 天气文本
  let weatherText = ''
  const weather = plan.weather_info ? plan.weather_info.find(function(w) { return w.date === day.date }) : null
  if (weather) {
    weatherText = (weather.day_weather || '') + ' ' + (weather.day_temp || '') + '°/' + (weather.night_temp || '') + '°'
  }

  // 第 X 天 + 日期 + 天气
  ctx.font = 'bold 16px PingFang SC, sans-serif'
  ctx.fillStyle = COLORS.accent
  ctx.textAlign = 'left'
  ctx.fillText('第' + (index + 1) + '天', cardX + 12, y + 22)

  ctx.font = '12px PingFang SC, sans-serif'
  ctx.fillStyle = COLORS.meta
  const dateX = cardX + 12 + ctx.measureText('第' + (index + 1) + '天').width + 12
  ctx.fillText(day.date || '', dateX, y + 22)

  if (weatherText) {
    ctx.fillStyle = '#dd6b20'
    ctx.textAlign = 'right'
    ctx.fillText(weatherText, cardX + cardW - 12, y + 22)
    ctx.textAlign = 'left'
  }

  y += 28

  // 描述
  if (day.description) {
    ctx.font = '13px PingFang SC, sans-serif'
    ctx.fillStyle = COLORS.body
    y = fillWrappedText(ctx, day.description, cardX + 14, y, cardW - 28, LINE_HEIGHT, 3)
    y += 2
  }

  // 标签（截断过长的单标签）
  ctx.font = '11px PingFang SC, sans-serif'
  const tagY = y
  let tagX = cardX + 12
  // 估算每个标签的最大宽度：两标签之间留 8px 间距，各自可用宽度均分
  const maxTagWidth = Math.floor((cardW - 24 - 8) / 2) - 16  // 减 16 是因为 tag 绘制时加了 16px 左右内边距
  const tags = [
    truncateText(ctx, '🚇 ' + (day.transportation || ''), maxTagWidth),
    truncateText(ctx, '🏨 ' + (day.accommodation || ''), maxTagWidth),
  ]
  for (const tag of tags) {
    var tw = ctx.measureText(tag).width + 16
    ctx.fillStyle = COLORS.tagBg
    roundRect(ctx, tagX, tagY - 8, tw, 22, 11)
    ctx.fill()
    ctx.fillStyle = COLORS.tagText
    ctx.textAlign = 'center'
    ctx.fillText(tag, tagX + tw / 2, tagY + 5)
    ctx.textAlign = 'left'
    tagX += tw + 8
  }
  y = tagY + 22

  // 景点
  if (day.attractions && day.attractions.length) {
    y += 4
    ctx.font = 'bold 14px PingFang SC, sans-serif'
    ctx.fillStyle = COLORS.title
    ctx.fillText('🏛 景点', cardX + 12, y + 16)
    y += 22

    for (const poi of day.attractions) {
      // 先测量右侧价格/时长文本宽度，截断左侧名称防重叠
      const rightText = '游玩' + poi.visit_duration + '分 · ' + (poi.ticket_price > 0 ? '¥' + poi.ticket_price : '免费')
      ctx.font = '11px PingFang SC, sans-serif'
      var rightW = ctx.measureText(rightText).width
      const maxNameW = (cardX + cardW - 12) - (cardX + 12) - rightW - 8
      ctx.font = '13px PingFang SC, sans-serif'
      ctx.fillStyle = COLORS.title
      fillSingleLine(ctx, poi.name, cardX + 12, y + 14, maxNameW)
      ctx.font = '11px PingFang SC, sans-serif'
      ctx.fillStyle = COLORS.light
      ctx.textAlign = 'right'
      ctx.fillText(rightText, cardX + cardW - 12, y + 14)
      ctx.textAlign = 'left'
      y += 18

      if (poi.address) {
        ctx.fillStyle = COLORS.meta
        ctx.font = '11px PingFang SC, sans-serif'
        ctx.fillText('📍 ' + poi.address, cardX + 14, y + 14)
        y += 16
      }
      if (poi.description) {
        ctx.fillStyle = COLORS.meta
        ctx.font = '12px PingFang SC, sans-serif'
        y = fillWrappedText(ctx, poi.description, cardX + 14, y + 4, cardW - 28, LINE_HEIGHT, 2)
      }
    }
  }

  // 餐饮
  if (day.meals && day.meals.length) {
    y += 2
    ctx.font = 'bold 14px PingFang SC, sans-serif'
    ctx.fillStyle = COLORS.title
    ctx.fillText('🍜 餐饮', cardX + 12, y + 16)
    y += 22

    for (const meal of day.meals) {
      if (meal.estimated_cost > 0) {
        // 有价格时，名称右对齐价格防碰撞
        const priceText = '约¥' + meal.estimated_cost
        ctx.font = '11px PingFang SC, sans-serif'
        var priceW = ctx.measureText(priceText).width
        const maxNameW = (cardX + cardW - 12) - (cardX + 12) - priceW - 8
        ctx.font = '13px PingFang SC, sans-serif'
        ctx.fillStyle = COLORS.body
        fillSingleLine(ctx, meal.name || '', cardX + 12, y + 14, maxNameW)
        ctx.font = '11px PingFang SC, sans-serif'
        ctx.fillStyle = COLORS.light
        ctx.textAlign = 'right'
        ctx.fillText(priceText, cardX + cardW - 12, y + 14)
        ctx.textAlign = 'left'
      } else {
        ctx.font = '13px PingFang SC, sans-serif'
        ctx.fillStyle = COLORS.body
        fillSingleLine(ctx, meal.name || '', cardX + 12, y + 14, cardW - 24)
      }
      y += 20
    }
  }

  // 住宿
  if (day.hotel) {
    y += 2
    ctx.font = 'bold 14px PingFang SC, sans-serif'
    ctx.fillStyle = COLORS.title
    ctx.fillText('🏨 住宿', cardX + 12, y + 16)
    y += 22

    const priceText = day.hotel.price_range || (day.hotel.estimated_cost > 0 ? '¥' + day.hotel.estimated_cost + '/晚' : '')
    if (priceText) {
      ctx.font = '11px PingFang SC, sans-serif'
      var priceW = ctx.measureText(priceText).width
      const maxNameW = (cardX + cardW - 12) - (cardX + 12) - priceW - 8
      ctx.font = '13px PingFang SC, sans-serif'
      ctx.fillStyle = COLORS.body
      fillSingleLine(ctx, day.hotel.name || '', cardX + 12, y + 14, maxNameW)
      ctx.font = '11px PingFang SC, sans-serif'
      ctx.fillStyle = COLORS.light
      ctx.textAlign = 'right'
      ctx.fillText(priceText, cardX + cardW - 12, y + 14)
      ctx.textAlign = 'left'
    } else {
      ctx.font = '13px PingFang SC, sans-serif'
      ctx.fillStyle = COLORS.body
      fillSingleLine(ctx, day.hotel.name || '', cardX + 12, y + 14, cardW - 24)
    }
    y += 24
  }

  return y
}

/**
 * 绘制总体建议
 */
function drawSuggestions(ctx, text, y) {
  const cardX = MARGIN
  const cardW = COL_WIDTH

  // 背景块
  ctx.fillStyle = COLORS.suggestBg
  roundRect(ctx, cardX, y, cardW, 30, 8)
  ctx.fill()

  // 左侧橙色条
  ctx.fillStyle = COLORS.suggestBorder
  ctx.fillRect(cardX, y, 6, 30)
  y += 6

  ctx.font = 'bold 14px PingFang SC, sans-serif'
  ctx.fillStyle = COLORS.suggestBorder
  ctx.fillText('💡 总体建议', cardX + 18, y + 16)
  y += 28

  ctx.font = '13px PingFang SC, sans-serif'
  ctx.fillStyle = COLORS.suggestText
  y = fillWrappedText(ctx, text, cardX + 18, y, cardW - 36, LINE_HEIGHT, 10)
  y += 8

  return y
}

/**
 * 绘制页脚
 */
function drawFooter(ctx, y, canvasHeight) {
  const footerY = canvasHeight - 30
  ctx.fillStyle = COLORS.footer
  ctx.font = '11px PingFang SC, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('—— 趣游智能旅行助手 ——', CANVAS_WIDTH / 2, footerY)
  ctx.textAlign = 'left'
  return canvasHeight
}

/**
 * 绘制圆角矩形路径
 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

module.exports = { generateTripPlanImage }
