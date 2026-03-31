import { SearchBar } from "./components/search-bar";
import { ResultsList } from "./components/results-list";
import { FooterBar } from "./components/footer-bar";
import { setupKeyboard } from "./services/keyboard";
import { searchItems } from "./services/search";
import "./styles/global.css";

class App {
  private searchBar: SearchBar;
  private resultsList: ResultsList;
  private footerBar: FooterBar;
  private container: HTMLElement;

  constructor(root: HTMLElement) {
    this.container = document.createElement("div");
    this.container.className = "launcher";

    this.searchBar = new SearchBar(this.onQueryChange.bind(this));
    this.resultsList = new ResultsList();
    this.footerBar = new FooterBar();

    this.container.appendChild(this.searchBar.element);
    this.container.appendChild(this.resultsList.element);
    this.container.appendChild(this.footerBar.element);
    root.appendChild(this.container);

    setupKeyboard(this.resultsList, this.searchBar);

    this.resultsList.setOnActivate(() => {
      this.searchBar.clear();
      this.onQueryChange("");
    });

    // Focus input whenever the window becomes visible.
    window.addEventListener("focus", () => {
      this.searchBar.focus();
    });

    // Show initial items
    this.onQueryChange("");
  }

  private async onQueryChange(query: string) {
    const results = await searchItems(query);
    this.resultsList.render(results);
  }
}

const root = document.getElementById("app");
if (root) new App(root);
