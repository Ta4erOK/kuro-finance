const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const db = require('../db/database')

let mainWindow = null

const DEV_URL = 'http://localhost:5173'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 640,
    minWidth: 380,
    minHeight: 500,
    frame: false,
    transparent: false,
    resizable: true,
    alwaysOnTop: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', '..', 'build', 'icon-512.png'),
    backgroundColor: '#1e1e2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Виджет-режим: компактное, поверх всех
  mainWindow.setAlwaysOnTop(false)

  const devMode = !app.isPackaged && (process.env.NODE_ENV === 'development' || !process.env.KURO_PROD)
  console.log('[kuro] devMode:', devMode)
  if (devMode) {
    mainWindow.loadURL(DEV_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })

  // Для диагностики: автозакрытие через N секунд после готовности
  if (process.env.KURO_SELFTEST) {
    mainWindow.webContents.once('did-finish-load', () => {
      console.log('[kuro] SELFTEST: окно загрузилось, заголовок =', mainWindow.getTitle())
      setTimeout(() => app.exit(0), 1500)
    })
    // если не загрузилось за 15 сек — падаем
    setTimeout(() => { console.error('[kuro] SELFTEST: TIMEOUT загрузки'); app.exit(1) }, 15000)
  }
}

// ======== НАСТРОЙКА ВИДЖЕТА ========
function applyWidgetMode(widgetOn) {
  if (!mainWindow) return
  if (widgetOn === 'true') {
    mainWindow.setAlwaysOnTop(true, 'screen-saver')
    mainWindow.setResizable(false)
    mainWindow.setMinimumSize(300, 480)
    mainWindow.setMaximumSize(360, 560)
  } else {
    mainWindow.setAlwaysOnTop(false)
    mainWindow.setResizable(true)
    mainWindow.setMinimumSize(380, 500)
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
ipcMain.handle('win:close', () => mainWindow && mainWindow.close())
ipcMain.handle('win:getMode', () => ({ widget: db.getSetting('widget_mode', 'false') }))

// ======== IPC: КАТЕГОРИИ ========
ipcMain.handle('cat:list', () => db.getCategories())
ipcMain.handle('cat:add', (_, name, color) => db.createCategory(name, color))
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

// ======== IPC: КОПИЛКА ========
ipcMain.handle('sav:add', (_, amount, note, date) => db.addSaving(amount, note, date))
ipcMain.handle('sav:total', () => db.getSavingsTotal())
ipcMain.handle('sav:byDate', (_, date) => db.getSavingsByDate(date))
ipcMain.handle('sav:byRange', (_, start, end) => db.getSavingsByRange(start, end))
ipcMain.handle('sav:totalByDate', (_, date) => db.getSavingsTotalByDate(date))
ipcMain.handle('sav:totalByRange', (_, start, end) => db.getSavingsTotalByRange(start, end))
ipcMain.handle('sav:groupedByDate', (_, start, end) => db.getSavingsGroupedByDate(start, end))
ipcMain.handle('sav:delete', (_, id) => db.deleteSaving(id))

// ======== IPC: НАСТРОЙКИ ========
ipcMain.handle('set:get', (_, key, def) => db.getSetting(key, def))
ipcMain.handle('set:set', (_, key, value) => {
  db.setSetting(key, value)
  if (key === 'widget_mode') applyWidgetMode(value)
  if (key === 'auto_launch') applyAutoLaunch(value)
  return true
})

// ======== IPC: СТАТИСТИКА / ИТОГИ ========
ipcMain.handle('stats:month', (_, year, month) => db.getMonthSummary(year, month))

// ======== ЖИЗНЕННЫЙ ЦИКЛ ========
app.whenReady().then(() => {
  // Применяем сохранённые настройки при старте
  const widgetMode = db.getSetting('widget_mode', 'false')
  const autoLaunch = db.getSetting('auto_launch', 'false')

  createWindow()
  applyWidgetMode(widgetMode)
  if (autoLaunch === 'true') applyAutoLaunch(true)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})