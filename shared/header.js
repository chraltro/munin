/**
 * NORRØN UNIFIED HEADER COMPONENT
 * Vanilla JavaScript implementation for non-React apps
 *
 * Usage:
 * const header = new UnifiedHeader({
 *   logo: 'logo.svg',
 *   title: 'App Name',
 *   accentColor: '#7DCFFF',
 *   actions: [
 *     { id: 'action1', icon: 'fas fa-plus', label: 'Add', onClick: () => {} }
 *   ],
 *   onLogout: () => { console.log('Logout') },
 *   showMobileTitle: false
 * });
 * document.body.prepend(header.render());
 */

class UnifiedHeader {
  constructor(options = {}) {
    this.logo = options.logo || 'logo.svg';
    this.title = options.title || 'App';
    this.accentColor = options.accentColor;
    this.actions = options.actions || [];
    this.onLogout = options.onLogout;
    this.onThemeToggle = options.onThemeToggle;
    this.showMobileTitle = options.showMobileTitle || false;
    this.showStatus = options.showStatus || false;
    this.statusText = options.statusText || 'Saved';
    this.statusType = options.statusType || 'success';

    this.userMenuOpen = false;
    this.headerElement = null;
    this.userMenuDropdown = null;
  }

  /**
   * Render the header element
   * @returns {HTMLElement}
   */
  render() {
    // Create header element
    const header = document.createElement('header');
    header.className = 'unified-header';
    header.setAttribute('role', 'banner');

    if (this.accentColor) {
      header.style.setProperty('--accent', this.accentColor);
    }

    // Skip to content link
    const skipLink = document.createElement('a');
    skipLink.className = 'skip-to-content';
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to content';
    header.appendChild(skipLink);

    // Brand section
    const brand = this._createBrand();
    header.appendChild(brand);

    // Actions section
    const actionsContainer = this._createActions();
    header.appendChild(actionsContainer);

    this.headerElement = header;

    // Add body class for layout spacing
    document.body.classList.add('has-unified-header');

    return header;
  }

  /**
   * Create brand section (logo + title)
   * @private
   */
  _createBrand() {
    const brand = document.createElement('div');
    brand.className = 'header-brand';

    const logo = document.createElement('img');
    logo.src = this.logo;
    logo.alt = `${this.title} logo`;
    logo.className = 'header-logo';

    const title = document.createElement('h1');
    title.className = `header-title ${this.showMobileTitle ? 'show-mobile' : ''}`;
    title.textContent = this.title;

    brand.appendChild(logo);
    brand.appendChild(title);

    return brand;
  }

  /**
   * Create actions section
   * @private
   */
  _createActions() {
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'header-actions';

    // Status indicator
    if (this.showStatus) {
      const status = this._createStatus();
      actionsContainer.appendChild(status);
    }

    // Action buttons
    this.actions.forEach(action => {
      const button = this._createActionButton(action);
      actionsContainer.appendChild(button);
    });

    // User menu
    const userMenu = this._createUserMenu();
    actionsContainer.appendChild(userMenu);

    return actionsContainer;
  }

  /**
   * Create status indicator
   * @private
   */
  _createStatus() {
    const status = document.createElement('div');
    status.className = `header-status ${this.statusType}`;
    status.id = 'header-status';

    const icon = document.createElement('i');
    icon.className = this._getStatusIcon(this.statusType);

    const text = document.createElement('span');
    text.textContent = this.statusText;

    status.appendChild(icon);
    status.appendChild(text);

    return status;
  }

  /**
   * Get status icon class
   * @private
   */
  _getStatusIcon(type) {
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    return icons[type] || icons.success;
  }

