const { app, BrowserWindow, dialog } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const http = require('http')

const PROXY_PORT = 58080
const isDev = !app.isPackaged

let mainWindow = null
let proxyProcess = null

function startProxy() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '..', 'proxy', 'server.js')
    proxyProcess = spawn('node', [serverPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    let started = false

    proxyProcess.stdout.on('data', (data) => {
      const msg = data.toString()
      console.log('[proxy]', msg.trim())
      if (!started && msg.includes('listening')) {
        started = true
        resolve()
      }
    })

    proxyProcess.stderr.on('data', (data) => {
      console.error('[proxy:err]', data.toString().trim())
    })

    proxyProcess.on('error', (err) => {
      console.error('[proxy] failed to start:', err.message)
      reject(err)
    })

    proxyProcess.on('exit', (code) => {
      console.log(`[proxy] exited with code ${code}`)
      proxyProcess = null
    })

    // fallback: try health check
    setTimeout(() => {
      if (!started) {
        checkHealth()
          .then(() => { started = true; resolve() })
          .catch(() => { /* keep waiting */ })
      }
    }, 2000)

    // hard timeout
    setTimeout(() => {
      if (!started) {
        started = true
        console.warn('[proxy] startup timeout, continuing anyway')
        resolve()
      }
    }, 8000)
  })
}

function checkHealth() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${PROXY_PORT}/health`, (res) => {
      if (res.statusCode === 200) resolve()
      else reject(new Error(`status ${res.statusCode}`))
    })
    req.on('error', reject)
    req.setTimeout(2000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

function stopProxy() {
  if (proxyProcess) {
    proxyProcess.kill()
    proxyProcess = null
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'TestFlow',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  try {
    console.log('[testflow] starting proxy server...')
    await startProxy()
    console.log('[testflow] proxy server ready')
  } catch (err) {
    console.error('[testflow] proxy startup error:', err.message)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopProxy()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  stopProxy()
})
