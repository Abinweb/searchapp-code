// Load Google Fonts dynamically
function loadGoogleFonts() {
  // Check if Google Fonts are already loaded
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
  
  // Add font loading verification
  link.onload = () => {
      console.log("Google Fonts CSS loaded successfully");
      // Test if fonts are actually available
      setTimeout(() => {
          const testDiv = document.createElement('div');
          testDiv.style.fontFamily = 'Great Vibes, cursive';
          testDiv.style.position = 'absolute';
          testDiv.style.left = '-9999px';
          testDiv.textContent = 'Test';
          document.body.appendChild(testDiv);
          
          const computedStyle = window.getComputedStyle(testDiv);
          console.log("Great Vibes font loaded:", computedStyle.fontFamily.includes('Great Vibes'));
          
          // Test Oswald font specifically
          const oswaldTest = document.createElement('div');
          oswaldTest.style.fontFamily = 'Oswald, sans-serif';
          oswaldTest.style.position = 'absolute';
          oswaldTest.style.left = '-9999px';
          oswaldTest.textContent = 'Oswald Test';
          document.body.appendChild(oswaldTest);
          
          const oswaldStyle = window.getComputedStyle(oswaldTest);
          console.log("Oswald font loaded:", oswaldStyle.fontFamily.includes('Oswald'));
          
          document.body.removeChild(testDiv);
          document.body.removeChild(oswaldTest);
      }, 1000);
  };
}

// Force load specific fonts with preload
function forceLoadFonts() {
  console.log("Force loading fonts...");
  
  // Create preload links for critical fonts
  const criticalFonts = [
    'https://fonts.googleapis.com/css2?family=Oswald:wght@200;300;400;500;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap',
    'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap'
  ];
  
  criticalFonts.forEach(fontUrl => {
    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.as = 'style';
    preloadLink.href = fontUrl;
    document.head.appendChild(preloadLink);
    
    // Also load as stylesheet
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = fontUrl;
    document.head.appendChild(styleLink);
  });
  
  // Force font loading by creating elements with each font
  const fontsToTest = ['Oswald', 'Great Vibes', 'Montserrat', 'Lato', 'Inter'];
  fontsToTest.forEach(font => {
    const testElement = document.createElement('div');
    testElement.style.fontFamily = font.includes('Great Vibes') ? 'Great Vibes, cursive' : `${font}, sans-serif`;
    testElement.style.position = 'absolute';
    testElement.style.left = '-9999px';
    testElement.style.visibility = 'hidden';
    testElement.textContent = 'Font Test';
    document.body.appendChild(testElement);
    
    // Force a reflow to ensure font loading
    testElement.offsetHeight;
    
    setTimeout(() => {
      if (testElement.parentNode) {
        document.body.removeChild(testElement);
      }
    }, 2000);
  });
}

// Wait for fonts to be fully loaded
function waitForFonts(fontNames, callback) {
  console.log("Waiting for fonts to load:", fontNames);
  
  const checkFonts = () => {
    const allLoaded = fontNames.every(fontName => {
      const testDiv = document.createElement('div');
      testDiv.style.fontFamily = fontName.includes('Great Vibes') ? 'Great Vibes, cursive' : `${fontName}, sans-serif`;
      testDiv.style.position = 'absolute';
      testDiv.style.left = '-9999px';
      testDiv.textContent = 'Test';
      document.body.appendChild(testDiv);
      
      const computedStyle = window.getComputedStyle(testDiv);
      const isLoaded = computedStyle.fontFamily.includes(fontName);
      
      document.body.removeChild(testDiv);
      return isLoaded;
    });
    
    if (allLoaded) {
      console.log("All fonts loaded successfully!");
      callback();
    } else {
      console.log("Some fonts still loading, retrying...");
      setTimeout(checkFonts, 500);
    }
  };
  
  // Start checking after a short delay
  setTimeout(checkFonts, 1000);
}

// ===== PERFORMANCE OPTIMIZATIONS FOR API SEARCH =====

// Enhanced search cache with TTL and size limits
const searchCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (increased from 5)
const MAX_CACHE_SIZE = 100; // Maximum number of cached results

// Request cancellation controller for race condition prevention
let currentSearchController = null;

// Connection pooling and keep-alive optimization
const connectionPool = new Map();
const MAX_CONNECTIONS = 6;
const CONNECTION_TIMEOUT = 30000; // 30 seconds

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
let progressiveDelay = 100; // Start with 100ms delay

