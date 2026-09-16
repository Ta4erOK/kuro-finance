<script setup>
import { ref, onMounted } from 'vue'

const income = ref('')
const budgetLimit = ref('')
const widgetMode = ref(false)
const autoLaunch = ref(false)
const minimizeToTray = ref(false)
const dailyNotify = ref(false)
const dailyNotifyTime = ref('21:00')
const theme = ref('dark')
const categories = ref([])
const backups = ref([])
const editingId = ref(null)
const editName = ref('')
const editColor = ref('')
const showAddCat = ref(false)
const newCatName = ref('')
const status = ref('')
const statusOk = ref(true)

const PRESET_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

async function load() {
  income.value = (await window.api.getSetting('income', '0')) || '0'
  budgetLimit.value = (await window.api.getSetting('budget_limit', '0')) || '0'
  widgetMode.value = (await window.api.getSetting('widget_mode', 'false')) === 'true'
  autoLaunch.value = (await window.api.getSetting('auto_launch', 'false')) === 'true'
  minimizeToTray.value = (await window.api.getSetting('minimize_to_tray', 'false')) === 'true'
  dailyNotify.value = (await window.api.getSetting('daily_notify', 'false')) === 'true'
  dailyNotifyTime.value = (await window.api.getSetting('daily_notify_time', '21:00')) || '21:00'
  theme.value = (await window.api.getSetting('theme', 'dark')) || 'dark'
  document.documentElement.setAttribute('data-theme', theme.value)
  await loadCategories()
  await loadBackups()
}

async function loadCategories() {
  categories.value = await window.api.getCategories()
}

async function loadBackups() {
  try { backups.value = await window.api.listBackups() } catch { backups.value = [] }
}

function flash(msg, ok = true) {
  status.value = msg
  statusOk.value = ok
  setTimeout(() => { status.value = '' }, 2000)
}

const confirmBox = ref(null)
let confirmResolve = null

function askConfirm(title, message, okText = 'Да', danger = true) {
  confirmBox.value = { title, message, okText, danger }
  return new Promise((resolve) => { confirmResolve = resolve })
}

function confirmYes() {
  const r = confirmResolve
  confirmBox.value = null
  confirmResolve = null
  r && r(true)
}

function confirmNo() {
  const r = confirmResolve
  confirmBox.value = null
  confirmResolve = null
  r && r(false)
}

async function saveIncome() {
  let v = parseFloat(income.value)
  if (isNaN(v) || v < 0) v = 0
  await window.api.setSetting('income', String(v))
  income.value = String(v)
  window.dispatchEvent(new CustomEvent('kuro:data-changed'))
  flash('Доход сохранён')
}

async function saveBudgetLimit() {
  let v = parseFloat(budgetLimit.value)
  if (isNaN(v) || v < 0) v = 0
  await window.api.setSetting('budget_limit', String(v))
  budgetLimit.value = String(v)
  window.dispatchEvent(new CustomEvent('kuro:data-changed'))
  flash('Лимит сохранён')
}

async function toggleWidget() {
  widgetMode.value = !widgetMode.value
  await window.api.setSetting('widget_mode', String(widgetMode.value))
  flash(widgetMode.value ? 'Виджет-режим ВКЛ' : 'Виджет-режим ВЫКЛ')
}

async function toggleAutoLaunch() {
  autoLaunch.value = !autoLaunch.value
  await window.api.setSetting('auto_launch', String(autoLaunch.value))
  flash(autoLaunch.value ? 'Автозапуск ВКЛ' : 'Автозапуск ВЫКЛ')
}

async function toggleMinimizeToTray() {
  minimizeToTray.value = !minimizeToTray.value
  await window.api.setSetting('minimize_to_tray', String(minimizeToTray.value))
  flash(minimizeToTray.value ? 'Сворачивать в трей ВКЛ' : 'Сворачивать в трей ВЫКЛ')
}

async function toggleDailyNotify() {
  dailyNotify.value = !dailyNotify.value
  await window.api.setSetting('daily_notify', String(dailyNotify.value))
  flash(dailyNotify.value ? 'Напоминание ВКЛ' : 'Напоминание ВЫКЛ')
}

async function saveNotifyTime() {
  await window.api.setSetting('daily_notify_time', dailyNotifyTime.value)
  flash('Время напоминания сохранено')
}

async function setTheme(t) {
  theme.value = t
  document.documentElement.setAttribute('data-theme', t)
  await window.api.setSetting('theme', t)
  flash(t === 'dark' ? 'Тёмная тема' : 'Светлая тема')
}

