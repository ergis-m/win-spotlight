import "./styles/settings.css";

class SettingsPage {
  private contentArea: HTMLElement;
  private navItems: HTMLElement[] = [];
  private pages = new Map<string, HTMLElement>();

  constructor(root: HTMLElement) {
    const container = document.createElement("div");
    container.className = "settings";

    const nav = this.createNav();

    this.contentArea = document.createElement("div");
    this.contentArea.className = "settings-content";

    this.pages.set("general", this.createGeneralPage());
    this.pages.set("about", this.createAboutPage());

    container.appendChild(nav);
    container.appendChild(this.contentArea);
    root.appendChild(container);

    this.showPage("general");
  }

  private createNav(): HTMLElement {
    const nav = document.createElement("nav");
    nav.className = "settings-nav";

    const title = document.createElement("h1");
    title.className = "settings-nav-title";
    title.textContent = "Settings";
    nav.appendChild(title);

    const items = [
      { id: "general", label: "General" },
      { id: "about", label: "About" },
    ];

    for (const item of items) {
      const el = document.createElement("button");
      el.className = "settings-nav-item";
      el.dataset.page = item.id;
      el.textContent = item.label;
      el.addEventListener("click", () => this.showPage(item.id));
      nav.appendChild(el);
      this.navItems.push(el);
    }

    return nav;
  }

  private showPage(id: string) {
    const page = this.pages.get(id);
    if (page) {
      this.contentArea.replaceChildren(page);
    }
    for (const item of this.navItems) {
      item.classList.toggle("active", item.dataset.page === id);
    }
  }

  private createGeneralPage(): HTMLElement {
    const page = document.createElement("div");
    page.className = "settings-page";

    page.innerHTML = `
      <h2 class="settings-page-title">General</h2>
      <div class="settings-card">
        <div class="settings-row">
          <div class="settings-row-text">
            <div class="settings-row-title">Launch at login</div>
            <div class="settings-row-desc">Start Win Spotlight when you sign in to Windows</div>
          </div>
          <label class="settings-toggle">
            <input type="checkbox" id="launch-at-login">
            <span class="settings-toggle-track"></span>
          </label>
        </div>
      </div>
      <div class="settings-card">
        <div class="settings-row">
          <div class="settings-row-text">
            <div class="settings-row-title">Activation shortcut</div>
            <div class="settings-row-desc">The keyboard shortcut to open the launcher</div>
          </div>
          <span class="settings-shortcut">Alt + Space</span>
        </div>
      </div>
    `;

    return page;
  }

  private createAboutPage(): HTMLElement {
    const page = document.createElement("div");
    page.className = "settings-page";

    page.innerHTML = `
      <h2 class="settings-page-title">About</h2>
      <div class="settings-card">
        <div class="settings-about">
          <div class="settings-about-name">Win Spotlight</div>
          <div class="settings-about-version">Version 0.1.0</div>
        </div>
      </div>
    `;

    return page;
  }
}

const root = document.getElementById("settings-app");
if (root) new SettingsPage(root);
