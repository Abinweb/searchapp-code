// ===== OPTIMIZED SEARCH SCRIPT - MINIMIZED VERSION =====

// Enhanced search cache with TTL and size limits
const searchCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_SIZE = 100;

// Request cancellation controller
let currentSearchController = null;

// Connection pooling
const connectionPool = new Map();
const MAX_CONNECTIONS = 6;
const CONNECTION_TIMEOUT = 30000;

// Enhanced cache management
function getCachedResults(query, selectedOption) {
  const cacheKey = `${query}_${selectedOption}`;
  const cached = searchCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Using cached results for:', query);
    return cached.results;
  }
  
  if (cached) searchCache.delete(cacheKey);
  return null;
}

function setCachedResults(query, selectedOption, results) {
  const cacheKey = `${query}_${selectedOption}`;
  
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

// Optimized debounced search
let searchDebounceTimer;
function debouncedSearch(performSearch, baseDelay = 100) {
  clearTimeout(searchDebounceTimer);
  
  const query = document.querySelector("input[name='query']")?.value || '';
  const delay = query.length <= 2 ? baseDelay : Math.min(baseDelay * 2, 500);
  
  searchDebounceTimer = setTimeout(() => {
    performSearch();
  }, delay);
}

// Optimized fetch with retry logic
async function optimizedFetch(url, options = {}, retries = 2) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      keepalive: true,
      headers: {
        ...options.headers,
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=30, max=1000'
      }
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return optimizedFetch(url, options, retries - 1);
    }
    throw error;
  }
}

// Parallel search execution
async function executeParallelSearches(query, selectedOption, siteName, token, collectionsParam, fieldsSearchParam, fieldsDisplayParam) {
  const headers = { Authorization: `Bearer ${token}` };
  const searchPromises = [];
  
  if (currentSearchController) {
    currentSearchController.abort();
  }
  
  currentSearchController = new AbortController();
  
  if (selectedOption === "Pages" || selectedOption === "Both") {
    const pagePromise = optimizedFetch(
      `https://search-server.long-rain-28bb.workers.dev/api/search-index?query=${encodeURIComponent(query)}&siteName=${siteName}`,
      { headers, signal: currentSearchController.signal }
    );
    searchPromises.push({ type: 'page', promise: pagePromise });
  }
  
  if (selectedOption === "Collection" || selectedOption === "Both") {
    const cmsPromise = optimizedFetch(
      `https://search-server.long-rain-28bb.workers.dev/api/search-cms?query=${encodeURIComponent(query)}&siteName=${siteName}&collections=${collectionsParam}&searchFields=${fieldsSearchParam}&displayFields=${fieldsDisplayParam}`,
      { headers, signal: currentSearchController.signal }
    );
    searchPromises.push({ type: 'cms', promise: cmsPromise });
  }
  
  const results = await Promise.allSettled(searchPromises.map(async ({ type, promise }) => {
    try {
      const response = await promise;
      if (response.ok) {
        const data = await response.json();
        return { type, data: data.results || [], success: true };
      } else {
        return { type, data: [], success: false, error: response.statusText };
      }
    } catch (error) {
      return { type, data: [], success: false, error: error.message };
    }
  }));
  
  let allResults = [];
  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value.success) {
      const typeData = result.value.data.map(item => ({ ...item, _type: result.value.type }));
      allResults = allResults.concat(typeData);
    }
  });
  
  return allResults;
}

