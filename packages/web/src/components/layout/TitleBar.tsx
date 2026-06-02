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
      className="flex items-center justify-between h-8 bg-background border-b border-border/50 select-none shrink-0"
    >
      <div data-tauri-drag-region className="flex items-center gap-2 pl-4">
        <span className="text-[11px] font-semibold text-muted-foreground tracking-widest">NOTHING</span>
        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
      </div>

      <div className="flex items-center h-8">
        <button
          onClick={handleMinimize}
          className="h-8 w-10 flex items-center justify-center text-muted-foreground/60 hover:bg-accent hover:text-foreground transition-colors"
        >
          <Minus className="h-3 w-3" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-8 w-10 flex items-center justify-center text-muted-foreground/60 hover:bg-accent hover:text-foreground transition-colors"
        >
          {isMaximized ? <Copy className="h-2.5 w-2.5" /> : <Square className="h-2.5 w-2.5" />}
        </button>
        <button
          onClick={handleClose}
          className="h-8 w-10 flex items-center justify-center text-muted-foreground/60 hover:bg-destructive hover:text-white transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
