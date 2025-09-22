// Enhanced cache with instant lookup
const searchCache = new Map();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const MAX_CACHE_SIZE = 200;

// Instant cache lookup
function getCachedResults(query, selectedOption) {
  const cacheKey = `${query.toLowerCase()}_${selectedOption}`;
  const cached = searchCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('⚡ Instant cache hit for:', query);
    return cached.results;
  }
  
  return null;
}

function setCachedResults(query, selectedOption, results) {
  const cacheKey = `${query.toLowerCase()}_${selectedOption}`;
  
  if (searchCache.size >= MAX_CACHE_SIZE) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }
  
  searchCache.set(cacheKey, {
    results,
    timestamp: Date.now()
  });
}

// Non-blocking font loading
function loadFontsAsync() {
  const fontLink = document.createElement('link');
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Oswald:wght@200;300;400;500;600;700&family=Great+Vibes&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&family=Inter:ital,wght@0,100..900;1,100..900&display=swap';
  fontLink.rel = 'stylesheet';
  fontLink.type = 'text/css';
  document.head.appendChild(fontLink);
}

// Optimized API requests
let currentSearchController = null;

async function optimizedFetch(url, options = {}, retries = 1) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      keepalive: true,
      headers: {
        ...options.headers,
        'Connection': 'keep-alive'
      }
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (retries > 0 && error.name !== 'AbortError') {
      await new Promise(resolve => setTimeout(resolve, 300));
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
      `https://search-server.long-rain-28bb.workers.dev/api/search-index?query=${encodeURIComponent(query)}&siteName=${siteName}&limit=50`,
      { headers, signal: currentSearchController.signal }
    );
    searchPromises.push({ type: 'page', promise: pagePromise });
  }
  
  if (selectedOption === "Collection" || selectedOption === "Both") {
    const cmsPromise = optimizedFetch(
      `https://search-server.long-rain-28bb.workers.dev/api/search-cms?query=${encodeURIComponent(query)}&siteName=${siteName}&collections=${collectionsParam}&searchFields=${fieldsSearchParam}&displayFields=${fieldsDisplayParam}&limit=50`,
      { headers, signal: currentSearchController.signal }
    );
    searchPromises.push({ type: 'cms', promise: cmsPromise });
  }
  
  const results = await Promise.allSettled(
    searchPromises.map(async ({ type, promise }) => {
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
    })
  );
  
  let allResults = [];
  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value.success) {
      const typeData = result.value.data.map(item => ({ ...item, _type: result.value.type }));
      allResults = allResults.concat(typeData);
    }
  });
  
  return allResults;
}

// Font weight helper
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

