// i18n.js – Responsible for initializing translations across pages
import { initI18n } from './utils.js';

// Automatically initialize translations once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initI18n().catch((err) => console.error('i18n init error:', err));
  });
} else {
  initI18n().catch((err) => console.error('i18n init error:', err));
}

// Add your i18n functions here