// Background search warming (doesn't show results)
async function performBackgroundSearch() {
  try {
    const token = await getVisitorSessionToken();
    if (!token) return;
    
    const siteName = window.location.hostname.replace(/^www\./, '').split('.')[0];
    const headers = { Authorization: `Bearer ${token}` };
    
    const searchConfigDiv = document.querySelector('#search-config');
    if (!searchConfigDiv) return;
    
    const selectedCollections = JSON.parse(searchConfigDiv.getAttribute('data-selected-collections') || '[]');
    const selectedFieldsSearch = JSON.parse(searchConfigDiv.getAttribute('data-selected-fields-search') || '[]');
    const selectedFieldsDisplay = JSON.parse(searchConfigDiv.getAttribute('data-selected-fields-display') || '[]');
    const selectedOption = searchConfigDiv.getAttribute('data-selected-option');
    
    // Random keywords for background warming
    const backgroundKeywords = [
      'the', 'and', 'for', 'with', 'from', 'this', 'that', 'have', 'will', 'been',
      'about', 'would', 'think', 'their', 'time', 'there', 'could', 'people', 'other',
      'first', 'after', 'should', 'because', 'through', 'during', 'before', 'however',
      'between', 'never', 'under', 'know', 'world', 'place', 'year', 'work', 'life',
      'company', 'business', 'service', 'product', 'information', 'technology'
    ];
    
    const numKeywords = Math.floor(Math.random() * 2) + 2;
    const selectedKeywords = [];
    for (let i = 0; i < numKeywords; i++) {
      const randomIndex = Math.floor(Math.random() * backgroundKeywords.length);
      selectedKeywords.push(backgroundKeywords[randomIndex]);
    }
    
    const backgroundQuery = selectedKeywords.join(' ');
    
    // Perform background search without showing results
    if (selectedOption === "Collection" || selectedOption === "Both") {
      const collectionsParam = encodeURIComponent(JSON.stringify(selectedCollections));
      const fieldsSearchParam = encodeURIComponent(JSON.stringify(selectedFieldsSearch));
      const fieldsDisplayParam = encodeURIComponent(JSON.stringify(selectedFieldsDisplay));
      
      await fetch(
        `https://search-server.long-rain-28bb.workers.dev/api/search-cms?query=${encodeURIComponent(backgroundQuery)}&siteName=${siteName}&collections=${collectionsParam}&searchFields=${fieldsSearchParam}&displayFields=${fieldsDisplayParam}`,
        { headers }
      );
    }
    
    if (selectedOption === "Pages" || selectedOption === "Both") {
      await fetch(
        `https://search-server.long-rain-28bb.workers.dev/api/search-index?query=${encodeURIComponent(backgroundQuery)}&siteName=${siteName}`,
        { headers }
      );
    }
    
    console.log("Background search completed - system warmed up!");
    
  } catch (error) {
    // Silent background search - don't show errors
  }
}

// Set up periodic background searches
function setupPeriodicBackgroundSearch() {
  setInterval(() => {
    performBackgroundSearch();
  }, 5 * 60 * 1000); // Every 5 minutes
}

