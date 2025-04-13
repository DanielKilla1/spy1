// deno-lint-ignore-file no-window no-unused-vars no-undef no-explicit-any no-this-alias no-var no-inner-declarations no-extra-semi no-empty ban-ts-comment no-empty-pattern no-sparse-arrays no-extra-boolean-cast no-case-declarations ban-untagged-todo no-prototype-builtins no-const-assign no-misused-new no-new-symbol no-self-compare no-use-before-declare no-inferrable-types no-cond-assign no-constant-condition no-unsafe-finally no-async-promise-executor no-throw-literal ban-types no-func-assign
// SPY Trading Simulation

// VERSION INFO
window.APP_VERSION = "1.0.3"; // Simplified, stable version
window.LAST_UPDATED = "2025-04-13";

// Global variables for data access
window.fullData = [];
window.trades = [];
window.years = [];
window.marketOpenCandles = []; // Track all 9:30 candles

// Strategy parameters - default values
window.rangeRequirement = 2.0;
window.profitTarget = 20.0;
window.maxTradesPerDay = 1;
window.positionSize = 10000;
window.exitStrategy = "default"; // "rsi" or "default"
window.rsiPeriod = 14;
window.rsiOverbought = 70;
window.rsiOversold = 30;

// Additional trade parameters - default values
window.breakoutPoints = 0.5;  // Points required for additional trade breakout
window.barsLookback = 2;      // Number of bars to look back for breakout pattern

// Market hours constants
window.marketOpenHour = 9;
window.marketOpenMinute = 30; // 9:30 AM ET
window.marketCloseHour = 16;
window.marketCloseMinute = 0; // 4:00 PM ET

// Debug mode toggle - always enable to prevent data loading issues
window.MARKET_HOURS_DEBUG_MODE = true;

// DOM elements will be initialized when DOM is loaded
window.yearSelect = null;
window.rangeSelect = null;
window.profitTargetSelect = null;
window.maxTradesPerDaySelect = null;
window.positionSizeSelect = null;
window.exitStrategySelect = null;
window.rsiOverboughtSelect = null;
window.rsiOversoldSelect = null;
window.rsiPeriodSelect = null;
window.breakoutPointsSelect = null;
window.barsLookbackSelect = null;
window.runButton = null;
window.loadingProgress = null;
window.loadingBar = null;
window.dataLoading = null;
window.tabButtons = null;
window.tabContents = null;

// Chart instances
window.priceChart = null;
window.performanceChart = null;
window.monthlyPerformanceChart = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log(`SPY Trading Simulation v${window.APP_VERSION} initializing...`);
    
    // Initialize DOM element references
    window.yearSelect = document.getElementById('year-select');
    window.rangeSelect = document.getElementById('range-select');
    window.profitTargetSelect = document.getElementById('profit-target-select');
    window.maxTradesPerDaySelect = document.getElementById('max-trades-per-day');
    window.positionSizeSelect = document.getElementById('position-size');
    window.exitStrategySelect = document.getElementById('exit-strategy');
    window.rsiOverboughtSelect = document.getElementById('rsi-overbought');
    window.rsiOversoldSelect = document.getElementById('rsi-oversold');
    window.rsiPeriodSelect = document.getElementById('rsi-period');
    window.breakoutPointsSelect = document.getElementById('breakout-points');
    window.barsLookbackSelect = document.getElementById('bars-lookback');
    window.runButton = document.getElementById('run-simulation');
    window.loadingProgress = document.getElementById('loading-progress');
    window.loadingBar = document.getElementById('loading-bar');
    window.dataLoading = document.querySelector('.data-loading');
    window.tabButtons = document.querySelectorAll('.tab-button');
    window.tabContents = document.querySelectorAll('.tab-content');
    
    // Set up tab functionality
    setupTabs();
    
    // Set up strategy parameter change handlers
    setupParameterChangeHandlers();
    
    // Start loading data
    initApp();
});

// Check if a time is during market hours (9:30 AM - 4:00 PM)
// Always returns true if debug mode is enabled
function isDuringMarketHours(date) {
    // Always return true in debug mode
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
}

// Find the market open candle (9:30 AM) for a trading day
function findMarketOpenCandle(dayCandles) {
    if (!dayCandles || dayCandles.length === 0) return null;
    
    // Sort candles by time
    const sortedCandles = [...dayCandles].sort((a, b) => a.datetime - b.datetime);
    
    // Find the first candle at or after market open time (9:30 AM)
    return sortedCandles.find(candle => {
        const hours = candle.datetime.getHours();
        const minutes = candle.datetime.getMinutes();
        return hours === window.marketOpenHour && minutes === window.marketOpenMinute;
    });
}

// Set up tab functionality
function setupTabs() {
    if (!window.tabButtons || !window.tabContents) return;
    
    window.tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Get the tab to show
            const tabId = this.getAttribute('data-tab') + '-tab';
            
            // Remove active class from all buttons and tabs
            window.tabButtons.forEach(btn => btn.classList.remove('active'));
            window.tabContents.forEach(content => content.style.display = 'none');
            
            // Add active class to current button and show corresponding tab
            this.classList.add('active');
            document.getElementById(tabId).style.display = 'block';
        });
    });
}

