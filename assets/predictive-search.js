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

  /* ===========================
     EVENT LISTENERS
  ============================ */
  setupEventListeners() {
    if (!this.input) return;

    this.input.form.addEventListener("submit", this.onFormSubmit.bind(this));
    this.input.addEventListener("focus", this.onFocus.bind(this));
    this.addEventListener("focusout", this.onFocusOut.bind(this));
    this.addEventListener("keyup", this.onKeyup.bind(this));
    this.addEventListener("keydown", this.onKeydown.bind(this));

    const closeBtn = this.querySelector(".wbsclose");
    if (closeBtn) closeBtn.addEventListener("click", this.onClick.bind(this));
  }

  getQuery() {
    return this.input.value.trim();
  }

  onChange() {
    super.onChange();

    const newSearchTerm = this.getQuery();

    if (this.defaultSearch && !this.defaultSearch.classList.contains("hidden")) {
      this.defaultSearch.classList.add("hidden");
    }

    if (!this.searchTerm || !newSearchTerm.startsWith(this.searchTerm)) {
      this.querySelector("#predictive-search-results-groups-wrapper")?.remove();
    }

    // update “Search for {term}”
    this.updateSearchForTerm(this.searchTerm, newSearchTerm);
    this.searchTerm = newSearchTerm;

    if (!this.searchTerm.length) {
      if (this.defaultSearch) this.defaultSearch.classList.remove("hidden");
      this.close(true);
      return;
    }

    this.getSearchResults(this.searchTerm);
  }

  onFormSubmit(event) {
    if (!this.getQuery().length || this.querySelector('[aria-selected="true"] a')) {
      event.preventDefault();
    }
  }

  onFocus() {
    const currentSearchTerm = this.getQuery();

    if (!currentSearchTerm.length) {
      if (this.defaultSearch) this.defaultSearch.classList.remove("hidden");
      if (this.demoSearch) this.demoSearch.classList.remove("hidden");
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
        if (this.defaultSearch) this.defaultSearch.classList.add("hidden");
        if (this.demoSearch) this.demoSearch.classList.add("hidden");
        this.hiddenClassActivity(false);
        this.close();
      }
    }, 100);
  }

  onClick() {
    setTimeout(() => {
      if (this.defaultSearch) this.defaultSearch.classList.add("hidden");
      if (this.demoSearch) this.demoSearch.classList.add("hidden");
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

  /* ===========================
     LANGUAGE-BASED SEARCH SWITCH
  ============================ */
  getSearchResults(searchTerm) {
    if (this.locale.startsWith("ar")) {
      this.getArabicSearchResults(searchTerm);
    } else {
      this.getDefaultPredictiveResults(searchTerm);
    }
  }

  /* ===========================
     ENGLISH (DEFAULT) – PREDICTIVE SEARCH
  ============================ */
  getDefaultPredictiveResults(searchTerm) {
    const queryKey = searchTerm.replace(" ", "-").toLowerCase();
    this.setLiveRegionLoadingState();

    if (this.cachedResults[queryKey]) {
      this.renderSearchResults(this.cachedResults[queryKey]);
      return;
    }

    // cancel previous request if any
    this.abortController.abort();
    this.abortController = new AbortController();

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
        const section = new DOMParser()
          .parseFromString(text, "text/html")
          .querySelector("#shopify-section-predictive-search");

        const resultsMarkup = section ? section.innerHTML : text;

        this.cachedResults[queryKey] = resultsMarkup;
        this.renderSearchResults(resultsMarkup);
      })
      .catch((error) => {
        if (error?.name === "AbortError" || error?.code === 20) return;
        this.hiddenClassActivity(false);
        this.close();
      });
  }

  /* ===========================
     ARABIC – USE SAME ENDPOINT
  ============================ */
  getArabicSearchResults(searchTerm) {
    const queryKey = searchTerm.replace(" ", "-").toLowerCase();
    this.setLiveRegionLoadingState();

    if (this.cachedResults[queryKey]) {
      this.renderSearchResults(this.cachedResults[queryKey]);
      return;
    }

    this.abortController.abort();
    this.abortController = new AbortController();

    fetch(
      `${routes.predictive_search_url}?q=${encodeURIComponent(searchTerm)}&section_id=predictive-search`,
      { signal: this.abortController.signal }
    )
      .then((response) => response.text())
      .then((text) => {
        const section = new DOMParser()
          .parseFromString(text, "text/html")
          .querySelector("#shopify-section-predictive-search");

        const resultsMarkup = section ? section.innerHTML : text;

        this.cachedResults[queryKey] = resultsMarkup;
        this.renderSearchResults(resultsMarkup);
      })
      .catch(() => {
        this.hiddenClassActivity(false);
        this.close();
      });
  }

  /* ===========================
     RENDER RESULTS
  ============================ */
  renderSearchResults(resultsMarkup) {
    if (!this.predictiveSearchResults) return;

    this.predictiveSearchResults.innerHTML = resultsMarkup;
    this.setAttribute("results", true);
    this.hiddenClassActivity(true);
    this.open();
  }

  /* ===========================
     UI HELPERS
  ============================ */
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
    if (selected) selected.setAttribute("aria-selected", "false");

    this.input.setAttribute("aria-activedescendant", "");
    this.removeAttribute("loading");
    this.removeAttribute("open");
    this.input.setAttribute("aria-expanded", "false");
    if (this.predictiveSearchResults) this.predictiveSearchResults.removeAttribute("style");
  }

  setLiveRegionLoadingState() {
    this.statusElement = this.statusElement || this.querySelector(".predictive-search-status");
    this.loadingText = this.loadingText || this.getAttribute("data-loading-text");
    if (!this.statusElement || !this.loadingText) return;

    this.setLiveRegionText(this.loadingText);
    this.setAttribute("loading", true);
  }

  setLiveRegionText(statusText) {
    if (!this.statusElement) return;

    this.statusElement.setAttribute("aria-hidden", "false");
    this.statusElement.textContent = statusText;
    setTimeout(() => {
      this.statusElement.setAttribute("aria-hidden", "true");
    }, 1000);
  }

  /* ===========================
     NEW / RESTORED METHODS
  ============================ */

  // Show / hide global “search is open” class
  hiddenClassActivity(isActive) {
    if (!this.searchActiveClass) return;
    document.body.classList.toggle(this.searchActiveClass, Boolean(isActive));
  }

  // Update the “Search for: {term}” text in the dropdown
  updateSearchForTerm(previousTerm, newTerm) {
    const searchForText = this.querySelector("[data-predictive-search-search-for-text]");
    if (!searchForText) return;
    searchForText.textContent = newTerm || "";
  }

  // Keyboard navigation through results
  switchOption(direction) {
    const options = Array.from(this.querySelectorAll("[role='option']"));
    if (!options.length) return;

    let currentIndex = options.findIndex((el) => el.getAttribute("aria-selected") === "true");

    if (direction === "down") {
      currentIndex = currentIndex + 1;
    } else {
      currentIndex = currentIndex - 1;
    }

    if (currentIndex < 0) currentIndex = options.length - 1;
    if (currentIndex >= options.length) currentIndex = 0;

    options.forEach((el) => el.setAttribute("aria-selected", "false"));

    const newOption = options[currentIndex];
    newOption.setAttribute("aria-selected", "true");

    if (newOption.id) {
      this.input.setAttribute("aria-activedescendant", newOption.id);
    }
  }

  // Enter key behaviour
  selectOption() {
    const selectedLink = this.querySelector('[aria-selected="true"] a');
    if (selectedLink) {
      window.location.href = selectedLink.href;
      return;
    }

    // If nothing selected, submit normal search
    if (this.getQuery().length) {
      this.input.form.submit();
    }
  }
}

customElements.define("predictive-search", PredictiveSearch);
