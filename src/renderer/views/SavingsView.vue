<template>
  <div class="savings-view">
    <div class="total-card">
      <div class="total-label">Накоплено всего</div>
      <div class="total-value">{{ money(totalSaved) }}</div>
      <div class="total-today">сегодня: {{ money(totalToday) }}</div>
    </div>

    <div class="section goals-section">
      <div class="section-header">
        <h3>Цели</h3>
        <button class="btn-small" @click="showGoalForm = !showGoalForm">+</button>
      </div>

      <div v-if="showGoalForm" class="goal-form">
        <input v-model="goalName" placeholder="Цель" class="input" />
        <input v-model.number="goalTarget" type="number" placeholder="Сумма" class="input input-short" />
        <button class="btn-add" @click="addGoal">Добавить</button>
      </div>

      <div v-if="!goals.length && !showGoalForm" class="empty-hint">Нет целей</div>

      <div v-for="g in goals" :key="g.id" class="goal-item">
        <div class="goal-top">
          <span class="goal-name">{{ g.name }}</span>
          <span class="goal-target">{{ money(g.target) }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: goalPercent(g) + '%' }"></div>
        </div>
        <div class="goal-actions">
          <button class="btn-ghost" @click="editGoalStart(g)">✎</button>
          <button class="btn-ghost btn-danger" @click="removeGoal(g.id)">✕</button>
        </div>

        <div v-if="editingGoalId === g.id" class="goal-form goal-edit-form">
          <input v-model="editGoalName" class="input" placeholder="Название" />
          <input v-model.number="editGoalTarget" type="number" class="input input-short" placeholder="Сумма" />
          <button class="btn-add" @click="saveGoal">OK</button>
          <button class="btn-ghost" @click="editingGoalId = null">Отмена</button>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="date-nav">
        <button class="btn-ghost" @click="shiftDay(-1)">◀</button>
        <span class="date-label">{{ formatDateLabel() }}</span>
        <button class="btn-ghost" @click="shiftDay(1)" :disabled="isToday">▶</button>
      </div>

      <div class="add-form">
        <input v-model.number="newAmount" type="number" placeholder="Сумма" class="input" />
        <input v-model="newNote" placeholder="Заметка" class="input input-note" />
        <button class="btn-add" @click="addEntry">Положить</button>
      </div>

      <div v-if="!entries.length" class="empty-hint">Нет записей</div>

      <div v-for="e in entries" :key="e.id" class="entry-item">
        <template v-if="editingId === e.id">
          <div class="entry-edit">
            <input v-model.number="editAmount" type="number" class="input" />
            <input v-model="editNote" class="input" placeholder="Заметка" />
            <input v-model="editDate" type="date" class="input input-date" />
            <button class="btn-add" @click="saveEntry(e.id)">OK</button>
            <button class="btn-ghost" @click="cancelEdit">Отмена</button>
          </div>
        </template>
        <template v-else>
          <div class="entry-info">
            <span class="entry-amount">+{{ money(e.amount) }}</span>
            <span v-if="e.note" class="entry-note">{{ e.note }}</span>
            <span class="entry-date-small">{{ e.date }}</span>
          </div>
          <div class="entry-actions">
            <button class="btn-ghost" @click="startEdit(e)">✎</button>
            <button class="btn-ghost btn-danger" @click="removeEntry(e.id)">✕</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const totalSaved = ref(0)
const totalToday = ref(0)
const goals = ref([])
const entries = ref([])

const viewDate = ref(todayStr())
const editingId = ref(null)
const editAmount = ref(0)
const editNote = ref('')
const editDate = ref('')
const editingGoalId = ref(null)
const editGoalName = ref('')
const editGoalTarget = ref(0)

const newAmount = ref(null)
const newNote = ref('')
const goalName = ref('')
const goalTarget = ref(null)
const showGoalForm = ref(false)

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

const isToday = computed(() => viewDate.value === todayStr())

function money(v) {
  return Number(v).toLocaleString('ru-RU') + ' ₽'
}

function goalPercent(g) {
  if (!g.target || g.target <= 0) return 0
  return Math.min((totalSaved.value / g.target) * 100, 100)
}

