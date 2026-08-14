import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from 'electron'
import { existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { loadConfig } from './config'
import { loadCredentials, saveCredentials } from './credentials'
import { OpenSkyClient, startPolling } from './opensky'
import { getCachedRoute, loadRouteCache, refreshRoutesInBackground } from './routeLookup'
import { loadOrSeedSettings, saveSettings, validateSettings } from './settings'
import { loadWindowPosition, saveWindowPosition } from './windowState'
import { radiusKmToBbox } from '../shared/geo'
import type { AppSettings, OpenSkyCredentials, FlightState } from '../shared/types'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

// A marker file is enough to enable auto-launch once without fighting the
// user's later choice to disable it from the tray menu on every subsequent launch.
function enableAutoLaunchOnFirstRun(): void {
  const markerPath = join(app.getPath('userData'), '.auto-launch-initialized')
  if (existsSync(markerPath)) return
  app.setLoginItemSettings({ openAtLogin: true })
  writeFileSync(markerPath, '')
}

function createWindow(): BrowserWindow {
  const position = loadWindowPosition()

  const win = new BrowserWindow({
    width: 400,
    height: 400,
    ...(position ?? {}),
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js')
    }
  })

  // Debounced so dragging the widget doesn't hammer disk I/O on every
  // intermediate 'move' event — only the settled position is persisted.
  let moveSaveTimeout: NodeJS.Timeout | null = null
  win.on('move', () => {
    if (moveSaveTimeout) clearTimeout(moveSaveTimeout)
    moveSaveTimeout = setTimeout(() => {
      const [x, y] = win.getPosition()
      saveWindowPosition({ x, y })
    }, 500)
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
      label: 'Configuración',
      click: () => {
        mainWindow?.show()
        mainWindow?.webContents.send('settings:open-request')
      }
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

  loadRouteCache()

  const config = loadConfig()
  let currentSettings = loadOrSeedSettings(config)
  let credentials = loadCredentials()

  let client: OpenSkyClient | null = null
  let stopPolling: () => void = () => {}

  let lastFlights: FlightState[] = []
  let routeResendTimeout: NodeJS.Timeout | null = null

  function enrichWithRoutes(flights: FlightState[]): FlightState[] {
    return flights.map((flight) => ({
      ...flight,
      route: flight.callsign ? (getCachedRoute(flight.callsign) ?? null) : null
    }))
  }

  function sendFlights(flights: FlightState[]): void {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('flights:update', enrichWithRoutes(flights))
    }
  }

  function onFlights(flights: FlightState[]): void {
    console.log(`[opensky] ${flights.length} aeronaves recibidas`)
    lastFlights = flights
    sendFlights(flights)

    const callsigns = flights.map((f) => f.callsign).filter((c): c is string => c !== null)
    refreshRoutesInBackground(callsigns, () => {
      // Debounced so a burst of resolved callsigns triggers one resend, not one per callsign.
      if (routeResendTimeout) clearTimeout(routeResendTimeout)
      routeResendTimeout = setTimeout(() => sendFlights(lastFlights), 500)
    })
  }

  function onPollError(err: unknown): void {
    console.error('[opensky] error de polling:', err)
  }

  function bboxFor(settings: AppSettings): ReturnType<typeof radiusKmToBbox> {
    return radiusKmToBbox(
      { latitude: settings.homeLatitude, longitude: settings.homeLongitude },
      settings.bboxRadiusKm
    )
  }

  // Only called once credentials exist. Replaces any previously running client/polling.
  function startWithCredentials(creds: OpenSkyCredentials): void {
    stopPolling()
    client = new OpenSkyClient({
      openSkyClientId: creds.clientId,
      openSkyClientSecret: creds.clientSecret,
      bbox: bboxFor(currentSettings)
    })
    stopPolling = startPolling(client, currentSettings.pollIntervalSeconds, onFlights, onPollError)
  }

  function applySettings(settings: AppSettings): void {
    currentSettings = settings
    saveSettings(settings)
    if (client) {
      stopPolling()
      client.updateBbox(bboxFor(settings))
      stopPolling = startPolling(client, settings.pollIntervalSeconds, onFlights, onPollError)
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('settings:updated', settings)
    }
  }

  if (credentials) startWithCredentials(credentials)

  // Only settings (never the OpenSky credentials) are shared with the renderer.
  ipcMain.handle('settings:get', () => currentSettings)

  ipcMain.handle('settings:save', (_event, input: AppSettings) => {
    const result = validateSettings(input)
    if (!result.ok) return result
    applySettings(result.settings)
    return { ok: true }
  })

  // credentials:get intentionally does not exist — the renderer must never be
  // able to read the client secret back, not even to prefill an edit form.
  ipcMain.handle('credentials:has', () => credentials !== null)

  ipcMain.handle('credentials:save', (_event, input: OpenSkyCredentials) => {
    const result = saveCredentials(input)
    if (!result.ok) return result
    credentials = input
    startWithCredentials(credentials)
    return { ok: true }
  })

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
