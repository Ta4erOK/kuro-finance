<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import Chart from 'chart.js/auto'

const periodType = ref('month') // day | week | month
const chartEl = ref(null)
let chart = null

// Данные
const rangeLabel = ref('')
const expensesTotal = ref(0)
const savingsTotal = ref(0)
const income = ref(0)
const avgPerDay = ref(0)
const daysWithExp = ref(0)

function todayStr() { return new Date().toISOString().slice(0, 10) }

// Считаем диапазон по выбранному типу
function getRange() {
  const now = new Date()
  const end = todayStr()
  let start
  const sub = (d, days) => {
    const x = new Date(d)
    x.setDate(x.getDate() - days)
    return x.toISOString().slice(0, 10)
  }
  switch (periodType.value) {
    case 'day': start = end; rangeLabel.value = 'Сегодня'; break
    case 'week':
      start = sub(now, 6)
      rangeLabel.value = 'За 7 дней'
      break
    case 'month':
      start = sub(now, 29)
      rangeLabel.value = 'За 30 дней'
      break
    default: start = end
  }
  return { start, end }
}

async function loadStats() {
  const { start, end } = getRange()

  const [expTotal, savTotal, expGrouped, savGrouped, expByCat] = await Promise.all([
    window.api.getTotalByRange(start, end),
    window.api.getSavingsTotalByRange(start, end),
    window.api.getExpensesGroupedByDate(start, end),
    window.api.getSavingsGroupedByDate(start, end),
    window.api.getExpensesGroupedByCategory(start, end)
  ])

  expensesTotal.value = expTotal
  savingsTotal.value = savTotal
  income.value = Number(await window.api.getSetting('income', '0')) || 0

  // Средние траты в день за месяц
  const now = new Date()
  const monthSummary = await window.api.getMonthSummary(now.getFullYear(), now.getMonth() + 1)
  avgPerDay.value = monthSummary.avgPerDay
  daysWithExp.value = monthSummary.daysWithExpenses

  renderChart(expGrouped, savGrouped)
  renderCategoryChart(expByCat)
}

// ====== Основной график: траты vs копилка ======
function renderChart(expGrouped, savGrouped) {
  // Собираем общий набор дат
  const dateMap = {}
  expGrouped.forEach(g => { dateMap[g.date] = { exp: g.total, sav: 0 } })
  savGrouped.forEach(g => {
    dateMap[g.date] = dateMap[g.date] || { exp: 0, sav: 0 }
    dateMap[g.date].sav = g.total
  })
  const dates = Object.keys(dateMap).sort()
  const labels = dates.map(d => {
    const dt = new Date(d + 'T12:00:00')
    return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  })
  const expData = dates.map(d => dateMap[d].exp)
  const savData = dates.map(d => dateMap[d].sav)

  if (chart) { chart.destroy(); chart = null }

  if (!chartEl.value) return
  chart = new Chart(chartEl.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Траты',
          data: expData,
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderRadius: 4
        },
        {
          label: 'Копилка',
          data: savData,
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${Number(ctx.parsed.y).toLocaleString('ru-RU')} ₽`
          }
        }
      },
      scales: {
        x: { ticks: { color: '#94a3b8', maxRotation: 45, font: { size: 9 } }, grid: { color: 'rgba(63,63,90,0.4)' } },
        y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(63,63,90,0.4)' } }
      }
    }
  })
}

// ====== Круговая: по категориям ======
const catChartEl = ref(null)
let catChart = null

function renderCategoryChart(expByCat) {
  if (catChart) { catChart.destroy(); catChart = null }
  if (!catChartEl.value || !expByCat.length) return

  catChart = new Chart(catChartEl.value, {
    type: 'doughnut',
    data: {
      labels: expByCat.map(c => c.name),
      datasets: [{
        data: expByCat.map(c => c.total),
        backgroundColor: expByCat.map(c => c.color),
        borderColor: '#27273a',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10 } },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${Number(ctx.parsed).toLocaleString('ru-RU')} ₽`
          }
        }
      }
    }
  })
}

