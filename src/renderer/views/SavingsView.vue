<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const todayStr = new Date().toISOString().slice(0, 10)

const savingsToday = ref([])
const todaySaved = ref(0)
const totalSaved = ref(0)
const viewDate = ref(todayStr)

const formAmount = ref('')
const formNote = ref('')

async function load() {
  try {
    totalSaved.value = await window.api.getSavingsTotal()
    await loadDate()
  } catch (e) {
    console.error('[kuro] SavingsView load error:', e)
  }
}

async function loadDate() {
  savingsToday.value = await window.api.getSavingsByDate(viewDate.value)
  todaySaved.value = await window.api.getSavingsTotalByDate(viewDate.value)
}

function notifyChange() {
  window.dispatchEvent(new CustomEvent('kuro:data-changed'))
}

async function addSaving() {
  const amount = parseFloat(formAmount.value)
  if (!amount || amount <= 0) return
  await window.api.addSaving(amount, formNote.value.trim(), viewDate.value)
  formAmount.value = ''
  formNote.value = ''
  await load()
  notifyChange()
}

async function removeSaving(id) {
  await window.api.deleteSaving(id)
  await load()
  notifyChange()
}

const isToday = computed(() => viewDate.value === todayStr)

function shiftDay(delta) {
  const d = new Date(viewDate.value + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  viewDate.value = d.toISOString().slice(0, 10)
  loadDate()
}

function formatDateLabel() {
  const d = new Date(viewDate.value + 'T12:00:00')
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function money(v) {
  return Number(v || 0).toLocaleString('ru-RU') + ' ₽'
}

onMounted(load)
watch(viewDate, () => loadDate())
</script>

<template>
  <div class="savings">
    <!-- Общая сумма -->
    <div class="total-card">
      <div class="total-label">Накоплено всего</div>
      <div class="total-value">{{ money(totalSaved) }}</div>
      <div class="total-sub">сегодня {{ money(todaySaved) }}</div>
    </div>

    <!-- Выбор даты -->
    <div class="date-nav">
      <button class="date-btn" @click="shiftDay(-1)">◀</button>
      <div class="date-label">{{ formatDateLabel() }} <span v-if="!isToday" class="date-not-today">(не сегодня)</span></div>
      <button class="date-btn" @click="shiftDay(1)" :disabled="isToday">▶</button>
    </div>

    <!-- Форма -->
    <div class="add-form">
      <input
        v-model="formAmount"
        type="number"
        step="0.01"
        min="0"
        placeholder="Сколько положил ₽"
        class="input"
        @keyup.enter="addSaving"
      />
      <button class="btn-add" @click="addSaving">Положить</button>
    </div>
    <input
      v-model="formNote"
      type="text"
      placeholder="Комментарий (опц.)"
      class="input note-input"
      @keyup.enter="addSaving"
    />

    <!-- Записи дня -->
    <div class="sav-list">
      <div v-if="!savingsToday.length" class="empty">Нет записей за этот день</div>
      <div v-for="s in savingsToday" :key="s.id" class="sav-item">
        <div class="sav-info">
          <span class="sav-amount">+{{ money(s.amount) }}</span>
          <span v-if="s.note" class="sav-note">{{ s.note }}</span>
        </div>
        <button class="del-btn" @click="removeSaving(s.id)">✕</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.savings { display: flex; flex-direction: column; height: 100%; gap: 8px; }

.total-card {
  background: linear-gradient(135deg, #2d2d44, #1f2740);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  text-align: center;
}
.total-label { font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; }
.total-value {
  font-size: 26px; font-weight: 800; color: var(--green);
  margin: 4px 0;
}
.total-sub { font-size: 11px; color: var(--text-dim); }

.date-nav {
  display: flex; align-items: center; justify-content: space-between;
}
.date-btn {
  width: 26px; height: 26px; border-radius: 8px;
  background: var(--bg-input); color: var(--text); font-size: 11px;
}
.date-btn:disabled { opacity: 0.3; cursor: default; }
.date-label { font-size: 13px; font-weight: 600; text-transform: capitalize; }
.date-not-today { font-size: 10px; color: var(--text-dim); font-weight: 400; }

.add-form {
  background: var(--bg-input);
  border-radius: 10px;
  padding: 10px;
  display: flex; gap: 6px; margin-bottom: 4px;
}
.add-form .input { flex: 1; }
.btn-add {
  background: var(--green); color: #fff;
  border-radius: 8px; padding: 0 16px; font-size: 12px; font-weight: 600;
  transition: 0.15s;
}
.btn-add:hover { opacity: 0.85; }

.input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  color: var(--text);
  font-size: 13px;
  width: 100%;
}
.input::placeholder { color: var(--text-dim); }
.input:focus { border-color: var(--accent); }

.sav-list {
  flex: 1; overflow-y: auto;
  display: flex; flex-direction: column; gap: 4px;
}
.empty { color: var(--text-dim); font-size: 12px; text-align: center; padding: 20px 0; }
.sav-item {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--bg); border-radius: 8px; padding: 8px 10px;
}
.sav-info { display: flex; align-items: center; gap: 8px; }
.sav-amount { font-size: 13px; font-weight: 700; color: var(--green); }
.sav-note { font-size: 11px; color: var(--text-dim); }
.del-btn { color: var(--text-dim); font-size: 11px; padding: 2px 4px; border-radius: 4px; }
.del-btn:hover { color: var(--red); background: var(--bg-input); }
</style>