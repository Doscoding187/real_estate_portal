/**
 * Focus Manager
 *
 * Manages focus indicators and keyboard/mouse detection.
 * Adds appropriate classes to body element to control focus visibility.
 *
 * Requirements: 10.5
 */

/**
 * Initialize focus management
 *
 * Detects whether user is navigating with keyboard or mouse
 * and applies appropriate classes to body element.
 */
export function initializeFocusManager(): () => void {
  let isUsingKeyboard = false;

  const handleKeyDown = (e: KeyboardEvent) => {
    // Tab key indicates keyboard navigation
    if (e.key === 'Tab') {
      if (!isUsingKeyboard) {
        isUsingKeyboard = true;
        document.body.classList.add('using-keyboard');
        document.body.classList.remove('using-mouse');
      }
    }
  };

  const handleMouseDown = () => {
    if (isUsingKeyboard) {
      isUsingKeyboard = false;
      document.body.classList.add('using-mouse');
      document.body.classList.remove('using-keyboard');
    }
  };

  const handlePointerDown = (e: PointerEvent) => {
    // Only treat as mouse if it's not a touch event
    if (e.pointerType === 'mouse') {
      handleMouseDown();
    }
  };

  // Add event listeners
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('pointerdown', handlePointerDown);

  // Initialize with mouse mode
  document.body.classList.add('using-mouse');

  // Return cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('pointerdown', handlePointerDown);
    document.body.classList.remove('using-keyboard', 'using-mouse');
  };
}

/**
 * Focus trap utility for modals and overlays
 */
export class FocusTrap {
  private element: HTMLElement;
  private previouslyFocusedElement: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];

  constructor(element: HTMLElement) {
    this.element = element;
  }

  /**
   * Activate the focus trap
   */
  activate(): void {
    // Store currently focused element
    this.previouslyFocusedElement = document.activeElement as HTMLElement;

    // Get all focusable elements within the trap
    this.updateFocusableElements();

    // Focus first element
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }

    // Add event listener for Tab key
    this.element.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Deactivate the focus trap
   */
  deactivate(): void {
    // Remove event listener
    this.element.removeEventListener('keydown', this.handleKeyDown);

    // Restore focus to previously focused element
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus();
    }
  }

  /**
   * Update list of focusable elements
   */
  private updateFocusableElements(): void {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    this.focusableElements = Array.from(this.element.querySelectorAll(selector)) as HTMLElement[];
  }

  /**
   * Handle Tab key navigation
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return;

    this.updateFocusableElements();

    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab: moving backwards
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: moving forwards
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };
}

/**
 * Create a focus trap for an element
 */
export function createFocusTrap(element: HTMLElement): FocusTrap {
  return new FocusTrap(element);
}

/**
 * Ensure an element is visible in the viewport
 */
export function ensureElementVisible(element: HTMLElement): void {
  const rect = element.getBoundingClientRect();
  const isVisible =
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth;

  if (!isVisible) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });
  }
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
}

/**
 * Check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableElements = getFocusableElements(document.body);
  return focusableElements.includes(element);
}

/**
 * Focus the first focusable element in a container
 */
export function focusFirstElement(container: HTMLElement): void {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
  }
}

/**
 * Focus the last focusable element in a container
 */
export function focusLastElement(container: HTMLElement): void {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[focusableElements.length - 1].focus();
  }
}