// Set up strategy parameter change handlers
function setupParameterChangeHandlers() {
    // Range requirement
    if (window.rangeSelect) {
        window.rangeSelect.addEventListener('change', function() {
            window.rangeRequirement = parseFloat(this.value);
        });
    }
    
    // Profit target
    if (window.profitTargetSelect) {
        window.profitTargetSelect.addEventListener('change', function() {
            window.profitTarget = parseFloat(this.value);
        });
    }
    
    // Max trades per day
    if (window.maxTradesPerDaySelect) {
        window.maxTradesPerDaySelect.addEventListener('change', function() {
            window.maxTradesPerDay = parseInt(this.value);
        });
    }
    
    // Position size
    if (window.positionSizeSelect) {
        window.positionSizeSelect.addEventListener('change', function() {
            window.positionSize = parseInt(this.value);
        });
    }
    
    // Exit strategy
    if (window.exitStrategySelect) {
        window.exitStrategySelect.addEventListener('change', function() {
            window.exitStrategy = this.value;
            
            // Show/hide RSI controls based on exit strategy
            const rsiControls = document.querySelectorAll('.rsi-controls');
            if (window.exitStrategy === 'rsi') {
                rsiControls.forEach(el => el.style.display = 'flex');
            } else {
                rsiControls.forEach(el => el.style.display = 'none');
            }
        });
        
        // Trigger change to set initial visibility
        window.exitStrategySelect.dispatchEvent(new Event('change'));
    }
    
    // RSI parameters
    if (window.rsiOverboughtSelect) {
        window.rsiOverboughtSelect.addEventListener('change', function() {
            window.rsiOverbought = parseInt(this.value);
        });
    }
    
    if (window.rsiOversoldSelect) {
        window.rsiOversoldSelect.addEventListener('change', function() {
            window.rsiOversold = parseInt(this.value);
        });
    }
    
    if (window.rsiPeriodSelect) {
        window.rsiPeriodSelect.addEventListener('change', function() {
            window.rsiPeriod = parseInt(this.value);
        });
    }
    
    // Additional trade parameters
    if (window.breakoutPointsSelect) {
        window.breakoutPointsSelect.addEventListener('change', function() {
            window.breakoutPoints = parseFloat(this.value);
        });
    }
    
    if (window.barsLookbackSelect) {
        window.barsLookbackSelect.addEventListener('change', function() {
            window.barsLookback = parseInt(this.value);
        });
    }
}

