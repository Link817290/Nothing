import { useState, createContext, useContext, useCallback, useRef } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({ title: '' });
  const resolveRef = useRef<(value: boolean) => void>(undefined);

  const confirm: ConfirmFn = useCallback((options) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = () => {
    setOpen(false);
    resolveRef.current?.(true);
  };

  const handleCancel = () => {
    setOpen(false);
    resolveRef.current?.(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={open} onOpenChange={setOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-lg">
            <AlertDialog.Title className="text-lg font-semibold text-foreground">
              {opts.title}
            </AlertDialog.Title>
            {opts.description && (
              <AlertDialog.Description className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {opts.description}
              </AlertDialog.Description>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  {opts.cancelText || 'Cancel'}
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  size="sm"
                  variant={opts.variant === 'destructive' ? 'destructive' : 'default'}
                  onClick={handleConfirm}
                >
                  {opts.confirmText || 'Confirm'}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  );
}
