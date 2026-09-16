<script setup>
import { ref, onMounted } from 'vue'
import ExpensesView from './views/ExpensesView.vue'
import SavingsView from './views/SavingsView.vue'
import DebtsView from './views/DebtsView.vue'
import StatsView from './views/StatsView.vue'
import SettingsView from './views/SettingsView.vue'

const tab = ref('expenses')
const monthExpenses = ref(0)
const monthSavings = ref(0)
const monthIncome = ref(0)
const budgetLimit = ref(0)
const totalDebt = ref(0)

async function refreshMonthHeader() {
  try {
    const now = new Date()
    const s = await window.api.getMonthSummary(now.getFullYear(), now.getMonth() + 1)
    monthExpenses.value = s.expenses
    monthSavings.value = s.savings
    monthIncome.value = Number(await window.api.getSetting('income', '0')) || 0
    budgetLimit.value = Number(await window.api.getSetting('budget_limit', '0')) || 0
    const debts = await window.api.getDebts()
    totalDebt.value = debts.reduce((sum, d) => sum + d.total - d.repaid, 0)
  } catch (e) {
    console.error('[kuro] refreshMonthHeader error:', e)
  }
}

function formatMoney(v) {
  return Number(v || 0).toLocaleString('ru-RU') + ' ₽'
}

function limitPercent() {
  if (!budgetLimit.value) return 0
  return Math.min(100, Math.round((monthExpenses.value / budgetLimit.value) * 100))
}

function limitColor() {
  const p = limitPercent()
  if (p >= 100) return '#ef4444'
  if (p >= 75) return '#f59e0b'
  return '#10b981'
}

function switchTab(t) {
  tab.value = t
  refreshMonthHeader()
}

function winMin() { window.api.winMinimize() }
function winClose() { window.api.winClose() }

async function applyTheme() {
  const theme = await window.api.getSetting('theme', 'dark')
  document.documentElement.setAttribute('data-theme', theme)
}

onMounted(() => {
  applyTheme()
  refreshMonthHeader()
})
window.addEventListener('kuro:data-changed', refreshMonthHeader)
</script>

<template>
  <div class="app">
    <header class="titlebar">
      <div class="titlebar-left">
        <div class="title-text">
          <div class="title-name">KURO FINANCE</div>
          <div class="title-date">{{ new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' }) }}</div>
        </div>
      </div>
      <div class="titlebar-btns">
        <button class="win-btn" @click="winMin">—</button>
        <button class="win-btn win-close" @click="winClose">✕</button>
      </div>
    </header>

    <!-- Сводка за месяц -->
    <div class="month-summary">
      <div class="ms-block">
        <span class="ms-label">Траты</span>
        <span class="ms-value ms-red">{{ formatMoney(monthExpenses) }}</span>
      </div>
      <div class="ms-divider"></div>
      <div class="ms-block">
        <span class="ms-label">Копилка</span>
        <span class="ms-value ms-green">{{ formatMoney(monthSavings) }}</span>
      </div>
      <div class="ms-divider"></div>
      <div class="ms-block">
        <span class="ms-label">Доход</span>
        <span class="ms-value">{{ formatMoney(monthIncome) }}</span>
      </div>
      <div class="ms-divider" v-if="totalDebt > 0"></div>
      <div class="ms-block" v-if="totalDebt > 0">
        <span class="ms-label">Долг</span>
        <span class="ms-value ms-orange">{{ formatMoney(totalDebt) }}</span>
      </div>
    </div>

    <!-- Лимит бюджета -->
    <div v-if="budgetLimit > 0" class="budget-bar">
      <div class="budget-fill" :style="{ width: limitPercent() + '%', background: limitColor() }"></div>
      <div class="budget-text">
        <span>Лимит {{ formatMoney(budgetLimit) }}</span>
        <span :style="{ color: limitColor() }">{{ limitPercent() }}%</span>
      </div>
    </div>

    <!-- Табы -->
    <nav class="tabs">
      <button class="tab" :class="{ active: tab === 'expenses' }" @click="switchTab('expenses')">Траты</button>
      <button class="tab" :class="{ active: tab === 'savings' }" @click="switchTab('savings')">Копилка</button>
      <button class="tab" :class="{ active: tab === 'debts' }" @click="switchTab('debts')">Долги</button>
      <button class="tab" :class="{ active: tab === 'stats' }" @click="switchTab('stats')">Статистика</button>
      <button class="tab" :class="{ active: tab === 'settings' }" @click="switchTab('settings')">Настр.</button>
    </nav>

    <!-- Контент -->
    <main class="content">
      <ExpensesView v-if="tab === 'expenses'" />
      <SavingsView v-else-if="tab === 'savings'" />
      <DebtsView v-else-if="tab === 'debts'" />
      <StatsView v-else-if="tab === 'stats'" />
      <SettingsView v-else />
    </main>
  </div>
</template>

<style scoped>
.app { display: flex; flex-direction: column; height: 100%; }

.titlebar {
  -webkit-app-region: drag;
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px 4px;
}
.titlebar-left { display: flex; align-items: center; }
.title-name { font-size: 14px; font-weight: 700; letter-spacing: 1px; }
.title-date { font-size: 11px; color: var(--text-dim); text-transform: capitalize; }

.titlebar-btns { -webkit-app-region: no-drag; display: flex; gap: 4px; }
.win-btn {
  width: 24px; height: 24px; border-radius: 6px;
  color: var(--text-dim); font-size: 12px;
  display: flex; align-items: center; justify-content: center;
  transition: 0.15s;
}
.win-btn:hover { background: var(--bg-card); color: var(--text); }
.win-close:hover { background: var(--red); color: #fff; }

.month-summary {
  display: flex; align-items: center; justify-content: space-around;
  padding: 8px 14px; background: var(--bg-card); border-radius: 10px;
  margin: 6px 10px;
}
.ms-block { display: flex; flex-direction: column; align-items: center; gap: 1px; flex: 1; }
.ms-divider { width: 1px; height: 24px; background: var(--border); }
.ms-label { font-size: 9px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px; }
.ms-value { font-size: 11px; font-weight: 700; }
.ms-red { color: var(--red); }
.ms-green { color: var(--green); }
.ms-orange { color: #f59e0b; }

/* Лимит */
.budget-bar {
  position: relative;
  margin: 4px 10px;
  height: 18px;
  background: var(--bg-card);
  border-radius: 9px;
  overflow: hidden;
}
.budget-fill {
  height: 100%;
  border-radius: 9px;
  transition: width 0.5s, background 0.3s;
}
.budget-text {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
  font-size: 9px;
  font-weight: 600;
  color: var(--text);
}

/* Табы */
.tabs {
  display: flex; gap: 0; padding: 0 10px;
  border-bottom: 1px solid var(--border);
}
.tab {
  flex: 1; padding: 10px 4px; text-align: center;
  font-size: 11px; font-weight: 500;
  color: var(--text-dim);
  background: transparent;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  transition: color 0.15s, border-color 0.15s;
}
.tab:hover { color: var(--text); }
.tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  font-weight: 600;
}

.content {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  padding: 10px;
  min-width: 0;
}
</style>