export class SearchBar {
  public element: HTMLElement;
  private input: HTMLInputElement;
  private debounceTimer: number | null = null;
  private onQuery: (query: string) => void;

  constructor(onQuery: (query: string) => void) {
    this.onQuery = onQuery;
    this.element = document.createElement("div");
    this.element.className = "search-bar";

    const icon = document.createElement("span");
    icon.className = "search-icon";
    icon.textContent = "\u{1F50D}";

    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.placeholder = "Search apps, commands...";
    this.input.autofocus = true;
    this.input.className = "search-input";

    this.input.addEventListener("input", () => this.handleInput());

    this.element.appendChild(icon);
    this.element.appendChild(this.input);
  }

  private handleInput() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => {
      this.onQuery(this.input.value);
    }, 50);
  }

  public clear() {
    this.input.value = "";
  }

  public focus() {
    this.input.focus();
  }
}
