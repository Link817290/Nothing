import { useState } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';

/** Detect if running inside Tauri */
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function TitleBar() {
  if (!isTauri) return null;

  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    getCurrentWindow().minimize();
  };

  const handleMaximize = async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const win = getCurrentWindow();
    const maximized = await win.isMaximized();
    if (maximized) {
      await win.unmaximize();
      setIsMaximized(false);
    } else {
      await win.maximize();
      setIsMaximized(true);
    }
  };

  const handleClose = async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    getCurrentWindow().close();
  };

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-9 bg-background/80 backdrop-blur-md border-b border-border/50 select-none shrink-0"
    >
      {/* Left: App name */}
      <div data-tauri-drag-region className="flex items-center gap-2 px-4">
        <span className="text-xs font-semibold text-muted-foreground tracking-wider">NOTHING</span>
      </div>

      {/* Right: Window controls */}
      <div className="flex items-center">
        <button
          onClick={handleMinimize}
          className="h-9 w-11 flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-9 w-11 flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          {isMaximized ? <Copy className="h-3 w-3" /> : <Square className="h-3 w-3" />}
        </button>
        <button
          onClick={handleClose}
          className="h-9 w-11 flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors rounded-tr-xl"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
