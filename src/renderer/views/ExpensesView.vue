<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const todayStr = new Date().toISOString().slice(0, 10)

const categories = ref([])
const expenses = ref([])
const dayTotal = ref(0)
const showNewCat = ref(false)
const newCatName = ref('')

const formAmount = ref('')
const formCategory = ref(null)
const formNote = ref('')

const viewDate = ref(todayStr)

async function load() {
  try {
    const cats = await window.api.getCategories()
    categories.value = cats
    if (cats.length && !formCategory.value) {
      formCategory.value = cats[0].id
    }
    await loadDate()
  } catch (e) {
    console.error('[kuro] ExpensesView load error:', e)
  }
}

async function loadDate() {
  expenses.value = await window.api.getExpensesByDate(viewDate.value)
  dayTotal.value = await window.api.getTotalByDate(viewDate.value)
}

function notifyChange() {
  window.dispatchEvent(new CustomEvent('kuro:data-changed'))
}

async function addExpense() {
  const amount = parseFloat(formAmount.value)
  if (!amount || amount <= 0) return
  if (!formCategory.value) return
  await window.api.addExpense(formCategory.value, amount, formNote.value.trim(), viewDate.value)
  formAmount.value = ''
  formNote.value = ''
  await loadDate()
  notifyChange()
}

async function addCategory() {
  const name = newCatName.value.trim()
  if (!name) return
  const res = await window.api.addCategory(name)
  if (!res.exists) {
    showNewCat.value = false
    newCatName.value = ''
  }
  const cats = await window.api.getCategories()
  categories.value = cats
  formCategory.value = res.id
}

async function removeExpense(id) {
  await window.api.deleteExpense(id)
  await loadDate()
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
  <div class="expenses">
    <!-- Навигация по дате -->
    <div class="date-nav">
      <button class="date-btn" @click="shiftDay(-1)">◀</button>
      <div class="date-label">{{ formatDateLabel() }} <span v-if="!isToday" class="date-not-today">(не сегодня)</span></div>
      <button class="date-btn" @click="shiftDay(1)" :disabled="isToday">▶</button>
    </div>

    <!-- Форма добавления траты -->
    <div class="add-form">
      <div class="form-row">
        <input
          v-model="formAmount"
          type="number"
          step="0.01"
          min="0"
          placeholder="Сумма ₽"
          class="input amount-input"
          @keyup.enter="addExpense"
        />
        <select v-model="formCategory" class="input cat-select">
          <option v-if="!categories.length" value="" disabled>Добавь категорию</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <button class="btn-add" @click="addExpense" :disabled="!formAmount || !formCategory">Добавить</button>
      </div>
      <div class="form-row">
        <input
          v-model="formNote"
          type="text"
          placeholder="Комментарий (необязательно)"
          class="input note-input"
          @keyup.enter="addExpense"
        />
      </div>
    </div>

    <!-- Категория -->
    <div class="new-cat-row">
      <button v-if="!showNewCat" class="link-btn" @click="showNewCat = true">+ новая категория</button>
      <div v-else class="new-cat-form">
        <input v-model="newCatName" type="text" placeholder="Название" class="input" @keyup.enter="addCategory" />
        <button class="btn-small" @click="addCategory">OK</button>
        <button class="btn-small btn-cancel" @click="showNewCat = false; newCatName = ''">✕</button>
      </div>
    </div>

    <!-- Список трат дня -->
    <div class="exp-list">
      <div v-if="!expenses.length" class="empty">Пока пусто. Зафиксируй трату ↑</div>
      <div v-for="e in expenses" :key="e.id" class="exp-item">
        <span class="exp-dot" :style="{ background: e.category_color }"></span>
        <div class="exp-info">
          <div class="exp-name">{{ e.category_name }}</div>
          <div v-if="e.note" class="exp-note">{{ e.note }}</div>
        </div>
        <span class="exp-amount">−{{ money(e.amount) }}</span>
        <button class="del-btn" @click="removeExpense(e.id)">✕</button>
      </div>
    </div>

    <!-- Итог за день -->
    <div class="day-total">
      <span>Итого за день</span>
      <span class="day-total-value">−{{ money(dayTotal) }}</span>
    </div>
  </div>
</template>

<style scoped>
.expenses { display: flex; flex-direction: column; height: 100%; gap: 8px; }

.date-nav {
  display: flex; align-items: center; justify-content: space-between;
}
.date-btn {
  width: 30px; height: 30px; border-radius: 8px;
  background: var(--bg-input); color: var(--text);
  font-size: 12px; transition: 0.15s;
}
.date-btn:hover { background: var(--border); }
.date-btn:disabled { opacity: 0.3; cursor: default; }
.date-label { font-size: 13px; font-weight: 600; text-transform: capitalize; }
.date-not-today { font-size: 10px; color: var(--text-dim); font-weight: 400; }

/* Форма */
.add-form {
  background: var(--bg-input);
  border-radius: 10px;
  padding: 10px;
  display: flex; flex-direction: column; gap: 6px;
}
.form-row { display: flex; gap: 6px; }
.form-row .input { flex: 1; }
.amount-input { max-width: 110px; }

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

.btn-add {
  background: var(--accent); color: #fff;
  border-radius: 8px; padding: 0 16px;
  font-size: 12px; font-weight: 600;
  white-space: nowrap;
  transition: 0.15s;
}
.btn-add:hover { opacity: 0.85; }
.btn-add:disabled { opacity: 0.4; cursor: default; }

/* Категория */
.new-cat-row { }
.link-btn { color: var(--accent); font-size: 11px; }
.new-cat-form { display: flex; gap: 6px; }
.new-cat-form .input { flex: 1; padding: 6px 8px; font-size: 12px; }
.btn-small {
  background: var(--accent); color: #fff;
  border-radius: 6px; padding: 0 12px; font-size: 12px;
}
.btn-cancel { background: var(--bg-input); color: var(--text-dim); }

/* Список трат */
.exp-list {
  flex: 1;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 4px;
}
.empty {
  color: var(--text-dim); font-size: 12px; text-align: center;
  padding: 30px 0;
}
.exp-item {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-input);
  border-radius: 8px;
  padding: 8px 10px;
}
.exp-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.exp-info { flex: 1; overflow: hidden; }
.exp-name { font-size: 13px; }
.exp-note { font-size: 11px; color: var(--text-dim); }
.exp-amount { font-size: 13px; font-weight: 600; color: var(--red); flex-shrink: 0; }
.del-btn {
  color: var(--text-dim); font-size: 11px;
  padding: 2px 6px; border-radius: 4px;
}
.del-btn:hover { color: var(--red); background: var(--bg); }

/* Итог */
.day-total {
  display: flex; justify-content: space-between; align-items: center;
  background: var(--bg);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  flex-shrink: 0;
}
.day-total-value {
  font-size: 16px; font-weight: 800; color: var(--red);
}
</style>