// Font weight helper function
function fontWeightFromClass(className) {
  if (!isNaN(className)) return parseInt(className);
  
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

// Optimized render results function
function renderResults(results, title, displayMode, maxItems, gridColumns = 3, paginationType = "None", container, currentPage = 1, isPageResult = true, styles = {}) {
  if (!Array.isArray(results) || results.length === 0) return "";
  
  const totalPages = maxItems ? Math.ceil(results.length / maxItems) : 1;
  currentPage = Math.max(1, Math.min(currentPage, totalPages));
  
  const startIndex = maxItems ? (currentPage - 1) * maxItems : 0;
  const endIndex = maxItems ? startIndex + maxItems : results.length;
  const pagedResults = results.slice(startIndex, endIndex);
  
  // Remove existing pagination to prevent duplication
  if (container) {
    const existingPagination = container.querySelector('.pagination');
    if (existingPagination) existingPagination.remove();
  }
  
  // Responsive grid columns
  const getResponsiveGridColumns = () => {
    try {
      const screenWidth = window.innerWidth || 1200;
      const maxColumns = Math.max(1, Math.min(gridColumns || 3, 6));
      
      if (screenWidth <= 480) return 1;
      if (screenWidth <= 675) return 1;
      if (screenWidth <= 768) return Math.min(maxColumns, 2);
      if (screenWidth <= 1024) return Math.min(maxColumns, 3);
      if (screenWidth <= 1440) return Math.min(maxColumns, 4);
      return maxColumns;
    } catch (error) {
      return Math.max(1, Math.min(gridColumns || 3, 3));
    }
  };
  
  const responsiveGridColumns = getResponsiveGridColumns();
  
  const {
    titleFontSize = "16px",
    titleFontFamily = "Arial",
    titleColor = "#000",
    titleFontWeight = "font-bold",
    borderRadius = "6px",
    otherFieldsColor = "#333",
    otherFieldsFontSize = "14px",
    otherFieldsFamily = "Arial",
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
            const imageStyle = displayMode === 'Grid' ? 'max-width: 100%;' : 'max-width: 50%;';
            return `<p style="color: ${otherFieldsColor} !important; font-size: ${otherFieldsFontSize} !important; font-family: '${otherFieldsFamily}', sans-serif !important; font-weight: ${fontWeightFromClass(otherFieldsFontWeight)} !important; text-align: ${bodyAlignment} !important;">
                      <img src="${imageUrl}" alt="${key}" class="item-image" style="${imageStyle} border-radius: 4px;" />
                    </p>`;
          }
          return `<p style="color: ${otherFieldsColor} !important; font-size: ${otherFieldsFontSize} !important; font-family: '${otherFieldsFamily}', sans-serif !important; font-weight: ${fontWeightFromClass(otherFieldsFontWeight)} !important; text-align: ${bodyAlignment} !important;">${JSON.stringify(value)}</p>`;
        }
        return `<p style="color: ${otherFieldsColor} !important; font-size: ${otherFieldsFontSize} !important; font-family: '${otherFieldsFamily}', sans-serif !important; font-weight: ${fontWeightFromClass(otherFieldsFontWeight)} !important; text-align: ${bodyAlignment} !important;">${value}</p>`;
      })
      .join("");

    const boxShadowStyle = boxShadow ? "0 2px 6px rgba(0, 0, 0, 0.1)" : "none";

    if (displayMode === "Grid") {
      return `
        <a href="${detailUrl}" target="_blank" style="text-decoration: none; color: inherit; display: block; height: 100%; min-height: 200px;">
          <div class="search-result-item grid-item" 
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
              box-sizing: border-box;
              overflow: hidden;
              word-wrap: break-word;
              word-break: break-word;
            ">
            <div style="flex: 1; display: flex; flex-direction: column;">
              <h4 style="
                font-size: ${titleFontSize} !important; 
                font-family: '${titleFontFamily}', sans-serif !important; 
                font-weight: ${fontWeightFromClass(titleFontWeight)} !important; 
                color: ${titleColor} !important; 
                text-align: ${headingAlignment} !important; 
                margin-bottom: 0.5rem; 
                word-wrap: break-word;
                word-break: break-word;
                line-height: 1.3;
                margin-top: 0;
              ">
                ${titleText}
              </h4>
              ${matchedText
                ? `<p style="
                    color: ${otherFieldsColor} !important; 
                    font-size: ${otherFieldsFontSize} !important; 
                    font-family: '${otherFieldsFamily}', sans-serif !important; 
                    font-weight: ${fontWeightFromClass(otherFieldsFontWeight)} !important; 
                    text-align: ${bodyAlignment} !important; 
                    flex-grow: 1;
                    margin: 0;
                    line-height: 1.4;
                    word-wrap: break-word;
                    word-break: break-word;
                  ">${matchedText}...</p>`
                : `<div style="flex-grow: 1; word-wrap: break-word; word-break: break-word;">${fieldsHtml}</div>`}
            </div>
          </div>
        </a>
      `;
    } else {
      return `
        <div class="search-result-item" style="margin-bottom: 1rem; padding-left: 1rem;">
          <a href="${detailUrl}" target="_blank" style="font-size: ${titleFontSize} !important; font-family: '${titleFontFamily}', sans-serif !important; font-weight: ${fontWeightFromClass(titleFontWeight)} !important; color: ${titleColor} !important; text-align: ${headingAlignment} !important; text-decoration: underline;">
            ${titleText}
          </a>
          ${matchedText
            ? `<p style="color: ${otherFieldsColor} !important; font-size: ${otherFieldsFontSize} !important; font-family: '${otherFieldsFamily}', sans-serif !important; font-weight: ${fontWeightFromClass(otherFieldsFontWeight)} !important; text-align: ${bodyAlignment} !important;">${matchedText}...</p>`
            : fieldsHtml}
        </div>
      `;
    }
  }).join("");

  // Enhanced pagination
  let paginationHtml = "";
  
  if (paginationType === "Numbered" && totalPages > 1 && totalPages <= 100) {
    paginationHtml = `<div class="pagination" id="search-pagination-${Date.now()}" style="margin-top: 1rem; display: flex; justify-content: center; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px; box-sizing: border-box;">`;
    
    if (currentPage > 1) {
      paginationHtml += `<button class="pagination-button prev-button" data-page="${currentPage - 1}" style="margin: 0; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; transition: all 0.2s ease; min-width: 40px;">←</button>`;
    }
    
    const maxVisiblePages = Math.min(7, totalPages);
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
      paginationHtml += `<button class="pagination-button" data-page="1" style="margin: 0; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; transition: all 0.2s ease; min-width: 40px;">1</button>`;
      if (startPage > 2) {
        paginationHtml += `<span style="padding: 0 8px; color: #666;">...</span>`;
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      const isCurrentPage = i === currentPage;
      const buttonStyle = isCurrentPage 
        ? 'margin: 0; padding: 8px 12px; border: 1px solid #0073e6; border-radius: 4px; background: #0073e6; color: white; cursor: pointer; transition: all 0.2s ease; min-width: 40px; font-weight: bold;'
        : 'margin: 0; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; transition: all 0.2s ease; min-width: 40px;';
      
      paginationHtml += `<button class="pagination-button ${isCurrentPage ? 'current-page' : ''}" data-page="${i}" style="${buttonStyle}">${i}</button>`;
    }
    
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationHtml += `<span style="padding: 0 8px; color: #666;">...</span>`;
      }
      paginationHtml += `<button class="pagination-button" data-page="${totalPages}" style="margin: 0; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; transition: all 0.2s ease; min-width: 40px;">${totalPages}</button>`;
    }
    
    if (currentPage < totalPages) {
      paginationHtml += `<button class="pagination-button next-button" data-page="${currentPage + 1}" style="margin: 0; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; transition: all 0.2s ease; min-width: 40px;">→</button>`;
    }
    
    paginationHtml += `</div>`;
  }

  if (paginationType === "Load More" && endIndex < results.length) {
    paginationHtml += `<div style="display: flex; justify-content: center; margin-top: 1rem; padding: 10px; box-sizing: border-box;"><button class="load-more-button" style="padding: 12px 24px; border: 1px solid #0073e6; border-radius: 6px; background: #0073e6; color: white; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s ease; min-width: 120px;">Load More</button></div>`;
  }

  const sectionHtml = `
    <section style="margin-top: 2rem;">
      <div class="search-results-wrapper" style="
        display: ${displayMode === 'Grid' ? 'grid' : 'block'};
        grid-template-columns: repeat(${responsiveGridColumns}, 1fr);
        gap: 1rem;
        width: 100%;
        max-width: 100%;
        min-height: 200px;
        box-sizing: border-box;
        overflow: hidden;
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