// Initialize the application
async function initApp() {
    console.log("Initializing app");
    try {
        // Keep loading indicator hidden
        if (window.dataLoading) window.dataLoading.style.display = 'none';
        
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
    
    // Clear existing data
    window.fullData = [];
    window.marketOpenCandles = [];
    
    // Track market hours candles count
    let marketHoursCount = 0;
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',');
        if (parts.length < 6) continue;
        
        // Parse the date and time - SIMPLE approach
        const dateTimeStr = parts[0];
        const [datePart, timePart] = dateTimeStr.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes, seconds] = timePart.split(':').map(Number);
        
        // Create Date object (month is 0-indexed in JavaScript)
        const date = new Date(year, month-1, day, hours, minutes, seconds);
        
        // Check if it's during market hours - always true in debug mode
        const duringMarketHours = isDuringMarketHours(date);
        
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
        
        // Count market hours candles
        if (duringMarketHours) {
            marketHoursCount++;
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
    console.log(`Market hours candles: ${marketHoursCount} (${((marketHoursCount/window.fullData.length)*100).toFixed(1)}%)`);
    console.log(`Market open (9:30 AM) candles: ${window.marketOpenCandles.length}`);
    
    // Check if we have market hours data
    if (marketHoursCount === 0) {
        console.warn("No candles found during market hours (9:30 AM - 4:00 PM)");
        console.warn("Debug mode is enabled - all candles will be treated as during market hours");
        
        // Ensure all candles are marked as during market hours
        window.fullData.forEach(candle => {
            candle.duringMarketHours = true;
        });
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
        // Clear previous trades
        window.trades = [];
        
        // Get selected parameters
        const selectedYear = window.yearSelect ? parseInt(window.yearSelect.value) : window.years[0];
        
        // Get all parameters from the UI selects
        window.maxTradesPerDay = parseInt(window.maxTradesPerDaySelect.value);
        window.rangeRequirement = parseFloat(window.rangeSelect.value);
        window.profitTarget = parseFloat(window.profitTargetSelect.value);
        window.positionSize = parseInt(window.positionSizeSelect.value);
        window.breakoutPoints = parseFloat(window.breakoutPointsSelect.value);
        window.barsLookback = parseInt(window.barsLookbackSelect.value);
        
        console.log(`Running simulation for year: ${selectedYear}`);
        console.log(`Parameters: Max trades per day: ${window.maxTradesPerDay}, Range: ${window.rangeRequirement}, Profit Target: ${window.profitTarget}`);
        console.log(`Additional trade parameters: Breakout: ${window.breakoutPoints} points, Bars lookback: ${window.barsLookback}`);
        
        // Filter data for the selected year
        const yearData = window.fullData.filter(d => d.datetime.getFullYear() === selectedYear);
        console.log(`Found ${yearData.length} data points for year ${selectedYear}`);
        
        // Group data by days
        const days = {};
        yearData.forEach(candle => {
            const dateStr = candle.datetime.toISOString().split('T')[0];
            if (!days[dateStr]) {
                days[dateStr] = [];
            }
            days[dateStr].push(candle);
        });
        
        console.log(`Found ${Object.keys(days).length} trading days for ${selectedYear}`);
        
        // Reset monthly profits
        window.monthlyProfits = {};
        
        // Process each day in order
        const dayKeys = Object.keys(days).sort();
        
        // Need previous day's close for entry conditions
        let previousDayClose = null;
        
        // Process each day
        dayKeys.forEach((dateStr, index) => {
            const dayCandles = days[dateStr];
            
            // Sort candles by time
            dayCandles.sort((a, b) => a.datetime - b.datetime);
            
            // Get market hours candles
            const marketHoursCandles = dayCandles.filter(c => c.duringMarketHours);
            
            if (marketHoursCandles.length === 0) {
                console.log(`No market hours data for ${dateStr}, skipping day`);
                return;
            }
            
            // Find market open candle (9:30 AM)
            const marketOpenCandle = findMarketOpenCandle(dayCandles);
            
            if (!marketOpenCandle) {
                console.log(`No market open candle found for ${dateStr}, skipping day`);
                return;
            }
            
            // Check if we have previous day's close
            if (previousDayClose === null && index > 0) {
                // Try to get previous day's close
                const prevDayCandles = days[dayKeys[index - 1]];
                if (prevDayCandles && prevDayCandles.length > 0) {
                    // Sort by time and get the last candle
                    prevDayCandles.sort((a, b) => a.datetime - b.datetime);
                    previousDayClose = prevDayCandles[prevDayCandles.length - 1].close;
                }
            }
            
            // If we still don't have previous day's close, skip this day
            if (previousDayClose === null) {
                console.log(`No previous day's close available for ${dateStr}, skipping day`);
                previousDayClose = marketHoursCandles[marketHoursCandles.length - 1].close;
                return;
            }
            
            // Calculate range of market open candle
            const openCandleRange = marketOpenCandle.high - marketOpenCandle.low;
            
            // Check if range requirement is met
            if (openCandleRange < window.rangeRequirement) {
                console.log(`Market open candle range (${openCandleRange.toFixed(2)}) < requirement (${window.rangeRequirement}), skipping day`);
                // Update previous day's close
                previousDayClose = marketHoursCandles[marketHoursCandles.length - 1].close;
                return;
            }
            
            // Create date string in YYYY-MM-DD format for comparison
            const dateParts = dateStr.split('T')[0];
            
            // Count existing trades for this exact day
            const tradesForThisDay = window.trades.filter(trade => {
                // Convert trade entry date to YYYY-MM-DD string for comparison
                const tradeDate = trade.entryDate.toISOString().split('T')[0];
                return tradeDate === dateParts;
            }).length;
            
            // Skip if we've reached the maximum trades per day (unless unlimited)
            if (window.maxTradesPerDay > 0 && tradesForThisDay >= window.maxTradesPerDay) {
                console.log(`Maximum trades per day (${window.maxTradesPerDay}) reached for ${dateStr}, skipping`);
                // Update previous day's close
                previousDayClose = marketHoursCandles[marketHoursCandles.length - 1].close;
                return;
            }
            
            // Determine entry signal
            let position = null; // 'long' or 'short'
            
            if (marketOpenCandle.close > previousDayClose) {
                position = 'long';
            } else if (marketOpenCandle.close < previousDayClose) {
                position = 'short';
            } else {
                console.log(`Market open candle close equals previous day's close, skipping day`);
                // Update previous day's close
                previousDayClose = marketHoursCandles[marketHoursCandles.length - 1].close;
                return;
            }
            
            console.log(`${dateStr} entry signal: ${position} at ${marketOpenCandle.close.toFixed(2)}`);
            
            // Process first trade for the day (first candle after market open)
            processTrade(marketOpenCandle, marketHoursCandles, position, previousDayClose, true);
            
            // Look for additional trades during the day if maxTradesPerDay allows
            if (window.maxTradesPerDay !== 1) {
                findAdditionalTrades(marketHoursCandles, dateStr);
            }
            
            // Update previous day's close
            previousDayClose = marketHoursCandles[marketHoursCandles.length - 1].close;
        });
        
        // Update UI with results
        updateResults();
        
        console.log(`Simulation complete. Generated ${window.trades.length} trades.`);
        
    } catch (error) {
        console.error('Error running simulation:', error);
        alert('Error running simulation: ' + error.message);
    }
}

