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

  // Inject drag bar + window controls after page loads
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      if (!document.getElementById('electron-titlebar')) {
        const bar = document.createElement('div');
        bar.id = 'electron-titlebar';
        bar.style.cssText = \`
          position: fixed; top: 0; left: 0; right: 0; height: 32px;
          -webkit-app-region: drag; z-index: 99999;
          display: flex; align-items: center; justify-content: space-between;
          background: var(--background, #09090b);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
        \`;

        const title = document.createElement('span');
        title.textContent = 'nothing';
        title.style.cssText = 'padding-left:16px;font-size:12px;font-weight:600;color:rgba(255,255,255,0.4);letter-spacing:0.05em;';

        const dot = document.createElement('span');
        dot.style.cssText = 'width:5px;height:5px;border-radius:50%;background:#ea580c;margin-left:6px;';

        const leftGroup = document.createElement('div');
        leftGroup.style.cssText = 'display:flex;align-items:center;';
        leftGroup.append(title, dot);

        const controls = document.createElement('div');
        controls.style.cssText = '-webkit-app-region:no-drag;display:flex;height:32px;';

        function makeBtn(label, hoverBg) {
          const btn = document.createElement('button');
          btn.textContent = label;
          btn.style.cssText = 'width:46px;height:32px;border:none;background:transparent;color:rgba(255,255,255,0.4);font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.15s;';
          btn.onmouseover = () => { btn.style.background = hoverBg; if (hoverBg.includes('e53')) btn.style.color = '#fff'; };
          btn.onmouseout = () => { btn.style.background = 'transparent'; btn.style.color = 'rgba(255,255,255,0.4)'; };
          return btn;
        }

        const min = makeBtn('—', 'rgba(255,255,255,0.08)');
        min.onclick = () => window.electronAPI.minimize();

        const max = makeBtn('□', 'rgba(255,255,255,0.08)');
        max.onclick = () => window.electronAPI.maximize();

        const close = makeBtn('✕', '#e53e3e');
        close.onclick = () => window.electronAPI.close();

        controls.append(min, max, close);
        bar.append(leftGroup, controls);
        document.body.prepend(bar);
        document.body.style.paddingTop = '32px';
      }
    `);
  });

  // IPC handlers
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