// ====== Проценты ======
const savingsPercent = computed(() => {
  const total = expensesTotal.value + savingsTotal.value
  if (!total) return 0
  return Math.round((savingsTotal.value / total) * 100)
})
const expensesPercent = computed(() => 100 - savingsPercent.value)

function money(v) {
  return Number(v || 0).toLocaleString('ru-RU') + ' ₽'
}

function switchPeriod(p) {
  periodType.value = p
  loadStats()
}

onMounted(loadStats)
onBeforeUnmount(() => {
  if (chart) chart.destroy()
  if (catChart) catChart.destroy()
})
watch(periodType, loadStats)
</script>

<template>
  <div class="stats">
    <!-- Период -->
    <div class="period-tabs">
      <button :class="{ active: periodType === 'day' }" @click="switchPeriod('day')">День</button>
      <button :class="{ active: periodType === 'week' }" @click="switchPeriod('week')">Неделя</button>
      <button :class="{ active: periodType === 'month' }" @click="switchPeriod('month')">Месяц</button>
    </div>

    <!-- Суммы и проценты -->
    <div class="sum-row">
      <div class="sum-card exp">
        <div class="sum-label">Траты</div>
        <div class="sum-value">−{{ money(expensesTotal) }}</div>
        <div class="sum-pct">{{ expensesPercent }}%</div>
      </div>
      <div class="sum-card sav">
        <div class="sum-label">Копилка</div>
        <div class="sum-value">+{{ money(savingsTotal) }}</div>
        <div class="sum-pct">{{ savingsPercent }}%</div>
      </div>
    </div>

    <!-- Мета месяца -->
    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Средние траты/день (мес.)</span>
        <span class="meta-value">{{ money(avgPerDay) }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Дней с тратами</span>
        <span class="meta-value">{{ daysWithExp }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Доход</span>
        <span class="meta-value">{{ money(income) }}</span>
      </div>
    </div>

    <!-- Основной график -->
    <div class="chart-box">
      <div class="chart-title">{{ rangeLabel }} · траты vs копилка</div>
      <div class="chart-wrap"><canvas ref="chartEl"></canvas></div>
    </div>

    <!-- Категории -->
    <div class="chart-box">
      <div class="chart-title">По категориям</div>
      <div class="chart-wrap cat">
        <canvas v-if="expensesTotal > 0" ref="catChartEl"></canvas>
        <div v-else class="empty-chart">Нет данных за период</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats { display: flex; flex-direction: column; gap: 10px; }

.period-tabs { display: flex; gap: 4px; background: var(--bg-input); border-radius: 10px; padding: 4px; }
.period-tabs button {
  flex: 1; padding: 7px 0;
  background: transparent; border-radius: 8px;
  font-size: 12px; color: var(--text-dim);
  transition: 0.15s;
}
.period-tabs button:hover { color: var(--text); }
.period-tabs button.active {
  background: var(--accent); color: #fff; font-weight: 600;
}

.sum-row { display: flex; gap: 8px; }
.sum-card {
  flex: 1;
  background: var(--bg-input);
  border-radius: 10px;
  padding: 12px;
  display: flex; flex-direction: column; gap: 2px;
}
.sum-label { font-size: 10px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px; }
.sum-value { font-size: 15px; font-weight: 800; }
.sum-card.exp .sum-value { color: var(--red); }
.sum-card.sav .sum-value { color: var(--green); }
.sum-pct { font-size: 11px; color: var(--text-dim); }

.meta-grid {
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;
}
.meta-item {
  background: var(--bg-input);
  border-radius: 8px;
  padding: 8px;
  display: flex; flex-direction: column; gap: 2px;
  text-align: center;
}
.meta-label { font-size: 9px; color: var(--text-dim); }
.meta-value { font-size: 12px; font-weight: 700; }

.chart-box {
  background: var(--bg-input);
  border-radius: 10px;
  padding: 10px;
}
.chart-title { font-size: 11px; color: var(--text-dim); margin-bottom: 8px; }
.chart-wrap { position: relative; height: 140px; }
.chart-wrap.cat { height: 160px; }
.empty-chart {
  height: 100%; display: flex; align-items: center; justify-content: center;
  color: var(--text-dim); font-size: 12px;
}
</style>