// Find additional trades during the day based on breakout pattern
function findAdditionalTrades(dayCandles, dateStr) {
    // Sort candles by time
    const sortedCandles = [...dayCandles].sort((a, b) => a.datetime - b.datetime);
    
    // Skip the first 30 minutes (to avoid overlap with first trade of the day)
    // and to have enough bars for lookback
    const startIndex = Math.min(window.barsLookback + 2, 6); 
    
    for (let i = startIndex; i < sortedCandles.length; i++) {
        // Get current date
        const currentDate = new Date(dateStr);
        const dateOnly = currentDate.toISOString().split('T')[0];
        
        // Count existing trades for this day
        const tradesForDay = window.trades.filter(trade => {
            const tradeDate = new Date(trade.entryDate);
            return tradeDate.toISOString().split('T')[0] === dateOnly;
        }).length;
        
        // Skip if we've reached the maximum trades per day
        if (window.maxTradesPerDay > 0 && tradesForDay >= window.maxTradesPerDay) {
            break;
        }
        
        const currentCandle = sortedCandles[i];
        
        // Get previous candles for breakout check
        const lookbackCandles = sortedCandles.slice(i - window.barsLookback, i);
        
        // Skip if we don't have enough candles for lookback
        if (lookbackCandles.length < window.barsLookback) {
            continue;
        }
        
        // Find the lowest low and highest high of the previous N bars
        const lowestLow = Math.min(...lookbackCandles.map(c => c.low));
        const highestHigh = Math.max(...lookbackCandles.map(c => c.high));
        
        // Check for a short entry (current candle breaks below the lowest low by breakoutPoints)
        if (currentCandle.low < lowestLow - window.breakoutPoints) {
            console.log(`Additional SHORT trade at ${currentCandle.datetime.toLocaleTimeString()}: Current low ${currentCandle.low.toFixed(2)} broke below previous ${window.barsLookback} bars low ${lowestLow.toFixed(2)}`);
            
            // Current candle breaks below previous lows - SHORT entry
            processTrade(currentCandle, sortedCandles.slice(i), 'short', sortedCandles[i-1].close, false);
            
            // Skip a few candles to avoid immediate reentry
            i += 3;
        }
        // Check for a long entry (current candle breaks above the highest high by breakoutPoints)
        else if (currentCandle.high > highestHigh + window.breakoutPoints) {
            console.log(`Additional LONG trade at ${currentCandle.datetime.toLocaleTimeString()}: Current high ${currentCandle.high.toFixed(2)} broke above previous ${window.barsLookback} bars high ${highestHigh.toFixed(2)}`);
            
            // Current candle breaks above previous highs - LONG entry
            processTrade(currentCandle, sortedCandles.slice(i), 'long', sortedCandles[i-1].close, false);
            
            // Skip a few candles to avoid immediate reentry
            i += 3;
        }
    }
}