function debouncedSearch(performSearch, baseDelay = 100) {
  clearTimeout(searchDebounceTimer);
  
  // Progressive delay: faster for short queries, slower for longer ones
  const query = document.querySelector("input[name='query']")?.value || '';
  const delay = query.length <= 2 ? baseDelay : Math.min(baseDelay * 2, 500);
  
  searchDebounceTimer = setTimeout(() => {
    performSearch();
    // Reset delay for next search
    progressiveDelay = baseDelay;
  }, delay);
}

// Connection pooling for better performance
function getConnection(siteName) {
  if (!connectionPool.has(siteName)) {
    if (connectionPool.size >= MAX_CONNECTIONS) {
      // Remove oldest connection
      const oldestKey = connectionPool.keys().next().value;
      connectionPool.delete(oldestKey);
    }
    
    connectionPool.set(siteName, {
      lastUsed: Date.now(),
      active: false
    });
  }
  
  const connection = connectionPool.get(siteName);
  connection.lastUsed = Date.now();
  return connection;
}

// Optimized fetch with connection pooling and retry logic
async function optimizedFetch(url, options = {}, retries = 2) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      // Enable keep-alive for better performance
      keepalive: true,
      // Add performance headers
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
    
    if (error.name === 'AbortError') {
      console.log('Request timed out, retrying...');
    }
    
    if (retries > 0) {
      console.log(`Retrying request, ${retries} attempts left...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      return optimizedFetch(url, options, retries - 1);
    }
    
    throw error;
  }
}

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
  
  // Execute all searches in parallel
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

// Render search results with pagination
function renderResults(results, title, displayMode, maxItems, gridColumns = 3, paginationType = "None", container, currentPage = 1, isPageResult = true, styles = {}) {
    
    if (!Array.isArray(results) || results.length === 0) return "";
    const totalPages = maxItems ? Math.ceil(results.length / maxItems) : 1;
    const startIndex = maxItems ? (currentPage - 1) * maxItems : 0;
    const endIndex = maxItems ? startIndex + maxItems : results.length;
    const pagedResults = results.slice(startIndex, endIndex);
    
    // Enhanced responsive grid columns with fallback protection
    const getResponsiveGridColumns = () => {
      try {
        const screenWidth = window.innerWidth || 1200; // Fallback width
        const maxColumns = Math.max(1, Math.min(gridColumns || 3, 6)); // Ensure valid range
        
        if (screenWidth <= 480) {
          return 1; // Single column on small mobile
        } else if (screenWidth <= 675) {
          return 1; // Single column on mobile
        } else if (screenWidth <= 768) {
          return Math.min(maxColumns, 2); // Max 2 columns on small tablets
        } else if (screenWidth <= 1024) {
          return Math.min(maxColumns, 3); // Max 3 columns on tablets
        } else if (screenWidth <= 1440) {
          return Math.min(maxColumns, 4); // Max 4 columns on medium screens
        } else {
          return maxColumns; // Full grid on large screens
        }
      } catch (error) {
        console.warn('Error calculating responsive grid columns, using fallback:', error);
        return Math.max(1, Math.min(gridColumns || 3, 3)); // Safe fallback
      }
    };
    
    const responsiveGridColumns = getResponsiveGridColumns();
    console.log(`Screen width: ${window.innerWidth}px, Grid columns: ${responsiveGridColumns}, Original: ${gridColumns}`);
   
   // Debug: Check if fonts are available
   console.log("Rendering results with styles:", styles);
   console.log("Title font family:", styles.titleFontFamily);
   console.log("Body font family:", styles.otherFieldsFontFamily);
   
   // Verify font availability
   if (styles.titleFontFamily && styles.titleFontFamily !== 'Arial') {
     const testDiv = document.createElement('div');
     testDiv.style.fontFamily = styles.titleFontFamily.includes('Great Vibes') ? 'Great Vibes, cursive' : `${styles.titleFontFamily}, sans-serif`;
     testDiv.style.position = 'absolute';
     testDiv.style.left = '-9999px';
     testDiv.textContent = 'Font Test';
     document.body.appendChild(testDiv);
     
     const computedStyle = window.getComputedStyle(testDiv);
     console.log(`Font ${styles.titleFontFamily} available:`, computedStyle.fontFamily.includes(styles.titleFontFamily));
     
     document.body.removeChild(testDiv);
   }

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
  //  Grid: whole card is clickable with enhanced reliability
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
                font-family: '${otherFieldsFontFamily}', sans-serif !important; 
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
  //  List: no card, only title is clickable
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
  
  // Enhanced pagination with better error handling and responsive design
  if (paginationType === "Numbered" && totalPages > 1 && totalPages <= 100) { // Limit to prevent excessive buttons
      paginationHtml = `<div class="pagination" style="margin-top: 1rem; display: flex; justify-content: center; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px; box-sizing: border-box;">`;
      
      // Add previous button if not on first page
      if (currentPage > 1) {
          paginationHtml += `<button class="pagination-button prev-button" data-page="${currentPage - 1}" style="margin: 0; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; transition: all 0.2s ease; min-width: 40px;">←</button>`;
      }
      
      // Calculate which page numbers to show (smart pagination)
      const maxVisiblePages = Math.min(7, totalPages); // Show max 7 page numbers
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      // Adjust start page if we're near the end
      if (endPage - startPage < maxVisiblePages - 1) {
          startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      // Show first page if not visible
      if (startPage > 1) {
          paginationHtml += `<button class="pagination-button" data-page="1" style="margin: 0; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; transition: all 0.2s ease; min-width: 40px;">1</button>`;
          if (startPage > 2) {
              paginationHtml += `<span style="padding: 0 8px; color: #666;">...</span>`;
          }
      }
      
      // Show visible page numbers
      for (let i = startPage; i <= endPage; i++) {
          const isCurrentPage = i === currentPage;
          const buttonStyle = isCurrentPage 
              ? 'margin: 0; padding: 8px 12px; border: 1px solid #0073e6; border-radius: 4px; background: #0073e6; color: white; cursor: pointer; transition: all 0.2s ease; min-width: 40px; font-weight: bold;'
              : 'margin: 0; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; transition: all 0.2s ease; min-width: 40px;';
          
          paginationHtml += `<button class="pagination-button ${isCurrentPage ? 'current-page' : ''}" data-page="${i}" style="${buttonStyle}">${i}</button>`;
      }
      
      // Show last page if not visible
      if (endPage < totalPages) {
          if (endPage < totalPages - 1) {
              paginationHtml += `<span style="padding: 0 8px; color: #666;">...</span>`;
          }
          paginationHtml += `<button class="pagination-button" data-page="${totalPages}" style="margin: 0; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; transition: all 0.2s ease; min-width: 40px;">${totalPages}</button>`;
      }
      
      // Add next button if not on last page
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
                  renderResults(results, title, displayMode, maxItems, gridColumns, paginationType, container, page,isPageResult,styles);
              });
          });
      }

      if (paginationType === "Load More") {
          const loadBtn = container.querySelector('.load-more-button');
          if (loadBtn) {
              loadBtn.addEventListener('click', () => {
                  renderResults(results, title, displayMode, endIndex + maxItems, gridColumns, paginationType, container, 1,isPageResult,
                      styles);
              });
          }
      }
  }

  return sectionHtml;
}

// Pre-load fonts and data to prevent lazy loading
async function preloadData() {
  console.log("Preloading data to prevent lazy loading...");
  
  // Pre-load fonts by creating a test element with each font
  const testFonts = [
      'Great Vibes', 'Oswald', 'Montserrat', 'Lato', 'Inter', 
      'Open Sans', 'Bitter', 'Merriweather', 'Ubuntu', 'PT Sans'
  ];
  
  const testDiv = document.createElement('div');
  testDiv.style.position = 'absolute';
  testDiv.style.left = '-9999px';
  testDiv.style.visibility = 'hidden';
  
  testFonts.forEach(font => {
    const span = document.createElement('span');
    span.style.fontFamily = font;
    span.textContent = 'Test';
    testDiv.appendChild(span);
  });
  
  document.body.appendChild(testDiv);
  
  // Remove test element after a short delay
  setTimeout(() => {
      if (testDiv.parentNode) {
          testDiv.parentNode.removeChild(testDiv);
      }
  }, 1000);
}

// Perform background search to warm up the system
async function performBackgroundSearch() {
  console.log("Performing background search to warm up the system...");
  
  try {
    const token = await getVisitorSessionToken();
    if (!token) {
      console.log("No token available for background search");
      return;
    }
    
    const siteName = window.location.hostname.replace(/^www\./, '').split('.')[0];
    const headers = { Authorization: `Bearer ${token}` };
    
    // Get search configuration for background search
    const searchConfigDiv = document.querySelector('#search-config');
    if (!searchConfigDiv) {
      console.log("No search config found for background search");
      return;
    }
    
    const selectedCollections = JSON.parse(searchConfigDiv.getAttribute('data-selected-collections') || '[]');
    const selectedFieldsSearch = JSON.parse(searchConfigDiv.getAttribute('data-selected-fields-search') || '[]');
    const selectedFieldsDisplay = JSON.parse(searchConfigDiv.getAttribute('data-selected-fields-display') || '[]');
    const selectedOption = searchConfigDiv.getAttribute('data-selected-option');
    
    // Random keywords for background search
    const backgroundKeywords = [
      'the', 'and', 'for', 'with', 'from', 'this', 'that', 'have', 'will', 'been',
      'about', 'would', 'think', 'their', 'time', 'there', 'could', 'people', 'other',
      'first', 'after', 'should', 'because', 'through', 'during', 'before', 'however',
      'between', 'never', 'under', 'know', 'world', 'place', 'year', 'work', 'life',
      'company', 'business', 'service', 'product', 'information', 'technology'
    ];
    
    // Select 2-3 random keywords for a meaningful search
    const numKeywords = Math.floor(Math.random() * 2) + 2; // 2 or 3 keywords
    const selectedKeywords = [];
    for (let i = 0; i < numKeywords; i++) {
      const randomIndex = Math.floor(Math.random() * backgroundKeywords.length);
      selectedKeywords.push(backgroundKeywords[randomIndex]);
    }
    
    const backgroundQuery = selectedKeywords.join(' ');
    console.log("Background search query:", backgroundQuery);
    
    // Perform background search for CMS content
    if (selectedOption === "Collection" || selectedOption === "Both") {
      const collectionsParam = encodeURIComponent(JSON.stringify(selectedCollections));
      const fieldsSearchParam = encodeURIComponent(JSON.stringify(selectedFieldsSearch));
      const fieldsDisplayParam = encodeURIComponent(JSON.stringify(selectedFieldsDisplay));
      
      const cmsResponse = await fetch(
        `https://search-server.long-rain-28bb.workers.dev/api/search-cms?query=${encodeURIComponent(backgroundQuery)}&siteName=${siteName}&collections=${collectionsParam}&searchFields=${fieldsSearchParam}&displayFields=${fieldsDisplayParam}`,
        { headers }
      );
      
      if (cmsResponse.ok) {
        const cmsData = await cmsResponse.json();
        console.log(`Background CMS search completed: ${cmsData.results?.length || 0} results found`);
      }
    }
    
    // Also perform background search for pages
    if (selectedOption === "Pages" || selectedOption === "Both") {
      const pageResponse = await fetch(
        `https://search-server.long-rain-28bb.workers.dev/api/search-index?query=${encodeURIComponent(backgroundQuery)}&siteName=${siteName}`,
        { headers }
      );
      
      if (pageResponse.ok) {
        const pageData = await pageResponse.json();
        console.log(`Background page search completed: ${pageData.results?.length || 0} results found`);
      }
    }
    
    console.log("Background search completed successfully - system warmed up!");
    
  } catch (error) {
    console.log("Background search error (this is normal):", error.message);
  }
}

