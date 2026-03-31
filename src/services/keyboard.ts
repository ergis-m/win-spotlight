import { hideWindow } from "./search";
import type { ResultsList } from "../components/results-list";
import type { SearchBar } from "../components/search-bar";

export function setupKeyboard(resultsList: ResultsList, searchBar: SearchBar) {
  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "Escape":
        searchBar.clear();
        hideWindow();
        break;
      case "ArrowDown":
        e.preventDefault();
        resultsList.moveSelection(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        resultsList.moveSelection(-1);
        break;
      case "Enter":
        e.preventDefault();
        resultsList.activateSelected();
        break;
    }
  });
}
