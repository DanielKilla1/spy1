// deno-lint-ignore-file no-window no-unused-vars no-undef no-explicit-any no-this-alias no-var no-inner-declarations no-extra-semi no-empty ban-ts-comment no-empty-pattern no-sparse-arrays no-extra-boolean-cast no-case-declarations ban-untagged-todo no-prototype-builtins no-const-assign no-misused-new no-new-symbol no-self-compare no-use-before-declare no-inferrable-types no-cond-assign no-constant-condition no-unsafe-finally no-async-promise-executor no-throw-literal ban-types no-func-assign
// SPY Trading Simulation - Simplified Version

// VERSION INFO
window.APP_VERSION = "1.0.2"; // Simplified version
window.LAST_UPDATED = "2025-04-13";
window.DEBUG_MODE = true; // Enable logging

// Global variables
window.fullData = [];
window.trades = [];
window.years = [];
window.marketOpenCandles = []; // Track all 9:30 candles

// Market hours constants
window.marketOpenHour = 9;
window.marketOpenMinute = 30;
window.marketCloseHour = 16;
window.marketCloseMinute = 0;

// Debug mode toggle
window.MARKET_HOURS_DEBUG_MODE = false;

// Application status tracking
window.appStatus = {
    initialized: false,
    dataLoaded: false,
    simulationRun: false,
    lastError: null
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log(`SPY Trading Simulation v${window.APP_VERSION} initializing...`);
    
    // Initialize UI elements
    window.yearSelect = document.getElementById('year-select');
    window.runButton = document.getElementById('run-simulation');
    window.loadingProgress = document.getElementById('loading-progress');
    window.loadingBar = document.getElementById('loading-bar');
    window.dataLoading = document.querySelector('.data-loading');
    
    // Start loading data
    initApp();
});

// Simple function to check if a time is during market hours (9:30 AM - 4:00 PM)
window.isDuringMarketHours = function(date) {
    // Quick check for debug mode
    if (window.MARKET_HOURS_DEBUG_MODE) {
        return true;
    }
    
    // Simple check for null/invalid dates
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return false;
    }
    
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    // Market hours: 9:30 AM to 4:00 PM
    return (hours === 9 && minutes >= 30) || (hours > 9 && hours < 16);
};

// Initialize the application
async function initApp() {
    console.log("Initializing app");
    try {
        // Show loading indicator
        if (window.dataLoading) window.dataLoading.style.display = 'block';
        
        // Load data
        await loadData();
        console.log("Data loaded successfully");
        
        // Hide loading indicator
        if (window.dataLoading) window.dataLoading.style.display = 'none';
        
        // Set up event listeners
        if (window.runButton) {
            window.runButton.addEventListener('click', function() {
                console.log("Run button clicked");
                runSimulation();
            });
        }
        
        // Update UI
        console.log("App initialized successfully");
        window.appStatus.initialized = true;
        
    } catch (error) {
        console.error('Error initializing app:', error);
        if (window.dataLoading) window.dataLoading.style.display = 'none';
        alert('Error loading application: ' + error.message);
    }
}

// Load and process data
async function loadData() {
    try {
        // Update loading progress
        if (window.loadingProgress) window.loadingProgress.textContent = '20%';
        if (window.loadingBar) window.loadingBar.value = 20;
        
        console.log("Fetching SPY data file...");
        const response = await fetch('SPY_full_5min_adjsplit.txt');
        
        if (!response.ok) {
            throw new Error(`Failed to load data file: ${response.status} ${response.statusText}`);
        }
        
        if (window.loadingProgress) window.loadingProgress.textContent = '50%';
        if (window.loadingBar) window.loadingBar.value = 50;
        
        const csvText = await response.text();
        console.log(`Data file loaded: ${csvText.length} bytes`);
        
        // Process the data
        console.log("Processing data...");
        processCSV(csvText);
        
        // Update UI
        if (window.loadingProgress) window.loadingProgress.textContent = '100%';
        if (window.loadingBar) window.loadingBar.value = 100;
        
        window.appStatus.dataLoaded = true;
        return true;
        
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Could not load the SPY data file: ' + error.message);
        throw error;
    }
}

