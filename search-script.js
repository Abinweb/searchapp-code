// Load Google Fonts dynamically - Simplified version
function loadGoogleFonts() {
    if (document.querySelector('link[href*="fonts.googleapis.com"]')) {
      console.log("Google Fonts already loaded");
      return;
    }
    
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Bitter:ital,wght@0,100..900;1,100..900&family=Changa+One:ital@0;1&family=Droid+Sans:wght@400;700&family=Droid+Serif:ital,wght@0,400;0,700;1,400;1,700&family=Exo:ital,wght@0,100..900;1,100..900&family=Great+Vibes:ital@0;1&family=Inconsolata:ital,wght@0,200..900;1,200..900&family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Oswald:wght@200..700&family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=PT+Serif:ital,wght@0,400;0,700;1,400;1,700&family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&family=Varela:wght@400&family=Varela+Round:wght@400&family=Vollkorn:ital,wght@0,400..900;1,100..900&family=Inter:ital,wght@0,100..900;1,100..900&display=swap';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    document.head.appendChild(link);
    console.log("Google Fonts loaded dynamically");
  }
  
  // ===== OPTIMIZED PERFORMANCE FEATURES =====
  
  // Enhanced search cache with TTL and size limits
  const searchCache = new Map();
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  const MAX_CACHE_SIZE = 100; // Maximum number of cached results
  
  // Request cancellation controller for race condition prevention
  let currentSearchController = null;
  
  // Search state management - PREVENTS DUPLICATE SEARCHES
  let searchInProgress = false;
  let lastSearchQuery = '';
  
  // Enhanced cache management
  function getCachedResults(query, selectedOption) {
    const cacheKey = `${query}_${selectedOption}`;
    const cached = searchCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Using cached results for:', query);
      return cached.results;
    }
    
    // Remove expired entry
    if (cached) {
      searchCache.delete(cacheKey);
    }
    
    return null;
  }
  
  function setCachedResults(query, selectedOption, results) {
    const cacheKey = `${query}_${selectedOption}`;
    
    // Implement LRU cache eviction
    if (searchCache.size >= MAX_CACHE_SIZE) {
      const firstKey = searchCache.keys().next().value;
      searchCache.delete(firstKey);
    }
    
    searchCache.set(cacheKey, {
      results,
      timestamp: Date.now(),
      accessCount: 1
    });
  }
  
  // Optimized debounced search with progressive delays
  let searchDebounceTimer;
  
  function debouncedSearch(performSearch, baseDelay = 100) {
    clearTimeout(searchDebounceTimer);
    
    // Progressive delay: faster for short queries, slower for longer ones
    const query = document.querySelector("input[name='query']")?.value || '';
    const delay = query.length <= 2 ? baseDelay : Math.min(baseDelay * 2, 500);
    
    searchDebounceTimer = setTimeout(() => {
      performSearch();
    }, delay);
  }
  
  // Generate or get visitor ID
  async function getOrCreateVisitorId() {
    let visitorId = localStorage.getItem('visitorId');
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem('visitorId', visitorId);
    }
    return visitorId;
  }
  
  // Check if the token has expired
  function isTokenExpired(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp && payload.exp < Math.floor(Date.now() / 1000);
    } catch (e) {
      return true;
    }
  }
  
  // Get or fetch visitor session token
  async function getVisitorSessionToken() {
    try {
      const existingToken = localStorage.getItem('visitorSessionToken');
      if (existingToken && !isTokenExpired(existingToken)) {
        console.log("Using existing token from localStorage");
        return existingToken;
      }
  
      const visitorId = await getOrCreateVisitorId();
      const siteName = window.location.hostname.replace(/^www\./, '').split('.')[0];
      console.log("Current Hostname for get visitorId: ", siteName);
  
      const response = await fetch('https://search-server.long-rain-28bb.workers.dev/api/visitor-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          userAgent: navigator.userAgent,
          siteName,
        }),
      });
  
      if (!response.ok) throw new Error('Failed to fetch visitor session token');
  
      const data = await response.json();
      localStorage.setItem('visitorSessionToken', data.token);
      return data.token;
    } catch (error) {
      console.error('Error getting visitor session token:', error);
      return null;
    }
  }
  
  // Font weight helper function - Updated to handle both class names and numeric values
  function fontWeightFromClass(className) {
    // If it's already a number, return it
    if (!isNaN(className)) return parseInt(className);
    
    // If it's a CSS class name, convert it
    switch (className) {
      case "font-light": return 300;
      case "font-normal": return 400;
      case "font-medium": return 500;
      case "font-semibold": return 600;
      case "font-bold": return 700;
      case "font-extrabold": return 800;
      default: return 400;
    }
  }
  
  // ===== OPTIMIZED SEARCH EXECUTION =====
  
  // Parallel search execution with smart batching
  async function executeParallelSearches(query, selectedOption, siteName, token, collectionsParam, fieldsSearchParam, fieldsDisplayParam) {
    const headers = { Authorization: `Bearer ${token}` };
    const searchPromises = [];
    
    // Cancel any ongoing search
    if (currentSearchController) {
      currentSearchController.abort();
    }
    
    currentSearchController = new AbortController();
    
    // Execute searches in parallel based on selected option
    if (selectedOption === "Pages" || selectedOption === "Both") {
      const pagePromise = fetch(
        `https://search-server.long-rain-28bb.workers.dev/api/search-index?query=${encodeURIComponent(query)}&siteName=${siteName}`,
        { headers, signal: currentSearchController.signal }
      ).then(r => r.json()).then(d => ({ type: 'page', data: d.results || [], success: true }))
      .catch(e => ({ type: 'page', data: [], success: false, error: e.message }));
      
      searchPromises.push({ type: 'page', promise: pagePromise });
    }
    
    if (selectedOption === "Collection" || selectedOption === "Both") {
      const cmsPromise = fetch(
        `https://search-server.long-rain-28bb.workers.dev/api/search-cms?query=${encodeURIComponent(query)}&siteName=${siteName}&collections=${collectionsParam}&searchFields=${fieldsSearchParam}&displayFields=${fieldsDisplayParam}`,
        { headers, signal: currentSearchController.signal }
      ).then(r => r.json()).then(d => ({ type: 'cms', data: d.results || [], success: true }))
      .catch(e => ({ type: 'cms', data: [], success: false, error: e.message }));
      
      searchPromises.push({ type: 'cms', promise: cmsPromise });
    }
    
    // Execute all searches in parallel
    const results = await Promise.allSettled(searchPromises.map(async ({ type, promise }) => {
      try {
        const result = await promise;
        return result;
      } catch (error) {
        return { type, data: [], success: false, error: error.message };
      }
    }));
    
    // Process results
    let allResults = [];
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.success) {
        const typeData = result.value.data.map(item => ({ ...item, _type: result.value.type }));
        allResults = allResults.concat(typeData);
      }
    });
    
    return allResults;
  }
  
  // ===== OPTIMIZED RENDERING =====
  
  // Render search results with pagination - Optimized version
  function renderResults(results, title, displayMode, maxItems, gridColumns = 3, paginationType = "None", container, currentPage = 1, isPageResult = true, styles = {}) {
      
    if (!Array.isArray(results) || results.length === 0) return "";
    const totalPages = maxItems ? Math.ceil(results.length / maxItems) : 1;
    const startIndex = maxItems ? (currentPage - 1) * maxItems : 0;
    const endIndex = maxItems ? startIndex + maxItems : results.length;
    const pagedResults = results.slice(startIndex, endIndex);
    
    // Responsive grid columns based on screen width
    const getResponsiveGridColumns = () => {
      const screenWidth = window.innerWidth;
      if (screenWidth <= 675) {
        return 1; // Single column on mobile
      } else if (screenWidth <= 1024) {
        return Math.min(gridColumns, 2); // Max 2 columns on tablets
      } else {
        return gridColumns; // Full grid on desktop
      }
    };
    
    const responsiveGridColumns = getResponsiveGridColumns();
    console.log(`Screen width: ${window.innerWidth}px, Grid columns: ${responsiveGridColumns}`);
   
    // Debug: Check if fonts are available
    console.log("Rendering results with styles:", styles);
    console.log("Title font family:", styles.titleFontFamily);
    console.log("Body font family:", styles.otherFieldsFontFamily);
    
    const {
      titleFontSize = "16px",
      titleFontFamily = "Arial",
      titleColor = "#000",
      titleFontWeight = "font-bold",
      borderRadius = "6px",
      otherFieldsColor = "#333",
      otherFieldsFontSize = "14px",
      otherFieldsFontFamily = "Arial",
      otherFieldsFontWeight = "font-normal",
      backgroundColor = "#fff",
      boxShadow = true,
      headingAlignment = "left",
      bodyAlignment = "left",
    } = styles;
  
    const itemsHtml = pagedResults.map(item => {
      const titleText = item.name || item.title || "Untitled";
      const detailUrl = item._type === 'page'
        ? (item.publishedPath || item.slug || "#")
        : (item.detailUrl || "#");
      const matchedText = item.matchedText?.slice(0, 200) || "";
  
      const fieldsHtml = Object.entries(item)
        .filter(([key]) => key !== "name" && key !== "title" && key !== "detailUrl")
        .map(([key, value]) => {
          if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
            value = new Date(value).toLocaleString();
          }
  
          if (typeof value === 'object' && value !== null) {
            const imageUrl = (Array.isArray(value) && value[0]?.url)
              || value.url || value.src || value.href;
  
            if (imageUrl) {
              const imageStyle = displayMode === 'Grid'
                ? 'max-width: 100%;'
                : 'max-width: 50%;';
  
              return `<p style="color: ${otherFieldsColor} !important; font-size: ${otherFieldsFontSize} !important; font-family: '${otherFieldsFontFamily}', sans-serif !important; font-weight: ${fontWeightFromClass(otherFieldsFontWeight)} !important; text-align: ${bodyAlignment} !important;">
                        <img src="${imageUrl}" alt="${key}" class="item-image" style="${imageStyle} border-radius: 4px;" />
                      </p>`;
            }
  
            return `<p style="color: ${otherFieldsColor} !important; font-size: ${otherFieldsFontSize} !important; font-family: '${otherFieldsFontFamily}', sans-serif !important; font-weight: ${fontWeightFromClass(otherFieldsFontWeight)} !important; text-align: ${bodyAlignment} !important;">${JSON.stringify(value)}</p>`;
          }
  
          return `<p style="color: ${otherFieldsColor} !important; font-size: ${otherFieldsFontSize} !important; font-family: '${otherFieldsFontFamily}', sans-serif !important; font-weight: ${fontWeightFromClass(otherFieldsFontWeight)} !important; text-align: ${bodyAlignment} !important;">${value}</p>`;
        })
        .join("");
  
      const boxShadowStyle = boxShadow ? "0 2px 6px rgba(0, 0, 0, 0.1)" : "none";
  
      if (displayMode === "Grid") {
        // Grid: whole card is clickable
        return `
          <a href="${detailUrl}" target="_blank" style="text-decoration: none; color: inherit; display: block; height: 100%;">
            <div class="search-result-item" 
              style="
                background: ${backgroundColor};
                border: 1px solid #ddd;
                border-radius: ${borderRadius};
                padding: 1rem;
                height: 100%;
                min-height: 200px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-shadow: ${boxShadowStyle};
              ">
              <div>
                <h4 style="font-size: ${titleFontSize} !important; font-family: '${titleFontFamily}', sans-serif !important; font-weight: ${fontWeightFromClass(titleFontWeight)} !important; color: ${titleColor} !important; text-align: ${headingAlignment} !important; margin-bottom: 0.5rem; word-wrap: break-word;">
                  ${titleText}
                </h4>
                ${matchedText
                  ? `<p style="color: ${otherFieldsColor} !important; font-size: ${otherFieldsFontSize} !important; font-family: '${otherFieldsFontFamily}', sans-serif !important; font-weight: ${fontWeightFromClass(otherFieldsFontWeight)} !important; text-align: ${bodyAlignment} !important; flex-grow: 1;">${matchedText}...</p>`
                  : `<div style="flex-grow: 1;">${fieldsHtml}</div>`}
              </div>
            </div>
          </a>
        `;
      } else {
        // List: no card, only title is clickable
        return `
          <div class="search-result-item" style="margin-bottom: 1rem; padding-left: 1rem;">
            <a href="${detailUrl}" target="_blank" style="font-size: ${titleFontSize} !important; font-family: '${titleFontFamily}', sans-serif !important; font-weight: ${fontWeightFromClass(titleFontWeight)} !important; color: ${titleColor} !important; text-align: ${headingAlignment} !important; text-decoration: underline;">
              ${titleText}
            </a>
            ${matchedText
              ? `<p style="color: ${otherFieldsColor} !important; font-size: ${otherFieldsFontSize} !important; font-family: '${otherFieldsFontFamily}', sans-serif !important; font-weight: ${fontWeightFromClass(otherFieldsFontWeight)} !important; text-align: ${bodyAlignment} !important;">${matchedText}...</p>`
              : fieldsHtml}
          </div>
        `;
      }
    }).join("");
  
    let paginationHtml = "";
    if (paginationType === "Numbered" && totalPages > 1) {
      paginationHtml = `<div class="pagination" style="margin-top: 1rem; display: flex; justify-content: center; align-items: center; gap: 8px; flex-wrap: wrap;">`;
      for (let i = 1; i <= totalPages; i++) {
        paginationHtml += `<button class="pagination-button" data-page="${i}" style="margin: 0; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; transition: all 0.2s ease;">${i}</button>`;
      }
      paginationHtml += `</div>`;
    }
  
    if (paginationType === "Load More" && endIndex < results.length) {
      paginationHtml += `<div style="display: flex; justify-content: center; margin-top: 1rem;"><button class="load-more-button" style="padding: 10px 20px; border: 1px solid #0073e6; border-radius: 6px; background: #0073e6; color: white; cursor: pointer; font-size: 14px; transition: all 0.2s ease;">Load More</button></div>`;
    }
  
    const sectionHtml = `
      <section style="margin-top: 2rem;">
        <div class="search-results-wrapper" style="
          display: ${displayMode === 'Grid' ? 'grid' : 'block'};
          grid-template-columns: repeat(${responsiveGridColumns}, 1fr);
          gap: 1rem;
          width: 100%;
          max-width: 100%;
        ">
          ${itemsHtml}
        </div>
        ${paginationHtml}
      </section>`;
  
    if (container) {
      container.innerHTML = sectionHtml;
      if (paginationType === "Numbered") {
        container.querySelectorAll('.pagination-button').forEach(btn => {
          btn.addEventListener('click', () => {
            const page = parseInt(btn.getAttribute('data-page'));
            renderResults(results, title, displayMode, maxItems, gridColumns, paginationType, container, page, isPageResult, styles);
          });
        });
      }
  
      if (paginationType === "Load More") {
        const loadBtn = container.querySelector('.load-more-button');
        if (loadBtn) {
          loadBtn.addEventListener('click', () => {
            renderResults(results, title, displayMode, endIndex + maxItems, gridColumns, paginationType, container, 1, isPageResult, styles);
          });
        }
      }
    }
  
    return sectionHtml;
  }
  
  // ===== OPTIMIZED SEARCH FUNCTION =====
  
  async function performSearch() {
    let query = input?.value.trim().toLowerCase();
  
    if (!query) {
      const params = new URLSearchParams(window.location.search);
      query = params.get('q')?.trim().toLowerCase() || '';
      console.log('Query from URL params:', query);
    }
  
    if (!query) return;
    
    // PREVENT DUPLICATE SEARCHES - This is the key performance improvement
    if (searchInProgress || lastSearchQuery === query) return;
    
    searchInProgress = true;
    lastSearchQuery = query;
    
    // Check cache first for instant results
    const cachedResults = getCachedResults(query, selectedOption);
    if (cachedResults) {
      console.log('Using cached results for:', query);
      resultsContainer.innerHTML = "";
      const combinedResultsDiv = document.createElement("div");
      combinedResultsDiv.classList.add("combined-search-results");
      resultsContainer.appendChild(combinedResultsDiv);
      renderResults(cachedResults, "Search Results", displayMode, maxItems, gridColumns, paginationType, combinedResultsDiv, 1, false, styles);
      searchInProgress = false;
      return;
    }
    
    showSpinner();
    resultsContainer.innerHTML = ""; 
  
    try {
      // Use optimized parallel search execution
      const allResults = await executeParallelSearches(
        query, 
        selectedOption, 
        siteName, 
        token, 
        collectionsParam, 
        fieldsSearchParam, 
        fieldsDisplayParam
      );
  
      if (allResults.length === 0) {
        hideSpinner();
        resultsContainer.innerHTML = "<p>No results found.</p>";
        return;
      }
  
      // Cache the results for future searches
      setCachedResults(query, selectedOption, allResults);
  
      // Render results
      const combinedResultsDiv = document.createElement("div");
      combinedResultsDiv.classList.add("combined-search-results");
      resultsContainer.appendChild(combinedResultsDiv);
      renderResults(allResults, "Search Results", displayMode, maxItems, gridColumns, paginationType, combinedResultsDiv, 1, false, styles);
      
    } catch (error) {
      console.error('Error performing search:', error);
      resultsContainer.innerHTML = "<p>Error performing search. Please try again later.</p>";
    } finally {
      hideSpinner();
      searchInProgress = false;
    }
  }
  
  // ===== HELPER FUNCTIONS =====
  
  function sanitizeText(text) {
    const div = document.createElement("div");
    div.innerHTML = text;
    return div.textContent || div.innerText || "";
  }
  
  function toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) =>
      txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
    );
  }
  
  // Create spinner element
  function createSpinner() {
    const spinner = document.createElement("div");
    spinner.id = "search-spinner";
    spinner.style.display = "none";
    spinner.innerHTML = `<div class="spinner"></div>`;
  
    // Add spinner styles
    const spinnerStyle = document.createElement("style");
    spinnerStyle.textContent = `
      #search-spinner {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 60px;
      }
      .spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #0073e6;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg);}
        100% { transform: rotate(360deg);}
      }
    `;
  
    // Append spinner and styles to the document
    document.head.appendChild(spinnerStyle);
    document.body.appendChild(spinner);
    
    return spinner;
  }
  
  function showSpinner() {
    if (spinner) {
      spinner.style.display = "flex";
      resultsContainer.parentNode.insertBefore(spinner, resultsContainer);
    }
  }
  
  function hideSpinner() {
    if (spinner) {
      spinner.style.display = "none";
    }
  }
  
  // ===== MAIN INITIALIZATION =====
  
  document.addEventListener("DOMContentLoaded", async function () {
    // Load Google Fonts first
    loadGoogleFonts();
    
    const searchConfigDiv = document.querySelector('#search-config');
  
    if (!searchConfigDiv) {
      console.error(" 'search-config' div not found.");
      return;
    }
  
    const selectedCollections = JSON.parse(searchConfigDiv.getAttribute('data-selected-collections') || '[]');
    const selectedFieldsSearch = JSON.parse(searchConfigDiv.getAttribute('data-selected-fields-search') || '[]');
    const selectedFieldsDisplay = JSON.parse(searchConfigDiv.getAttribute('data-selected-fields-display') || '[]');
    const selectedOption = searchConfigDiv.getAttribute('data-selected-option');
    const displayMode = searchConfigDiv.getAttribute('data-display-mode');
    const paginationType = searchConfigDiv.getAttribute('data-pagination-type') || "None";
    const gridRows = parseInt(searchConfigDiv.getAttribute('data-grid-rows'), 10) || 1;
    const gridColumns = parseInt(searchConfigDiv.getAttribute('data-grid-columns'), 10) || 1;
    const itemsPerPage = parseInt(searchConfigDiv.getAttribute('data-items-per-page'), 10) || 10;
    const resultType = searchConfigDiv.getAttribute('data-result-type') || "Click on search";
    const searchBarType = searchConfigDiv.getAttribute('data-search-bar');
    const resultPage = searchConfigDiv.getAttribute('data-result-page') || "Same page";
    const shouldOpenInNewPage = resultPage === "New Page";
  
    // Original styling properties
    const titleFontSize = searchConfigDiv.getAttribute("data-title-font-size") || "16px";
    const titleFontFamily = searchConfigDiv.getAttribute("data-title-font-family") || "Arial";
    const titleColor = searchConfigDiv.getAttribute("data-title-color") || "#000";
    const otherFieldsColor = searchConfigDiv.getAttribute("data-other-fields-color") || "#333";
    const otherFieldsFontSize = searchConfigDiv.getAttribute("data-other-fields-font-size") || "14px";
    const borderRadius = searchConfigDiv.getAttribute("data-border-radius") || "6px";
    const boxShadow = searchConfigDiv.getAttribute("data-box-shadow") === "true";
  
    // Additional styling properties
    const titleFontWeight = searchConfigDiv.getAttribute("data-title-font-weight") || "font-bold";
    const otherFieldsFontFamily = searchConfigDiv.getAttribute("data-other-fields-font-family") || "Arial";
    const otherFieldsFontWeight = searchConfigDiv.getAttribute("data-other-font-weight") || "font-normal";
    const backgroundColor = searchConfigDiv.getAttribute("data-background-color") || "#fff";
    const headingAlignment = searchConfigDiv.getAttribute("data-heading-alignment") || "left";
    const bodyAlignment = searchConfigDiv.getAttribute("data-body-alignment") || "left";
  
    const maxItems = displayMode === "Grid" ? gridRows * gridColumns : itemsPerPage;
    const collectionsParam = encodeURIComponent(JSON.stringify(selectedCollections));
    const fieldsSearchParam = encodeURIComponent(JSON.stringify(selectedFieldsSearch));
    const fieldsDisplayParam = encodeURIComponent(JSON.stringify(selectedFieldsDisplay));
  
    const styles = {
      titleFontSize,
      titleFontFamily,
      titleColor,
      titleFontWeight,
      otherFieldsColor,
      otherFieldsFontSize,
      otherFieldsFontFamily,
      otherFieldsFontWeight,
      borderRadius,
      backgroundColor,
      boxShadow,
      headingAlignment,
      bodyAlignment,
    };
    
    // Debug: Log the styles being applied
    console.log("Styles being applied:", styles);
    console.log("Title font family:", titleFontFamily);
    console.log("Body font family:", otherFieldsFontFamily);
  
    const wrapper = document.querySelector(".searchresultformwrapper");
    const form = wrapper.querySelector("form.w-form");
    const input = wrapper.querySelector("input[name='query']");
    const resultsContainer = document.querySelector(".searchresults");
    const siteName = window.location.hostname.replace(/^www\./, '').split('.')[0];
  
    if (input) {
      input.style.borderRadius = '8px'; 
    }
  
    // Hide submit button if Auto result
    const submitButton = form?.querySelector("input[type='submit']");
    if (submitButton) submitButton.style.display = "none";
  
    if (!form || !input || !resultsContainer) {
      console.warn("Search form or elements not found.");
      return;
    }
  
    form.removeAttribute("action");
    form.setAttribute("action", "#");
  
    const token = await getVisitorSessionToken();
    console.log("Generated Token: ", token);
  
    // Create spinner
    const spinner = createSpinner();
  
    // === Implement Search Bar Display Mode ===
    if (searchBarType === "Icon") {
      form.style.display = "none";
      const iconContainer = document.querySelector(".searchiconcontainer");
      if (!iconContainer) {
        console.error("'.searchiconcontainer' element not found.");
        return;
      }
  
      iconContainer.style.cursor = "pointer";
      iconContainer.style.display = "";
  
      iconContainer.addEventListener("click", () => {
        form.style.display = "";
        iconContainer.style.display = "none";
        input.focus();
      });
    } else {
      form.style.display = "";
      const iconContainer = document.querySelector(".searchiconcontainer");
      if (iconContainer) iconContainer.style.display = "none";
    }
  
    // Inject styles dynamically for suggestions and ensure font application
    const style = document.createElement("style");
    style.textContent = `
      .searchsuggestionbox {
        position: absolute;
        top: 100%;
        left: 0;
        background: white;
        border: 1px solid #ccc;
        max-height: 200px;
        overflow-y: auto;
        width: 100%;
        display: none;
        z-index: 1000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      }
  
      /* Ensure custom fonts are applied with maximum specificity */
      .search-result-item h4,
      .search-result-item a,
      .search-result-item p {
        font-family: inherit !important;
      }
      
      /* Force specific fonts with maximum specificity */
      .search-result-item h4[style*="Oswald"] {
        font-family: 'Oswald', sans-serif !important;
      }
      
      .search-result-item h4[style*="Great Vibes"] {
        font-family: 'Great Vibes', cursive !important;
      }
      
      .search-result-item h4[style*="Montserrat"] {
        font-family: 'Montserrat', sans-serif !important;
      }
      
      .search-result-item h4[style*="Lato"] {
        font-family: 'Lato', sans-serif !important;
      }
      
      .search-result-item h4[style*="Inter"] {
        font-family: 'Inter', sans-serif !important;
      }
      
      /* Force body text fonts too */
      .search-result-item p[style*="Oswald"] {
        font-family: 'Oswald', sans-serif !important;
      }
      
      .search-result-item p[style*="Great Vibes"] {
        font-family: 'Great Vibes', cursive !important;
      }
      
      /* Responsive grid breakpoints */
      @media (max-width: 675px) {
        .search-results-wrapper {
          grid-template-columns: repeat(1, 1fr) !important;
        }
      }
      
      @media (max-width: 480px) {
        .search-results-wrapper {
          gap: 0.5rem !important;
        }
      }
  
      .searchsuggestionbox .suggestion-item {
        padding: 8px;
        cursor: pointer;
        color: black !important;
        font-size: 12px !important;
        font-family: 'Inter', 'Arial', sans-serif !important;
        line-height: 1.4;
        background: white !important;
        border: none !important;
        text-transform: capitalize !important;
        white-space: normal;
      }
  
      .searchsuggestionbox .suggestion-item:hover {
        background-color: #eee;
      }
      .searchsuggestionbox .view-all-link {
        padding: 10px;
        text-align: center;
        font-weight: bold;
        color: #0073e6 !important;
        cursor: pointer;
        border-top: 1px solid #eee;
        background: #fafafa;
        font-family: Arial, sans-serif !important;
        font-size: 16px !important;
      }
    `;
    document.head.appendChild(style);
  
    // Create suggestion box if it doesn't exist
    let suggestionBox = document.querySelector(".searchsuggestionbox");
    if (!suggestionBox) {
      suggestionBox = document.createElement("div");
      suggestionBox.className = "searchsuggestionbox";
      input.parentNode.style.position = "relative";
      input.parentNode.appendChild(suggestionBox);
    }
  
    // Add input event listener for suggestion box
    input.addEventListener("input", async () => {
      const query = input.value.trim();
  
      if (!query) {
        suggestionBox.style.display = "none";
        suggestionBox.innerHTML = "";
        return;
      }
  
      try {
        const url = `https://search-server.long-rain-28bb.workers.dev/api/suggestions?query=${encodeURIComponent(query)}&siteName=${encodeURIComponent(siteName)}&collections=${collectionsParam}&searchFields=${fieldsSearchParam}`;
  
        const response = await fetch(url);
  
        if (!response.ok) throw new Error("Network response was not ok");
  
        const data = await response.json();
  
        if (data.suggestions && data.suggestions.length > 0) {
          suggestionBox.style.display = "block";
          suggestionBox.innerHTML = data.suggestions
            .map(s => {
              const clean = sanitizeText(s);
              const titled = toTitleCase(clean);
              return `<div class="suggestion-item">${titled}</div>`;
            })
            .join("");
  
          // Attach click listeners to suggestions
          suggestionBox.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
              input.value = item.textContent;
              suggestionBox.style.display = "none";
              performSearch();
            });
          });
  
        } else {
          suggestionBox.style.display = "none";
          suggestionBox.innerHTML = "";
        }
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
        suggestionBox.style.display = "none";
        suggestionBox.innerHTML = "";
      }
    });
    
    // Handle window resize for responsive grid
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const existingResults = document.querySelector('.combined-search-results');
        if (existingResults && resultsContainer.children.length > 0) {
          console.log('Window resized, updating grid layout...');
          const currentQuery = input?.value || new URLSearchParams(window.location.search).get('q');
          if (currentQuery) {
            performSearch();
          }
        }
      }, 250);
    });
  
    // Add input event listener for debounced search
    input.addEventListener("input", () => {
      debouncedSearch(performSearch, 100);
    });
  
    // Form submit handler
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      performSearch();
    });
  
    // Handle URL-based search
    if (window.location.pathname.includes("search-app-results")) {
      performSearch();
    }
  
    // Close suggestion box when clicking outside
    document.addEventListener('click', (event) => {
      if (!suggestionBox.contains(event.target) && event.target !== input) {
        suggestionBox.style.display = "none";
      }
    });
  });
