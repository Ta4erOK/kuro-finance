<template>
  <div class="stats-view">
    <div class="period-tabs">
      <button
        v-for="p in periods"
        :key="p.key"
        class="tab"
        :class="{ active: periodType === p.key }"
        @click="switchPeriod(p.key)"
      >{{ p.label }}</button>
    </div>

    <div class="summary-cards">
      <div class="sum-card expenses">
        <span class="label">Траты</span>
        <span class="amount">{{ money(expensesTotal) }}</span>
        <span class="percent">{{ expensesPercent }}%</span>
      </div>
      <div class="sum-card savings">
        <span class="label">Копилка</span>
        <span class="amount">{{ money(savingsTotal) }}</span>
        <span class="percent">{{ savingsPercent }}%</span>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Средние траты/день</span>
        <span class="meta-value">{{ money(monthSummary.avgPerDay) }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Дней с тратами</span>
        <span class="meta-value">{{ monthSummary.daysWithExpenses }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Доход</span>
        <span class="meta-value">{{ money(income) }}</span>
      </div>
    </div>

    <div v-if="budgetLimit > 0" class="budget-bar-box">
      <div class="budget-label">
        <span>Бюджет: {{ money(budgetLimit) }}</span>
        <span>{{ money(expensesTotal) }} / {{ money(budgetLimit) }}</span>
      </div>
      <div class="budget-track">
        <div
          class="budget-fill"
          :style="{ width: budgetPercent + '%', background: budgetPercent > 100 ? '#e74c3c' : 'var(--accent)' }"
        ></div>
      </div>
    </div>

    <div class="chart-box">
      <h3>За {{ rangeLabel }} · траты vs копилка</h3>
      <div class="canvas-wrap" style="height:140px">
        <canvas ref="chartEl"></canvas>
      </div>
    </div>

    <div class="chart-box">
      <h3>По категориям</h3>
      <div class="canvas-wrap" style="height:160px">
        <canvas ref="catChartEl"></canvas>
      </div>
    </div>

    <div v-if="periodType === 'year'" class="year-summary-box">
      <h3>Итого за год</h3>
      <div class="year-table">
        <div class="year-row year-header">
          <span>Месяц</span><span>Траты</span><span>Копилка</span><span>Баланс</span>
        </div>
        <div v-for="row in yearRows" :key="row.month" class="year-row">
          <span>{{ row.name }}</span>
          <span class="red">{{ money(row.expenses) }}</span>
          <span class="green">{{ money(row.savings) }}</span>
          <span :class="row.balance >= 0 ? 'green' : 'red'">{{ money(row.balance) }}</span>
        </div>
      </div>
    </div>

    <div class="compare-box">
      <h3>Этот месяц vs прошлый</h3>
      <div class="compare-grid">
        <div class="compare-col">
          <span class="compare-label">Траты</span>
          <span class="compare-val">{{ money(compare.currExpenses) }}</span>
          <span class="delta" :class="deltaClass(compare.currExpenses, compare.prevExpenses, true)">
            {{ deltaText(compare.currExpenses, compare.prevExpenses) }}
          </span>
        </div>
        <div class="compare-col">
          <span class="compare-label">Прошлый месяц</span>
          <span class="compare-val">{{ money(compare.prevExpenses) }}</span>
        </div>
      </div>
      <div class="compare-grid">
        <div class="compare-col">
          <span class="compare-label">Копилка</span>
          <span class="compare-val">{{ money(compare.currSavings) }}</span>
          <span class="delta" :class="deltaClass(compare.currSavings, compare.prevSavings, false)">
            {{ deltaText(compare.currSavings, compare.prevSavings) }}
          </span>
        </div>
        <div class="compare-col">
          <span class="compare-label">Прошлый месяц</span>
          <span class="compare-val">{{ money(compare.prevSavings) }}</span>
        </div>
      </div>
      <div class="compare-grid">
        <div class="compare-col">
          <span class="compare-label">Долги</span>
          <span class="compare-val">{{ money(compare.currDebt) }}</span>
          <span class="delta" :class="deltaClass(compare.currDebt, compare.prevDebt, true)">
            {{ deltaText(compare.currDebt, compare.prevDebt) }}
          </span>
        </div>
        <div class="compare-col">
          <span class="compare-label">Прошлый месяц</span>
          <span class="compare-val">{{ money(compare.prevDebt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import Chart from 'chart.js/auto'

const periods = [
  { key: 'day', label: 'День' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'year', label: 'Год' }
]

const periodType = ref('month')
const chartEl = ref(null)
const catChartEl = ref(null)

let barChart = null
let doughnutChart = null

const expensesTotal = ref(0)
const savingsTotal = ref(0)
const income = ref(0)
const budgetLimit = ref(0)
const rangeLabel = ref('')
const monthSummary = ref({ avgPerDay: 0, daysWithExpenses: 0 })
const yearRows = ref([])
const compare = ref({ currExpenses: 0, prevExpenses: 0, currSavings: 0, prevSavings: 0, currDebt: 0, prevDebt: 0 })

const expensesPercent = computed(() => {
  const sum = expensesTotal.value + savingsTotal.value
  return sum > 0 ? Math.round(expensesTotal.value / sum * 100) : 0
})
const savingsPercent = computed(() => 100 - expensesPercent.value)

const budgetPercent = computed(() =>
  budgetLimit.value > 0 ? Math.min(100, expensesTotal.value / budgetLimit.value * 100) : 0
)

function money(v) {
  return Number(v || 0).toLocaleString('ru-RU') + ' ₽'
}

function getRange() {
  const now = new Date()
  const p = periodType.value
  let start, end, label

  if (p === 'day') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    end = now
    label = 'Сегодня'
  } else if (p === 'week') {
    end = now
    start = new Date(now)
    start.setDate(start.getDate() - 6)
    start.setHours(0, 0, 0, 0)
    label = 'За 7 дней'
  } else if (p === 'month') {
    end = now
    start = new Date(now)
    start.setDate(start.getDate() - 29)
    start.setHours(0, 0, 0, 0)
    label = 'За 30 дней'
  } else {
    start = new Date(now.getFullYear(), 0, 1)
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
    label = 'За год'
  }

  const fmt = d => d.toISOString().slice(0, 10)
  return { start: fmt(start), end: fmt(end), label }
}

function switchPeriod(p) {
  periodType.value = p
}

async function loadStats() {
  const { start, end, label } = getRange()
  rangeLabel.value = label

  const [exp, sav, expByDate, savByDate, expByCat, incomeVal, budgetVal] = await Promise.all([
    window.api.getTotalByRange(start, end),
    window.api.getSavingsTotalByRange(start, end),
    window.api.getExpensesGroupedByDate(start, end),
    window.api.getSavingsGroupedByDate(start, end),
    window.api.getExpensesGroupedByCategory(start, end),
    window.api.getSetting('income', '0'),
    window.api.getSetting('budget_limit', '')
  ])

  expensesTotal.value = exp
  savingsTotal.value = sav
  income.value = Number(incomeVal) || 0
  budgetLimit.value = Number(budgetVal) || 0

  const now = new Date()
  const ms = await window.api.getMonthSummary(now.getFullYear(), now.getMonth() + 1)
  monthSummary.value = ms

  await renderChart(expByDate, savByDate)
  renderCategoryChart(expByCat)

  if (periodType.value === 'year') {
    await loadYearSummary(now.getFullYear())
  } else {
    yearRows.value = []
  }

  await loadComparison(now)
}

async function loadYearSummary(year) {
  const months = []
  const names = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']
  for (let m = 0; m < 12; m++) {
    const s = `${year}-${String(m + 1).padStart(2, '0')}-01`
    const e = `${year}-${String(m + 1).padStart(2, '0')}-31`
    const [exp, sav] = await Promise.all([
      window.api.getTotalByRange(s, e),
      window.api.getSavingsTotalByRange(s, e)
    ])
    months.push({ name: names[m], expenses: exp, savings: sav, balance: sav - exp })
  }
  yearRows.value = months
}

async function loadComparison(now) {
  const currStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const currEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`

  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevStart = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-01`
  const prevEnd = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-31`

  const [ce, pe, cs, ps, cd, pd] = await Promise.all([
    window.api.getTotalByRange(currStart, currEnd),
    window.api.getTotalByRange(prevStart, prevEnd),
    window.api.getSavingsTotalByRange(currStart, currEnd),
    window.api.getSavingsTotalByRange(prevStart, prevEnd),
    window.api.getDebtTotalByRange(currStart, currEnd),
    window.api.getDebtTotalByRange(prevStart, prevEnd)
  ])

  compare.value = {
    currExpenses: ce, prevExpenses: pe,
    currSavings: cs, prevSavings: ps,
    currDebt: cd, prevDebt: pd
  }
}

async function renderChart(expByDate, savByDate) {
  if (barChart) { barChart.destroy(); barChart = null }
  if (!chartEl.value) return

  const mapExp = new Map(expByDate.map(d => [d.date, d.total]))
  const mapSav = new Map(savByDate.map(d => [d.date, d.total]))
  const allDates = [...new Set([...mapExp.keys(), ...mapSav.keys()])].sort()

  const p = periodType.value
  let labels, expVals, savVals

  if (p === 'day') {
    labels = ['Сегодня']
    expVals = [expensesTotal.value]
    savVals = [savingsTotal.value]
  } else if (p === 'week') {
    labels = allDates
    expVals = allDates.map(d => mapExp.get(d) || 0)
    savVals = allDates.map(d => mapSav.get(d) || 0)
  } else if (p === 'month') {
    labels = allDates
    expVals = allDates.map(d => mapExp.get(d) || 0)
    savVals = allDates.map(d => mapSav.get(d) || 0)
  } else {
    const monthNames = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']
    const expByMonth = await window.api.getExpensesGroupedByMonth(
      `${new Date().getFullYear()}-01-01`, `${new Date().getFullYear()}-12-31`
    )
    const savByMonth = await window.api.getSavingsGroupedByMonth(
      `${new Date().getFullYear()}-01-01`, `${new Date().getFullYear()}-12-31`
    )
    const mExp = new Map(expByMonth.map(d => [d.month, d.total]))
    const mSav = new Map(savByMonth.map(d => [d.month, d.total]))
    labels = monthNames
    const yr = new Date().getFullYear()
    expVals = monthNames.map((_, i) => mExp.get(`${yr}-${String(i + 1).padStart(2, '0')}`) || 0)
    savVals = monthNames.map((_, i) => mSav.get(`${yr}-${String(i + 1).padStart(2, '0')}`) || 0)
  }

  barChart = new Chart(chartEl.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Траты', data: expVals, backgroundColor: 'rgba(231,76,60,0.7)', borderRadius: 4 },
        { label: 'Копилка', data: savVals, backgroundColor: 'rgba(46,204,113,0.7)', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#ccc', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#aaa', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y: { ticks: { color: '#aaa', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.06)' } }
      }
    }
  })
}

function renderCategoryChart(expByCat) {
  if (doughnutChart) { doughnutChart.destroy(); doughnutChart = null }
  if (!catChartEl.value || !expByCat.length) return

  doughnutChart = new Chart(catChartEl.value, {
    type: 'doughnut',
    data: {
      labels: expByCat.map(c => c.name),
      datasets: [{
        data: expByCat.map(c => c.total),
        backgroundColor: expByCat.map(c => c.color || '#888'),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: { position: 'right', labels: { color: '#ccc', font: { size: 11 }, padding: 8 } }
      }
    }
  })
}

function deltaText(curr, prev) {
  if (!prev) return curr > 0 ? '+∞' : '—'
  if (!curr && !prev) return '—'
  const diff = curr - prev
  const pct = Math.round(Math.abs(diff) / prev * 100)
  if (diff === 0) return '—'
  return (diff > 0 ? '▲ +' : '▼ -') + pct + '%'
}

function deltaClass(curr, prev, invert) {
  if (!prev || curr === prev) return ''
  const more = curr > prev
  if (invert) return more ? 'red' : 'green'
  return more ? 'green' : 'red'
}

onMounted(() => loadStats())

watch(periodType, () => loadStats())

onBeforeUnmount(() => {
  if (barChart) barChart.destroy()
  if (doughnutChart) doughnutChart.destroy()
})
</script>

<style scoped>
.stats-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  color: var(--text, #ddd);
  font-size: 13px;
}

.period-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-input, #1e1e2e);
  border-radius: 10px;
  padding: 4px;
}
.tab {
  flex: 1;
  padding: 6px 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #aaa;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.tab.active {
  background: var(--accent, #6c5ce7);
  color: #fff;
}

.summary-cards {
  display: flex;
  gap: 10px;
}
.sum-card {
  flex: 1;
  background: var(--bg-input, #1e1e2e);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sum-card .label { font-size: 12px; color: #888; }
.sum-card .amount { font-size: 18px; font-weight: 700; }
.sum-card.expenses .amount { color: #e74c3c; }
.sum-card.savings .amount { color: #2ecc71; }
.sum-card .percent { font-size: 12px; color: #666; }

.meta-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.meta-item {
  background: var(--bg-input, #1e1e2e);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.meta-label { font-size: 11px; color: #888; }
.meta-value { font-size: 15px; font-weight: 600; }

.budget-bar-box {
  background: var(--bg-input, #1e1e2e);
  border-radius: 10px;
  padding: 12px;
}
.budget-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 6px;
}
.budget-track {
  height: 6px;
  background: #333;
  border-radius: 3px;
  overflow: hidden;
}
.budget-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.chart-box {
  background: var(--bg-input, #1e1e2e);
  border-radius: 10px;
  padding: 12px;
}
.chart-box h3 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
}
.canvas-wrap {
  position: relative;
  width: 100%;
}

.year-summary-box {
  background: var(--bg-input, #1e1e2e);
  border-radius: 10px;
  padding: 12px;
}
.year-summary-box h3 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
}
.year-table {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.year-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr;
  padding: 5px 4px;
  font-size: 12px;
  border-radius: 4px;
}
.year-row:nth-child(even) { background: rgba(255,255,255,0.03); }
.year-header { color: #888; font-weight: 600; margin-bottom: 2px; }
.red { color: #e74c3c; }
.green { color: #2ecc71; }

.compare-box {
  background: var(--bg-input, #1e1e2e);
  border-radius: 10px;
  padding: 12px;
}
.compare-box h3 {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
}
.compare-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 8px;
}
.compare-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.compare-label { font-size: 11px; color: #888; }
.compare-val { font-size: 14px; font-weight: 600; }
.delta { font-size: 11px; font-weight: 600; }
.delta.red { color: #e74c3c; }
.delta.green { color: #2ecc71; }
</style>
