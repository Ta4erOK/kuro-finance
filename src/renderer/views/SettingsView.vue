<script setup>
import { ref, onMounted } from 'vue'

const income = ref('')
const widgetMode = ref(false)
const autoLaunch = ref(false)
const status = ref('')

async function load() {
  income.value = (await window.api.getSetting('income', '0')) || '0'
  widgetMode.value = (await window.api.getSetting('widget_mode', 'false')) === 'true'
  autoLaunch.value = (await window.api.getSetting('auto_launch', 'false')) === 'true'
  await window.api.getCategories() // прогреем то же самое для проверки связи
}

function flash(msg) {
  status.value = msg
  setTimeout(() => { status.value = '' }, 2000)
}

async function saveIncome() {
  let v = parseFloat(income.value)
  if (isNaN(v) || v < 0) v = 0
  await window.api.setSetting('income', String(v))
  income.value = String(v)
  window.dispatchEvent(new CustomEvent('kuro:data-changed'))
  flash('Доход сохранён')
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

onMounted(load)
</script>

<template>
  <div class="settings">
    <div class="setting-card">
      <label class="setting-label">Месячный доход (₽)</label>
      <div class="row">
        <input v-model="income" type="number" min="0" step="100" class="input" @keyup.enter="saveIncome" />
        <button class="btn-save" @click="saveIncome">OK</button>
      </div>
    </div>

    <div class="setting-card">
      <div class="setting-toggle" @click="toggleWidget">
        <div>
          <div class="setting-name">Виджет-режим</div>
          <div class="setting-desc">Компактное окно поверх всех</div>
        </div>
        <div class="switch" :class="{ on: widgetMode }"><span></span></div>
      </div>
    </div>

    <div class="setting-card">
      <div class="setting-toggle" @click="toggleAutoLaunch">
        <div>
          <div class="setting-name">Автозапуск с Windows</div>
          <div class="setting-desc">Запускать при входе в систему</div>
        </div>
        <div class="switch" :class="{ on: autoLaunch }"><span></span></div>
      </div>
    </div>

    <div class="about">KURO FINANCE · v1.0 · лучше утром, чем никогда</div>
    <div v-if="status" class="status">{{ status }}</div>
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
.row { display: flex; gap: 6px; }
.input {
  flex: 1;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  color: var(--text);
  font-size: 13px;
}
.btn-save {
  background: var(--accent); color: #fff;
  border-radius: 8px; padding: 0 16px; font-size: 12px; font-weight: 600;
}

.setting-toggle {
  display: flex; align-items: center; justify-content: space-between;
  cursor: pointer;
}
.setting-name { font-size: 13px; font-weight: 600; }
.setting-desc { font-size: 11px; color: var(--text-dim); margin-top: 2px; }

.switch {
  width: 40px; height: 22px;
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
.switch.on span { left: 20px; background: #fff; }

.about {
  text-align: center;
  font-size: 10px; color: var(--text-dim);
  margin-top: 6px;
}
.status {
  text-align: center;
  font-size: 12px; color: var(--green);
}
</style>