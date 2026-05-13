const { app, BrowserWindow } = require('electron')
const http = require('http')
const https = require('https')
const { URL } = require('url')

const PROXY_PORT = 58080
const isDev = !app.isPackaged

let mainWindow = null
let proxyServer = null

function forwardRequest(targetUrl, method, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl)
    const lib = parsed.protocol === 'https:' ? https : http

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: { ...headers },
      rejectUnauthorized: false,
    }

    delete options.headers['host']
    delete options.headers['connection']
    delete options.headers['proxy-connection']

    const req = lib.request(options, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
        })
      })
    })

    req.on('error', (err) => reject(err))

    if (body) {
      req.write(body)
    }
    req.end()
  })
}

function startProxy() {
  return new Promise((resolve) => {
    proxyServer = http.createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', '*')

      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }

      const parsedUrl = new URL(req.url, `http://localhost:${PROXY_PORT}`)

      if (parsedUrl.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }))
        return
      }

      if (parsedUrl.pathname === '/proxy') {
        const targetUrl = req.headers['x-proxy-target'] || parsedUrl.searchParams.get('target')

        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing target URL. Use ?target=<url> or X-Proxy-Target header.' }))
          return
        }

        try {
          const chunks = []
          req.on('data', (chunk) => chunks.push(chunk))
          req.on('end', async () => {
            const body = chunks.length > 0 ? Buffer.concat(chunks) : null

            try {
              const result = await forwardRequest(targetUrl, req.method, req.headers, body)
              const responseHeaders = { ...result.headers }
              delete responseHeaders['transfer-encoding']
              delete responseHeaders['content-encoding']

              if (result.body && result.body.length > 0) {
                responseHeaders['content-length'] = result.body.length
              }

              res.writeHead(result.status, responseHeaders)
              res.end(result.body)
            } catch (err) {
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Proxy request failed', detail: err.message }))
            }
          })
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
        return
      }

      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Not found' }))
    })

    proxyServer.listen(PROXY_PORT, () => {
      console.log(`[testflow-proxy] listening on http://localhost:${PROXY_PORT}`)
      resolve()
    })

    proxyServer.on('error', (err) => {
      console.error('[testflow-proxy] server error:', err.message)
    })
  })
}

function stopProxy() {
  if (proxyServer) {
    proxyServer.close()
    proxyServer = null
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
      preload: `${__dirname}/preload.cjs`,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(`${__dirname}/../dist/index.html`)
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