// Process CSV data
function processCSV(csvText) {
    const lines = csvText.split('\n');
    console.log(`Processing ${lines.length} lines of data`);
    
    const marketHoursCandles = [];
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',');
        if (parts.length < 6) continue;
        
        // Parse the date and time - ULTRA SIMPLE approach
        const dateTimeStr = parts[0];
        const [datePart, timePart] = dateTimeStr.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes, seconds] = timePart.split(':').map(Number);
        
        // Create Date object (month is 0-indexed in JavaScript)
        const date = new Date(year, month-1, day, hours, minutes, seconds);
        
        // Check if it's during market hours - DIRECT CHECK
        const duringMarketHours = (hours === 9 && minutes >= 30) || (hours > 9 && hours < 16);
        
        // Check if it's a market open candle (9:30 AM)
        if (hours === 9 && minutes === 30) {
            window.marketOpenCandles.push(dateTimeStr);
            console.log(`Found market open candle: ${dateTimeStr}`);
        }
        
        // Parse other values
        const open = parseFloat(parts[1]);
        const high = parseFloat(parts[2]);
        const low = parseFloat(parts[3]);
        const close = parseFloat(parts[4]);
        const volume = parseInt(parts[5]);
        
        if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
            continue; // Skip invalid data
        }
        
        // Create candle object
        const candle = {
            datetime: date,
            rawTimeStr: dateTimeStr,
            open: open,
            high: high,
            low: low,
            close: close,
            volume: volume,
            duringMarketHours: duringMarketHours
        };
        
        // Store the candle
        window.fullData.push(candle);
        
        // Track market hours candles
        if (duringMarketHours) {
            marketHoursCandles.push(candle);
        }
        
        // Update progress for large datasets
        if (i % 5000 === 0) {
            const progress = Math.min(90, 50 + Math.floor((i / lines.length) * 40));
            if (window.loadingProgress) window.loadingProgress.textContent = `${progress}%`;
            if (window.loadingBar) window.loadingBar.value = progress;
        }
    }
    
    // Extract years from the data
    window.years = [...new Set(window.fullData.map(d => d.datetime.getFullYear()))].sort();
    
    // Log market hours statistics
    console.log(`Total candles: ${window.fullData.length}`);
    console.log(`Market hours candles: ${marketHoursCandles.length} (${((marketHoursCandles.length/window.fullData.length)*100).toFixed(1)}%)`);
    console.log(`Market open (9:30 AM) candles: ${window.marketOpenCandles.length}`);
    
    // Check if we have market hours data
    if (marketHoursCandles.length === 0) {
        console.error("No candles found during market hours (9:30 AM - 4:00 PM)");
        console.error("Activating debug mode to allow simulation to run");
        
        // Print hour distribution
        const hourCounts = {};
        window.fullData.forEach(candle => {
            const hour = candle.datetime.getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        
        console.log("Hours distribution:");
        Object.keys(hourCounts).sort().forEach(hour => {
            console.log(`Hour ${hour}: ${hourCounts[hour]} candles`);
        });
        
        // Activate debug mode
        window.MARKET_HOURS_DEBUG_MODE = true;
        
        // Mark all candles as during market hours
        window.fullData.forEach(candle => {
            candle.duringMarketHours = true;
        });
        
        alert("No market hours data found. Debug mode activated.\nThis means either the data doesn't include market hours or there's an issue with time interpretation.");
    }
    
    // Sort data by time
    window.fullData.sort((a, b) => a.datetime - b.datetime);
    
    // Populate year dropdown
    if (window.yearSelect) {
        window.yearSelect.innerHTML = '';
        window.years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            window.yearSelect.appendChild(option);
        });
    }
    
    console.log("Data processing complete");
}

// Run the simulation
function runSimulation() {
    console.log("Running simulation...");
    try {
        if (!window.appStatus.dataLoaded) {
            alert("Data not loaded yet. Please wait.");
            return;
        }
        
        const selectedYear = window.yearSelect ? parseInt(window.yearSelect.value) : window.years[0];
        console.log(`Running simulation for year: ${selectedYear}`);
        
        // Filter data for the selected year
        const yearData = window.fullData.filter(d => d.datetime.getFullYear() === selectedYear);
        console.log(`Found ${yearData.length} data points for year ${selectedYear}`);
        
        // Count market hours data
        const marketHoursData = yearData.filter(d => d.duringMarketHours);
        console.log(`Market hours data: ${marketHoursData.length} candles (${((marketHoursData.length/yearData.length)*100).toFixed(1)}%)`);
        
        // Look for market open candles
        const marketOpenCandles = yearData.filter(d => {
            const hours = d.datetime.getHours();
            const minutes = d.datetime.getMinutes();
            return hours === 9 && minutes === 30;
        });
        
        console.log(`Found ${marketOpenCandles.length} market open (9:30 AM) candles for ${selectedYear}`);
        
        // Verify we have market open data
        if (marketOpenCandles.length === 0) {
            console.warn(`No market open candles found for ${selectedYear}`);
        }
        
        // Process each day
        const days = {};
        yearData.forEach(candle => {
            const dateStr = candle.datetime.toISOString().split('T')[0];
            if (!days[dateStr]) {
                days[dateStr] = [];
            }
            days[dateStr].push(candle);
        });
        
        console.log(`Found ${Object.keys(days).length} trading days for ${selectedYear}`);
        
        // Check each day for market open candle
        Object.keys(days).forEach(date => {
            const dayCandles = days[date];
            const marketHoursCandles = dayCandles.filter(c => c.duringMarketHours);
            
            if (marketHoursCandles.length > 0) {
                // Find market open candle (9:30 AM)
                const marketOpenCandle = dayCandles.find(c => {
                    const hours = c.datetime.getHours();
                    const minutes = c.datetime.getMinutes();
                    return hours === 9 && minutes === 30;
                });
                
                if (marketOpenCandle) {
                    console.log(`Found market open candle for ${date}: ${marketOpenCandle.rawTimeStr}`);
                } else {
                    console.log(`No 9:30 AM candle found for ${date}`);
                }
            } else {
                console.log(`No market hours data for ${date}`);
            }
        });
        
        alert(`Simulation complete for ${selectedYear}.\nFound ${marketHoursData.length} market hours candles.\nFound ${marketOpenCandles.length} market open (9:30 AM) candles.`);
        
    } catch (error) {
        console.error('Error running simulation:', error);
        alert('Error running simulation: ' + error.message);
    }
}