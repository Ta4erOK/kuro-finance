<script setup>
import { ref, onMounted } from 'vue'

const expenses = ref([])
const categories = ref([])
const amount = ref('')
const note = ref('')
const selectedCat = ref('')
const selectedDate = ref(new Date().toISOString().slice(0, 10))
const showCatForm = ref(false)
const newCatName = ref('')
const loading = ref(false)
const editingId = ref(null)
const editAmount = ref('')
const editNote = ref('')
const editCat = ref('')
const editDate = ref('')

const dayTotal = ref(0)

async function load() {
  loading.value = true
  try {
    expenses.value = await window.api.getExpenses(selectedDate.value)
    categories.value = await window.api.getCategories()
    dayTotal.value = expenses.value.reduce((s, e) => s + e.amount, 0)
  } catch (e) { console.error(e) }
  loading.value = false
}

function prevDay() {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() - 1)
  selectedDate.value = d.toISOString().slice(0, 10)
  load()
}

function nextDay() {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() + 1)
  selectedDate.value = d.toISOString().slice(0, 10)
  load()
}

async function addExpense() {
  if (!amount.value || !selectedCat.value) return
  try {
    await window.api.addExpense(selectedCat.value, parseFloat(amount.value), note.value, selectedDate.value)
    amount.value = ''
    note.value = ''
    await load()
    notifyChange()
  } catch (e) { console.error(e) }
}

async function addCategory() {
  if (!newCatName.value.trim()) return
  try {
    await window.api.addCategory(newCatName.value.trim())
    newCatName.value = ''
    showCatForm.value = false
    await load()
  } catch (e) { console.error(e) }
}

async function removeExpense(id) {
  try {
    await window.api.removeExpense(id)
    await load()
    notifyChange()
  } catch (e) { console.error(e) }
}

function startEdit(exp) {
  editingId.value = exp.id
  editAmount.value = exp.amount
  editNote.value = exp.note || ''
  editCat.value = exp.category_id
  editDate.value = exp.date
}

function cancelEdit() {
  editingId.value = null
}

async function saveEdit(id) {
  if (!editAmount.value || !editCat.value) return
  try {
    await window.api.updateExpense(id, editCat.value, parseFloat(editAmount.value), editNote.value, editDate.value)
    editingId.value = null
    await load()
    notifyChange()
  } catch (e) { console.error(e) }
}

function notifyChange() {
  try { window.api.notifyChange() } catch {}
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtMoney(v) {
  return v.toLocaleString('ru-RU', { minimumFractionDigits: 2 }) + ' ₽'
}

function catName(id) {
  const c = categories.value.find(c => c.id === id)
  return c ? c.name : '—'
}

onMounted(load)
</script>

<template>
  <div class="expenses-view">
    <div class="date-nav">
      <button class="nav-btn" @click="prevDay">◀</button>
      <span class="nav-date">{{ fmtDate(selectedDate) }}</span>
      <button class="nav-btn" @click="nextDay">▶</button>
    </div>

    <div class="add-form">
      <div class="form-row">
        <input class="input" type="number" v-model="amount" placeholder="Сумма" min="0" step="0.01" />
        <select class="input" v-model="selectedCat">
          <option value="" disabled>Категория</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div class="form-row">
        <input class="input" type="text" v-model="note" placeholder="Заметка" />
        <button class="btn-add" @click="addExpense">Добавить</button>
      </div>
      <div class="cat-toggle" @click="showCatForm = !showCatForm">+ новая категория</div>
      <div v-if="showCatForm" class="cat-form">
        <input class="input" type="text" v-model="newCatName" placeholder="Название" />
        <button class="btn-small" @click="addCategory">OK</button>
      </div>
    </div>

    <div class="exp-list" v-if="expenses.length">
      <div v-for="exp in expenses" :key="exp.id">
        <div v-if="editingId !== exp.id" class="exp-item">
          <div class="exp-main">
            <span class="exp-cat">{{ catName(exp.category_id) }}</span>
            <span class="exp-note" v-if="exp.note">{{ exp.note }}</span>
          </div>
          <div class="exp-bottom">
            <span class="exp-amount">{{ fmtMoney(exp.amount) }}</span>
            <div class="exp-actions">
              <button class="btn-icon" @click="startEdit(exp)">✎</button>
              <button class="btn-icon btn-red" @click="removeExpense(exp.id)">✕</button>
            </div>
          </div>
        </div>
        <div v-else class="exp-item editing">
          <div class="edit-row">
            <input class="input" type="number" v-model="editAmount" placeholder="Сумма" step="0.01" />
            <select class="input" v-model="editCat">
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="edit-row">
            <input class="input" type="text" v-model="editNote" placeholder="Заметка" />
            <input class="input" type="date" v-model="editDate" />
          </div>
          <div class="edit-actions">
            <button class="btn-small btn-ok" @click="saveEdit(exp.id)">OK</button>
            <button class="btn-small" @click="cancelEdit">Отмена</button>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty" v-show="!loading">Нет расходов</div>

    <div class="day-total" v-if="expenses.length">
      Итого: {{ fmtMoney(dayTotal) }}
    </div>
  </div>
</template>

<style scoped>
.expenses-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.date-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.nav-btn {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 16px;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}
.nav-btn:hover {
  background: var(--bg-input);
  color: var(--text);
}

.nav-date {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  min-width: 100px;
  text-align: center;
}

.add-form {
  background: var(--bg-input);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: flex;
  gap: 8px;
}

.form-row .input {
  flex: 1;
}

.input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 8px;
  color: var(--text);
  font-size: 13px;
  outline: none;
  width: 100%;
  transition: border-color 0.15s;
}
.input:focus {
  border-color: var(--accent);
}

.btn-add {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.btn-add:hover { opacity: 0.85; }

.btn-small {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-small:hover { background: var(--border); }

.btn-ok {
  background: var(--green);
  color: #fff;
  border: none;
}
.btn-ok:hover { opacity: 0.85; }

.cat-toggle {
  font-size: 12px;
  color: var(--accent);
  cursor: pointer;
  user-select: none;
  padding: 2px 0;
}
.cat-toggle:hover { opacity: 0.8; }

.cat-form {
  display: flex;
  gap: 8px;
}

.cat-form .input {
  flex: 1;
}

.exp-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.exp-item {
  background: var(--bg-input);
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.exp-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.exp-cat {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.exp-note {
  font-size: 12px;
  color: var(--text-dim);
}

.exp-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exp-amount {
  font-size: 14px;
  font-weight: 700;
  color: var(--accent);
}

.exp-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 14px;
  cursor: pointer;
  padding: 2px 5px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}
.btn-icon:hover {
  background: var(--border);
  color: var(--text);
}

.btn-red:hover {
  color: var(--red);
}

.exp-item.editing {
  gap: 6px;
}

.edit-row {
  display: flex;
  gap: 8px;
}

.edit-row .input {
  flex: 1;
}

.edit-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.empty {
  text-align: center;
  color: var(--text-dim);
  font-size: 13px;
  padding: 20px 0;
}

.day-total {
  background: var(--bg);
  border-radius: 10px;
  padding: 10px;
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  color: var(--accent);
}
</style>
