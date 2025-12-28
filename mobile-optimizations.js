/**
 * Mobile Optimizations for Munin
 * Handles dropdown repositioning and mobile-specific UI improvements
 */

(function() {
    'use strict';

    /**
     * Reposition an element to ensure it stays within viewport bounds
     * @param {HTMLElement} element - The element to reposition
     * @param {HTMLElement} trigger - The element that triggered the dropdown
     */
    function repositionDropdown(element, trigger) {
        if (!element || !trigger) return;

        const rect = element.getBoundingClientRect();
        const triggerRect = trigger.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Reset any previous repositioning
        element.style.removeProperty('left');
        element.style.removeProperty('right');
        element.style.removeProperty('top');
        element.style.removeProperty('bottom');
        element.style.removeProperty('max-height');

        // Check if dropdown goes off the right edge
        if (rect.right > viewportWidth) {
            const overflow = rect.right - viewportWidth;
            element.style.right = `${Math.max(0, -overflow + 10)}px`;
            element.style.left = 'auto';
        }

        // Check if dropdown goes off the left edge
        if (rect.left < 0) {
            element.style.left = '10px';
            element.style.right = 'auto';
        }

        // Check if dropdown goes off the bottom edge
        if (rect.bottom > viewportHeight) {
            // Try to position above the trigger instead
            const spaceAbove = triggerRect.top;
            const spaceBelow = viewportHeight - triggerRect.bottom;

            if (spaceAbove > spaceBelow && spaceAbove > 200) {
                element.style.bottom = 'calc(100% + 0.5rem)';
                element.style.top = 'auto';
                element.style.maxHeight = `${Math.min(spaceAbove - 20, 400)}px`;
            } else {
                element.style.maxHeight = `${Math.min(spaceBelow - 20, 400)}px`;
            }
        }

        // Check if dropdown goes off the top edge
        if (rect.top < 0) {
            element.style.top = '10px';
            element.style.bottom = 'auto';
        }
    }

    /**
     * Monitor and reposition all active dropdowns
     */
    function monitorDropdowns() {
        // Monitor custom mobile selector dropdown
        const mobileSelector = document.getElementById('customMobileSelector');
        const mobileSelectorBtn = document.getElementById('customMobileSelectorBtn');
        const mobileSelectorDropdown = document.getElementById('customMobileSelectorDropdown');

        if (mobileSelector && mobileSelector.classList.contains('is-open') && mobileSelectorDropdown) {
            repositionDropdown(mobileSelectorDropdown, mobileSelectorBtn);
        }

        // Monitor autocomplete container
        const autocompleteContainer = document.getElementById('autocompleteContainer');
        const noteEditor = document.getElementById('noteEditor');

        if (autocompleteContainer && autocompleteContainer.style.display !== 'none' && noteEditor) {
            repositionDropdown(autocompleteContainer, noteEditor);
        }

        // Monitor AI actions menu
        const aiActionsContainer = document.getElementById('aiActionsContainer');
        const aiActionsBtn = document.getElementById('aiActionsBtn');
        const aiActionsMenu = document.getElementById('aiActionsMenu');

        if (aiActionsContainer && aiActionsContainer.classList.contains('is-open') && aiActionsMenu) {
            repositionDropdown(aiActionsMenu, aiActionsBtn);
        }
    }

    /**
     * Setup observers and event listeners for dropdown repositioning
     */
    function setupDropdownMonitoring() {
        // Use MutationObserver to detect when dropdowns become visible
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' &&
                    (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
                    // Delay to ensure DOM has updated
                    setTimeout(monitorDropdowns, 10);
                }
            });
        });

        // Observe dropdown containers
        const elementsToObserve = [
            document.getElementById('customMobileSelector'),
            document.getElementById('autocompleteContainer'),
            document.getElementById('aiActionsContainer')
        ].filter(Boolean);

        elementsToObserve.forEach(element => {
            observer.observe(element, {
                attributes: true,
                attributeFilter: ['class', 'style']
            });
        });

        // Reposition on window resize and scroll
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(monitorDropdowns, 100);
        });

        window.addEventListener('scroll', monitorDropdowns, { passive: true });

        // Reposition when editor panel scrolls
        const editorPanel = document.getElementById('editorPanel');
        if (editorPanel) {
            editorPanel.addEventListener('scroll', monitorDropdowns, { passive: true });
        }
    }

    /**
     * Prevent body scroll when modals are open (iOS fix)
     */
    function setupModalScrollLock() {
        const modals = document.querySelectorAll('.modal-overlay');

        modals.forEach(modal => {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const isVisible = modal.style.display === 'flex';
                        if (isVisible) {
                            document.body.style.overflow = 'hidden';
                            document.body.style.position = 'fixed';
                            document.body.style.width = '100%';
                        } else {
                            document.body.style.removeProperty('overflow');
                            document.body.style.removeProperty('position');
                            document.body.style.removeProperty('width');
                        }
                    }
                });
            });

            observer.observe(modal, {
                attributes: true,
                attributeFilter: ['style']
            });
        });
    }

    /**
     * Improve touch target sizes on mobile
     */
    function improveTouchTargets() {
        if (window.innerWidth <= 768) {
            const smallButtons = document.querySelectorAll('.icon-btn, .toolbar-btn');
            smallButtons.forEach(btn => {
                const rect = btn.getBoundingClientRect();
                if (rect.width < 44 || rect.height < 44) {
                    btn.style.minWidth = '44px';
                    btn.style.minHeight = '44px';
                }
            });
        }
    }

    /**
     * Handle viewport changes on mobile (address bar show/hide)
     */
    function handleViewportChanges() {
        // Update CSS custom property for actual viewport height
        const updateVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        updateVH();
        window.addEventListener('resize', updateVH);
        window.addEventListener('orientationchange', () => {
            setTimeout(updateVH, 100);
        });
    }

    /**
     * Initialize all mobile optimizations
     */
    function init() {
        // Only run on mobile devices
        if (window.innerWidth <= 1024) {
            setupDropdownMonitoring();
            setupModalScrollLock();
            improveTouchTargets();
            handleViewportChanges();

            // Re-check touch targets on resize
            window.addEventListener('resize', improveTouchTargets);

            console.log('[Mobile Optimizations] Initialized');
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