  /**
   * Create action button
   * @private
   */
  _createActionButton(action) {
    const button = document.createElement('button');

    if (action.variant === 'icon') {
      button.className = 'header-icon-btn';
    } else {
      button.className = `header-action-btn ${action.primary ? 'primary' : ''} ${
        action.showMobileText ? 'show-mobile-text' : ''
      }`;
    }

    button.setAttribute('aria-label', action.label);
    button.title = action.label;

    // Icon
    if (action.icon) {
      const icon = document.createElement('i');
      icon.className = action.icon;
      button.appendChild(icon);
    }

    // Text (if not icon-only)
    if (action.variant !== 'icon') {
      const text = document.createElement('span');
      text.textContent = action.label;
      button.appendChild(text);
    }

    // Click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      if (action.onClick) {
        action.onClick();
      }
    });

    return button;
  }

  /**
   * Create user menu
   * @private
   */
  _createUserMenu() {
    const userMenu = document.createElement('div');
    userMenu.className = 'user-menu';

    // Toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'user-menu-toggle';
    toggleBtn.setAttribute('aria-label', 'User menu');
    toggleBtn.setAttribute('aria-expanded', 'false');

    // User icon
    const userIcon = document.createElement('i');
    userIcon.className = 'fas fa-user';
    toggleBtn.appendChild(userIcon);

    // Dropdown menu
    const dropdown = document.createElement('menu');
    dropdown.className = 'user-menu-dropdown';
    dropdown.setAttribute('role', 'menu');

    // Menu items
    const menuItems = [];

    // Theme toggle (if provided)
    if (this.onThemeToggle) {
      menuItems.push({
        label: 'Change Theme',
        icon: 'fas fa-palette',
        onClick: this.onThemeToggle
      });
    }

    // Settings
    menuItems.push({
      label: 'Settings',
      icon: 'fas fa-cog',
      onClick: () => console.log('Settings clicked')
    });

    // Separator
    menuItems.push({ type: 'separator' });

    // Logout (if provided)
    if (this.onLogout) {
      menuItems.push({
        label: 'Logout',
        icon: 'fas fa-sign-out-alt',
        onClick: this.onLogout
      });
    }

    menuItems.forEach(item => {
      if (item.type === 'separator') {
        const separator = document.createElement('li');
        separator.setAttribute('role', 'separator');
        dropdown.appendChild(separator);
      } else {
        const li = document.createElement('li');
        li.setAttribute('role', 'menuitem');

        const button = document.createElement('button');

        if (item.icon) {
          const icon = document.createElement('i');
          icon.className = item.icon;
          button.appendChild(icon);
        }

        const text = document.createTextNode(item.label);
        button.appendChild(text);

        button.addEventListener('click', (e) => {
          e.preventDefault();
          this.closeUserMenu();
          if (item.onClick) {
            item.onClick();
          }
        });

        li.appendChild(button);
        dropdown.appendChild(li);
      }
    });

    userMenu.appendChild(toggleBtn);
    userMenu.appendChild(dropdown);

    this.userMenuDropdown = dropdown;

    // Toggle menu on button click
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleUserMenu();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!userMenu.contains(e.target)) {
        this.closeUserMenu();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.userMenuOpen) {
        this.closeUserMenu();
        toggleBtn.focus();
      }
    });

    return userMenu;
  }

  /**
   * Toggle user menu open/closed
   */
  toggleUserMenu() {
    if (this.userMenuOpen) {
      this.closeUserMenu();
    } else {
      this.openUserMenu();
    }
  }

  /**
   * Open user menu
   */
  openUserMenu() {
    this.userMenuOpen = true;
    this.userMenuDropdown.classList.add('open');
    const toggleBtn = this.headerElement.querySelector('.user-menu-toggle');
    toggleBtn.setAttribute('aria-expanded', 'true');
  }

  /**
   * Close user menu
   */
  closeUserMenu() {
    this.userMenuOpen = false;
    if (this.userMenuDropdown) {
      this.userMenuDropdown.classList.remove('open');
    }
    const toggleBtn = this.headerElement?.querySelector('.user-menu-toggle');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
  }

  /**
   * Update status indicator
   * @param {string} text - Status text
   * @param {string} type - Status type (success, error, warning, info)
   */
  updateStatus(text, type = 'success') {
    const status = this.headerElement?.querySelector('#header-status');
    if (!status) return;

    this.statusText = text;
    this.statusType = type;

    // Update class
    status.className = `header-status ${type}`;

    // Update icon
    const icon = status.querySelector('i');
    if (icon) {
      icon.className = this._getStatusIcon(type);
    }

    // Update text
    const textSpan = status.querySelector('span');
    if (textSpan) {
      textSpan.textContent = text;
    }
  }

  /**
   * Update title
   * @param {string} newTitle
   */
  updateTitle(newTitle) {
    this.title = newTitle;
    const titleElement = this.headerElement?.querySelector('.header-title');
    if (titleElement) {
      titleElement.textContent = newTitle;
    }
  }

  /**
   * Destroy the header and clean up
   */
  destroy() {
    if (this.headerElement) {
      this.headerElement.remove();
      this.headerElement = null;
    }
    document.body.classList.remove('has-unified-header');
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnifiedHeader;
}