// Process a trade for a day
function processTrade(entryCandle, dayCandles, position, previousDayClose, isFirstTrade = false) {
    // Entry price is the close of the market open candle
    const entryPrice = entryCandle.close;
    let entryDate = entryCandle.datetime;
    
    // Find exit point in subsequent candles
    let exitCandle = null;
    let exitPrice = null;
    let exitDate = null;
    let exitReason = '';
    
    // Sort candles by time and start checking from after entry candle
    const tradingCandles = dayCandles.filter(c => c.datetime > entryDate);
    
    // Exit logic differs for first trade vs additional trades
    if (isFirstTrade) {
        // First trade of the day - uses default or RSI exit strategy
        // Stop loss level - default exit strategy for first trade
        const stopPrice = position === 'long' ? entryCandle.low : entryCandle.high;
        
        // Profit target - same for all trades
        const profitTargetPrice = position === 'long' 
            ? entryPrice + window.profitTarget
            : entryPrice - window.profitTarget;
            
        for (let i = 0; i < tradingCandles.length; i++) {
            const candle = tradingCandles[i];
            
            // RSI-based exit logic
            if (window.exitStrategy === 'rsi') {
                // Calculate a simple placeholder RSI value based on price moves
                const rsiValue = calculateSimpleRSI(tradingCandles.slice(0, i + 1), window.rsiPeriod);
                
                // Check RSI conditions
                if (position === 'long' && rsiValue >= window.rsiOverbought) {
                    exitPrice = candle.close;
                    exitDate = candle.datetime;
                    exitReason = 'RSI Overbought';
                    exitCandle = candle;
                    break;
                } else if (position === 'short' && rsiValue <= window.rsiOversold) {
                    exitPrice = candle.close;
                    exitDate = candle.datetime;
                    exitReason = 'RSI Oversold';
                    exitCandle = candle;
                    break;
                }
            }
            
            // Default exit strategy for first trade
            if (window.exitStrategy === 'default') {
                if (position === 'long' && candle.low <= stopPrice) {
                    exitPrice = stopPrice; // Exit at stop level
                    exitDate = candle.datetime;
                    exitReason = 'Stop Loss';
                    exitCandle = candle;
                    break;
                } else if (position === 'short' && candle.high >= stopPrice) {
                    exitPrice = stopPrice; // Exit at stop level
                    exitDate = candle.datetime;
                    exitReason = 'Stop Loss';
                    exitCandle = candle;
                    break;
                }
            }
            
            // Profit target check (applies to both first and additional trades)
            if (position === 'long' && candle.high >= profitTargetPrice) {
                exitPrice = profitTargetPrice; // Exit at profit target
                exitDate = candle.datetime;
                exitReason = 'Profit Target';
                exitCandle = candle;
                break;
            } else if (position === 'short' && candle.low <= profitTargetPrice) {
                exitPrice = profitTargetPrice; // Exit at profit target
                exitDate = candle.datetime;
                exitReason = 'Profit Target';
                exitCandle = candle;
                break;
            }
            
            // If we reach the last candle of the day, exit at close
            if (i === tradingCandles.length - 1) {
                exitPrice = candle.close;
                exitDate = candle.datetime;
                exitReason = 'Market Close';
                exitCandle = candle;
            }
        }
    } else {
        // Additional trades of the day - use the specified exit strategy
        // Profit target - same for all trades
        const profitTargetPrice = position === 'long' 
            ? entryPrice + window.profitTarget
            : entryPrice - window.profitTarget;
            
        for (let i = 0; i < tradingCandles.length; i++) {
            const candle = tradingCandles[i];
            
            // Need at least 2 bars to check the previous bars
            if (i < 2) continue;
            
            // Get the previous two bars for the stop loss
            const prevBar1 = tradingCandles[i-1];
            const prevBar2 = tradingCandles[i-2];
            
            // Calculate stop loss levels based on the previous two bars
            const stopLossLevelLong = Math.min(prevBar1.low, prevBar2.low);
            const stopLossLevelShort = Math.max(prevBar1.high, prevBar2.high);
            
            // Stop loss check for additional trades
            if (position === 'long' && candle.low <= stopLossLevelLong) {
                exitPrice = candle.close; // Exit at close of breaking candle
                exitDate = candle.datetime;
                exitReason = 'Stop Loss - Previous Bars Low';
                exitCandle = candle;
                break;
            } else if (position === 'short' && candle.high >= stopLossLevelShort) {
                exitPrice = candle.close; // Exit at close of breaking candle
                exitDate = candle.datetime;
                exitReason = 'Stop Loss - Previous Bars High';
                exitCandle = candle;
                break;
            }
            
            // Alternate exit strategy (if no stop loss is triggered)
            // For short: exit when price breaks previous bar's high
            // For long: exit when price breaks previous bar's low
            if (position === 'short' && candle.high > prevBar1.high) {
                exitPrice = candle.close;
                exitDate = candle.datetime;
                exitReason = 'Break Previous Bar High';
                exitCandle = candle;
                break;
            } else if (position === 'long' && candle.low < prevBar1.low) {
                exitPrice = candle.close;
                exitDate = candle.datetime;
                exitReason = 'Break Previous Bar Low';
                exitCandle = candle;
                break;
            }
            
            // Profit target check
            if (position === 'long' && candle.high >= profitTargetPrice) {
                exitPrice = profitTargetPrice; // Exit at profit target
                exitDate = candle.datetime;
                exitReason = 'Profit Target';
                exitCandle = candle;
                break;
            } else if (position === 'short' && candle.low <= profitTargetPrice) {
                exitPrice = profitTargetPrice; // Exit at profit target
                exitDate = candle.datetime;
                exitReason = 'Profit Target';
                exitCandle = candle;
                break;
            }
            
            // If we reach the last candle of the day, exit at close
            if (i === tradingCandles.length - 1) {
                exitPrice = candle.close;
                exitDate = candle.datetime;
                exitReason = 'Market Close';
                exitCandle = candle;
            }
        }
    }
    
    // If we couldn't find an exit (e.g., no more candles after entry), exit at last candle
    if (!exitCandle && dayCandles.length > 0) {
        const lastCandle = dayCandles[dayCandles.length - 1];
        exitPrice = lastCandle.close;
        exitDate = lastCandle.datetime;
        exitReason = 'End of Day';
        exitCandle = lastCandle;
    }
    
    // Calculate P&L
    let pnl = position === 'long' 
        ? (exitPrice - entryPrice) * (window.positionSize / entryPrice)
        : (entryPrice - exitPrice) * (window.positionSize / entryPrice);
    
    // Create trade object
    const trade = {
        entryDate: entryDate,
        exitDate: exitDate,
        entryPrice: entryPrice,
        exitPrice: exitPrice,
        position: position,
        pnl: pnl,
        exitReason: exitReason,
        positionSize: window.positionSize,
        previousClose: previousDayClose,
        isFirstTrade: isFirstTrade
    };
    
    // Track monthly P&L
    const month = entryDate.getMonth();
    const year = entryDate.getFullYear();
    const monthKey = `${year}-${month+1}`;
    
    if (!window.monthlyProfits[monthKey]) {
        window.monthlyProfits[monthKey] = {
            year: year,
            month: month+1,
            totalPnl: 0,
            tradeCount: 0,
            wins: 0,
            losses: 0
        };
    }
    
    window.monthlyProfits[monthKey].totalPnl += pnl;
    window.monthlyProfits[monthKey].tradeCount++;
    if (pnl > 0) window.monthlyProfits[monthKey].wins++;
    else if (pnl < 0) window.monthlyProfits[monthKey].losses++;
    
    // Add monthlyPnl to trade for display
    trade.monthlyPnl = window.monthlyProfits[monthKey].totalPnl;
    
    // Add the trade to our list
    window.trades.push(trade);
    
    console.log(`Trade recorded: ${position} entry at ${entryPrice.toFixed(2)}, exit at ${exitPrice.toFixed(2)}, P&L: $${pnl.toFixed(2)}, Reason: ${exitReason}, First trade: ${isFirstTrade}`);
}

