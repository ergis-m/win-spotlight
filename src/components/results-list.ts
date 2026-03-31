import { activateItem, type SearchResult } from "../services/search";

function renderIcon(item: SearchResult): string {
  if (item.icon) {
    return `<img class="result-icon-img" src="${item.icon}" alt="" />`;
  }
  return `<span class="result-icon result-initial">${item.title.charAt(0).toUpperCase()}</span>`;
}

export class ResultsList {
  public element: HTMLElement;
  private items: SearchResult[] = [];
  private selectedIndex = 0;
  private onActivate: (() => void) | null = null;

  constructor() {
    this.element = document.createElement("div");
    this.element.className = "results-list";
  }

  public render(items: SearchResult[]) {
    this.items = items;
    this.selectedIndex = 0;
    this.element.innerHTML = "";

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "results-empty";
      empty.textContent = "No results found";
      this.element.appendChild(empty);
      return;
    }

    items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "result-item" + (index === 0 ? " selected" : "");
      row.dataset.index = String(index);

      const badge =
        item.kind === "window"
          ? `<span class="result-badge">Running</span>`
          : "";

      row.innerHTML = `
        <div class="result-icon-wrap">${renderIcon(item)}</div>
        <div class="result-text">
          <span class="result-title">${item.title}</span>
          <span class="result-subtitle">${item.subtitle}</span>
        </div>
        ${badge}
      `;

      row.addEventListener("click", () => {
        this.selectedIndex = index;
        this.activateSelected();
      });

      row.addEventListener("mouseenter", () => {
        this.selectedIndex = index;
        this.updateSelection();
      });

      this.element.appendChild(row);
    });
  }

  public moveSelection(delta: number) {
    if (this.items.length === 0) return;
    this.selectedIndex =
      (this.selectedIndex + delta + this.items.length) % this.items.length;
    this.updateSelection();
  }

  public setOnActivate(cb: () => void) {
    this.onActivate = cb;
  }

  public activateSelected() {
    const item = this.items[this.selectedIndex];
    if (item) {
      activateItem(item.id);
      this.onActivate?.();
    }
  }

  private updateSelection() {
    const rows = this.element.querySelectorAll(".result-item");
    rows.forEach((row, i) => {
      row.classList.toggle("selected", i === this.selectedIndex);
    });
    const selected = rows[this.selectedIndex] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: "nearest" });
  }
}
