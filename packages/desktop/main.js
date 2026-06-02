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

    // Inject window controls only (no branding — web has its own)
    mainWindow.webContents.executeJavaScript(`
      if (!document.getElementById('electron-controls')) {
        const isDark = document.documentElement.classList.contains('dark');
        const fg = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
        const hoverBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

        // Window control buttons — float top-right over existing header
        const controls = document.createElement('div');
        controls.id = 'electron-controls';
        controls.style.cssText = 'position:fixed;top:0;right:0;z-index:99999;display:flex;height:40px;-webkit-app-region:no-drag;';

        function makeBtn(label, isClose) {
          const btn = document.createElement('button');
          btn.textContent = label;
          btn.style.cssText = 'width:46px;height:40px;border:none;background:transparent;color:' + fg + ';font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;';
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
        document.body.append(controls);

        // Make the existing header draggable
        const header = document.querySelector('header');
        if (header) header.style.webkitAppRegion = 'drag';

        // Make buttons inside header NOT draggable
        header?.querySelectorAll('button, a, input').forEach(el => {
          el.style.webkitAppRegion = 'no-drag';
        });
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
