import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { TitleBar } from '@/components/layout/TitleBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from '@/components/ui/toast';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { api } from '@/services/api';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  const isLoginPage = location.pathname === '/login';

  // Fetch user on mount if we have a token
  useEffect(() => {
    if (token) {
      api.me().then(setUser).catch(() => {
        useAuthStore.getState().logout();
        navigate('/login');
      });
    }
  }, [token]);

  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

  // Login page -- no shell
  if (isLoginPage) return (
    <ConfirmProvider>
      <div className={isTauri ? 'rounded-xl overflow-hidden' : ''}>
        <TitleBar />
        <Outlet />
      </div>
      <Toaster />
    </ConfirmProvider>
  );

  // Authenticated shell
  return (
    <ConfirmProvider>
      <div className={`flex min-h-screen flex-col bg-background ${isTauri ? 'rounded-xl overflow-hidden' : ''}`}>
        <TitleBar />
        <TopBar />
        <div className="flex flex-1">
          <Sidebar />
          <main
            className={`flex flex-1 flex-col overflow-auto bg-background transition-[margin] duration-300 ease-out pb-16 md:pb-0 ${
              sidebarOpen ? 'md:ml-64' : ''
            }`}
          >
            <Outlet />
          </main>
        </div>
        <Toaster />
      </div>
    </ConfirmProvider>
  );
}