// Calculate a simple RSI (placeholder)
function calculateSimpleRSI(candles, period) {
    if (candles.length < period) return 50; // Not enough data
    
    const prices = candles.map(c => c.close);
    const gains = [];
    const losses = [];
    
    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
        const change = prices[i] - prices[i-1];
        if (change >= 0) {
            gains.push(change);
            losses.push(0);
        } else {
            gains.push(0);
            losses.push(Math.abs(change));
        }
    }
    
    // Get data for the RSI period
    const periodGains = gains.slice(-period);
    const periodLosses = losses.slice(-period);
    
    // Average gains and losses
    const avgGain = periodGains.reduce((sum, val) => sum + val, 0) / period;
    const avgLoss = periodLosses.reduce((sum, val) => sum + val, 0) / period;
    
    // Calculate RSI
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
}

// Update UI with simulation results
function updateResults() {
    // Update results tab
    updateResultsTab();
    
    // Update analytics tab
    updateAnalyticsTab();
    
    // Update trades tab
    updateTradesTab();
}

// Update the Results tab
function updateResultsTab() {
    // Calculate performance metrics
    const totalTrades = window.trades.length;
    if (totalTrades === 0) {
        alert("No trades were generated. Try adjusting parameters.");
        return;
    }
    
    const grossProfit = window.trades
        .filter(t => t.pnl > 0)
        .reduce((sum, t) => sum + t.pnl, 0);
    
    const grossLoss = window.trades
        .filter(t => t.pnl < 0)
        .reduce((sum, t) => sum + Math.abs(t.pnl), 0);
    
    const netProfit = window.trades.reduce((sum, t) => sum + t.pnl, 0);
    const profitFactor = grossLoss === 0 ? Infinity : grossProfit / grossLoss;
    
    const winCount = window.trades.filter(t => t.pnl > 0).length;
    const lossCount = window.trades.filter(t => t.pnl < 0).length;
    const winRate = totalTrades === 0 ? 0 : (winCount / totalTrades) * 100;
    
    const totalInvestment = window.positionSize * totalTrades;
    const annualReturn = totalInvestment === 0 ? 0 : (netProfit / totalInvestment) * 100;
    
    // Calculate max drawdown
    let maxDrawdown = 0;
    let peakEquity = 0;
    let currentEquity = 0;
    
    window.trades.forEach(trade => {
        currentEquity += trade.pnl;
        if (currentEquity > peakEquity) {
            peakEquity = currentEquity;
        }
        
        const drawdown = peakEquity - currentEquity;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    });
    
    const maxDrawdownPercent = totalInvestment === 0 ? 0 : (maxDrawdown / totalInvestment) * 100;
    
    // Update stats display
    document.getElementById('annual-return-stat').textContent = `${annualReturn.toFixed(2)}%`;
    document.getElementById('max-drawdown-stat').textContent = `$${maxDrawdown.toFixed(2)} (${maxDrawdownPercent.toFixed(2)}%)`;
    document.getElementById('profit-factor-stat').textContent = profitFactor === Infinity ? 'Infinity' : profitFactor.toFixed(2);
    document.getElementById('win-rate-stat').textContent = `${winRate.toFixed(2)}% (${winCount}/${totalTrades})`;
    document.getElementById('total-trades-stat').textContent = totalTrades;
    document.getElementById('total-investment-stat').textContent = `$${totalInvestment.toLocaleString()}`;
    
    // Create price chart
    createPriceChart();
    
    // Create performance chart
    createPerformanceChart();
}

// Create price chart with entry/exit points
function createPriceChart() {
    const canvas = document.getElementById('price-chart');
    if (!canvas) return;
    
    // Destroy existing chart if it exists
    if (window.priceChart) {
        window.priceChart.destroy();
    }
    
    // Get the selected year's data
    const selectedYear = window.yearSelect ? parseInt(window.yearSelect.value) : window.years[0];
    const yearData = window.fullData.filter(d => d.datetime.getFullYear() === selectedYear);
    
    if (yearData.length === 0) return;
    
    // Format data for Chart.js - take fewer samples for better readability
    const sampledData = [];
    for (let i = 0; i < yearData.length; i += 1) { // Sample every point for better readability
        sampledData.push(yearData[i]);
    }
    
    // Format data for Chart.js
    const chartLabels = sampledData.map(d => d.datetime);
    const chartData = sampledData.map(d => d.close);
    
    // Create entry/exit point datasets
    const longEntryPoints = [];
    const shortEntryPoints = [];
    const exitPoints = []; // Single exit points array
    
    // Prepare trade data
    window.trades.forEach(trade => {
        // Entry points
        if (trade.position === 'long') {
            longEntryPoints.push({
                x: trade.entryDate,
                y: trade.entryPrice
            });
        } else {
            shortEntryPoints.push({
                x: trade.entryDate,
                y: trade.entryPrice
            });
        }
        
        // All exit points in one array
        exitPoints.push({
            x: trade.exitDate,
            y: trade.exitPrice
        });
    });
    
    // Create the chart with improved readability
    window.priceChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [
                {
                    label: 'SPY Price',
                    data: chartData,
                    borderColor: 'rgba(25, 25, 25, 1)',
                    backgroundColor: 'rgba(240, 240, 240, 0.5)',
                    pointRadius: 0,
                    borderWidth: 2,
                    fill: true
                },
                {
                    label: 'Long Entry',
                    data: longEntryPoints,
                    borderColor: 'rgba(0, 128, 0, 1)',
                    backgroundColor: 'rgba(0, 128, 0, 1)',
                    pointRadius: 10, 
                    pointStyle: 'triangle',
                    pointRotation: 0,
                    showLine: false
                },
                {
                    label: 'Short Entry',
                    data: shortEntryPoints,
                    borderColor: 'rgba(255, 0, 0, 1)',
                    backgroundColor: 'rgba(255, 0, 0, 1)',
                    pointRadius: 10,
                    pointStyle: 'triangle',
                    pointRotation: 180,
                    showLine: false
                },
                {
                    label: 'Exit Position',
                    data: exitPoints,
                    borderColor: 'rgba(0, 0, 0, 1)',
                    backgroundColor: 'rgba(0, 0, 0, 1)',
                    pointRadius: 10,
                    pointStyle: 'rect',
                    showLine: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM d'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Price ($)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            return formatDateTime(new Date(tooltipItems[0].parsed.x));
                        },
                        label: function(context) {
                            const datasetLabel = context.dataset.label;
                            const value = context.parsed.y;
                            
                            if (datasetLabel === 'SPY Price') {
                                return `Price: $${value.toFixed(2)}`;
                            } else {
                                return `${datasetLabel}: $${value.toFixed(2)}`;
                            }
                        }
                    },
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    }
                },
                title: {
                    display: true,
                    text: `SPY Price Chart - ${selectedYear}`,
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: 12
                        },
                        padding: 15
                    }
                }
            }
        }
    });
}

