import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

declare global {
  interface Window {
    lenis: any;
  }
}

const mainEl = document.querySelector('main');
const headerEl = document.querySelector('header');
const rootEl = document.getElementById('root');

function handleRouting() {
  if (window.location.hash === '#dashboard') {
    if (mainEl) mainEl.classList.add('hidden');
    if (headerEl) headerEl.classList.add('hidden');
    if (rootEl) rootEl.classList.remove('hidden');

    // The custom cursor is a landing-page effect. Inside the admin app we
    // restore the native cursor so forms, tables and buttons behave normally.
    document.body.classList.add('app-active');
    
    // Disable Lenis smooth scrolling for the React App
    if (window.lenis) {
      window.lenis.destroy();
      window.lenis = null;
    }
    document.documentElement.classList.remove('lenis', 'lenis-smooth', 'lenis-stopped');
    document.documentElement.style.height = 'auto';
    document.body.style.overflow = 'auto';
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