// Ultra-fast rendering with FIXED pagination
function renderResultsFast(results, title, displayMode, maxItems, gridColumns = 3, paginationType = "None", container, currentPage = 1, isPageResult = true, styles = {}, selectedFieldsDisplay = []) {
  if (!Array.isArray(results) || results.length === 0) return "";
  
  const totalPages = maxItems ? Math.ceil(results.length / maxItems) : 1;
  currentPage = Math.max(1, Math.min(currentPage, totalPages));
  
  const startIndex = maxItems ? (currentPage - 1) * maxItems : 0;
  const endIndex = maxItems ? startIndex + maxItems : results.length;
  const pagedResults = results.slice(startIndex, endIndex);
  
  if (container) {
    const existingPagination = container.querySelector('.pagination');
    if (existingPagination) {
      existingPagination.remove();
    }
  }
  
  const getResponsiveGridColumns = () => {
    const screenWidth = window.innerWidth || 1200;
    const maxColumns = Math.max(1, Math.min(gridColumns || 3, 6));
    
    if (screenWidth <= 480) return 1;
    if (screenWidth <= 675) return 1;
    if (screenWidth <= 768) return Math.min(maxColumns, 2);
    if (screenWidth <= 1024) return Math.min(maxColumns, 3);
    if (screenWidth <= 1440) return Math.min(maxColumns, 4);
    return maxColumns;
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
    otherFieldsFontFamily = "Arial",
    otherFieldsFontWeight = "font-normal",
    backgroundColor = "#fff",
    boxShadow = true,
    headingAlignment = "left",
    bodyAlignment = "left",
  } = styles;
  
  const itemsHtml = pagedResults.map(item => {
    // Debug: Log item structure to identify backend issues
    console.log('🔍 Rendering item:', item);
    
    const titleText = item.name || item.title || "Untitled";
    const detailUrl = item._type === 'page' 
      ? (item.publishedPath || item.slug || "#")
      : (item.detailUrl || "#");
    const matchedText = item.matchedText?.slice(0, 200) || "";
    
    // Use selectedFieldsDisplay if provided, otherwise show all fields
    const fieldsToShow = selectedFieldsDisplay.length > 0 ? selectedFieldsDisplay : Object.keys(item);
    
    const fieldsHtml = Object.entries(item)
      .filter(([key]) => {
        // Always exclude these fields
        const excludedFields = ['name', 'title', 'detailUrl', '_type', 'matchedText', 'slug', 'publishedPath'];
        if (excludedFields.includes(key)) return false;
        
        // If selectedFieldsDisplay is specified, only show those fields
        if (selectedFieldsDisplay.length > 0) {
          return selectedFieldsDisplay.includes(key);
        }
        
        return true;
      })
      .slice(0, 7) // Show more fields
      .map(([key, value]) => {
        // Handle different data types properly
        let displayValue = '';
        
        if (typeof value === 'string') {
          if (value.match(/^\d{4}-\d{2}-\d{2}T/)) {
            displayValue = new Date(value).toLocaleString();
          } else {
            displayValue = value;
          }
        } else if (typeof value === 'object' && value !== null) {
          // Handle images specially
          if (key === 'images') {
            if (Array.isArray(value)) {
              // Handle array of images
              return value.slice(0, 2).map(img => 
                `<img src="${img.url || img}" alt="${img.alt || ''}" style="max-width: 100%; height: auto; border-radius: 4px; margin: 0.5rem 0; display: block; text-align: ${bodyAlignment};">`
              ).join('');
            } else if (value.url) {
              // Handle single image object
              return `<img src="${value.url}" alt="${value.alt || ''}" style="max-width: 100%; height: auto; border-radius: 4px; margin: 0.5rem 0; display: block; text-align: ${bodyAlignment};">`;
            }
          }
          // Handle objects by extracting meaningful values
          if (Array.isArray(value)) {
            displayValue = value.join(', ');
          } else if (value.text || value.content || value.description) {
            displayValue = value.text || value.content || value.description;
          } else if (value.url) {
            // If it's an image object with URL, show the image
            return `<img src="${value.url}" alt="${value.alt || ''}" style="max-width: 100%; height: auto; border-radius: 4px; margin: 0.5rem 0; display: block; text-align: ${bodyAlignment};">`;
          } else {
            displayValue = JSON.stringify(value, null, 2).slice(0, 100) + '...';
          }
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          displayValue = String(value);
        } else {
          displayValue = String(value || '');
        }
        
        // Only show non-empty values - NO LABELS
        if (displayValue && displayValue.trim() && displayValue !== 'null' && displayValue !== 'undefined') {
          return `<p style="
            color: ${otherFieldsColor};
            font-size: ${otherFieldsFontSize};
            font-family: '${otherFieldsFontFamily}', sans-serif;
            font-weight: ${fontWeightFromClass(otherFieldsFontWeight)};
            text-align: ${bodyAlignment};
            margin: 0.25rem 0;
            line-height: 1.4;
          ">${displayValue}</p>`;
        }
        return '';
      })
      .filter(html => html) // Remove empty entries
      .join("");
    
    if (displayMode === "Grid") {
      return `
        <a href="${detailUrl}" target="_blank" style="text-decoration: none; color: inherit; display: block; height: 100%; min-height: 200px;">
          <div class="search-result-item grid-item" style="
            background: ${backgroundColor};
            border: 1px solid #ddd;
            border-radius: ${borderRadius};
            padding: 1rem;
            height: 100%;
            min-height: 200px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
            overflow: hidden;
            word-wrap: break-word;
            ${boxShadow ? 'box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);' : ''}
          ">
            <div style="flex: 1; display: flex; flex-direction: column;">
              <h4 style="
                font-size: ${titleFontSize};
                font-family: '${titleFontFamily}', sans-serif;
                font-weight: ${fontWeightFromClass(titleFontWeight)};
                color: ${titleColor};
                text-align: ${headingAlignment};
                margin-bottom: 0.5rem;
                word-wrap: break-word;
                line-height: 1.3;
                margin-top: 0;
              ">
                ${titleText}
              </h4>
              ${matchedText ? `
                <p style="
                  color: ${otherFieldsColor};
                  font-size: ${otherFieldsFontSize};
                  font-family: '${otherFieldsFontFamily}', sans-serif;
                  font-weight: ${fontWeightFromClass(otherFieldsFontWeight)};
                  text-align: ${bodyAlignment};
                  flex-grow: 1;
                  margin: 0;
                  line-height: 1.4;
                  word-wrap: break-word;
                ">${matchedText}...</p>
              ` : `
                <div style="flex-grow: 1; word-wrap: break-word;">
                  ${fieldsHtml}
                </div>
              `}
            </div>
          </div>
        </a>
      `;
    } else {
      return `
        <div class="search-result-item" style="margin-bottom: 1rem; padding-left: 1rem;">
          <a href="${detailUrl}" target="_blank" style="
            font-size: ${titleFontSize};
            font-family: '${titleFontFamily}', sans-serif;
            font-weight: ${fontWeightFromClass(titleFontWeight)};
            color: ${titleColor};
            text-align: ${headingAlignment};
            text-decoration: underline;
          ">
            ${titleText}
          </a>
          ${matchedText ? `
            <p style="
              color: ${otherFieldsColor};
              font-size: ${otherFieldsFontSize};
              font-family: '${otherFieldsFontFamily}', sans-serif;
              font-weight: ${fontWeightFromClass(otherFieldsFontWeight)};
              text-align: ${bodyAlignment};
            ">${matchedText}...</p>
          ` : fieldsHtml}
        </div>
      `;
    }
  }).join("");
  
  // FIXED PAGINATION
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
    </section>
  `;
  
  if (container) {
    container.innerHTML = sectionHtml;
    
    if (paginationType === "Numbered") {
      const paginationButtons = container.querySelectorAll('.pagination-button');
      paginationButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const page = parseInt(btn.getAttribute('data-page'));
          console.log(`Pagination clicked: page ${page}`);
          renderResultsFast(results, title, displayMode, maxItems, gridColumns, paginationType, container, page, isPageResult, styles, selectedFieldsDisplay);
        });
      });
    }

    if (paginationType === "Load More") {
      const loadBtn = container.querySelector('.load-more-button');
      if (loadBtn) {
        loadBtn.addEventListener('click', () => {
          console.log('Load more clicked');
          renderResultsFast(results, title, displayMode, endIndex + maxItems, gridColumns, paginationType, container, 1, isPageResult, styles, selectedFieldsDisplay);
        });
      }
    }
  }
  
  return sectionHtml;
}

// Token management
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
      console.log("Using existing token from localStorage");
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

// ===== MAIN INITIALIZATION =====
document.addEventListener("DOMContentLoaded", async function () {
  loadFontsAsync();
  
  const searchConfigDiv = document.querySelector('#search-config');
  if (!searchConfigDiv) {
    console.error("'search-config' div not found.");
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
  const searchBarType = searchConfigDiv.getAttribute('data-search-bar');

  const titleFontSize = searchConfigDiv.getAttribute("data-title-font-size") || "16px";
  const titleFontFamily = searchConfigDiv.getAttribute("data-title-font-family") || "Arial";
  const titleColor = searchConfigDiv.getAttribute("data-title-color") || "#000";
  const otherFieldsColor = searchConfigDiv.getAttribute("data-other-fields-color") || "#333";
  const otherFieldsFontSize = searchConfigDiv.getAttribute("data-other-fields-font-size") || "14px";
  const borderRadius = searchConfigDiv.getAttribute("data-border-radius") || "6px";
  const boxShadow = searchConfigDiv.getAttribute("data-box-shadow") === "true";
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

  const wrapper = document.querySelector(".searchresultformwrapper");
  const form = wrapper?.querySelector("form.w-form");
  const input = wrapper?.querySelector("input[name='query']");
  const resultsContainer = document.querySelector(".searchresults");
  const siteName = window.location.hostname.replace(/^www\./, '').split('.')[0];

  if (input) {
    input.style.borderRadius = '8px';
  }

  const submitButton = form?.querySelector("input[type='submit']");
  if (submitButton) {
    submitButton.style.display = "none";
  }

  if (!form || !input || !resultsContainer) {
    console.warn("Search form or elements not found.");
    return;
  }

  form.removeAttribute("action");
  form.setAttribute("action", "#");

  const token = await getVisitorSessionToken();
  console.log("Generated Token: ", token);

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

  // CSS injection
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
    
    .searchsuggestionbox .suggestion-item {
      padding: 8px;
      cursor: pointer;
      color: black;
      font-size: 12px;
      font-family: 'Inter', 'Arial', sans-serif;
      line-height: 1.4;
      background: white;
      border: none;
      text-transform: capitalize;
      white-space: normal;
    }
    
    .searchsuggestionbox .suggestion-item:hover {
      background-color: #eee;
    }
    
    .search-results-wrapper {
      display: grid;
      gap: 1rem;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }
    
    @media (max-width: 479px) {
      .search-results-wrapper {
        grid-template-columns: 1fr;
      }
    }
    
    @media (min-width: 480px) and (max-width: 767px) {
      .search-results-wrapper {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    @media (min-width: 768px) and (max-width: 991px) {
      .search-results-wrapper {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    
    @media (min-width: 992px) {
      .search-results-wrapper {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      padding: 10px;
      box-sizing: border-box;
      margin-top: 1rem;
    }
    
    .pagination-button {
      min-width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 14px;
      line-height: 1;
      text-decoration: none;
    }
    
    .pagination-button:hover {
      background: #f5f5f5;
      border-color: #0073e6;
    }
    
    .pagination-button.current-page {
      background: #0073e6;
      color: white;
      border-color: #0073e6;
      font-weight: bold;
    }
    
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
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .search-result-item img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      margin: 0.5rem 0;
      display: block;
      object-fit: cover;
    }
    
    .grid-item img {
      max-height: 150px;
      width: 100%;
      object-fit: cover;
    }
  `;
  document.head.appendChild(style);

  // Create suggestion box
  let suggestionBox = document.querySelector(".searchsuggestionbox");
  if (!suggestionBox) {
    suggestionBox = document.createElement("div");
    suggestionBox.className = "searchsuggestionbox";
    input.parentNode.style.position = "relative";
    input.parentNode.appendChild(suggestionBox);
  }

  // Suggestion handling (LIVE SUGGESTIONS ONLY)
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

        suggestionBox.querySelectorAll('.suggestion-item').forEach(item => {
          item.addEventListener('click', () => {
            input.value = item.textContent;
            suggestionBox.style.display = "none";
            performSearchFast();
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

  // Create spinner
  const spinner = document.createElement("div");
  spinner.id = "search-spinner";
  spinner.style.display = "none";
  spinner.innerHTML = `<div class="spinner"></div>`;
  document.body.appendChild(spinner);

  function showSpinner() {
    spinner.style.display = "flex";
    resultsContainer.parentNode.insertBefore(spinner, resultsContainer);
  }

  function hideSpinner() {
    spinner.style.display = "none";
  }

  // FIXED: Search function that handles query parameters properly
  async function performSearchFast() {
    let query = input?.value.trim();

    // Check URL parameters first for results page
    if (!query) {
      const params = new URLSearchParams(window.location.search);
      query = params.get('q')?.trim() || '';
      console.log('🚀 Query from URL params:', query);
      
      // DON'T overwrite the input field - just use the query for search
      // The input field should remain independent for live suggestions
    }

    if (!query) return;
    
    const cachedResults = getCachedResults(query, selectedOption);
    if (cachedResults) {
      console.log('⚡ Rendering cached results instantly');
      resultsContainer.innerHTML = "";
      
      if (cachedResults.length === 0) {
        resultsContainer.innerHTML = `
          <div style="
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 200px;
            text-align: center;
            padding: 2rem;
          ">
            <p style="
              color: #666;
              font-size: 16px;
              font-family: 'Arial', sans-serif;
              margin: 0;
              line-height: 1.5;
            ">Your search did not return any results in this topic category.</p>
          </div>
        `;
        return;
      }
      
      const combinedResultsDiv = document.createElement("div");
      combinedResultsDiv.classList.add("combined-search-results");
      resultsContainer.appendChild(combinedResultsDiv);
      renderResultsFast(cachedResults, "Search Results", displayMode, maxItems, gridColumns, paginationType, combinedResultsDiv, 1, false, styles, selectedFieldsDisplay);
      return;
    }
    
    showSpinner();
    resultsContainer.innerHTML = "";
    
    try {
      console.log('🔍 Performing fast search for:', query);
      const startTime = performance.now();
      
      const allResults = await executeParallelSearches(
        query, 
        selectedOption, 
        siteName, 
        token, 
        collectionsParam, 
        fieldsSearchParam, 
        fieldsDisplayParam
      );

      const searchTime = performance.now() - startTime;
      console.log(`⚡ Search completed in ${searchTime.toFixed(2)}ms`);

      if (allResults.length === 0) {
        hideSpinner();
        resultsContainer.innerHTML = `
          <div style="
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 200px;
            text-align: center;
            padding: 2rem;
          ">
            <p style="
              color: #666;
              font-size: 16px;
              font-family: 'Arial', sans-serif;
              margin: 0;
              line-height: 1.5;
            ">Your search did not return any results in this topic category.</p>
          </div>
        `;
        return;
      }

      setCachedResults(query, selectedOption, allResults);

      const combinedResultsDiv = document.createElement("div");
      combinedResultsDiv.classList.add("combined-search-results");
      resultsContainer.appendChild(combinedResultsDiv);
      
      renderResultsFast(allResults, "Search Results", displayMode, maxItems, gridColumns, paginationType, combinedResultsDiv, 1, false, styles, selectedFieldsDisplay);
      hideSpinner();
      
    } catch (error) {
      console.error('❌ Search error:', error);
      resultsContainer.innerHTML = `
        <div style="
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 200px;
          text-align: center;
          padding: 2rem;
        ">
          <p style="
            color: #e74c3c;
            font-size: 16px;
            font-family: 'Arial', sans-serif;
            margin: 0;
            line-height: 1.5;
          ">Error performing search. Please try again later.</p>
        </div>
      `;
      hideSpinner();
    }
  }

  // Optimized debouncing - PRELOAD ONLY, NO DISPLAY
  let searchDebounceTimer;
  function optimizedDebouncedSearch() {
    clearTimeout(searchDebounceTimer);
    
    const query = document.querySelector("input[name='query']")?.value?.trim() || '';
    
    // Only preload data in background, don't show results
    if (query.length >= 2) {
      const delay = query.length <= 2 ? 50 : Math.min(query.length * 15, 200);
      searchDebounceTimer = setTimeout(() => {
        preloadSearchData(query);
      }, delay);
    }
    // DON'T clear results when typing - keep existing results visible
    // Only clear if user explicitly clears the input field completely
  }

  // Preload search data in background (without showing)
  async function preloadSearchData(query) {
    try {
      console.log('🔄 Preloading search data for:', query);
      
      // Show subtle loading indicator
      const loadingIndicator = document.createElement('div');
      loadingIndicator.id = 'preload-indicator';
      loadingIndicator.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        width: 12px;
        height: 12px;
        border: 2px solid #0073e6;
        border-top: 2px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        z-index: 1000;
      `;
      
      // Add to input container if not already there
      if (!document.getElementById('preload-indicator')) {
        input.parentNode.style.position = 'relative';
        input.parentNode.appendChild(loadingIndicator);
      }
      
      const allResults = await executeParallelSearches(
        query, 
        selectedOption, 
        siteName, 
        token, 
        collectionsParam, 
        fieldsSearchParam, 
        fieldsDisplayParam
      );

      // Cache the results for instant display when search button is clicked
      setCachedResults(query, selectedOption, allResults);
      console.log('✅ Search data preloaded and cached for:', query);
      
      // Remove loading indicator
      const indicator = document.getElementById('preload-indicator');
      if (indicator) {
        indicator.remove();
      }
      
    } catch (error) {
      console.log('⚠️ Preload failed for:', query, error.message);
      
      // Remove loading indicator on error
      const indicator = document.getElementById('preload-indicator');
      if (indicator) {
        indicator.remove();
      }
    }
  }

  // Event listeners
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    performSearchFast();
  });

  input.addEventListener("input", () => {
    const query = input.value.trim();
    
    // DON'T clear results when user is typing - keep existing results visible
    // Only preload new data in background without clearing existing results
    if (query.length >= 2) {
      optimizedDebouncedSearch();
    }
    
    // Only clear results if user explicitly clears the entire input field
    // and there are no URL parameters indicating a results page
    if (query === '' && !new URLSearchParams(window.location.search).get('q')) {
      resultsContainer.innerHTML = "";
    }
  });

  document.addEventListener('click', (event) => {
    if (!suggestionBox.contains(event.target) && event.target !== input) {
      suggestionBox.style.display = "none";
    }
  });

  // FIXED: Handle search button with ID "search-input"
  const searchButton = document.getElementById('search-input');
  if (searchButton) {
    searchButton.addEventListener('click', () => {
      const query = input.value.trim();
      if (query) {
        console.log('🔍 Search button clicked for:', query);
        
        // Show loading state on button
        const originalText = searchButton.textContent;
        searchButton.textContent = 'Searching...';
        searchButton.disabled = true;
        
        // Check if we have cached results for instant display
        const cachedResults = getCachedResults(query, selectedOption);
        if (cachedResults) {
          console.log('⚡ Showing cached results instantly for:', query);
          resultsContainer.innerHTML = "";
          
          if (cachedResults.length === 0) {
            resultsContainer.innerHTML = `
              <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 200px;
                text-align: center;
                padding: 2rem;
              ">
                <p style="
                  color: #666;
                  font-size: 16px;
                  font-family: 'Arial', sans-serif;
                  margin: 0;
                  line-height: 1.5;
                ">Your search did not return any results in this topic category.</p>
              </div>
            `;
          } else {
            const combinedResultsDiv = document.createElement("div");
            combinedResultsDiv.classList.add("combined-search-results");
            resultsContainer.appendChild(combinedResultsDiv);
            renderResultsFast(cachedResults, "Search Results", displayMode, maxItems, gridColumns, paginationType, combinedResultsDiv, 1, false, styles, selectedFieldsDisplay);
          }
          
          // Add query parameter to URL
          const url = new URL(window.location);
          url.searchParams.set('q', query);
          window.history.pushState({}, '', url.toString());
          
          // Reset button
          searchButton.textContent = originalText;
          searchButton.disabled = false;
        } else {
          // No cached results, perform fresh search
          performSearchFast().then(() => {
            // Add query parameter to URL
            const url = new URL(window.location);
            url.searchParams.set('q', query);
            window.history.pushState({}, '', url.toString());
            
            // Reset button
            searchButton.textContent = originalText;
            searchButton.disabled = false;
          });
        }
      }
    });
  }

  // Handle URL-based searches immediately on page load
  const urlParams = new URLSearchParams(window.location.search);
  const urlQuery = urlParams.get('q');
  
  if (urlQuery && urlQuery.trim()) {
    console.log('🚀 Results page detected, starting search immediately for:', urlQuery);
    setTimeout(() => {
      performSearchFast();
    }, 100);
  }
});
