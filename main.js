// main.js
const { app, session, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const TRANSLATE_CONFIG = {
  url: 'https://libretranslate.com/translate',
  apiKey: null,
  source: 'auto',
  target: 'en'
};

app.whenReady().then(() => {
  const ses = session.defaultSession;

  // 缓存 nonce，每个请求可能不同，示例用 map 按 URL 存储
  const nonceMap = new Map();

  ses.webRequest.onHeadersReceived({urls: ['https://www.messenger.com/*']}, (details, callback) => {
    const headers = details.responseHeaders || {};
    // 兼容大小写
    const cspHeader = headers['content-security-policy'] || headers['Content-Security-Policy'] || headers['content-security-policy-report-only'] || headers['Content-Security-Policy-Report-Only'];
    if (cspHeader && cspHeader.length) {
      const header = Array.isArray(cspHeader) ? cspHeader[0] : cspHeader;
      const m = header.match(/'nonce-([^']+)'/);
      if (m) {
        // 保存 base64 部分（m[1]）
        nonceMap.set(details.url, m[1]);
        // console.log(nonce)
        // win.webContents.send('injectScriptToPage', { nonceMap });
      }
    }
    callback({ cancel: false, responseHeaders: details.responseHeaders });
  });

  const win = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // 把 nonce 发给 preload（按 URL 匹配）
  // win.webContents.on('did-finish-load', () => {
  //   const url = win.webContents.getURL();
  //   const nonce = nonceMap.get(url) || null;
  //   console.log(nonce, url, 'nonce=====')
  //   win.webContents.send('csp-nonce', { url, nonce });
  //   win.webContents.send('translate-config', TRANSLATE_CONFIG);
  // });
  win.webContents.on('did-navigate', async (event, url) => {
    win.webContents.send('injectScriptToBlob', { url, nonceMap });
  })

  win.loadURL('https://www.messenger.com');
  win.webContents.openDevTools({ mode: 'detach' });
});
