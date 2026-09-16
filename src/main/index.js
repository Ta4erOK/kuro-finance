const { app, BrowserWindow, ipcMain, Tray, Menu, Notification } = require('electron')
const path = require('path')
const db = require('../db/database')

let mainWindow = null
let tray = null
let forceQuit = false

const DEV_URL = 'http://localhost:5173'

// ======== Иконка для трея ========
const ICON_PATH = path.join(__dirname, '..', '..', 'build', 'icon-256.png')
const ICON_FALLBACK = path.join(__dirname, '..', '..', 'build', 'icon.ico')

// ======== СОЗДАНИЕ ОКНА ========
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 440,
    height: 660,
    minWidth: 400,
    minHeight: 560,
    frame: false,
    transparent: false,
    resizable: true,
    alwaysOnTop: false,
    autoHideMenuBar: true,
    icon: ICON_PATH,
    backgroundColor: '#1e1e2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const devMode = !app.isPackaged && (process.env.NODE_ENV === 'development' || !process.env.KURO_PROD)
  console.log('[kuro] devMode:', devMode)
  if (devMode) {
    mainWindow.loadURL(DEV_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'))
  }

  // Поведение при закрытии: если в трее — скрываем, иначе выходим
  mainWindow.on('close', (e) => {
    const trayOn = db.getSetting('minimize_to_tray', 'false')
    if (trayOn === 'true' && tray && !forceQuit) {
      e.preventDefault()
      mainWindow.hide()
      return
    }
    if (!app.isPackaged) {
      // dev: просто закрываем
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })

  // Selftest
  if (process.env.KURO_SELFTEST) {
    mainWindow.webContents.once('did-finish-load', () => {
      console.log('[kuro] SELFTEST: окно загрузилось, заголовок =', mainWindow.getTitle())
      setTimeout(() => app.exit(0), 1500)
    })
    setTimeout(() => { console.error('[kuro] SELFTEST: TIMEOUT'); app.exit(1) }, 15000)
  }
}

// ======== ТРЕЙ ========
function initTray() {
  if (tray) return
  try {
    const fs = require('fs')
    const iconPath = fs.existsSync(ICON_PATH) ? ICON_PATH : ICON_FALLBACK
    if (!fs.existsSync(iconPath)) { console.error('[kuro] tray: no icon found'); return }
    tray = new Tray(iconPath)
    tray.setToolTip('KURO FINANCE')
    updateTrayMenu()
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) mainWindow.hide()
        else mainWindow.show()
      }
    })
  } catch (e) {
    console.error('[kuro] tray init error:', e.message)
  }
}

function destroyTray() {
  if (tray) { tray.destroy(); tray = null }
}

function updateTrayMenu() {
  if (!tray) return
  const menu = Menu.buildFromTemplate([
    { label: 'KURO FINANCE', enabled: false },
    { type: 'separator' },
    { label: 'Показать', click: () => mainWindow && mainWindow.show() },
    { label: 'Выход', click: () => { forceQuit = true; app.quit() } }
  ])
  tray.setContextMenu(menu)
}

// ======== УВЕДОМЛЕНИЯ (вечером) ========
let notifTimer = null

function startNotificationChecker() {
  stopNotificationChecker()
  notifTimer = setInterval(() => {
    checkAndNotify()
  }, 30000) // проверяем каждые 30 сек
  checkAndNotify() // сразу
}

function stopNotificationChecker() {
  if (notifTimer) { clearInterval(notifTimer); notifTimer = null }
}

function checkAndNotify() {
  const enabled = db.getSetting('daily_notify', 'false')
  if (enabled !== 'true') return
  const time = db.getSetting('daily_notify_time', '21:00')
  const [h, m] = time.split(':').map(Number)
  const now = new Date()
  if (now.getHours() === h && now.getMinutes() === m) {
    const lastNotif = db.getSetting('last_daily_notif', '')
    const today = now.toISOString().slice(0, 10)
    if (lastNotif === today) return // уже показали сегодня
    db.setSetting('last_daily_notif', today)
    const total = db.getTotalByDate(today)
    if (total === 0) { // не было трат — напоминаем
      if (Notification.isSupported()) {
        new Notification({
          title: 'KURO FINANCE',
          body: 'Не забудь записать траты дня!',
          icon: ICON_PATH,
          silent: true
        }).show()
      }
    }
  }
}

