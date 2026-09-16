const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // Окно
  winMinimize: () => ipcRenderer.invoke('win:minimize'),
  winClose: () => ipcRenderer.invoke('win:close'),

  // Категории
  getCategories: () => ipcRenderer.invoke('cat:list'),
  addCategory: (name, color) => ipcRenderer.invoke('cat:add', name, color),
  deleteCategory: (id) => ipcRenderer.invoke('cat:delete', id),

  // Траты
  addExpense: (categoryId, amount, note, date) => ipcRenderer.invoke('exp:add', categoryId, amount, note, date),
  getExpensesByDate: (date) => ipcRenderer.invoke('exp:byDate', date),
  getTotalByDate: (date) => ipcRenderer.invoke('exp:totalByDate', date),
  getExpensesByRange: (start, end) => ipcRenderer.invoke('exp:byRange', start, end),
  getTotalByRange: (start, end) => ipcRenderer.invoke('exp:totalByRange', start, end),
  getExpensesGroupedByDate: (start, end) => ipcRenderer.invoke('exp:groupedByDate', start, end),
  getExpensesGroupedByWeek: (start, end) => ipcRenderer.invoke('exp:groupedByWeek', start, end),
  getExpensesGroupedByMonth: (start, end) => ipcRenderer.invoke('exp:groupedByMonth', start, end),
  getExpensesGroupedByCategory: (start, end) => ipcRenderer.invoke('exp:groupedByCategory', start, end),
  deleteExpense: (id) => ipcRenderer.invoke('exp:delete', id),

  // Копилка
  addSaving: (amount, note, date) => ipcRenderer.invoke('sav:add', amount, note, date),
  getSavingsTotal: () => ipcRenderer.invoke('sav:total'),
  getSavingsByDate: (date) => ipcRenderer.invoke('sav:byDate', date),
  getSavingsByRange: (start, end) => ipcRenderer.invoke('sav:byRange', start, end),
  getSavingsTotalByDate: (date) => ipcRenderer.invoke('sav:totalByDate', date),
  getSavingsTotalByRange: (start, end) => ipcRenderer.invoke('sav:totalByRange', start, end),
  getSavingsGroupedByDate: (start, end) => ipcRenderer.invoke('sav:groupedByDate', start, end),
  deleteSaving: (id) => ipcRenderer.invoke('sav:delete', id),

  // Настройки
  getSetting: (key, def) => ipcRenderer.invoke('set:get', key, def),
  setSetting: (key, value) => ipcRenderer.invoke('set:set', key, value),

  // Статистика
  getMonthSummary: (year, month) => ipcRenderer.invoke('stats:month', year, month)
})