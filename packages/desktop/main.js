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

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Inject titlebar + hide scrollbar
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      *::-webkit-scrollbar { width: 0 !important; height: 0 !important; }
      * { scrollbar-width: none !important; }
    `);

    mainWindow.webContents.executeJavaScript(`
      if (!document.getElementById('electron-titlebar')) {
        const isDark = document.documentElement.classList.contains('dark');
        const fg = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
        const hoverBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
        const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';

        const bar = document.createElement('div');
        bar.id = 'electron-titlebar';
        bar.style.cssText = 'position:fixed;top:0;left:0;right:0;height:32px;-webkit-app-region:drag;z-index:99999;display:flex;align-items:center;justify-content:space-between;background:var(--background,#fff);border-bottom:1px solid ' + borderColor + ';font-family:Inter,-apple-system,sans-serif;';

        const title = document.createElement('span');
        title.textContent = 'nothing';
        title.style.cssText = 'padding-left:16px;font-size:12px;font-weight:600;color:' + fg + ';letter-spacing:0.05em;';

        const dot = document.createElement('span');
        dot.style.cssText = 'width:5px;height:5px;border-radius:50%;background:#ea580c;margin-left:6px;';

        const left = document.createElement('div');
        left.style.cssText = 'display:flex;align-items:center;';
        left.append(title, dot);

        const controls = document.createElement('div');
        controls.style.cssText = '-webkit-app-region:no-drag;display:flex;height:32px;';

        function makeBtn(label, isClose) {
          const btn = document.createElement('button');
          btn.textContent = label;
          btn.style.cssText = 'width:46px;height:32px;border:none;background:transparent;color:' + fg + ';font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;';
          btn.onmouseover = () => {
            if (isClose) { btn.style.background = '#e53e3e'; btn.style.color = '#fff'; }
            else { btn.style.background = hoverBg; }
          };
          btn.onmouseout = () => { btn.style.background = 'transparent'; btn.style.color = fg; };
          return btn;
        }

        const min = makeBtn('—'); min.onclick = () => window.electronAPI.minimize();
        const max = makeBtn('□'); max.onclick = () => window.electronAPI.maximize();
        const close = makeBtn('✕', true); close.onclick = () => window.electronAPI.close();

        controls.append(min, max, close);
        bar.append(left, controls);
        document.body.prepend(bar);
        document.body.style.paddingTop = '32px';
      }
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
