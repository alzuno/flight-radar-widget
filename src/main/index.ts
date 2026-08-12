import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { loadConfig } from './config'
import { OpenSkyClient, startPolling } from './opensky'

let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 400,
    height: 400,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js')
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.on('closed', () => {
    mainWindow = null
  })

  return win
}

app.whenReady().then(() => {
  mainWindow = createWindow()

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

  app.on('window-all-closed', () => {
    stopPolling()
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
    }
  })
})
