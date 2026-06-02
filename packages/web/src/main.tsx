import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import './i18n';
import App from './App';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Threads from './pages/Threads';
import ThreadDetail from './pages/ThreadDetail';
import Inbox from './pages/Inbox';
import Sent from './pages/Sent';
import MessageDetail from './pages/MessageDetail';
import Compose from './pages/Compose';
import Settings from './pages/Settings';
import Connect from './pages/Connect';
import AdminUsers from './pages/admin/Users';
import AdminDomains from './pages/admin/Domains';
import AdminMailboxes from './pages/admin/Mailboxes';
import AdminSystem from './pages/admin/System';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Detect Tauri and add class for rounded window styling
if ('__TAURI__' in window) {
  document.documentElement.classList.add('tauri');
}

// Apply persisted theme immediately to prevent flash
(() => {
  try {
    const persisted = localStorage.getItem('nothing-ui');
    if (persisted) {
      const parsed = JSON.parse(persisted);
      const theme = parsed?.state?.theme;
      if (theme === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
        return;
      }
    }
  } catch {}
  // Default to dark
  document.documentElement.classList.add('dark');
  document.documentElement.classList.remove('light');
})();

const P = ({ children }: { children: React.ReactNode }) => <ProtectedRoute>{children}</ProtectedRoute>;

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { index: true, element: <P><Dashboard /></P> },
      { path: 'dashboard', element: <P><Dashboard /></P> },
      { path: 'threads', element: <P><Threads /></P> },
      { path: 'threads/:id', element: <P><ThreadDetail /></P> },
      { path: 'inbox', element: <P><Inbox /></P> },
      { path: 'sent', element: <P><Sent /></P> },
      { path: 'messages/:id', element: <P><MessageDetail /></P> },
      { path: 'compose', element: <P><Compose /></P> },
      { path: 'connect', element: <P><Connect /></P> },
      { path: 'settings', element: <P><Settings /></P> },
      { path: 'admin/users', element: <P><AdminUsers /></P> },
      { path: 'admin/domains', element: <P><AdminDomains /></P> },
      { path: 'admin/mailboxes', element: <P><AdminMailboxes /></P> },
      { path: 'admin/system', element: <P><AdminSystem /></P> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