// ======== АВТО-БЭКАП ========
function checkAutoBackup() {
  const lastBackup = db.getSetting('last_backup_date', '')
  const today = new Date().toISOString().slice(0, 10)
  if (lastBackup === today) return
  const lastDate = lastBackup ? new Date(lastBackup + 'T12:00:00') : null
  if (lastDate) {
    const diffDays = Math.floor((new Date(today + 'T12:00:00') - lastDate) / 86400000)
    if (diffDays < 7) return
  }
  const dest = db.backupDatabase()
  if (dest) {
    db.setSetting('last_backup_date', today)
    console.log('[kuro] auto-backup:', dest)
  }
}

// ======== НАСТРОЙКА ВИДЖЕТА ========
function applyWidgetMode(widgetOn) {
  if (!mainWindow) return
  if (widgetOn === 'true') {
    mainWindow.setAlwaysOnTop(true, 'screen-saver')
    mainWindow.setResizable(false)
    mainWindow.setMinimumSize(340, 520)
    mainWindow.setMaximumSize(400, 580)
  } else {
    mainWindow.setAlwaysOnTop(false)
    mainWindow.setResizable(true)
    mainWindow.setMinimumSize(400, 560)
    mainWindow.setMaximumSize(9999, 9999)
  }
}

// ======== НАСТРОЙКА АВТОЗАПУСКА ========
function applyAutoLaunch(on) {
  try {
    app.setLoginItemSettings({
      openAtLogin: on === 'true',
      path: process.execPath
    })
  } catch (e) {
    console.error('autolaunch error:', e)
  }
}

// ======== IPC: WINDOW ========
ipcMain.handle('win:minimize', () => mainWindow && mainWindow.minimize())
ipcMain.handle('win:close', () => {
  const trayOn = db.getSetting('minimize_to_tray', 'false')
  if (trayOn === 'true') {
    mainWindow && mainWindow.hide()
  } else {
    forceQuit = true
    app.quit()
  }
})
ipcMain.handle('win:getMode', () => ({ widget: db.getSetting('widget_mode', 'false') }))

// ======== IPC: КАТЕГОРИИ ========
ipcMain.handle('cat:list', () => db.getCategories())
ipcMain.handle('cat:add', (_, name, color) => db.createCategory(name, color))
ipcMain.handle('cat:update', (_, id, name, color) => db.updateCategory(id, name, color))
ipcMain.handle('cat:delete', (_, id) => db.deleteCategory(id))

// ======== IPC: ТРАТЫ ========
ipcMain.handle('exp:add', (_, categoryId, amount, note, date) => db.addExpense(categoryId, amount, note, date))
ipcMain.handle('exp:byDate', (_, date) => db.getExpensesByDate(date))
ipcMain.handle('exp:totalByDate', (_, date) => db.getTotalByDate(date))
ipcMain.handle('exp:byRange', (_, start, end) => db.getExpensesByRange(start, end))
ipcMain.handle('exp:totalByRange', (_, start, end) => db.getTotalByRange(start, end))
ipcMain.handle('exp:groupedByDate', (_, start, end) => db.getGroupedByDate(start, end))
ipcMain.handle('exp:groupedByWeek', (_, start, end) => db.getGroupedByWeek(start, end))
ipcMain.handle('exp:groupedByMonth', (_, start, end) => db.getGroupedByMonth(start, end))
ipcMain.handle('exp:groupedByCategory', (_, start, end) => db.getGroupedByCategory(start, end))
ipcMain.handle('exp:delete', (_, id) => db.deleteExpense(id))
ipcMain.handle('exp:update', (_, id, catId, amount, note, date) => db.updateExpense(id, catId, amount, note, date))

