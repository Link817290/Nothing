import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles.css';

import App from './App.jsx';
import Landing from './pages/Landing.jsx';
import SetupStep1 from './pages/SetupStep1.jsx';
import SetupStep2A from './pages/SetupStep2A.jsx';
import SetupStep2B from './pages/SetupStep2B.jsx';
import SetupStep5 from './pages/SetupStep5.jsx';
import Register from './pages/Register.jsx';
import Inbox from './pages/Inbox.jsx';
import Sent from './pages/Sent.jsx';
import MessageDetail from './pages/MessageDetail.jsx';
import Compose from './pages/Compose.jsx';
import Tokens from './pages/Tokens.jsx';
import Settings from './pages/Settings.jsx';
import States from './pages/States.jsx';
import Globals from './pages/Globals.jsx';
import MobileInbox from './pages/MobileInbox.jsx';
import MobileDetail from './pages/MobileDetail.jsx';
import MobileQuickReply from './pages/MobileQuickReply.jsx';
import MobileSettings from './pages/MobileSettings.jsx';
import MobileTokens from './pages/MobileTokens.jsx';
import MobileNotifications from './pages/MobileNotifications.jsx';

const router = (
  <BrowserRouter>
    <Routes>
      <Route element={<App />}>
        <Route path="/"              element={<Landing />} />
        <Route path="/setup"         element={<SetupStep1 />} />
        <Route path="/setup/dns"     element={<SetupStep2A />} />
        <Route path="/setup/email"   element={<SetupStep2B />} />
        <Route path="/setup/done"    element={<SetupStep5 />} />
        <Route path="/register"      element={<Register />} />
        <Route path="/inbox"         element={<Inbox />} />
        <Route path="/sent"          element={<Sent />} />
        <Route path="/messages/:id"  element={<MessageDetail />} />
        <Route path="/compose"       element={<Compose />} />
        <Route path="/tokens"        element={<Tokens />} />
        <Route path="/settings"      element={<Settings />} />
        <Route path="/states/:kind?" element={<States />} />
        <Route path="/globals/:kind?" element={<Globals />} />
        <Route path="/m/inbox"       element={<MobileInbox />} />
        <Route path="/m/messages/:id" element={<MobileDetail />} />
        <Route path="/m/decide"      element={<MobileQuickReply />} />
        <Route path="/m/settings"    element={<MobileSettings />} />
        <Route path="/m/tokens"      element={<MobileTokens />} />
        <Route path="/m/activity"    element={<MobileNotifications />} />
        <Route path="*"              element={<Navigate to="/" />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')).render(router);
