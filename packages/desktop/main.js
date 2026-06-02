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

    // Inject CSS for window controls (uses CSS variables — auto-follows theme)
    mainWindow.webContents.insertCSS(`
      .ec-btn {
        width: 36px; height: 36px; border: none; background: transparent;
        color: var(--muted-foreground, #666);
        cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
        border-radius: 8px; transition: background 0.15s, color 0.15s;
        -webkit-app-region: no-drag; padding: 0; outline: none;
      }
      .ec-btn:hover { background: var(--accent, rgba(128,128,128,0.1)); color: var(--foreground, #eee); }
      .ec-btn.ec-close:hover { background: #e53e3e; color: #fff; }
      .ec-wrap {
        -webkit-app-region: no-drag; display: flex; align-items: center; gap: 2px; height: 100%;
        margin-left: 8px; padding-left: 8px; border-left: 1px solid var(--border, rgba(128,128,128,0.15));
      }
      #electron-floating {
        position: fixed; top: 0; left: 0; right: 0; height: 40px; z-index: 9999;
        display: flex; align-items: center; justify-content: flex-end;
        padding-right: 8px; -webkit-app-region: drag;
      }
    `);

    // Inject window controls
    mainWindow.webContents.executeJavaScript(`
      (function() {
        const SVG_MIN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="7" y1="12" x2="17" y2="12"/></svg>';
        const SVG_MAX = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';
        const SVG_CLOSE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="7" y1="7" x2="17" y2="17"/><line x1="7" y1="17" x2="17" y2="7"/></svg>';

        function btns() {
          const f = document.createDocumentFragment();
          const mk = (svg, cls, fn) => { const b = document.createElement('button'); b.className = 'ec-btn' + (cls ? ' ' + cls : ''); b.innerHTML = svg; b.onclick = fn; return b; };
          f.append(mk(SVG_MIN, '', () => window.electronAPI.minimize()));
          f.append(mk(SVG_MAX, '', () => window.electronAPI.maximize()));
          f.append(mk(SVG_CLOSE, 'ec-close', () => window.electronAPI.close()));
          return f;
        }

        function addFloating() {
          if (document.getElementById('electron-floating')) return;
          const bar = document.createElement('div');
          bar.id = 'electron-floating';
          bar.append(btns());
          document.body.append(bar);
        }

        function addToHeader(header) {
          if (document.getElementById('electron-controls')) return;
          const old = document.getElementById('electron-floating');
          if (old) old.remove();

          header.style.webkitAppRegion = 'drag';
          header.querySelectorAll('button, a, input, select, [role=button]').forEach(el => {
            el.style.webkitAppRegion = 'no-drag';
          });

          const wrap = document.createElement('div');
          wrap.id = 'electron-controls';
          wrap.className = 'ec-wrap';
          wrap.append(btns());
          header.append(wrap);
        }

        const h = document.querySelector('header');
        if (h) addToHeader(h); else addFloating();

        new MutationObserver(() => {
          const h = document.querySelector('header');
          if (h && !document.getElementById('electron-controls')) addToHeader(h);
          else if (!h && !document.getElementById('electron-floating')) addFloating();
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
