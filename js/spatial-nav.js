/**
 * Aero TV — Spatial Navigation Engine
 * Follows modern web spatial navigation standards for TV remotes and D-pads.
 * Geometric 2D edge-based candidate scoring with roving tabindex.
 */

class SpatialNavigator {
    constructor() {
        this.currentElement = null;
        this.tolerance = 4; // sub-pixel rounding tolerance
        this.init();
    }

    init() {
        // Find initial focus target on load
        window.addEventListener('DOMContentLoaded', () => {
            this.setInitialFocus();
        });

        // Listen for keyboard / TV remote D-Pad events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Sync hover events so mouse / air-mouse works in tandem with D-pad
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('.focusable, .nav-tab, .opt-btn');
            if (target && target !== this.currentElement && this.isVisible(target)) {
                this.focusElement(target, false);
            }
        });
    }

    setInitialFocus() {
        // If lock screen is active, focus the center key (5) or first key
        const lockScreen = document.querySelector('#tv-lock-screen.active');
        if (lockScreen) {
            const centerKey = lockScreen.querySelector('[data-key="5"]') || lockScreen.querySelector('.key-btn');
            if (centerKey) {
                this.focusElement(centerKey, false);
                return;
            }
        }

        // If a modal is open, focus first focusable in modal; else first nav tab or first app
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
            const first = activeModal.querySelector('.focusable');
            if (first) {
                this.focusElement(first, false);
                return;
            }
        }

        const defaultTarget = document.querySelector('.nav-tab.active') ||
                              document.querySelector('.card.focusable');
        if (defaultTarget) {
            this.focusElement(defaultTarget, false);
        }
    }

    isVisible(el) {
        if (!el) return false;
        if (typeof el.checkVisibility === 'function') {
            return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
    }

    focusElement(el, playSound = true) {
        if (!el || el === this.currentElement) return;

        // Clean previous
        if (this.currentElement) {
            this.currentElement.setAttribute('tabindex', '-1');
            this.currentElement.classList.remove('is-focused');
        }

        this.currentElement = el;
        el.setAttribute('tabindex', '0');
        el.classList.add('is-focused');
        el.focus({ preventScroll: true });

        // Ensure visible in TV viewport with smooth auto-scroll
        el.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
        });

        if (playSound && window.TVAudio) {
            window.TVAudio.playFocusTick();
        }
    }

    handleKeyDown(e) {
        // If ambient screensaver is active, ANY key wakes the screen
        const ambient = document.getElementById('ambient-overlay');
        if (ambient && ambient.classList.contains('active')) {
            e.preventDefault();
            if (window.TVApp) {
                window.TVApp.exitAmbientMode();
            }
            return;
        }

        // If target is typing in an input field and pressing non-directional keys
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        const isEditing = activeTag === 'input' && ['ArrowLeft', 'ArrowRight', 'Backspace'].includes(e.key);
        if (isEditing && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
            return; // Let native text input cursor move
        }

        let direction = null;
        switch (e.key) {
            case 'ArrowUp':
            case 'Up':
                direction = 'up';
                break;
            case 'ArrowDown':
            case 'Down':
                direction = 'down';
                break;
            case 'ArrowLeft':
            case 'Left':
                direction = 'left';
                break;
            case 'ArrowRight':
            case 'Right':
                direction = 'right';
                break;
            case 'Enter':
                // Handled natively by click/submit if element is focused
                if (window.TVAudio && document.activeElement) {
                    window.TVAudio.playSelectChime();
                }
                return;
            case 'Escape':
            case 'Backspace':
                // Check if lock screen is active
                const lockScreen = document.querySelector('#tv-lock-screen.active');
                if (lockScreen && window.TVApp) {
                    e.preventDefault();
                    window.TVApp.backspacePinDigit();
                    return;
                }

                // Check if modal or screensaver can be dismissed
                const openModal = document.querySelector('.modal-overlay.active');
                if (openModal) {
                    e.preventDefault();
                    if (window.TVAudio) window.TVAudio.playBackSound();
                    if (window.TVApp) window.TVApp.closeAllModals();
                    return;
                }
                return;
            default:
                return;
        }

        if (!direction) return;

        const bestCandidate = this.findBestCandidate(direction);
        if (bestCandidate) {
            e.preventDefault();
            this.focusElement(bestCandidate, true);
        }
        // If no candidate in direction, DO NOT preventDefault so natural scroll can occur if needed
    }

    findBestCandidate(direction) {
        if (!this.currentElement || !this.isVisible(this.currentElement)) {
            this.setInitialFocus();
            return null;
        }

        // Determine scope: lock screen > modal > full TV app
        const lockScreen = document.querySelector('#tv-lock-screen.active');
        const activeModal = document.querySelector('.modal-overlay.active');
        const rootContainer = lockScreen ? lockScreen : (activeModal ? activeModal : document.getElementById('tv-app'));
        if (!rootContainer) return null;

        const allFocusables = Array.from(rootContainer.querySelectorAll(
            '.focusable, .nav-tab, .opt-btn, .card, .icon-btn, .modal-close, .btn, .tv-input, .key-btn'
        ));

        const candidates = allFocusables.filter(el => el !== this.currentElement && this.isVisible(el));
        if (candidates.length === 0) return null;

        const currentRect = this.currentElement.getBoundingClientRect();
        const validCandidates = [];

        // Step 1: Direction Filter (Edge-based)
        for (const candidate of candidates) {
            const rect = candidate.getBoundingClientRect();

            let isInDirection = false;
            let gap = 0;
            let perpendicularCenterOffset = 0;
            let overlapsPerpendicular = false;

            if (direction === 'right') {
                if (rect.left >= currentRect.right - this.tolerance) {
                    isInDirection = true;
                    gap = rect.left - currentRect.right;
                    overlapsPerpendicular = (rect.bottom > currentRect.top && rect.top < currentRect.bottom);
                    const currentCenterY = (currentRect.top + currentRect.bottom) / 2;
                    const candCenterY = (rect.top + rect.bottom) / 2;
                    perpendicularCenterOffset = Math.abs(candCenterY - currentCenterY);
                }
            } else if (direction === 'left') {
                if (rect.right <= currentRect.left + this.tolerance) {
                    isInDirection = true;
                    gap = currentRect.left - rect.right;
                    overlapsPerpendicular = (rect.bottom > currentRect.top && rect.top < currentRect.bottom);
                    const currentCenterY = (currentRect.top + currentRect.bottom) / 2;
                    const candCenterY = (rect.top + rect.bottom) / 2;
                    perpendicularCenterOffset = Math.abs(candCenterY - currentCenterY);
                }
            } else if (direction === 'down') {
                if (rect.top >= currentRect.bottom - this.tolerance) {
                    isInDirection = true;
                    gap = rect.top - currentRect.bottom;
                    overlapsPerpendicular = (rect.right > currentRect.left && rect.left < currentRect.right);
                    const currentCenterX = (currentRect.left + currentRect.right) / 2;
                    const candCenterX = (rect.left + rect.right) / 2;
                    perpendicularCenterOffset = Math.abs(candCenterX - currentCenterX);
                }
            } else if (direction === 'up') {
                if (rect.bottom <= currentRect.top + this.tolerance) {
                    isInDirection = true;
                    gap = currentRect.top - rect.bottom;
                    overlapsPerpendicular = (rect.right > currentRect.left && rect.left < currentRect.right);
                    const currentCenterX = (currentRect.left + currentRect.right) / 2;
                    const candCenterX = (rect.left + rect.right) / 2;
                    perpendicularCenterOffset = Math.abs(candCenterX - currentCenterX);
                }
            }

            if (isInDirection) {
                // Score: prioritize overlapping candidates first, then weighted distance
                const weight = 2.4;
                const score = overlapsPerpendicular
                    ? gap + (perpendicularCenterOffset * 0.4)
                    : gap + (perpendicularCenterOffset * weight) + 1000;

                validCandidates.push({
                    element: candidate,
                    overlaps: overlapsPerpendicular,
                    gap: gap,
                    offset: perpendicularCenterOffset,
                    score: score
                });
            }
        }

        if (validCandidates.length === 0) return null;

        // Sort ascending by score
        validCandidates.sort((a, b) => a.score - b.score);
        return validCandidates[0].element;
    }
}

// Global Spatial Navigator instance
window.SpatialNav = new SpatialNavigator();
