/**
 * pwa-init.js
 * PWA & Install Prompts have been disabled.
 * Automatically unregisters any existing Service Workers and removes manifest links.
 */

(function () {
    'use strict';

    // Unregister all service workers
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => {
                registration.unregister().then(() => {
                    console.log('[PWA] Service Worker unregistered');
                });
            });
        }).catch((err) => {
            console.warn('[PWA] Error unregistering Service Worker:', err);
        });
    }

    // Remove any manifest tag if dynamically or statically present
    const manifest = document.querySelector('link[rel="manifest"]');
    if (manifest) {
        manifest.remove();
    }

    // Clean up any existing install card or prompts if left in DOM
    const card = document.getElementById('pwa-install-card');
    if (card) card.remove();

    const iosCard = document.getElementById('pwa-ios-dismiss');
    if (iosCard && iosCard.parentElement) iosCard.parentElement.remove();
})();
