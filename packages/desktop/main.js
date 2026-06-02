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

    // Inject window controls — handles both login (no header) and app (with header)
    mainWindow.webContents.executeJavaScript(`
      (function injectControls() {
        const isDark = document.documentElement.classList.contains('dark');
        const fg = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
        const hoverBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
        const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

        function makeBtn(svg, isClose) {
          const btn = document.createElement('button');
          btn.innerHTML = svg;
          btn.style.cssText = 'width:40px;height:40px;border:none;background:transparent;color:' + fg + ';cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:9999px;transition:color 0.15s,background 0.15s;-webkit-app-region:no-drag;';
          btn.onmouseover = () => {
            if (isClose) { btn.style.background = '#e53e3e'; btn.style.color = '#fff'; }
            else { btn.style.background = hoverBg; btn.style.color = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)'; }
          };
          btn.onmouseout = () => { btn.style.background = 'transparent'; btn.style.color = fg; };
          return btn;
        }

        function createButtons() {
          const min = makeBtn('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="6" y1="12" x2="18" y2="12"/></svg>');
          min.onclick = () => window.electronAPI.minimize();
          const max = makeBtn('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>');
          max.onclick = () => window.electronAPI.maximize();
          const close = makeBtn('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="7" y1="7" x2="17" y2="17"/><line x1="7" y1="17" x2="17" y2="7"/></svg>', true);
          close.onclick = () => window.electronAPI.close();
          return [min, max, close];
        }

        // Floating bar for pages without header (login page)
        function addFloatingBar() {
          if (document.getElementById('electron-floating')) return;
          const bar = document.createElement('div');
          bar.id = 'electron-floating';
          bar.style.cssText = 'position:fixed;top:0;left:0;right:0;height:40px;z-index:9999;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;-webkit-app-region:drag;';
          createButtons().forEach(b => bar.append(b));
          document.body.append(bar);
        }

        // Inject into existing header
        function addToHeader(header) {
          if (document.getElementById('electron-controls')) return;
          // Remove floating bar if it exists
          const floating = document.getElementById('electron-floating');
          if (floating) floating.remove();

          header.style.webkitAppRegion = 'drag';
          header.querySelectorAll('button, a, input, select').forEach(el => {
            el.style.webkitAppRegion = 'no-drag';
          });

          const controls = document.createElement('div');
          controls.id = 'electron-controls';
          controls.style.cssText = '-webkit-app-region:no-drag;display:flex;align-items:center;gap:2px;height:100%;margin-left:12px;padding-left:12px;border-left:1px solid ' + borderColor + ';';
          createButtons().forEach(b => controls.append(b));
          header.append(controls);
        }

        // Try header first, fallback to floating bar
        const header = document.querySelector('header');
        if (header) {
          addToHeader(header);
        } else {
          addFloatingBar();
        }

        // Watch for header appearing/disappearing (login <-> app transitions)
        new MutationObserver(() => {
          const h = document.querySelector('header');
          if (h && !document.getElementById('electron-controls')) {
            addToHeader(h);
          } else if (!h && !document.getElementById('electron-floating')) {
            addFloatingBar();
          }
        }).observe(document.body, { childList: true, subtree: true });
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
