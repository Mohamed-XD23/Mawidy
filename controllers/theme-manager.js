// Theme Manager for Mawidy
class ThemeManager {
    constructor() {
        this.themes = {
            light: 'light',
            dark: 'dark',
            auto: 'auto'
        };
        
        this.currentTheme = this.loadTheme();
        this.init();
    }
    
    init() {
        // Apply saved theme on load
        this.applyTheme(this.currentTheme);
        
        // Listen for system theme changes if auto mode is selected
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkModeQuery.addEventListener('change', (e) => {
                if (this.currentTheme === this.themes.auto) {
                    this.applySystemTheme();
                }
            });
        }
        
        // Add theme toggle functionality to any existing theme toggles
        this.attachEventListeners();
    }
    
    loadTheme() {
        const savedTheme = localStorage.getItem('mawidy-theme');
        return savedTheme || this.themes.auto;
    }
    
    saveTheme(theme) {
        localStorage.setItem('mawidy-theme', theme);
        this.currentTheme = theme;
    }
    
    applyTheme(theme) {
        const root = document.documentElement;
        
        if (theme === this.themes.auto) {
            this.applySystemTheme();
        } else if (theme === this.themes.dark) {
            root.setAttribute('data-theme', 'dark');
            this.updateMetaThemeColor('#1A1A1A');
        } else {
            root.setAttribute('data-theme', 'light');
            this.updateMetaThemeColor('#FFF9C4');
        }
        
        // Update active state on theme selector if it exists
        this.updateThemeSelector(theme);
        
        // Fire custom event for theme change
        window.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme: theme } 
        }));
    }
    
    applySystemTheme() {
        const prefersDark = window.matchMedia && 
                           window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (prefersDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            this.updateMetaThemeColor('#1A1A1A');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            this.updateMetaThemeColor('#FFF9C4');
        }
    }
    
    updateMetaThemeColor(color) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.content = color;
    }
    
    toggleTheme() {
        const currentDataTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentDataTheme === 'dark' ? this.themes.light : this.themes.dark;
        this.saveTheme(newTheme);
        this.applyTheme(newTheme);
    }
    
    setTheme(theme) {
        if (Object.values(this.themes).includes(theme)) {
            this.saveTheme(theme);
            this.applyTheme(theme);
        }
    }
    
    updateThemeSelector(theme) {
        const themeSelectors = document.querySelectorAll('[data-theme-selector]');
        themeSelectors.forEach(selector => {
            const options = selector.querySelectorAll('option, input[type="radio"]');
            options.forEach(option => {
                if (option.value === theme) {
                    if (option.type === 'radio') {
                        option.checked = true;
                    } else {
                        option.selected = true;
                    }
                }
            });
        });
    }
    
    attachEventListeners() {
        // Attach to theme selector elements
        const themeSelectors = document.querySelectorAll('[data-theme-selector]');
        themeSelectors.forEach(selector => {
            selector.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        });
        
        // Attach to theme toggle buttons
        const themeToggles = document.querySelectorAll('[data-theme-toggle]');
        themeToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        });
    }
    
    // Get current theme
    getTheme() {
        return this.currentTheme;
    }
    
    // Get actual applied theme (useful when auto is selected)
    getAppliedTheme() {
        const dataTheme = document.documentElement.getAttribute('data-theme');
        return dataTheme || 'light';
    }
}

// Initialize theme manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.themeManager = new ThemeManager();
    });
} else {
    window.themeManager = new ThemeManager();
}

// Export for use in other modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}
