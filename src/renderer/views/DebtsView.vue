<template>
  <div class="debts-view">
    <div class="summary-card">
      <div class="summary-label">Остаток долгов</div>
      <div class="summary-total">{{ money(totalDebt) }}</div>
      <div class="summary-repaid">Погашено: {{ money(totalRepaid) }}</div>
    </div>

    <div class="add-form">
      <input v-model="newName" class="input" placeholder="Кому/что должны" />
      <input v-model.number="newTotal" type="number" class="input input-short" placeholder="Сумма" />
      <button class="btn-add" @click="addDebt">Добавить долг</button>
    </div>

    <div v-if="!debts.length" class="empty-hint">Нет долгов</div>

    <div v-for="debt in debts" :key="debt.id" class="debt-card">
      <template v-if="editingDebtId === debt.id">
        <div class="debt-edit">
          <input v-model="editName" class="input" placeholder="Название" />
          <input v-model.number="editTotal" type="number" class="input input-short" placeholder="Сумма" />
          <button class="btn-add" @click="saveDebt(debt.id)">OK</button>
          <button class="btn-ghost" @click="cancelEdit">Отмена</button>
        </div>
      </template>
      <template v-else>
        <div class="debt-top">
          <div class="debt-info">
            <div class="debt-name">{{ debt.name }}</div>
            <div class="debt-amounts">
              <span class="debt-repaid">{{ money(debt.repaid) }}</span>
              <span class="debt-dim">из {{ money(debt.total) }}</span>
              <span class="debt-remaining">{{ money(debt.total - debt.repaid) }}</span>
            </div>
          </div>
          <div class="debt-actions">
            <button class="btn-ghost" @click="startEdit(debt)">✎</button>
            <button class="btn-ghost btn-danger" @click="removeDebt(debt.id)">✕</button>
          </div>
        </div>

        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: debtPercent(debt) + '%' }"></div>
        </div>

        <div class="pay-form">
          <input v-model.number="payAmounts[debt.id]" type="number" class="input input-short" placeholder="Сумма" />
          <input v-model="payNotes[debt.id]" class="input" placeholder="Заметка" />
          <button class="btn-add btn-small" @click="payDebt(debt.id)">Ок</button>
        </div>

        <div v-if="debt.payments.length" class="payments-list">
          <div v-for="p in debt.payments" :key="p.id" class="payment-item">
            <span class="payment-date">{{ p.date }}</span>
            <span class="payment-amount">{{ money(p.amount) }}</span>
            <span v-if="p.note" class="payment-note">{{ p.note }}</span>
            <button class="btn-ghost btn-danger" @click="removePayment(p.id)">✕</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const debts = ref([])
const newName = ref('')
const newTotal = ref(null)
const editingDebtId = ref(null)
const editName = ref('')
const editTotal = ref(0)
const payAmounts = ref({})
const payNotes = ref({})

const totalDebt = computed(() => debts.value.reduce((s, d) => s + (d.total - d.repaid), 0))
const totalRepaid = computed(() => debts.value.reduce((s, d) => s + d.repaid, 0))

function money(v) {
  return Number(v || 0).toLocaleString('ru-RU') + ' ₽'
}

function debtPercent(d) {
  if (!d.total || d.total <= 0) return 0
  return Math.min((d.repaid / d.total) * 100, 100)
}

async function load() {
  try {
    debts.value = await window.api.getDebtsWithPayments()
  } catch (err) {
    console.error('Debts load error:', err)
  }
}

function notifyChange() {
  window.dispatchEvent(new CustomEvent('kuro:data-changed'))
}

async function addDebt() {
  if (!newName.value.trim() || !newTotal.value || newTotal.value <= 0) return
  try {
    await window.api.addDebt(newName.value.trim(), newTotal.value)
    newName.value = ''
    newTotal.value = null
    await load()
    notifyChange()
  } catch (err) {
    console.error(err)
  }
}

function startEdit(debt) {
  editingDebtId.value = debt.id
  editName.value = debt.name
  editTotal.value = debt.total
}

function cancelEdit() {
  editingDebtId.value = null
}

async function saveDebt(id) {
  if (!editName.value.trim() || !editTotal.value || editTotal.value <= 0) return
  try {
    await window.api.updateDebt(id, editName.value.trim(), editTotal.value)
    editingDebtId.value = null
    await load()
    notifyChange()
  } catch (err) {
    console.error(err)
  }
}

async function removeDebt(id) {
  try {
    await window.api.deleteDebt(id)
    await load()
    notifyChange()
  } catch (err) {
    console.error(err)
  }
}

async function payDebt(debtId) {
  const amount = payAmounts.value[debtId]
  if (!amount || amount <= 0) return
  try {
    await window.api.payDebt(debtId, amount, payNotes.value[debtId] || '', new Date().toISOString().slice(0, 10))
    payAmounts.value[debtId] = null
    payNotes.value[debtId] = ''
    await load()
    notifyChange()
  } catch (err) {
    console.error(err)
  }
}

async function removePayment(id) {
  try {
    await window.api.deleteDebtPayment(id)
    await load()
    notifyChange()
  } catch (err) {
    console.error(err)
  }
}

onMounted(load)
</script>

<style scoped>
.debts-view {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--text);
  overflow-x: hidden;
  min-width: 0;
}

.summary-card {
  background: var(--grad-strong);
  border-radius: 10px;
  padding: 16px;
  text-align: center;
}

.summary-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-dim);
}

.summary-total {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin-top: 4px;
}

.summary-repaid {
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 4px;
}

.add-form {
  display: flex;
  gap: 6px;
  align-items: center;
}

.input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 9px;
  color: var(--text);
  font-size: 13px;
  flex: 1;
  min-width: 0;
}

.input-short {
  flex: 0 0 100px;
}

.btn-add {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
}

.btn-add:hover {
  opacity: 0.85;
}

.btn-small {
  padding: 5px 10px;
  font-size: 12px;
}

.btn-ghost {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 14px;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}

.btn-ghost:hover {
  background: var(--border);
  color: var(--text);
}

.btn-danger {
  color: var(--red);
}

.btn-danger:hover {
  background: none;
  color: var(--red);
  opacity: 0.8;
}

.empty-hint {
  text-align: center;
  color: var(--text-dim);
  font-size: 13px;
  padding: 16px 0;
}

.debt-card {
  background: var(--bg-input);
  border-radius: 10px;
  padding: 12px;
}

.debt-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.debt-name {
  font-size: 14px;
  font-weight: 600;
}

.debt-amounts {
  font-size: 12px;
  margin-top: 2px;
}

.debt-repaid {
  color: var(--green);
}

.debt-dim {
  color: var(--text-dim);
}

.debt-remaining {
  color: var(--text);
  font-weight: 600;
  margin-left: 6px;
}

.debt-actions {
  display: flex;
  gap: 2px;
}

.progress-bar {
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  margin-top: 8px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--green);
  border-radius: 3px;
  transition: width 0.3s;
}

.pay-form {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 10px;
}

.pay-form .input-short {
  flex: 0 0 90px;
}

.payments-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  border-top: 1px solid var(--border);
  padding-top: 6px;
}

.payment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.payment-date {
  color: var(--text-dim);
  min-width: 74px;
}

.payment-amount {
  min-width: 80px;
  color: var(--text);
}

.payment-note {
  flex: 1;
  color: var(--text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.debt-edit {
  display: flex;
  gap: 6px;
  align-items: center;
}
</style>