// Create performance chart (removed as requested)
function createPerformanceChart() {
    // Function is now empty as we've removed the daily trading performance chart
    return;
}

// Update the Analytics tab
function updateAnalyticsTab() {
    // Calculate metrics
    const totalTrades = window.trades.length;
    if (totalTrades === 0) return;
    
    const netProfit = window.trades.reduce((sum, t) => sum + t.pnl, 0);
    const winCount = window.trades.filter(t => t.pnl > 0).length;
    const lossCount = window.trades.filter(t => t.pnl < 0).length;
    const totalInvestment = window.positionSize * totalTrades;
    
    // Update summary stats
    document.getElementById('analytics-investment-stat').textContent = `$${totalInvestment.toLocaleString()}`;
    document.getElementById('analytics-wins-stat').textContent = winCount;
    document.getElementById('analytics-losses-stat').textContent = lossCount;
    document.getElementById('analytics-net-profit-stat').textContent = `$${netProfit.toFixed(2)}`;
    
    // Monthly breakdown
    const monthlyData = Object.values(window.monthlyProfits).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
    });
    
    // Calculate monthly metrics
    if (monthlyData.length > 0) {
        // Best/worst months
        const bestMonth = [...monthlyData].sort((a, b) => b.totalPnl - a.totalPnl)[0];
        const worstMonth = [...monthlyData].sort((a, b) => a.totalPnl - b.totalPnl)[0];
        const avgMonthlyReturn = monthlyData.reduce((sum, m) => sum + m.totalPnl, 0) / monthlyData.length;
        const profitableMonths = monthlyData.filter(m => m.totalPnl > 0).length;
        const monthlyConsistency = `${profitableMonths}/${monthlyData.length} (${((profitableMonths/monthlyData.length)*100).toFixed(2)}%)`;
        
        // Most active month
        const mostActiveMonth = [...monthlyData].sort((a, b) => b.tradeCount - a.tradeCount)[0];
        
        // Update monthly stats
        document.getElementById('best-month-stat').textContent = `${getMonthName(bestMonth.month)} ${bestMonth.year}: $${bestMonth.totalPnl.toFixed(2)}`;
        document.getElementById('worst-month-stat').textContent = `${getMonthName(worstMonth.month)} ${worstMonth.year}: $${worstMonth.totalPnl.toFixed(2)}`;
        document.getElementById('avg-monthly-return-stat').textContent = `$${avgMonthlyReturn.toFixed(2)}`;
        document.getElementById('monthly-consistency-stat').textContent = monthlyConsistency;
        document.getElementById('most-active-month-stat').textContent = `${getMonthName(mostActiveMonth.month)} ${mostActiveMonth.year}: ${mostActiveMonth.tradeCount} trades`;
        
        // Create monthly performance chart
        createMonthlyPerformanceChart(monthlyData);
        
        // Populate monthly table
        const monthlyBody = document.getElementById('monthly-body');
        monthlyBody.innerHTML = '';
        
        monthlyData.forEach(monthData => {
            const row = document.createElement('tr');
            
            // Calculate win rate
            const winRate = monthData.tradeCount === 0 ? 0 : 
                (monthData.wins / monthData.tradeCount) * 100;
            
            // Calculate ROI
            const monthlyInvestment = window.positionSize * monthData.tradeCount;
            const roi = monthlyInvestment === 0 ? 0 : 
                (monthData.totalPnl / monthlyInvestment) * 100;
            
            // Month column
            const monthCell = document.createElement('td');
            monthCell.textContent = `${getMonthName(monthData.month)} ${monthData.year}`;
            row.appendChild(monthCell);
            
            // Trades column
            const tradesCell = document.createElement('td');
            tradesCell.textContent = monthData.tradeCount;
            row.appendChild(tradesCell);
            
            // Win Rate column
            const winRateCell = document.createElement('td');
            winRateCell.textContent = `${winRate.toFixed(2)}% (${monthData.wins}/${monthData.tradeCount})`;
            row.appendChild(winRateCell);
            
            // Net Profit column
            const netProfitCell = document.createElement('td');
            netProfitCell.textContent = `$${monthData.totalPnl.toFixed(2)}`;
            netProfitCell.classList.add(monthData.totalPnl >= 0 ? 'positive-pnl' : 'negative-pnl');
            row.appendChild(netProfitCell);
            
            // ROI column
            const roiCell = document.createElement('td');
            roiCell.textContent = `${roi.toFixed(2)}%`;
            roiCell.classList.add(roi >= 0 ? 'positive-pnl' : 'negative-pnl');
            row.appendChild(roiCell);
            
            monthlyBody.appendChild(row);
        });
    }
}