async function createBackup() {
  try {
    await window.api.runBackup()
    await loadBackups()
    flash('Бэкап создан')
  } catch (e) {
    flash('Ошибка бэкапа', false)
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' Б'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' КБ'
  return (bytes / 1048576).toFixed(1) + ' МБ'
}

function startEdit(cat) {
  editingId.value = cat.id
  editName.value = cat.name
  editColor.value = cat.color
}

async function saveEdit() {
  const name = editName.value.trim()
  if (!name || !editingId.value) return
  await window.api.updateCategory(editingId.value, name, editColor.value)
  editingId.value = null
  await loadCategories()
  window.dispatchEvent(new CustomEvent('kuro:data-changed'))
  flash('Категория обновлена')
}

function cancelEdit() {
  editingId.value = null
}

async function removeCategory(cat) {
  const ok = await askConfirm(
    'Удалить категорию?',
    `«${cat.name}» и все траты по ней будут удалены.`
  )
  if (!ok) return
  await window.api.deleteCategory(cat.id)
  await loadCategories()
  window.dispatchEvent(new CustomEvent('kuro:data-changed'))
  flash('Категория удалена')
}

async function addCategory() {
  const name = newCatName.value.trim()
  if (!name) return
  await window.api.addCategory(name, '#8b5cf6')
  newCatName.value = ''
  showAddCat.value = false
  await loadCategories()
  window.dispatchEvent(new CustomEvent('kuro:data-changed'))
  flash('Категория добавлена')
}

async function resetAll() {
  const ok = await askConfirm(
    'Сбросить ВСЕ данные?',
    'Будут удалены: все траты, вся копилка, все долги, категории и месячный доход.\nВосстановить нельзя!',
    'Сбросить всё'
  )
  if (!ok) return
  const ok2 = await askConfirm(
    'Вы уверены?',
    'Это действие необратимо. Все данные будут удалены без возможности восстановления.',
    'Да, сбросить'
  )
  if (!ok2) return
  await window.api.resetAll()
  income.value = '0'
  budgetLimit.value = '0'
  await loadCategories()
  window.dispatchEvent(new CustomEvent('kuro:data-changed'))
  flash('Все данные сброшены')
}

onMounted(load)
</script>

<template>
  <div class="settings">
    <!-- 1. Доход -->
    <div class="setting-card">
      <label class="setting-label">Месячный доход (₽)</label>
      <div class="row">
        <input v-model="income" type="number" min="0" step="100" class="input" @keyup.enter="saveIncome" />
        <button class="btn-save" @click="saveIncome">OK</button>
      </div>
    </div>

    <!-- 2. Лимит бюджета -->
    <div class="setting-card">
      <label class="setting-label">Лимит бюджета (₽)</label>
      <div class="row">
        <input v-model="budgetLimit" type="number" min="0" step="100" class="input" @keyup.enter="saveBudgetLimit" />
        <button class="btn-save" @click="saveBudgetLimit">OK</button>
      </div>
    </div>

    <!-- 3. Категории -->
    <div class="setting-card">
      <div class="card-header">
        <span class="setting-label cat-label">Категории</span>
        <button v-if="!showAddCat" class="link-btn" @click="showAddCat = true">+ добавить</button>
      </div>

      <div v-if="showAddCat" class="add-cat-form">
        <input v-model="newCatName" type="text" placeholder="Название категории" class="input input-sm" @keyup.enter="addCategory" />
        <button class="btn-small" @click="addCategory">OK</button>
        <button class="btn-small btn-ghost" @click="showAddCat = false; newCatName = ''">✕</button>
      </div>

      <div v-if="!categories.length && !showAddCat" class="cats-empty">Категорий нет — добавь первую</div>

      <div v-for="c in categories" :key="c.id" class="cat-item">
        <template v-if="editingId !== c.id">
          <span class="cat-dot" :style="{ background: c.color }"></span>
          <span class="cat-name">{{ c.name }}</span>
          <div class="cat-actions">
            <button class="mini-btn" @click="startEdit(c)">✎</button>
            <button class="mini-btn danger" @click="removeCategory(c)">✕</button>
          </div>
        </template>

        <template v-else>
          <div class="edit-block">
            <input v-model="editName" type="text" class="input input-sm cat-edit-name" @keyup.enter="saveEdit" />
            <div class="color-row">
              <button
                v-for="col in PRESET_COLORS"
                :key="col"
                class="color-dot"
                :class="{ selected: editColor === col }"
                :style="{ background: col }"
                @click="editColor = col"
              ></button>
            </div>
            <div class="edit-row-btns">
              <button class="btn-small" @click="saveEdit">OK</button>
              <button class="btn-small btn-ghost" @click="cancelEdit">✕</button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 4. Виджет-режим -->
    <div class="setting-card">
      <div class="setting-toggle" @click="toggleWidget">
        <div>
          <div class="setting-name">Виджет-режим</div>
          <div class="setting-desc">Компактное окно поверх всех</div>
        </div>
        <div class="switch" :class="{ on: widgetMode }"><span></span></div>
      </div>
    </div>

    <!-- 5. Автозапуск -->
    <div class="setting-card">
      <div class="setting-toggle" @click="toggleAutoLaunch">
        <div>
          <div class="setting-name">Автозапуск с Windows</div>
        </div>
        <div class="switch" :class="{ on: autoLaunch }"><span></span></div>
      </div>
    </div>

    <!-- 6. Сворачивать в трей -->
    <div class="setting-card">
      <div class="setting-toggle" @click="toggleMinimizeToTray">
        <div>
          <div class="setting-name">Сворачивать в трей</div>
          <div class="setting-desc">При закрытии окно сворачивается в трей</div>
        </div>
        <div class="switch" :class="{ on: minimizeToTray }"><span></span></div>
      </div>
    </div>

    <!-- 7. Напоминание вечером -->
    <div class="setting-card">
      <div class="setting-toggle" @click="toggleDailyNotify">
        <div>
          <div class="setting-name">Напоминание вечером</div>
          <div class="setting-desc">Напоминание записать траты</div>
        </div>
        <div class="switch" :class="{ on: dailyNotify }"><span></span></div>
      </div>
      <div v-if="dailyNotify" class="notify-time-row">
        <label class="time-label">Время:</label>
        <input v-model="dailyNotifyTime" type="time" class="input input-time" @change="saveNotifyTime" />
      </div>
    </div>

    <!-- 8. Тема -->
    <div class="setting-card">
      <label class="setting-label">Тема оформления</label>
      <div class="theme-row">
        <button class="theme-btn" :class="{ active: theme === 'dark' }" @click="setTheme('dark')">Тёмная</button>
        <button class="theme-btn" :class="{ active: theme === 'light' }" @click="setTheme('light')">Светлая</button>
      </div>
    </div>

    <!-- 9. Бэкап данных -->
    <div class="setting-card">
      <label class="setting-label">Бэкап данных</label>
      <button class="btn-backup" @click="createBackup">Создать бэкап</button>
      <div v-if="backups.length" class="backup-list">
        <div v-for="b in backups" :key="b.name" class="backup-item">
          <span class="backup-name">{{ b.name }}</span>
          <span class="backup-size">{{ formatSize(b.size) }}</span>
        </div>
      </div>
      <div v-else class="backup-empty">Бэкапов пока нет</div>
    </div>

    <!-- 10. Сброс данных -->
    <div class="setting-card danger-card">
      <div class="setting-name">Сброс данных</div>
      <div class="setting-desc">Удалить все траты, копилку, долги, категории и доход</div>
      <button class="btn-reset" @click="resetAll">Сбросить все данные</button>
    </div>

    <!-- 11. Footer -->
    <div class="footer">KURO FINANCE · v1.0</div>

    <div v-if="status" class="status" :class="{ err: !statusOk }">{{ status }}</div>

    <!-- Модальный confirm -->
    <div v-if="confirmBox" class="modal-overlay" @click.self="confirmNo">
      <div class="modal">
        <div class="modal-title">{{ confirmBox.title }}</div>
        <div class="modal-message">{{ confirmBox.message }}</div>
        <div class="modal-btns">
          <button class="modal-btn cancel" @click="confirmNo">Отмена</button>
          <button class="modal-btn ok" :class="{ danger: confirmBox.danger }" @click="confirmYes">{{ confirmBox.okText }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings { display: flex; flex-direction: column; gap: 10px; }

.setting-card {
  background: var(--bg-input);
  border-radius: 10px;
  padding: 12px;
}
.setting-label {
  display: block;
  font-size: 11px; color: var(--text-dim);
  margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;
}
.cat-label { margin-bottom: 0; }
.card-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px;
}
.link-btn { color: var(--accent); font-size: 11px; }

.row { display: flex; gap: 6px; }
.input {
  flex: 1;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  color: var(--text);
  font-size: 13px;
}
.input:focus { border-color: var(--accent); outline: none; }
.input-sm { padding: 6px 8px; font-size: 12px; }
.btn-save {
  background: var(--accent); color: #fff;
  border-radius: 8px; padding: 0 16px; font-size: 12px; font-weight: 600;
}
.btn-small {
  background: var(--accent); color: #fff;
  border-radius: 6px; padding: 0 12px; font-size: 12px;
}
.btn-ghost { background: var(--bg-input); color: var(--text-dim); border: 1px solid var(--border); }

/* Категории */
.add-cat-form { display: flex; gap: 6px; margin-bottom: 8px; }
.add-cat-form .input { flex: 1; }
.cats-empty { color: var(--text-dim); font-size: 12px; padding: 6px 0; }

.cat-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(63,63,90,0.5);
}
.cat-item:last-child { border-bottom: none; }
.cat-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.cat-name { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cat-actions { display: flex; gap: 4px; }
.mini-btn {
  width: 24px; height: 24px;
  border-radius: 6px;
  background: var(--bg);
  color: var(--text-dim);
  font-size: 11px;
  display: flex; align-items: center; justify-content: center;
  transition: 0.15s;
}
.mini-btn:hover { color: var(--text); background: var(--border); }
.mini-btn.danger:hover { color: var(--red); }

.edit-block { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.cat-edit-name { width: 100%; }
.color-row { display: flex; gap: 4px; }
.color-dot {
  width: 16px; height: 16px;
  border-radius: 50%;
  border: 2px solid transparent;
  transition: 0.15s;
  cursor: pointer;
}
.color-dot.selected { border-color: #fff; transform: scale(1.15); }
.edit-row-btns { display: flex; gap: 4px; }

/* Тумблеры */
.setting-toggle {
  display: flex; align-items: center; justify-content: space-between;
  cursor: pointer;
}
.setting-name { font-size: 13px; font-weight: 600; }
.setting-desc { font-size: 11px; color: var(--text-dim); margin-top: 2px; }

.switch {
  width: 38px; height: 22px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 11px;
  position: relative;
  transition: 0.2s;
  flex-shrink: 0;
}
.switch span {
  position: absolute;
  top: 2px; left: 2px;
  width: 16px; height: 16px;
  background: var(--text-dim);
  border-radius: 50%;
  transition: 0.2s;
}
.switch.on { background: var(--accent); border-color: var(--accent); }
.switch.on span { left: 18px; background: #fff; }

/* Напоминание */
.notify-time-row {
  display: flex; align-items: center; gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}
.time-label { font-size: 12px; color: var(--text-dim); }
.input-time {
  width: 90px;
  flex: none;
  font-size: 12px;
}

/* Тема */
.theme-row { display: flex; gap: 6px; }
.theme-btn {
  flex: 1;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px;
  font-size: 12px; font-weight: 600;
  color: var(--text-dim);
  transition: 0.15s;
}
.theme-btn:hover { border-color: var(--accent); color: var(--text); }
.theme-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }

/* Бэкапы */
.btn-backup {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px;
  font-size: 12px; font-weight: 600;
  color: var(--accent);
  margin-bottom: 8px;
  transition: 0.15s;
}
.btn-backup:hover { border-color: var(--accent); }
.backup-list { display: flex; flex-direction: column; gap: 2px; }
.backup-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid rgba(63,63,90,0.3);
  font-size: 11px;
}
.backup-item:last-child { border-bottom: none; }
.backup-name { color: var(--text); }
.backup-size { color: var(--text-dim); }
.backup-empty { font-size: 11px; color: var(--text-dim); padding: 4px 0; }

/* Сброс */
.danger-card { border: 1px solid rgba(239,68,68,0.3); }
.btn-reset {
  margin-top: 10px;
  width: 100%;
  background: rgba(239,68,68,0.15);
  color: var(--red);
  border: 1px solid rgba(239,68,68,0.4);
  border-radius: 8px;
  padding: 9px;
  font-size: 12px; font-weight: 600;
  transition: 0.15s;
}
.btn-reset:hover { background: var(--red); color: #fff; }

/* Footer */
.footer {
  text-align: center;
  font-size: 10px; color: var(--text-dim);
  margin-top: 6px;
}
.status {
  text-align: center;
  font-size: 12px; color: var(--green);
}
.status.err { color: var(--red); }

/* Модальный confirm */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  max-width: 280px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0,0,0,0.6);
}
.modal-title { font-size: 14px; font-weight: 700; margin-bottom: 6px; }
.modal-message { font-size: 12px; color: var(--text-dim); line-height: 1.5; margin-bottom: 14px; white-space: pre-line; }
.modal-btns { display: flex; gap: 8px; }
.modal-btn {
  flex: 1;
  border-radius: 8px;
  padding: 9px 0;
  font-size: 12px; font-weight: 600;
  transition: 0.15s;
}
.modal-btn.cancel { background: var(--bg); color: var(--text-dim); }
.modal-btn.cancel:hover { color: var(--text); }
.modal-btn.ok { background: var(--accent); color: #fff; }
.modal-btn.ok:hover { opacity: 0.85; }
.modal-btn.ok.danger { background: var(--red); }
</style>
