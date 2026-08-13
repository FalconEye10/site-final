import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { MAINTENANCE_MODE } from './config/maintenance.ts';

declare global {
  interface Window {
    lenis: any;
  }
}

const mainEl = document.querySelector('main');
const headerEl = document.querySelector('header');
const rootEl = document.getElementById('root');

function handleRouting() {
  if (MAINTENANCE_MODE || window.location.hash === '#dashboard') {
    if (mainEl) mainEl.classList.add('hidden');
    if (headerEl) headerEl.classList.add('hidden');
    if (rootEl) rootEl.classList.remove('hidden');

    // Restore native cursor and disable landing page effects during maintenance/app
    document.body.classList.add('app-active');
    
    // Disable Lenis smooth scrolling
    if (window.lenis) {
      window.lenis.destroy();
      window.lenis = null;
    }
    document.documentElement.classList.remove('lenis', 'lenis-smooth', 'lenis-stopped');
    document.documentElement.style.height = '100%';
    document.body.style.overflow = MAINTENANCE_MODE ? 'hidden' : 'auto';
    document.body.classList.remove('overflow-x-hidden');
  } else {
    if (mainEl) mainEl.classList.remove('hidden');
    if (headerEl) headerEl.classList.remove('hidden');
    if (rootEl) rootEl.classList.add('hidden');
    document.body.classList.remove('app-active');
  }
}

// Listen to hash changes
window.addEventListener('hashchange', handleRouting);

// Run routing logic initially
handleRouting();

import { CommunityPitchForm } from './components/public/CommunityPitchForm.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

const communityPitchEl = document.getElementById('community-pitch-root');
if (communityPitchEl) {
  ReactDOM.createRoot(communityPitchEl).render(
    <React.StrictMode>
      <CommunityPitchForm />
    </React.StrictMode>
  );
}