// Create monthly performance chart
function createMonthlyPerformanceChart(monthlyData) {
    const canvas = document.getElementById('monthly-performance-chart');
    if (!canvas) return;
    
    // Destroy existing chart if it exists
    if (window.monthlyPerformanceChart) {
        window.monthlyPerformanceChart.destroy();
    }
    
    if (monthlyData.length === 0) return;
    
    // Format data for Chart.js
    const labels = monthlyData.map(m => `${getMonthName(m.month)} ${m.year}`);
    const pnlData = monthlyData.map(m => m.totalPnl);
    const tradeCountData = monthlyData.map(m => m.tradeCount);
    
    // Create background colors based on profit/loss
    const backgroundColors = pnlData.map(pnl => 
        pnl >= 0 ? 'rgba(75, 192, 192, 0.7)' : 'rgba(255, 99, 132, 0.7)');
    
    // Create the chart
    window.monthlyPerformanceChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Monthly P&L',
                    data: pnlData,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Trade Count',
                    data: tradeCountData,
                    type: 'line',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Month'
                    }
                },
                y: {
                    position: 'left',
                    title: {
                        display: true,
                        text: 'P&L ($)'
                    }
                },
                y1: {
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: 'Trade Count'
                    },
                    min: 0
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const datasetLabel = context.dataset.label;
                            const value = context.parsed.y;
                            
                            if (datasetLabel === 'Monthly P&L') {
                                return `${datasetLabel}: $${value.toFixed(2)}`;
                            } else {
                                return `${datasetLabel}: ${value}`;
                            }
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Monthly Performance'
                }
            }
        }
    });
}

// Update the Trades tab
function updateTradesTab() {
    const tradesBody = document.getElementById('trades-body');
    if (!tradesBody) return;
    
    tradesBody.innerHTML = '';
    
    // Sort trades by entry date
    const sortedTrades = [...window.trades].sort((a, b) => a.entryDate - b.entryDate);
    
    sortedTrades.forEach(trade => {
        const row = document.createElement('tr');
        
        // Format dates in Eastern Time
        const entryDate = formatDateTime(trade.entryDate);
        const exitDate = formatDateTime(trade.exitDate);
        
        // Entry Date column
        const entryDateCell = document.createElement('td');
        entryDateCell.textContent = entryDate;
        // Highlight if it's a first trade of the day (meaning 9:30 candle trade)
        if (trade.isFirstTrade) {
            entryDateCell.classList.add('first-trade');
        }
        row.appendChild(entryDateCell);
        
        // Exit Date column
        const exitDateCell = document.createElement('td');
        exitDateCell.textContent = exitDate;
        row.appendChild(exitDateCell);
        
        // Position column
        const positionCell = document.createElement('td');
        positionCell.textContent = trade.position.charAt(0).toUpperCase() + trade.position.slice(1);
        row.appendChild(positionCell);
        
        // Entry Price column
        const entryPriceCell = document.createElement('td');
        entryPriceCell.textContent = trade.entryPrice.toFixed(2);
        row.appendChild(entryPriceCell);
        
        // Exit Price column
        const exitPriceCell = document.createElement('td');
        exitPriceCell.textContent = trade.exitPrice.toFixed(2);
        row.appendChild(exitPriceCell);
        
        // P&L column
        const pnlCell = document.createElement('td');
        pnlCell.textContent = `$${trade.pnl.toFixed(2)}`;
        pnlCell.classList.add(trade.pnl >= 0 ? 'trade-win' : 'trade-loss');
        row.appendChild(pnlCell);
        
        // Exit Reason column
        const exitReasonCell = document.createElement('td');
        exitReasonCell.textContent = trade.exitReason;
        row.appendChild(exitReasonCell);
        
        // Monthly P&L column
        const monthlyPnlCell = document.createElement('td');
        monthlyPnlCell.textContent = `$${trade.monthlyPnl.toFixed(2)}`;
        monthlyPnlCell.classList.add(trade.monthlyPnl >= 0 ? 'trade-win' : 'trade-loss');
        row.appendChild(monthlyPnlCell);
        
        tradesBody.appendChild(row);
    });
}

// Helper function to format date time
function formatDateTime(date) {
    try {
        // Convert to Eastern Time with 24-hour format
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false // Use 24-hour format (military time)
        };
        return date.toLocaleString('en-US', options) + ' ET';
    } catch (error) {
        console.error("Error formatting date:", error, date);
        return "Invalid Date";
    }
}

// Helper function to get month name
function getMonthName(month) {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month - 1]; // Adjust for 0-indexed array
}