// Essential functions
async function getOrCreateVisitorId() {
  let visitorId = localStorage.getItem('visitorId');
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem('visitorId', visitorId);
  }
  return visitorId;
}

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp && payload.exp < Math.floor(Date.now() / 1000);
  } catch (e) {
    return true;
  }
}

async function getVisitorSessionToken() {
  try {
    const existingToken = localStorage.getItem('visitorSessionToken');
    if (existingToken && !isTokenExpired(existingToken)) {
      return existingToken;
    }

    const visitorId = await getOrCreateVisitorId();
    const siteName = window.location.hostname.replace(/^www\./, '').split('.')[0];

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

// Main search function
async function performSearch() {
  let query = input?.value.trim().toLowerCase();

  if (!query) {
    const params = new URLSearchParams(window.location.search);
    query = params.get('q')?.trim().toLowerCase() || '';
  }

  if (!query) return;
  
  // Check cache first for instant results
  const cachedResults = getCachedResults(query, selectedOption);
  if (cachedResults) {
    resultsContainer.innerHTML = "";
    const combinedResultsDiv = document.createElement("div");
    combinedResultsDiv.classList.add("combined-search-results");
    resultsContainer.appendChild(combinedResultsDiv);
    renderResults(cachedResults, "Search Results", displayMode, maxItems, gridColumns, paginationType, combinedResultsDiv, 1, false, styles);
    return;
  }
  
  showSpinner();
  resultsContainer.innerHTML = ""; 

  try {
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

    const combinedResultsDiv = document.createElement("div");
    combinedResultsDiv.classList.add("combined-search-results");
    resultsContainer.appendChild(combinedResultsDiv);

    renderResults(allResults, "Search Results", displayMode, maxItems, gridColumns, paginationType, combinedResultsDiv, 1, false, styles);
    hideSpinner();
  } catch (error) {
    console.error('Error performing search:', error);
    resultsContainer.innerHTML = "<p>Error performing search. Please try again later.</p>";
    hideSpinner();
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", async function () {
  // Start background search warming
  setTimeout(() => {
    performBackgroundSearch();
    setupPeriodicBackgroundSearch();
  }, 2000);
  
  const searchConfigDiv = document.querySelector('#search-config');
  if (!searchConfigDiv) return;

  const selectedCollections = JSON.parse(searchConfigDiv.getAttribute('data-selected-collections') || '[]');
  const selectedFieldsSearch = JSON.parse(searchConfigDiv.getAttribute('data-selected-fields-search') || '[]');
  const selectedFieldsDisplay = JSON.parse(searchConfigDiv.getAttribute('data-selected-fields-display') || '[]');
  const selectedOption = searchConfigDiv.getAttribute('data-selected-option');
  const displayMode = searchConfigDiv.getAttribute('data-display-mode');
  const paginationType = searchConfigDiv.getAttribute('data-pagination-type') || "None";
  const gridRows = parseInt(searchConfigDiv.getAttribute('data-grid-rows'), 10) || 1;
  const gridColumns = parseInt(searchConfigDiv.getAttribute('data-grid-columns'), 10) || 1;
  const itemsPerPage = parseInt(searchConfigDiv.getAttribute('data-items-per-page'), 10) || 10;
  const searchBarType = searchConfigDiv.getAttribute('data-search-bar');
  const resultPage = searchConfigDiv.getAttribute('data-result-page') || "Same page";

  const titleFontSize = searchConfigDiv.getAttribute("data-title-font-size") || "16px";
  const titleFontFamily = searchConfigDiv.getAttribute("data-title-font-family") || "Arial";
  const titleColor = searchConfigDiv.getAttribute("data-title-color") || "#000";
  const titleFontWeight = searchConfigDiv.getAttribute("data-title-font-weight") || "font-bold";
  const otherFieldsColor = searchConfigDiv.getAttribute("data-other-fields-color") || "#333";
  const otherFieldsFontSize = searchConfigDiv.getAttribute("data-other-fields-font-size") || "14px";
  const borderRadius = searchConfigDiv.getAttribute("data-border-radius") || "6px";
  const boxShadow = searchConfigDiv.getAttribute("data-box-shadow") === "true";
  const otherFieldsFamily = searchConfigDiv.getAttribute("data-other-fields-font-family") || "Arial";
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
    otherFieldsFamily,
    otherFieldsFontWeight,
    borderRadius,
    backgroundColor,
    boxShadow,
    headingAlignment,
    bodyAlignment,
  };

  const wrapper = document.querySelector(".searchresultformwrapper");
  const form = wrapper.querySelector("form.w-form");
  const input = wrapper.querySelector("input[name='query']");
  const resultsContainer = document.querySelector(".searchresults");
  const base_url = "https://search-server.long-rain-28bb.workers.dev";
  const siteName = window.location.hostname.replace(/^www\./, '').split('.')[0];

  if (!form || !input || !resultsContainer) return;

  form.removeAttribute("action");
  form.setAttribute("action", "#");

  const token = await getVisitorSessionToken();

  // Search bar display mode
  if (searchBarType === "Icon") {
    form.style.display = "none";
    const iconContainer = document.querySelector(".searchiconcontainer");
    if (iconContainer) {
      iconContainer.style.cursor = "pointer";
      iconContainer.addEventListener("click", () => {
        form.style.display = "";
        iconContainer.style.display = "none";
        input.focus();
      });
    }
  }

  // Create spinner
  const spinner = document.createElement("div");
  spinner.id = "search-spinner";
  spinner.style.display = "none";
  spinner.innerHTML = `<div class="spinner"></div>`;
  
  const spinnerStyle = document.createElement("style");
  spinnerStyle.textContent = `
    #search-spinner { display: flex; justify-content: center; align-items: center; min-height: 60px; }
    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #0073e6; border-radius: 50%; width: 32px; height: 32px; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  `;
  
  document.head.appendChild(spinnerStyle);
  document.body.appendChild(spinner);

  function showSpinner() {
    spinner.style.display = "flex";
    resultsContainer.parentNode.insertBefore(spinner, resultsContainer);
  }

  function hideSpinner() {
    spinner.style.display = "none";
  }

  // Event listeners
  input.addEventListener("input", () => {
    debouncedSearch(performSearch, 100);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    performSearch();
  });

  // Handle window resize
  let resizeTimeout;
  let lastWindowWidth = window.innerWidth;
  
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const currentWidth = window.innerWidth;
      const widthDifference = Math.abs(currentWidth - lastWindowWidth);
      
      if (widthDifference > 50) {
        lastWindowWidth = currentWidth;
        const existingResults = document.querySelector('.combined-search-results');
        if (existingResults) {
          const responsiveGridColumns = Math.max(1, Math.min(gridColumns || 3, 6));
          existingResults.style.gridTemplateColumns = `repeat(${responsiveGridColumns}, 1fr)`;
        }
      }
    }, 300);
  });

  // Auto-search on page load if query parameter exists
  if (window.location.pathname.includes("search-app-results")) {
    performSearch();
  }
});
