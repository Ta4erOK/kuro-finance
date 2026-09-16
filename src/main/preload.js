const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // Окно
  winMinimize: () => ipcRenderer.invoke('win:minimize'),
  winClose: () => ipcRenderer.invoke('win:close'),

  // Категории
  getCategories: () => ipcRenderer.invoke('cat:list'),
  addCategory: (name, color) => ipcRenderer.invoke('cat:add', name, color),
  updateCategory: (id, name, color) => ipcRenderer.invoke('cat:update', id, name, color),
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
  updateExpense: (id, catId, amount, note, date) => ipcRenderer.invoke('exp:update', id, catId, amount, note, date),

  // Копилка
  addSaving: (amount, note, date) => ipcRenderer.invoke('sav:add', amount, note, date),
  getSavingsTotal: () => ipcRenderer.invoke('sav:total'),
  getSavingsByDate: (date) => ipcRenderer.invoke('sav:byDate', date),
  getSavingsByRange: (start, end) => ipcRenderer.invoke('sav:byRange', start, end),
  getSavingsTotalByDate: (date) => ipcRenderer.invoke('sav:totalByDate', date),
  getSavingsTotalByRange: (start, end) => ipcRenderer.invoke('sav:totalByRange', start, end),
  getSavingsGroupedByDate: (start, end) => ipcRenderer.invoke('sav:groupedByDate', start, end),
  getSavingsGroupedByMonth: (start, end) => ipcRenderer.invoke('sav:groupedByMonth', start, end),
  deleteSaving: (id) => ipcRenderer.invoke('sav:delete', id),
  updateSaving: (id, amount, note, date) => ipcRenderer.invoke('sav:update', id, amount, note, date),

  // Цели копилки
  getGoals: () => ipcRenderer.invoke('goal:list'),
  addGoal: (name, target) => ipcRenderer.invoke('goal:add', name, target),
  updateGoal: (id, name, target) => ipcRenderer.invoke('goal:update', id, name, target),
  deleteGoal: (id) => ipcRenderer.invoke('goal:delete', id),

  // Долги
  getDebts: () => ipcRenderer.invoke('debt:list'),
  getDebtsWithPayments: () => ipcRenderer.invoke('debt:listWithPayments'),
  addDebt: (name, total) => ipcRenderer.invoke('debt:add', name, total),
  updateDebt: (id, name, total) => ipcRenderer.invoke('debt:update', id, name, total),
  deleteDebt: (id) => ipcRenderer.invoke('debt:delete', id),
  payDebt: (debtId, amount, note, date) => ipcRenderer.invoke('debt:pay', debtId, amount, note, date),
  deleteDebtPayment: (id) => ipcRenderer.invoke('debt:payDelete', id),
  getDebtPaymentsByDate: (date) => ipcRenderer.invoke('debt:payByDate', date),
  getDebtPaymentsByRange: (start, end) => ipcRenderer.invoke('debt:payByRange', start, end),
  getDebtTotalByDate: (date) => ipcRenderer.invoke('debt:totalPayByDate', date),
  getDebtTotalByRange: (start, end) => ipcRenderer.invoke('debt:totalPayByRange', start, end),
  getDebtTotalOverall: () => ipcRenderer.invoke('debt:totalOverall'),

  // Настройки
  getSetting: (key, def) => ipcRenderer.invoke('set:get', key, def),
  setSetting: (key, value) => ipcRenderer.invoke('set:set', key, value),

  // Статистика
  getMonthSummary: (year, month) => ipcRenderer.invoke('stats:month', year, month),
  getDebtGroupedByMonth: (start, end) => ipcRenderer.invoke('stats:groupedDebtByMonth', start, end),

  // Сброс
  resetAll: () => ipcRenderer.invoke('reset:all'),

  // Бэкап
  runBackup: () => ipcRenderer.invoke('backup:run'),
  listBackups: () => ipcRenderer.invoke('backup:list')
})