function shiftDay(delta) {
  const d = new Date(viewDate.value)
  d.setDate(d.getDate() + delta)
  viewDate.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function formatDateLabel() {
  const parts = viewDate.value.split('-')
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
  return parseInt(parts[2]) + ' ' + months[parseInt(parts[1]) - 1] + ' ' + parts[0]
}

async function load() {
  try {
    totalSaved.value = await window.api.getSavingsTotal()
    totalToday.value = await window.api.getSavingsTotalByDate(todayStr())
    goals.value = await window.api.getGoals()
    entries.value = await window.api.getSavingsByDate(viewDate.value)
  } catch (err) {
    console.error('Savings load error:', err)
  }
}

function notifyChange() {
  window.dispatchEvent(new CustomEvent('kuro:data-changed'))
}

async function addEntry() {
  if (!newAmount.value || newAmount.value <= 0) return
  try {
    await window.api.addSaving(newAmount.value, newNote.value || '', viewDate.value)
    newAmount.value = null
    newNote.value = ''
    await load()
    notifyChange()
  } catch (err) {
    console.error(err)
  }
}

function startEdit(e) {
  editingId.value = e.id
  editAmount.value = e.amount
  editNote.value = e.note || ''
  editDate.value = e.date
}

function cancelEdit() {
  editingId.value = null
}

async function saveEntry(id) {
  try {
    await window.api.updateSaving(id, editAmount.value, editNote.value, editDate.value)
    editingId.value = null
    await load()
    notifyChange()
  } catch (err) {
    console.error(err)
  }
}

async function removeEntry(id) {
  try {
    await window.api.deleteSaving(id)
    await load()
    notifyChange()
  } catch (err) {
    console.error(err)
  }
}

async function addGoal() {
  if (!goalName.value || !goalTarget.value || goalTarget.value <= 0) return
  try {
    await window.api.addGoal(goalName.value, goalTarget.value)
    goalName.value = ''
    goalTarget.value = null
    showGoalForm.value = false
    await load()
    notifyChange()
  } catch (err) {
    console.error(err)
  }
}

function editGoalStart(g) {
  editingGoalId.value = g.id
  editGoalName.value = g.name
  editGoalTarget.value = g.target
}

async function saveGoal() {
  try {
    await window.api.updateGoal(editingGoalId.value, editGoalName.value, editGoalTarget.value)
    editingGoalId.value = null
    await load()
    notifyChange()
  } catch (err) {
    console.error(err)
  }
}

async function removeGoal(id) {
  try {
    await window.api.deleteGoal(id)
    await load()
    notifyChange()
  } catch (err) {
    console.error(err)
  }
}

onMounted(load)

const stopWatch = null
import { watch } from 'vue'
watch(viewDate, () => { load() })
</script>

<script>
export default { name: 'SavingsView' }
</script>

<style scoped>
.savings-view {
  --bg: #1a1d28;
  --bg-input: #252836;
  --border: #363a4f;
  --accent: #6c5ce7;
  --green: #2ed573;
  --red: #ff4757;
  --text: #e4e6f0;
  --text-dim: #8b8fa3;

  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: inherit;
  color: var(--text);
}

.total-card {
  background: linear-gradient(135deg, #2d2d44, #1f2740);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.total-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-dim);
}

.total-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--green);
  margin: 6px 0;
}

.total-today {
  font-size: 13px;
  color: var(--text-dim);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-header h3 {
  margin: 0;
  font-size: 15px;
  color: var(--text);
}

.goal-form {
  display: flex;
  gap: 8px;
  align-items: center;
}

.goal-edit-form {
  margin-top: 6px;
}

.goal-item {
  background: var(--bg-input);
  border-radius: 8px;
  padding: 10px 12px;
}

.goal-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 13px;
}

.goal-name {
  font-weight: 600;
}

.goal-target {
  color: var(--text-dim);
}

.progress-bar {
  height: 6px;
  background: var(--bg);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
  transition: width 0.3s;
}

.goal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 6px;
}

.date-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.date-label {
  font-size: 14px;
  min-width: 140px;
  text-align: center;
  font-weight: 600;
}

.add-form {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  color: var(--text);
  font-size: 13px;
  outline: none;
  flex: 1;
}

.input:focus {
  border-color: var(--accent);
}

.input-short {
  flex: 0 0 120px;
}

.input-note {
  flex: 1;
}

.input-date {
  flex: 0 0 140px;
}

.btn-add {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-add:hover {
  opacity: 0.85;
}

.btn-small {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  width: 26px;
  height: 26px;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.btn-small:hover {
  opacity: 0.85;
}

.btn-ghost {
  background: none;
  color: var(--text-dim);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 13px;
  cursor: pointer;
}

.btn-ghost:hover {
  color: var(--text);
  border-color: var(--text-dim);
}

.btn-ghost:disabled {
  opacity: 0.3;
  cursor: default;
}

.btn-danger:hover {
  color: var(--red);
  border-color: var(--red);
}

.entry-item {
  background: var(--bg-input);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.entry-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.entry-amount {
  color: var(--green);
  font-weight: 600;
}

.entry-note {
  color: var(--text-dim);
}

.entry-date-small {
  color: var(--text-dim);
  font-size: 11px;
}

.entry-actions {
  display: flex;
  gap: 4px;
}

.entry-edit {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 100%;
}

.empty-hint {
  text-align: center;
  color: var(--text-dim);
  font-size: 13px;
  padding: 12px 0;
}
</style>
