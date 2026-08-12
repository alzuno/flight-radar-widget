import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from 'electron'
import { existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { loadConfig } from './config'
import { OpenSkyClient, startPolling } from './opensky'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

// electron-store (persisted settings) lands in Milestone 5; for now a marker
// file is enough to enable auto-launch once without fighting the user's
// later choice to disable it from the tray menu on every subsequent launch.
function enableAutoLaunchOnFirstRun(): void {
  const markerPath = join(app.getPath('userData'), '.auto-launch-initialized')
  if (existsSync(markerPath)) return
  app.setLoginItemSettings({ openAtLogin: true })
  writeFileSync(markerPath, '')
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 400,
    height: 400,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js')
    }
  })

  // Pin the widget to the desktop level (behind normal windows, above the
  // wallpaper) and keep it visible when switching virtual desktops/Spaces.
  // 'desktop' pins the window at the wallpaper level (as Übersicht does) —
  // valid at runtime on macOS even though the current @types/electron level
  // union hasn't caught up with it.
  win.setAlwaysOnTop(true, 'desktop' as Parameters<BrowserWindow['setAlwaysOnTop']>[1])
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // A frameless desktop widget has no close button; treat the window as
  // hideable chrome and only actually destroy it when the app is quitting.
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      win.hide()
    }
  })

  win.on('closed', () => {
    mainWindow = null
  })

  return win
}

function toggleWindowVisibility(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    mainWindow.show()
  }
}

function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    {
      label: mainWindow?.isVisible() ? 'Ocultar widget' : 'Mostrar widget',
      click: toggleWindowVisibility
    },
    {
      label: 'Iniciar con macOS',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({ openAtLogin: menuItem.checked })
      }
    },
    {
      label: 'Configuración (próximamente)',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])
}

function refreshTrayMenu(): void {
  tray?.setContextMenu(buildTrayMenu())
}

function createTray(): Tray {
  const iconPath = join(app.getAppPath(), 'resources', 'trayIconTemplate.png')
  const icon = nativeImage.createFromPath(iconPath)
  const trayInstance = new Tray(icon)
  trayInstance.setToolTip('Flight Radar Widget')
  trayInstance.setContextMenu(buildTrayMenu())
  trayInstance.on('click', () => refreshTrayMenu())
  return trayInstance
}

app.whenReady().then(() => {
  enableAutoLaunchOnFirstRun()

  mainWindow = createWindow()
  mainWindow.on('show', refreshTrayMenu)
  mainWindow.on('hide', refreshTrayMenu)

  tray = createTray()

  const config = loadConfig()
  const client = new OpenSkyClient(config)

  // Only the home coordinates are shared with the renderer — never the OpenSky credentials.
  ipcMain.handle('config:get-home-location', () => ({
    latitude: config.homeLatitude,
    longitude: config.homeLongitude
  }))

  const stopPolling = startPolling(
    client,
    config.pollIntervalSeconds,
    (flights) => {
      console.log(`[opensky] ${flights.length} aeronaves recibidas`)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('flights:update', flights)
      }
    },
    (err) => {
      console.error('[opensky] error de polling:', err)
    }
  )

  app.on('before-quit', () => {
    isQuitting = true
    stopPolling()
  })

  app.on('window-all-closed', () => {
    // On macOS the tray keeps the app alive with no open windows; only quit
    // outright on platforms without a tray-driven lifecycle.
    if (process.platform !== 'darwin') {
      stopPolling()
      app.quit()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
    } else {
      mainWindow?.show()
    }
  })
})
