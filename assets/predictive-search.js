class PredictiveSearch extends SearchForm {
  constructor() {
    super();

    this.input = this.querySelector("input[type='search']");
    this.locale = (document.documentElement.lang || Shopify.locale || "en").toLowerCase();

    this.cachedResults = {};
    this.predictiveSearchResults = this.querySelector("[data-predictive-search]");
    this.allPredictiveSearchInstances = document.querySelectorAll("predictive-search");
    this.isOpen = false;
    this.abortController = new AbortController();
    this.searchTerm = "";

    this.defaultSearch = this.querySelector(".default--search");
    this.demoSearch = this.querySelector(".wbsclose");
    this.searchActiveClass = this.dataset.searchActiveClass;

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.input.form.addEventListener("submit", this.onFormSubmit.bind(this));
    this.input.addEventListener("focus", this.onFocus.bind(this));
    this.addEventListener("focusout", this.onFocusOut.bind(this));
    this.addEventListener("keyup", this.onKeyup.bind(this));
    this.addEventListener("keydown", this.onKeydown.bind(this));
    this.querySelector(".wbsclose").addEventListener("click", this.onClick.bind(this));
  }

  getQuery() {
    return this.input.value.trim();
  }

  onChange() {
    super.onChange();

    const newSearchTerm = this.getQuery();

    if (!this.defaultSearch.classList.contains("hidden"))
      this.defaultSearch.classList.add("hidden");

    if (!this.searchTerm || !newSearchTerm.startsWith(this.searchTerm)) {
      this.querySelector("#predictive-search-results-groups-wrapper")?.remove();
    }

    this.updateSearchForTerm(this.searchTerm, newSearchTerm);
    this.searchTerm = newSearchTerm;

    if (!this.searchTerm.length) {
      this.defaultSearch.classList.remove("hidden");
      this.close(true);
      return;
    }

    this.getSearchResults(this.searchTerm);
  }

  onFormSubmit(event) {
    if (!this.getQuery().length || this.querySelector('[aria-selected="true"] a')) event.preventDefault();
  }

  onFocus() {
    const currentSearchTerm = this.getQuery();

    if (!currentSearchTerm.length) {
      this.defaultSearch.classList.remove("hidden");
      this.demoSearch.classList.remove("hidden");
      this.hiddenClassActivity(true);
      return;
    }

    if (this.searchTerm !== currentSearchTerm) {
      this.onChange();
    } else if (this.getAttribute("results") === "true") {
      this.hiddenClassActivity(true);
      this.open();
    } else {
      this.getSearchResults(this.searchTerm);
    }
  }

  onFocusOut() {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) {
        this.defaultSearch.classList.add("hidden");
        this.demoSearch.classList.add("hidden");
        this.hiddenClassActivity(false);
        this.close();
      }
    }, 100);
  }

  onClick() {
    setTimeout(() => {
      this.defaultSearch.classList.add("hidden");
      this.demoSearch.classList.add("hidden");
      this.hiddenClassActivity(false);
      this.close();
    });
  }

  onKeyup(event) {
    if (!this.getQuery().length) this.close(true);

    event.preventDefault();

    switch (event.code) {
      case "ArrowUp":
        this.switchOption("up");
        break;
      case "ArrowDown":
        this.switchOption("down");
        break;
      case "Enter":
        this.selectOption();
        break;
    }
  }

  onKeydown(event) {
    if (event.code === "ArrowUp" || event.code === "ArrowDown") {
      event.preventDefault();
    }
  }

  /* ---------------------------------------------
      MAIN UPDATE: LANGUAGE-BASED SEARCH SWITCH
  --------------------------------------------- */
  getSearchResults(searchTerm) {
    if (this.locale.startsWith("ar")) {
      this.getArabicSearchResults(searchTerm);
    } else {
      this.getDefaultPredictiveResults(searchTerm);
    }
  }

  /* ---------------------------------------------
      ENGLISH (DEFAULT) – SHOPIFY PREDICTIVE SEARCH
  --------------------------------------------- */
  getDefaultPredictiveResults(searchTerm) {
    const queryKey = searchTerm.replace(" ", "-").toLowerCase();
    this.setLiveRegionLoadingState();

    if (this.cachedResults[queryKey]) {
      this.renderSearchResults(this.cachedResults[queryKey]);
      return;
    }

    fetch(
      `${routes.predictive_search_url}?q=${encodeURIComponent(searchTerm)}&section_id=predictive-search`,
      { signal: this.abortController.signal }
    )
      .then((response) => {
        if (!response.ok) {
          this.hiddenClassActivity(false);
          this.close();
          throw new Error(response.status);
        }
        return response.text();
      })
      .then((text) => {
        const resultsMarkup = new DOMParser()
          .parseFromString(text, "text/html")
          .querySelector("#shopify-section-predictive-search").innerHTML;

        this.cachedResults[queryKey] = resultsMarkup;
        this.renderSearchResults(resultsMarkup);
      })
      .catch((error) => {
        if (error?.code === 20) return;
        this.hiddenClassActivity(false);
        this.close();
      });
  }

  /* ---------------------------------------------
      ARABIC FALLBACK – REGULAR SEARCH AS PREDICTIVE
  --------------------------------------------- */
  getArabicSearchResults(searchTerm) {
    const queryKey = searchTerm.replace(" ", "-").toLowerCase();
    this.setLiveRegionLoadingState();

    if (this.cachedResults[queryKey]) {
      this.renderSearchResults(this.cachedResults[queryKey]);
      return;
    }

    fetch(`/search?q=${encodeURIComponent(searchTerm)}&view=predictive-arabic`, {
      signal: this.abortController.signal,
    })
      .then((response) => response.text())
      .then((html) => {
        this.cachedResults[queryKey] = html;
        this.renderSearchResults(html);
      })
      .catch(() => {
        this.hiddenClassActivity(false);
        this.close();
      });
  }

  /* ---------------------------------------------
      RENDER RESULTS
  --------------------------------------------- */
  renderSearchResults(resultsMarkup) {
    this.predictiveSearchResults.innerHTML = resultsMarkup;
    this.setAttribute("results", true);
    this.hiddenClassActivity(true);
    this.open();
  }

  /* ---------------------------------------------
      UI HELPERS (UNCHANGED)
  --------------------------------------------- */
  open() {
    this.setAttribute("open", true);
    this.input.setAttribute("aria-expanded", true);
    this.isOpen = true;
  }

  close(clearSearchTerm = false) {
    this.closeResults(clearSearchTerm);
    this.isOpen = false;
  }

  closeResults(clearSearchTerm = false) {
    if (clearSearchTerm) {
      this.input.value = "";
      this.removeAttribute("results");
    }
    const selected = this.querySelector('[aria-selected="true"]');
    if (selected) selected.setAttribute("aria-selected", false);

    this.input.setAttribute("aria-activedescendant", "");
    this.removeAttribute("loading");
    this.removeAttribute("open");
    this.input.setAttribute("aria-expanded", false);
    this.predictiveSearchResults.removeAttribute("style");
  }

  setLiveRegionLoadingState() {
    this.statusElement = this.statusElement || this.querySelector(".predictive-search-status");
    this.loadingText = this.loadingText || this.getAttribute("data-loading-text");
    this.setLiveRegionText(this.loadingText);
    this.setAttribute("loading", true);
  }

  setLiveRegionText(statusText) {
    this.statusElement.setAttribute("aria-hidden", "false");
    this.statusElement.textContent = statusText;
    setTimeout(() => {
      this.statusElement.setAttribute("aria-hidden", "true");
    }, 1000);
  }
}

customElements.define("predictive-search", PredictiveSearch);