// ======== IPC: КОПИЛКА ========
ipcMain.handle('sav:add', (_, amount, note, date) => db.addSaving(amount, note, date))
ipcMain.handle('sav:total', () => db.getSavingsTotal())
ipcMain.handle('sav:byDate', (_, date) => db.getSavingsByDate(date))
ipcMain.handle('sav:byRange', (_, start, end) => db.getSavingsByRange(start, end))
ipcMain.handle('sav:totalByDate', (_, date) => db.getSavingsTotalByDate(date))
ipcMain.handle('sav:totalByRange', (_, start, end) => db.getSavingsTotalByRange(start, end))
ipcMain.handle('sav:groupedByDate', (_, start, end) => db.getSavingsGroupedByDate(start, end))
ipcMain.handle('sav:groupedByMonth', (_, start, end) => db.getSavingsGroupedByMonth(start, end))
ipcMain.handle('sav:delete', (_, id) => db.deleteSaving(id))
ipcMain.handle('sav:update', (_, id, amount, note, date) => db.updateSaving(id, amount, note, date))

// ======== IPC: ЦЕЛИ КОПИЛКИ ========
ipcMain.handle('goal:list', () => db.getGoals())
ipcMain.handle('goal:add', (_, name, target) => db.addGoal(name, target))
ipcMain.handle('goal:update', (_, id, name, target) => db.updateGoal(id, name, target))
ipcMain.handle('goal:delete', (_, id) => db.deleteGoal(id))

// ======== IPC: ДОЛГИ ========
ipcMain.handle('debt:list', () => db.getDebts())
ipcMain.handle('debt:listWithPayments', () => db.getDebtsWithPayments())
ipcMain.handle('debt:add', (_, name, total) => db.addDebt(name, total))
ipcMain.handle('debt:update', (_, id, name, total) => db.updateDebt(id, name, total))
ipcMain.handle('debt:delete', (_, id) => db.deleteDebt(id))
ipcMain.handle('debt:pay', (_, debtId, amount, note, date) => db.addDebtPayment(debtId, amount, note, date))
ipcMain.handle('debt:payDelete', (_, id) => db.deleteDebtPayment(id))
ipcMain.handle('debt:payByDate', (_, date) => db.getDebtPaymentsByDate(date))
ipcMain.handle('debt:payByRange', (_, start, end) => db.getDebtPaymentsByRange(start, end))
ipcMain.handle('debt:totalPayByDate', (_, date) => db.getDebtTotalByDate(date))
ipcMain.handle('debt:totalPayByRange', (_, start, end) => db.getDebtTotalByRange(start, end))
ipcMain.handle('debt:totalOverall', () => db.getDebtTotalOverall())

// ======== IPC: НАСТРОЙКИ ========
ipcMain.handle('set:get', (_, key, def) => db.getSetting(key, def))
ipcMain.handle('set:set', (_, key, value) => {
  db.setSetting(key, value)
  if (key === 'widget_mode') applyWidgetMode(value)
  if (key === 'auto_launch') applyAutoLaunch(value)
  if (key === 'minimize_to_tray') {
    if (value === 'true') initTray(); else destroyTray()
  }
  return true
})

// ======== IPC: СТАТИСТИКА ========
ipcMain.handle('stats:month', (_, year, month) => db.getMonthSummary(year, month))
ipcMain.handle('stats:groupedDebtByMonth', (_, start, end) => db.getDebtGroupedByMonth(start, end))

// ======== IPC: СБРОС ========
ipcMain.handle('reset:all', () => db.resetAll())

// ======== IPC: БЭКАП ========
ipcMain.handle('backup:run', () => db.backupDatabase())
ipcMain.handle('backup:list', () => db.listBackups())

// ======== ЖИЗНЕННЫЙ ЦИКЛ ========
app.whenReady().then(() => {
  const widgetMode = db.getSetting('widget_mode', 'false')
  const autoLaunch = db.getSetting('auto_launch', 'false')
  const trayEnabled = db.getSetting('minimize_to_tray', 'false')

  createWindow()
  applyWidgetMode(widgetMode)
  if (autoLaunch === 'true') applyAutoLaunch(true)
  if (trayEnabled === 'true') initTray()

  // Уведомления
  startNotificationChecker()

  // Авто-бэкап
  checkAutoBackup()

  app.on('activate', () => {
    if (mainWindow) mainWindow.show()
    else createWindow()
  })
})

app.on('window-all-closed', () => {
  if (db.getSetting('minimize_to_tray', 'false') !== 'true') {
    app.quit()
  }
})