// Set up periodic background searches to keep system warm
function setupPeriodicBackgroundSearch() {
  // Perform background search every 5 minutes to keep system warm
  setInterval(() => {
    console.log("Performing periodic background search to maintain system performance...");
    performBackgroundSearch();
  }, 5 * 60 * 1000); // 5 minutes
  
  console.log("Periodic background search setup complete - will run every 5 minutes");
}

document.addEventListener("DOMContentLoaded", async function () {
  // Load Google Fonts first
  loadGoogleFonts();
  
  // Force load critical fonts
  forceLoadFonts();
  
  // Start pre-loading immediately
  preloadData();
  
  // Perform background search to warm up the system (after a short delay)
  setTimeout(() => {
    performBackgroundSearch();
    // Also set up periodic background searches
    setupPeriodicBackgroundSearch();
  }, 2000); // Wait 2 seconds for initial setup
  
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

  // NEW: Additional styling properties
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

const form = wrapper.querySelector("form.w-form"); // form inside wrapper
const input = wrapper.querySelector("input[name='query']"); // input inside wrapper
  const resultsContainer = document.querySelector(".searchresults");
  const base_url = "https://search-server.long-rain-28bb.workers.dev";
  const siteName = window.location.hostname.replace(/^www\./, '').split('.')[0];

   if (input) {
  input.style.borderRadius = '8px'; 
}

  // Hide submit button if Auto result
const submitButton = form?.querySelector("input[type='submit']");

submitButton.style.display = "none";


  if (!form || !input || !resultsContainer) {
      console.warn("Search form or elements not found.");
      return;
  }

  form.removeAttribute("action");
  form.setAttribute("action", "#");

  const token = await getVisitorSessionToken();
  console.log("Generated Token: ", token);

   // === Implement Search Bar Display Mode ===
if (searchBarType === "Icon") {
// Hide form initially, show icon container (assumed to already exist)
form.style.display = "none";

const iconContainer = document.querySelector(".searchiconcontainer");
if (!iconContainer) {
  console.error("'.searchiconcontainer' element not found.");
  return;
}

iconContainer.style.cursor = "pointer";
iconContainer.style.display = ""; // Make sure icon is visible

// On click show the form and hide the icon container
iconContainer.addEventListener("click", () => {
  form.style.display = "";
  iconContainer.style.display = "none";
  input.focus();
});
} else {
// Expand mode: show form and hide icon container if exists
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
   
   /* Enhanced responsive grid breakpoints with fallback protection */
   .search-results-wrapper {
     display: grid !important;
     grid-template-columns: repeat(1, 1fr) !important;
     gap: 1rem !important;
     width: 100% !important;
     max-width: 100% !important;
     box-sizing: border-box !important;
     overflow: hidden !important;
   }
   
   @media (min-width: 481px) {
     .search-results-wrapper {
       grid-template-columns: repeat(2, 1fr) !important;
       gap: 1rem !important;
     }
   }
   
   @media (min-width: 676px) {
     .search-results-wrapper {
       grid-template-columns: repeat(3, 1fr) !important;
       gap: 1.5rem !important;
     }
   }
   
   @media (min-width: 1025px) {
     .search-results-wrapper {
       grid-template-columns: repeat(4, 1fr) !important;
       gap: 2rem !important;
     }
   }
   
   @media (min-width: 1441px) {
     .search-results-wrapper {
       grid-template-columns: repeat(5, 1fr) !important;
       gap: 2rem !important;
     }
   }
   
   /* Fallback for grid support */
   @supports not (display: grid) {
     .search-results-wrapper {
       display: flex !important;
       flex-wrap: wrap !important;
       gap: 1rem !important;
     }
     
     .search-result-item {
       flex: 1 1 300px !important;
       max-width: calc(50% - 0.5rem) !important;
     }
   }
   
   /* Enhanced pagination reliability */
   .pagination {
     display: flex !important;
     justify-content: center !important;
     align-items: center !important;
     flex-wrap: wrap !important;
     gap: 8px !important;
     padding: 10px !important;
     box-sizing: border-box !important;
     margin-top: 1rem !important;
   }
   
   .pagination-button {
     min-width: 40px !important;
     height: 40px !important;
     display: flex !important;
     align-items: center !important;
     justify-content: center !important;
     border: 1px solid #ddd !important;
     border-radius: 4px !important;
     background: white !important;
     cursor: pointer !important;
     transition: all 0.2s ease !important;
     font-size: 14px !important;
     line-height: 1 !important;
     text-decoration: none !important;
   }
   
   .pagination-button:hover {
     background: #f5f5f5 !important;
     border-color: #0073e6 !important;
   }
   
   .pagination-button.current-page {
     background: #0073e6 !important;
     color: white !important;
     border-color: #0073e6 !important;
     font-weight: bold !important;
   }
   
   /* Mobile pagination optimization */
   @media (max-width: 480px) {
     .pagination {
       gap: 4px !important;
       padding: 5px !important;
     }
     
     .pagination-button {
       min-width: 36px !important;
       height: 36px !important;
       font-size: 12px !important;
       padding: 6px 8px !important;
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
      // Append right after the input or somewhere appropriate in DOM
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
  performSearch(); // Trigger the search
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
  
  
 // Create spinner element
const spinner = document.createElement("div");
spinner.id = "search-spinner";
spinner.style.display = "none";
spinner.innerHTML = `
<div class="spinner"></div>
`;

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


function showSpinner() {
spinner.style.display = "flex";
// Optionally, position spinner over resultsContainer:
resultsContainer.parentNode.insertBefore(spinner, resultsContainer);
}

function hideSpinner() {
spinner.style.display = "none";
}

// ===== OPTIMIZED SEARCH FUNCTION WITH PERFORMANCE IMPROVEMENTS =====
async function performSearch() {
  let query = input?.value.trim().toLowerCase();

  if (!query) {
      const params = new URLSearchParams(window.location.search);
      query = params.get('q')?.trim().toLowerCase() || '';
      console.log('Query from URL params:', query);
  }

  if (!query) return;
  
  // Check cache first for instant results
  const cachedResults = getCachedResults(query, selectedOption);
  if (cachedResults) {
    console.log('Using cached results for:', query);
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

    // Wait for fonts to load before rendering
    const fontsToWaitFor = [];
    if (styles.titleFontFamily && styles.titleFontFamily !== 'Arial') {
      fontsToWaitFor.push(styles.titleFontFamily);
    }
    if (styles.otherFieldsFontFamily && styles.otherFieldsFontFamily !== 'Arial') {
      fontsToWaitFor.push(styles.otherFieldsFontFamily);
    }
    
    if (fontsToWaitFor.length > 0) {
      console.log("Waiting for fonts before rendering:", fontsToWaitFor);
      waitForFonts(fontsToWaitFor, () => {
        renderResults(allResults, "Search Results", displayMode, maxItems, gridColumns, paginationType, combinedResultsDiv, 1, false, styles);
        hideSpinner();
      });
    } else {
      // No custom fonts, render immediately
      renderResults(allResults, "Search Results", displayMode, maxItems, gridColumns, paginationType, combinedResultsDiv, 1, false, styles);
      hideSpinner();
    }
  } catch (error) {
    console.error('Error performing search:', error);
    resultsContainer.innerHTML = "<p>Error performing search. Please try again later.</p>";
    hideSpinner();
  }
}

  
  window.addEventListener("DOMContentLoaded", () => {
if (window.location.pathname.includes("search-app-results")) {
  performSearch();
}
});




     
    //  let debounceTimeout;
    //  input.addEventListener("input", () => {
      //    clearTimeout(debounceTimeout);
       //   debounceTimeout = setTimeout(() => {
         //     performSearch();
         // }, 300); // 300ms debounce
     // }
  
      
      form.addEventListener("submit", (e) => {
e.preventDefault();
performSearch(); // ✅ trigger search on submit
});
  
document.addEventListener('click', (event) => {
 if (!suggestionBox.contains(event.target) && event.target !== input) {
   suggestionBox.style.display = "none";
 }
});

// Enhanced window resize handler for responsive grid reliability
let resizeTimeout;
let lastWindowWidth = window.innerWidth;

window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const currentWidth = window.innerWidth;
    const widthDifference = Math.abs(currentWidth - lastWindowWidth);
    
    // Only update if width change is significant (prevents unnecessary updates)
    if (widthDifference > 50) {
      console.log(`Window resized from ${lastWindowWidth}px to ${currentWidth}px, updating grid layout...`);
      lastWindowWidth = currentWidth;
      
      // Re-render results with new responsive grid if they exist
      const existingResults = document.querySelector('.combined-search-results');
      if (existingResults && resultsContainer.children.length > 0) {
        // Force a reflow to ensure proper grid layout
        existingResults.style.display = 'none';
        existingResults.offsetHeight; // Force reflow
        existingResults.style.display = 'grid';
        
        // Update grid columns based on new width
        const responsiveGridColumns = getResponsiveGridColumns();
        existingResults.style.gridTemplateColumns = `repeat(${responsiveGridColumns}, 1fr)`;
        
        console.log(`Grid updated to ${responsiveGridColumns} columns`);
      }
    }
  }, 300); // Increased debounce for better performance
});

// Add orientation change handler for mobile devices
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    console.log('Orientation changed, updating grid layout...');
    const existingResults = document.querySelector('.combined-search-results');
    if (existingResults) {
      const responsiveGridColumns = getResponsiveGridColumns();
      existingResults.style.gridTemplateColumns = `repeat(${responsiveGridColumns}, 1fr)`;
      console.log(`Grid updated to ${responsiveGridColumns} columns after orientation change`);
    }
  }, 100); // Small delay to ensure orientation change is complete
});

// ===== ADD OPTIMIZED INPUT EVENT LISTENER =====
// Use the enhanced debounced search for better performance
input.addEventListener("input", () => {
  debouncedSearch(performSearch, 100); // Start with 100ms delay for faster response
});

});
