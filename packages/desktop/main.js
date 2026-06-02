const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');

const URL = 'https://nothingmail.shop';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(URL);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('did-finish-load', () => {
    // Hide scrollbars
    mainWindow.webContents.insertCSS(`
      *::-webkit-scrollbar { width: 0 !important; height: 0 !important; }
      * { scrollbar-width: none !important; }
    `);

    // Inject window controls — wait for header to appear (SPA may not have it yet)
    mainWindow.webContents.executeJavaScript(`
      (function injectControls() {
        function setup(header) {
          if (document.getElementById('electron-controls')) return;

          const isDark = document.documentElement.classList.contains('dark');
          const fg = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
          const hoverBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
          const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

          // Make header draggable
          header.style.webkitAppRegion = 'drag';
          header.querySelectorAll('button, a, input, select').forEach(el => {
            el.style.webkitAppRegion = 'no-drag';
          });

          // Window controls container
          const controls = document.createElement('div');
          controls.id = 'electron-controls';
          controls.style.cssText = '-webkit-app-region:no-drag;display:flex;align-items:center;height:100%;margin-left:8px;padding-left:8px;border-left:1px solid ' + borderColor + ';';

          function makeBtn(svg, isClose) {
            const btn = document.createElement('button');
            btn.innerHTML = svg;
            btn.style.cssText = 'width:32px;height:32px;border:none;background:transparent;color:' + fg + ';cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:6px;transition:all 0.15s;';
            btn.onmouseover = () => {
              if (isClose) { btn.style.background = '#e53e3e'; btn.style.color = '#fff'; }
              else { btn.style.background = hoverBg; }
            };
            btn.onmouseout = () => { btn.style.background = 'transparent'; btn.style.color = fg; };
            return btn;
          }

          const min = makeBtn('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>');
          min.onclick = () => window.electronAPI.minimize();

          const max = makeBtn('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>');
          max.onclick = () => window.electronAPI.maximize();

          const close = makeBtn('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>', true);
          close.onclick = () => window.electronAPI.close();

          controls.append(min, max, close);
          header.append(controls);
        }

        // Try immediately
        const header = document.querySelector('header');
        if (header) { setup(header); return; }

        // Wait for React to render header
        const observer = new MutationObserver(() => {
          const h = document.querySelector('header');
          if (h) { observer.disconnect(); setup(h); }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      })();
    `);
  });

  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
