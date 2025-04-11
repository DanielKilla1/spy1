// SPY Trading Simulation
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing application");
    
    // DOM elements
    const yearSelect = document.getElementById('year-select');
    const rangeSelect = document.getElementById('range-select');
    const profitTargetSelect = document.getElementById('profit-target-select');
    const runButton = document.getElementById('run-simulation');
    const loadingProgress = document.getElementById('loading-progress');
    const loadingBar = document.getElementById('loading-bar');
    const dataLoading = document.querySelector('.data-loading');
    
    // Chart instances
    let priceChart = null;
    let performanceChart = null;
    
    // Data storage
    let fullData = [];
    let trades = [];
    let years = [];
    
    // Strategy parameters
    let rangeRequirement = 2.0;
    let profitTarget = 20.0;
    
    // Exit strategy parameters
    let exitStrategy = "atr"; // "atr" or "default"
    
    // ATR-based stop loss parameters
    let atrMultiplier = 1.0;
    let atrPeriod = 14;
    let monthlyProfitLimit = "100"; // Percentage of monthly profit risked
    let riskRewardMin = 1.5; // Minimum risk-to-reward ratio
    
    // Monthly profit tracking
    let monthlyProfits = {}; // Will track profits by year and month
    let totalMonthlyProfit = 0; // Current month's profit
    
    // Initialize application
    initApp();
    
    async function initApp() {
        console.log("Initializing app");
        try {
            // Show loading indicator
            dataLoading.style.display = 'block';
            
            // Load data
            await loadData();
            console.log("Data loaded successfully");
            
            // Hide loading indicator
            dataLoading.style.display = 'none';
            
            // Set up event listeners
            setupEventListeners();
            
            // Run simulation for most recent year by default
            if (years.length > 0) {
                const latestYear = years[years.length - 1];
                if (yearSelect) {
                    yearSelect.value = latestYear;
                    runSimulation();
                } else {
                    console.error("Year select element not found");
                }
            } else {
                console.error("No years available in the data");
            }
        } catch (error) {
            console.error('Error initializing app:', error);
            alert('Error loading application data: ' + error.message);
        }
    }
    
    async function loadData() {
        try {
            // Show loading indicator progress
            if (loadingBar) loadingBar.value = 10;
            if (loadingProgress) loadingProgress.textContent = '10%';
            
            // Fetch the actual SPY data file
            if (loadingProgress) loadingProgress.textContent = '20%';
            if (loadingBar) loadingBar.value = 20;
            
            console.log("Fetching SPY data file...");
            const response = await fetch('SPY_full_1hour_adjsplit.txt');
            
            if (!response.ok) {
                throw new Error(`Failed to load data file: ${response.status} ${response.statusText}`);
            }
            
            if (loadingProgress) loadingProgress.textContent = '50%';
            if (loadingBar) loadingBar.value = 50;
            
            console.log("Reading SPY data file...");
            const csvText = await response.text();
            console.log(`Data file size: ${csvText.length} bytes`);
            
            if (loadingProgress) loadingProgress.textContent = '70%';
            if (loadingBar) loadingBar.value = 70;
            
            // Verify Papa Parse is available
            if (typeof Papa === 'undefined') {
                throw new Error("Papa Parse library not loaded");
            }
            
            // Parse the CSV data
            console.log("Parsing CSV data...");
            Papa.parse(csvText, {
                header: false,
                dynamicTyping: true,
                skipEmptyLines: true,
                delimiter: ",", // Explicitly set the delimiter to comma
                complete: function(results) {
                    console.log(`CSV parsing complete: ${results.data.length} rows`);
                    
                    if (results.errors && results.errors.length > 0) {
                        console.error("CSV parsing errors:", results.errors);
                        return;
                    }
                    
                    // Process the data - format matches:
                    // datetime, open, high, low, close, volume
                    fullData = results.data.map(row => {
                        try {
                            return {
                                datetime: new Date(row[0]),
                                open: parseFloat(row[1]),
                                high: parseFloat(row[2]),
                                low: parseFloat(row[3]),
                                close: parseFloat(row[4]),
                                volume: parseInt(row[5]),
                                date: new Date(new Date(row[0]).setHours(0, 0, 0, 0)),
                                time: row[0].split(' ')[1].substring(0, 5)
                            };
                        } catch (error) {
                            console.error("Error processing row:", row, error);
                            return null;
                        }
                    }).filter(row => row !== null); // Remove any rows that failed to process
                    
                    console.log(`Processed ${fullData.length} valid data points`);
                    if (fullData.length > 0) {
                        console.log("Sample data point:", fullData[0]);
                    }
                    
                    if (loadingProgress) loadingProgress.textContent = '90%';
                    if (loadingBar) loadingBar.value = 90;
                    
                    // Continue with data processing
                    processData();
                    populateYears();
                    
                    if (loadingProgress) loadingProgress.textContent = '100%';
                    if (loadingBar) loadingBar.value = 100;
                },
                error: function(error) {
                    console.error('Error parsing CSV:', error);
                    alert('Error parsing the data file. Please check if the file format is correct.');
                }
            });
            
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Could not load the SPY data file. Please make sure "SPY_full_1hour_adjsplit.txt" exists in the same directory as the HTML file.');
            throw error;
        }
    }
    
    // Function to calculate ATR (Average True Range)
    function calculateATR(data, period) {
        // Calculate true range for each candle
        for (let i = 0; i < data.length; i++) {
            const candle = data[i];
            
            if (i === 0) {
                // First candle TR is just the high-low range
                candle.tr = candle.high - candle.low;
            } else {
                // True Range is the greatest of:
                // 1. Current High - Current Low
                // 2. |Current High - Previous Close|
                // 3. |Current Low - Previous Close|
                const prevClose = data[i-1].close;
                const highLowRange = candle.high - candle.low;
                const highPrevCloseRange = Math.abs(candle.high - prevClose);
                const lowPrevCloseRange = Math.abs(candle.low - prevClose);
                
                candle.tr = Math.max(highLowRange, highPrevCloseRange, lowPrevCloseRange);
            }
        }
        
        // Calculate ATR using the specified period
        for (let i = 0; i < data.length; i++) {
            const candle = data[i];
            
            if (i < period) {
                // Not enough data for full ATR calculation yet
                // Use simple average of true ranges
                const trSum = data.slice(0, i + 1).reduce((sum, c) => sum + c.tr, 0);
                candle.atr = trSum / (i + 1);
            } else {
                // ATR is smoothed using Wilder's smoothing method
                // ATR = ((Previous ATR * (period - 1)) + Current TR) / period
                const prevATR = data[i-1].atr;
                candle.atr = ((prevATR * (period - 1)) + candle.tr) / period;
            }
        }
    }
    
    function processData() {
        console.log("Processing data...");
        // Extract unique years
        years = [...new Set(fullData.map(d => d.datetime.getFullYear()))].sort();
        console.log("Years found in data:", years);
        
        // Group data by date
        const dataByDate = {};
        fullData.forEach(row => {
            const dateStr = row.date.toISOString().split('T')[0];
            if (!dataByDate[dateStr]) {
                dataByDate[dateStr] = [];
            }
            dataByDate[dateStr].push(row);
        });
        
        // Initialize trading variables and identify first candles
        const dates = Object.keys(dataByDate).sort();
        
        console.log(`Processing ${dates.length} trading days`);
        
        dates.forEach((dateStr, dateIndex) => {
            const candles = dataByDate[dateStr];
            
            // Sort candles by time
            candles.sort((a, b) => a.datetime - b.datetime);
            
            // Mark first candle of the day
            candles.forEach((candle, i) => {
                candle.is_first_candle = (i === 0);
                
                // Calculate candle range
                candle.candle_range = candle.high - candle.low;
                
                // Initialize trading variables
                candle.signal = 0;
                candle.position = 0;
                candle.entry_price = null;
                candle.stop_price = null;
                candle.target_price = null;
                candle.exit_reason = '';
                candle.trade_pnl = 0;
                
                // Get previous day's close if this is the first candle
                if (candle.is_first_candle && dateIndex > 0) {
                    const prevDateCandles = dataByDate[dates[dateIndex - 1]];
                    if (prevDateCandles && prevDateCandles.length > 0) {
                        // Get the last candle of the previous day
                        const lastCandle = prevDateCandles[prevDateCandles.length - 1];
                        candle.prev_day_close = lastCandle.close;
                    } else {
                        candle.prev_day_close = null;
                    }
                } else {
                    candle.prev_day_close = null;
                }
            });
        });
        
        console.log("Data processing complete");
    }
    
    function populateYears() {
        if (!yearSelect) {
            console.error("Year select element not found");
            return;
        }
        
        // Clear existing options
        yearSelect.innerHTML = '';
        
        // Add an option for each year
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
        
        console.log("Year select populated with", years.length, "years");
    }
    
    function setupEventListeners() {
        try {
            console.log("Setting up event listeners");
            
            // Run simulation when button is clicked
            if (runButton) {
                runButton.addEventListener('click', runSimulation);
                console.log("Run button listener attached");
            } else {
                console.error("Run button not found");
            }
            
            // Also run when year selection changes
            if (yearSelect) {
                yearSelect.addEventListener('change', function() {
                    // Reset monthly profit tracking when year changes
                    monthlyProfits = {};
                    totalMonthlyProfit = 0;
                    runSimulation();
                });
                console.log("Year select listener attached");
            }
            
            // Update range requirement when selection changes
            if (rangeSelect) {
                rangeSelect.addEventListener('change', function() {
                    rangeRequirement = parseFloat(rangeSelect.value);
                    runSimulation();
                });
                console.log("Range select listener attached");
            }
            
            // Update profit target when selection changes
            if (profitTargetSelect) {
                profitTargetSelect.addEventListener('change', function() {
                    profitTarget = parseFloat(profitTargetSelect.value);
                    runSimulation();
                });
                console.log("Profit target select listener attached");
            }
            
            // Add listeners for exit strategy parameters
            const parameterIds = [
                'exit-strategy',
                'atr-multiplier', 
                'atr-period', 
                'monthly-profit-limit', 
                'risk-reward-min'
            ];
            
            // Set up each listener safely
            parameterIds.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('change', function() {
                        // If exit strategy changes, we need to update the UI
                        if (id === 'exit-strategy') {
                            updateExitStrategyControls();
                        }
                        runSimulation();
                    });
                    console.log(`${id} listener attached`);
                } else {
                    console.log(`${id} element not found, skipping listener`);
                }
            });
            
            // Initialize exit strategy controls visibility
            updateExitStrategyControls();
            
            // Make the results tab active by default
            const resultsTab = document.getElementById('results-tab');
            if (resultsTab) {
                resultsTab.style.display = 'block';
            }
            
            // Tab navigation
            const tabButtons = document.querySelectorAll('.tab-button');
            const tabContents = document.querySelectorAll('.tab-content');
            
            tabButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const tabName = this.getAttribute('data-tab');
                    
                    // Remove active class from all buttons and tabs
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabContents.forEach(content => content.style.display = 'none');
                    
                    // Add active class to current button and show its content
                    this.classList.add('active');
                    document.getElementById(`${tabName}-tab`).style.display = 'block';
                    
                    // If analytics tab is selected, update the monthly analytics chart
                    if (tabName === 'analytics') {
                        updateMonthlyAnalytics();
                    }
                });
            });
            
            console.log("Event listeners setup complete");
        } catch (error) {
            console.error("Error setting up event listeners:", error);
        }
    }
    
    function runSimulation() {
        console.log("Running simulation...");
        try {
            // Get current parameter values
            let selectedYear = parseInt(yearSelect.value);
            
            if (isNaN(selectedYear) && years.length > 0) {
                selectedYear = years[years.length - 1];
                console.log("Invalid year, using latest:", selectedYear);
            }
            
            // Get parameters from UI with fallbacks
            rangeRequirement = rangeSelect ? parseFloat(rangeSelect.value) : 2.0;
            
            const ptSelect = document.getElementById('profit-target-select');
            profitTarget = ptSelect ? parseFloat(ptSelect.value) : 20.0;
            
            // Get exit strategy
            const exitStrategyEl = document.getElementById('exit-strategy');
            exitStrategy = exitStrategyEl ? exitStrategyEl.value : 'atr';
            
            // Safely update ATR-based stop loss parameters with default fallbacks
            const atrMultiplierEl = document.getElementById('atr-multiplier');
            atrMultiplier = atrMultiplierEl ? parseFloat(atrMultiplierEl.value) : 1.0;
            
            const atrPeriodEl = document.getElementById('atr-period');
            atrPeriod = atrPeriodEl ? parseInt(atrPeriodEl.value) : 14;
            
            const monthlyProfitLimitEl = document.getElementById('monthly-profit-limit');
            monthlyProfitLimit = monthlyProfitLimitEl ? monthlyProfitLimitEl.value : 'off';
            
            const riskRewardMinEl = document.getElementById('risk-reward-min');
            riskRewardMin = riskRewardMinEl ? parseFloat(riskRewardMinEl.value) : 0;
            
            console.log("Simulation parameters:", {
                year: selectedYear,
                rangeRequirement,
                profitTarget,
                exitStrategy,
                atrMultiplier,
                atrPeriod,
                monthlyProfitLimit,
                riskRewardMin
            });
            
            // Reset monthly profit tracking if year changes
            if (!monthlyProfits[selectedYear]) {
                monthlyProfits[selectedYear] = {};
            }
            
            // Filter data for selected year
            const yearData = fullData.filter(d => d.datetime.getFullYear() === selectedYear);
            console.log(`Filtered ${yearData.length} data points for year ${selectedYear}`);
            
            if (yearData.length === 0) {
                console.error("No data found for selected year");
                return;
            }
            
            // Calculate ATR for all data
            calculateATR(yearData, atrPeriod);
            
            // Run the trading algorithm
            console.log("Running trading algorithm...");
            const { yearTrades, tradingResults } = runTradingAlgorithm(yearData);
            
            // Update the UI with results
            console.log("Updating UI with results...");
            updateCharts(yearData, yearTrades);
            updateStatistics(tradingResults);
            updateTradesTable(yearTrades);
            updateMonthlyAnalytics(); // Update monthly analytics
            console.log("Simulation complete!");
        } catch (error) {
            console.error('Error running simulation:', error);
        }
    }
    
    function runTradingAlgorithm(data) {
        // Reset trades for this simulation
        const yearTrades = [];
        
        try {
            // Group data by date
            const dataByDate = {};
            data.forEach(row => {
                const dateStr = row.date.toISOString().split('T')[0];
                if (!dataByDate[dateStr]) {
                    dataByDate[dateStr] = [];
                }
                dataByDate[dateStr].push(row);
            });
            
            // Process each date
            const dates = Object.keys(dataByDate).sort();
            
            console.log(`Analyzing ${dates.length} trading days in selected year`);
            
            dates.forEach(dateStr => {
                const dayCandles = dataByDate[dateStr].sort((a, b) => a.datetime - b.datetime);
                
                // Skip days with no candles
                if (dayCandles.length === 0) return;
                
                // Get the first candle of the day
                const firstCandle = dayCandles[0];
                
                // Extract month from the date for monthly profit tracking
                const dateObj = new Date(dateStr);
                const year = dateObj.getFullYear();
                const month = dateObj.getMonth();
                
                // Initialize monthly tracking if not already done
                if (!monthlyProfits[year]) {
                    monthlyProfits[year] = {};
                }
                
                if (!monthlyProfits[year][month]) {
                    monthlyProfits[year][month] = {
                        profit: 0,
                        lossLimit: 0,
                        trades: 0,
                        winCount: 0,
                        wins: 0,   // Total winning amount
                        losses: 0   // Total losing amount (positive value)
                    };
                }
                
                // Get monthly profit data
                const monthlyData = monthlyProfits[year][month];
                
                // Check entry conditions
                if (firstCandle.is_first_candle && 
                    firstCandle.candle_range >= rangeRequirement && 
                    firstCandle.prev_day_close !== null && 
                    firstCandle.close !== firstCandle.prev_day_close) {
                    
                    // Skip trade if we've lost more than our monthly profit limit allows
                    let monthlyCheck = true;
                    
                    try {
                        if (monthlyProfitLimit && monthlyProfitLimit !== 'off') {
                            const profitLimitPercentage = parseInt(monthlyProfitLimit) / 100;
                            const maxLossThisMonth = monthlyData.profit * profitLimitPercentage;
                            
                            // If we've already hit our allowed loss limit for the month, skip this trade
                            if (monthlyData.profit > 0 && monthlyData.lossLimit >= maxLossThisMonth) {
                                console.log(`SKIP TRADE on ${dateStr}: Monthly profit protection active. Current profit: $${monthlyData.profit.toFixed(2)}, Losses used: $${monthlyData.lossLimit.toFixed(2)}, Max allowed: $${maxLossThisMonth.toFixed(2)}`);
                                monthlyCheck = false;
                            }
                        }
                    } catch (error) {
                        console.error("Error in monthly profit check:", error);
                        monthlyCheck = true; // Continue with trade if there's an error
                    }
                    
                    // Determine direction
                    const isLong = firstCandle.close > firstCandle.prev_day_close;
                    const direction = isLong ? 'Long' : 'Short';
                    
                    // Calculate ATR-based stop loss
                    let atrStopPrice = null;
                    let riskRewardCheck = true;
                    
                    try {
                        if (firstCandle.atr) {
                            const atrStopDistance = firstCandle.atr * atrMultiplier;
                            atrStopPrice = isLong ? firstCandle.close - atrStopDistance : firstCandle.close + atrStopDistance;
                            
                            // Calculate risk in dollars
                            const risk = Math.abs(firstCandle.close - atrStopPrice) * (10000 / firstCandle.close);
                            
                            // Calculate potential reward in dollars
                            const rewardPrice = isLong ? (firstCandle.close + profitTarget) : (firstCandle.close - profitTarget);
                            const reward = Math.abs(firstCandle.close - rewardPrice) * (10000 / firstCandle.close);
                            
                            // Calculate risk-reward ratio
                            const riskRewardRatio = reward / risk;
                            
                            // Skip trade if risk-reward ratio is below minimum
                            if (riskRewardMin > 0 && riskRewardRatio < riskRewardMin) {
                                console.log(`SKIP TRADE on ${dateStr}: Risk-reward ratio ${riskRewardRatio.toFixed(2)} below minimum ${riskRewardMin}`);
                                riskRewardCheck = false;
                            }
                        }
                    } catch (error) {
                        console.error("Error in risk-reward calculation:", error);
                        riskRewardCheck = true; // Continue with trade if there's an error in calculation
                        // Use standard stop if ATR stop calculation fails
                        atrStopPrice = null;
                    }
                    
                    if (!monthlyCheck || !riskRewardCheck) {
                        return; // Skip this trade
                    }
                    
                    console.log(`ENTRY on ${dateStr}: ${direction} at ${firstCandle.close.toFixed(2)}`);
                    
                    // Set up trade parameters
                    const entryPrice = firstCandle.close;
                    
                    let stopPrice;
                    let stopType = '';
                    
                    // Determine stop price based on exit strategy
                    if (exitStrategy === 'atr' && atrStopPrice) {
                        // Use ATR-based stop
                        stopPrice = atrStopPrice;
                        stopType = 'ATR-Based';
                    } else {
                        // Use default strategy: first candle's low/high as stop
                        stopPrice = isLong ? firstCandle.low : firstCandle.high;
                        stopType = 'Default';
                    }
                    
                    // Set profit target
                    const targetPrice = isLong ? (entryPrice + profitTarget) : (entryPrice - profitTarget);
                    
                    // Mark the entry on first candle
                    firstCandle.position = isLong ? 1 : -1;
                    firstCandle.entry_price = entryPrice;
                    firstCandle.stop_price = stopPrice;
                    firstCandle.target_price = targetPrice;
                    
                    console.log(`Trade details: Entry=${entryPrice.toFixed(2)}, Stop=${stopPrice.toFixed(2)} (${stopType}), Target=${targetPrice.toFixed(2)}`);
                    
                    // Track if trade has been exited
                    let isExited = false;
                    let exitPrice = null;
                    let exitCandle = null;
                    let exitReason = '';
                    
                    // Initialize tracking variables for this trade
                    let entryTime = firstCandle.datetime;
                    
                    // Process subsequent candles for exit conditions
                    for (let i = 1; i < dayCandles.length; i++) {
                        const currentCandle = dayCandles[i];
                        
                        // Continue tracking position until exit
                        if (!isExited) {
                            currentCandle.position = isLong ? 1 : -1;
                            currentCandle.entry_price = entryPrice;
                            currentCandle.stop_price = stopPrice;
                            currentCandle.target_price = targetPrice;
                            
                            // Check for stop loss conditions based on the strategy
                            let stopLossTriggered;
                            
                            if (exitStrategy === 'default') {
                                // Default Strategy: 
                                // - For Long: Exit if any following 1-hour candle breaks below the first 1-hour candle's low
                                // - For Short: Exit if any following 1-hour candle breaks above the first 1-hour candle's high
                                stopLossTriggered = 
                                    (isLong && currentCandle.low <= firstCandle.low) ||
                                    (!isLong && currentCandle.high >= firstCandle.high);
                            } else {
                                // ATR-based Strategy: Use the calculated stop price
                                stopLossTriggered = 
                                    (isLong && currentCandle.low <= stopPrice) ||
                                    (!isLong && currentCandle.high >= stopPrice);
                            }
                            
                            // Set exit price to the stop price if triggered
                            if (stopLossTriggered) {
                                exitPrice = stopPrice;
                            }
                            
                            // Check for stop loss exit
                            if (stopLossTriggered) {
                                isExited = true;
                                exitCandle = currentCandle;
                                exitReason = 'Stop Loss';
                                
                                // Mark the exit on this candle
                                currentCandle.position = 0;
                                currentCandle.exit_reason = exitReason;
                                
                                console.log(`EXIT on ${currentCandle.datetime.toISOString()}: ${exitReason} at ${exitPrice.toFixed(2)}`);
                            }
                            // Check profit target
                            else if ((isLong && currentCandle.high >= targetPrice) || 
                                    (!isLong && currentCandle.low <= targetPrice)) {
                                // Profit target hit
                                isExited = true;
                                exitPrice = targetPrice;
                                exitCandle = currentCandle;
                                exitReason = 'Profit Target';
                                
                                // Mark the exit on this candle
                                currentCandle.position = 0;
                                currentCandle.exit_reason = exitReason;
                                
                                console.log(`EXIT on ${currentCandle.datetime.toISOString()}: Profit Target at ${exitPrice.toFixed(2)}`);
                            }
                        } else {
                            // Position already exited
                            currentCandle.position = 0;
                        }
                    }
                    
                    // If neither condition is met during the day, exit at the last 1-hour candle's close
                    if (!isExited && dayCandles.length > 1) {
                        const lastCandle = dayCandles[dayCandles.length - 1];
                        isExited = true;
                        exitPrice = lastCandle.close;
                        exitCandle = lastCandle;
                        exitReason = 'End of Day';
                        
                        // Mark the exit on the last candle
                        lastCandle.position = 0;
                        lastCandle.exit_reason = exitReason;
                        
                        console.log(`EXIT on ${lastCandle.datetime.toISOString()}: End of Day at ${exitPrice.toFixed(2)}`);
                    }
                    
                    // Calculate P&L
                    if (isExited) {
                        let tradePnl = 0;
                        
                        // Regular P&L calculation
                        if (isLong) { // Long position
                            tradePnl = (exitPrice - entryPrice) * (10000 / entryPrice);
                        } else { // Short position
                            tradePnl = (entryPrice - exitPrice) * (10000 / entryPrice);
                        }
                        
                        // Record the P&L on the exit candle
                        exitCandle.trade_pnl = tradePnl;
                        
                        // Update monthly profit tracking
                        try {
                            if (tradePnl > 0) {
                                // Add to monthly profit
                                monthlyData.profit += tradePnl;
                                monthlyData.winCount += 1;
                                monthlyData.wins += tradePnl;
                            } else {
                                // Track losses against monthly limit
                                if (monthlyProfitLimit && monthlyProfitLimit !== 'off') {
                                    monthlyData.lossLimit += Math.abs(tradePnl);
                                }
                                monthlyData.losses += Math.abs(tradePnl);
                            }
                        } catch (error) {
                            console.error("Error updating monthly tracking:", error);
                        }
                        
                        // Increment trade count for this month
                        monthlyData.trades += 1;
                        
                        // Record the trade
                        yearTrades.push({
                            entryDate: firstCandle.datetime,
                            exitDate: exitCandle.datetime,
                            position: direction,
                            entryPrice: entryPrice,
                            exitPrice: exitPrice,
                            pnl: tradePnl,
                            exitReason: exitReason,
                            stopType: stopType,
                            monthlyProfit: monthlyData.profit,
                            monthlyLossLimit: monthlyData.lossLimit
                        });
                        
                        console.log(`Trade completed: P&L=$${tradePnl.toFixed(2)} | Month Profit: $${monthlyData.profit.toFixed(2)} | Month Losses: $${monthlyData.lossLimit.toFixed(2)}`);
                    }
                }
            });
            
            console.log(`Total trades executed: ${yearTrades.length}`);
        } catch (error) {
            console.error("Error running trading algorithm:", error);
        }
        
        // Calculate trading statistics
        const tradingResults = calculateTradingResults(data, yearTrades);
        
        return { yearTrades, tradingResults };
    }
    
    function calculateTradingResults(data, trades) {
        try {
            // Initial values
            const initialValue = 10000;
            let finalValue = initialValue;
            
            // Add trade P&L to get final value
            trades.forEach(trade => {
                finalValue += trade.pnl;
            });
            
            // Calculate returns
            const strategyReturn = ((finalValue / initialValue) - 1) * 100;
            
            // Calculate buy & hold return for comparison
            const firstPrice = data.length > 0 ? data[0].close : 0;
            const lastPrice = data.length > 0 ? data[data.length - 1].close : 0;
            const buyHoldReturn = firstPrice > 0 ? ((lastPrice / firstPrice) - 1) * 100 : 0;
            
            // Calculate max drawdown
            let peak = initialValue;
            let maxDrawdown = 0;
            let currentValue = initialValue;
            
            // Sort trades by exit date
            const sortedTrades = [...trades].sort((a, b) => a.exitDate - b.exitDate);
            
            sortedTrades.forEach(trade => {
                currentValue += trade.pnl;
                peak = Math.max(peak, currentValue);
                const drawdown = peak > 0 ? ((peak - currentValue) / peak) * 100 : 0;
                maxDrawdown = Math.max(maxDrawdown, drawdown);
            });
            
            // Trade statistics
            const totalTrades = trades.length;
            const winningTrades = trades.filter(t => t.pnl > 0).length;
            const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
            
            const totalProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
            const totalLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
            const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
            
            // Exit reasons
            const stopLossExits = trades.filter(t => t.exitReason === 'Stop Loss').length;
            const profitTargetExits = trades.filter(t => t.exitReason === 'Profit Target').length;
            const dayEndExits = trades.filter(t => t.exitReason === 'End of Day').length;
            
            return {
                initialValue,
                finalValue,
                strategyReturn,
                buyHoldReturn,
                maxDrawdown,
                totalTrades,
                winningTrades,
                winRate,
                profitFactor,
                stopLossExits,
                profitTargetExits,
                dayEndExits
            };
        } catch (error) {
            console.error("Error calculating trading results:", error);
            return {
                initialValue: 10000,
                finalValue: 10000,
                strategyReturn: 0,
                buyHoldReturn: 0,
                maxDrawdown: 0,
                totalTrades: 0,
                winningTrades: 0,
                winRate: 0,
                profitFactor: 0,
                stopLossExits: 0,
                profitTargetExits: 0,
                dayEndExits: 0
            };
        }
    }
    
    function updateCharts(data, trades) {
        try {
            if (data.length === 0) {
                console.error("No data available for charts");
                return;
            }
            
            // Verify Chart.js is available
            if (typeof Chart === 'undefined') {
                console.error("Chart.js library not loaded");
                return;
            }
            
            // Prepare chart data
            const dates = data.map(d => d.datetime);
            const prices = data.map(d => d.close);
            
            // Find trade entry and exit points
            const longEntries = [];
            const longExits = [];
            const shortEntries = [];
            const shortExits = [];
            
            trades.forEach(trade => {
                if (trade.position === 'Long') {
                    // Find the index in data that matches this trade's entry date
                    const entryIndex = data.findIndex(d => d.datetime.getTime() === trade.entryDate.getTime());
                    const exitIndex = data.findIndex(d => d.datetime.getTime() === trade.exitDate.getTime());
                    
                    if (entryIndex !== -1) {
                        longEntries.push({
                            x: trade.entryDate,
                            y: trade.entryPrice
                        });
                    }
                    
                    if (exitIndex !== -1) {
                        longExits.push({
                            x: trade.exitDate,
                            y: trade.exitPrice
                        });
                    }
                } else {
                    // Find the index in data that matches this trade's entry date
                    const entryIndex = data.findIndex(d => d.datetime.getTime() === trade.entryDate.getTime());
                    const exitIndex = data.findIndex(d => d.datetime.getTime() === trade.exitDate.getTime());
                    
                    if (entryIndex !== -1) {
                        shortEntries.push({
                            x: trade.entryDate,
                            y: trade.entryPrice
                        });
                    }
                    
                    if (exitIndex !== -1) {
                        shortExits.push({
                            x: trade.exitDate,
                            y: trade.exitPrice
                        });
                    }
                }
            });
            
            // Calculate performance data for comparison chart
            const firstPrice = data[0].close;
            const strategyData = [{ x: data[0].datetime, y: 0 }]; // Start at 0% return
            
            let currentValue = 10000; // Initial capital
            let lastTradeDate = data[0].datetime;
            
            // Sort trades by exit date
            const sortedTrades = [...trades].sort((a, b) => a.exitDate - b.exitDate);
            
            sortedTrades.forEach(trade => {
                // Add point right before this trade's impact
                strategyData.push({
                    x: trade.exitDate,
                    y: ((currentValue / 10000) - 1) * 100
                });
                
                // Add trade's P&L to current value
                currentValue += trade.pnl;
                
                // Add point after this trade's impact
                strategyData.push({
                    x: trade.exitDate,
                    y: ((currentValue / 10000) - 1) * 100
                });
                
                lastTradeDate = trade.exitDate;
            });
            
            // Add final point at the end of the data
            if (lastTradeDate < data[data.length - 1].datetime) {
                strategyData.push({
                    x: data[data.length - 1].datetime,
                    y: ((currentValue / 10000) - 1) * 100
                });
            }
            
            // Calculate buy & hold performance
            const buyHoldData = data.map(d => ({
                x: d.datetime,
                y: ((d.close / firstPrice) - 1) * 100
            }));
            
            // Find the chart container elements
            const priceChartEl = document.getElementById('price-chart');
            const perfChartEl = document.getElementById('performance-chart');
            
            if (!priceChartEl || !perfChartEl) {
                console.error("Chart canvas elements not found");
                return;
            }
            
            // Create or update price chart
            const priceCtx = priceChartEl.getContext('2d');
            
            if (priceChart) {
                priceChart.destroy();
            }
            
            priceChart = new Chart(priceCtx, {
                type: 'line',
                data: {
                    datasets: [
                        {
                            label: 'SPY Price',
                            data: data.map(d => ({ x: d.datetime, y: d.close })),
                            borderColor: 'black',
                            borderWidth: 1,
                            pointRadius: 0,
                            fill: false
                        },
                        {
                            label: 'Long Entries',
                            data: longEntries,
                            backgroundColor: 'green',
                            borderColor: 'green',
                            pointRadius: 6,
                            pointStyle: 'triangle',
                            showLine: false
                        },
                        {
                            label: 'Short Entries',
                            data: shortEntries,
                            backgroundColor: 'red',
                            borderColor: 'red',
                            pointRadius: 6,
                            pointStyle: 'triangle',
                            rotation: 180,
                            showLine: false
                        },
                        {
                            label: 'Trade Exits',
                            data: [...longExits, ...shortExits],
                            backgroundColor: 'black',
                            borderColor: 'black',
                            pointRadius: 5,
                            pointStyle: 'circle',
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
                                unit: 'month',
                                displayFormats: {
                                    month: 'MMM'
                                }
                            },
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Price ($)'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: `SPY Price with Entry/Exit Points - ${yearSelect ? yearSelect.value : 'Current Year'} (Range: ${rangeRequirement} pts, PT: ${profitTarget} pts)`,
                            font: {
                                size: 16
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    if (context.dataset.label === 'SPY Price') {
                                        return `Price: $${context.parsed.y.toFixed(2)}`;
                                    } else {
                                        return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
                                    }
                                }
                            }
                        }
                    },
                    interaction: {
                        mode: 'nearest',
                        intersect: false
                    }
                }
            });
            
            // Create or update performance comparison chart
            const perfCtx = perfChartEl.getContext('2d');
            
            if (performanceChart) {
                performanceChart.destroy();
            }
            
            performanceChart = new Chart(perfCtx, {
                type: 'line',
                data: {
                    datasets: [
                        {
                            label: 'Strategy',
                            data: strategyData,
                            borderColor: 'green',
                            borderWidth: 2,
                            pointRadius: 0,
                            fill: false
                        },
                        {
                            label: 'Buy & Hold',
                            data: buyHoldData,
                            borderColor: 'blue',
                            borderWidth: 2,
                            pointRadius: 0,
                            fill: false
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
                                unit: 'month',
                                displayFormats: {
                                    month: 'MMM'
                                }
                            },
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Returns (%)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return value.toFixed(1) + '%';
                                }
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: `Performance Comparison - ${yearSelect ? yearSelect.value : 'Current Year'} (Range: ${rangeRequirement} pts, PT: ${profitTarget} pts)`,
                            font: {
                                size: 16
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
                                }
                            }
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false
                    }
                }
            });
        } catch (error) {
            console.error("Error updating charts:", error);
        }
    }
    
    function updateStatistics(results) {
        try {
            // Update DOM elements with statistics
            updateElementText('annual-return-stat', 
                `Strategy: ${results.strategyReturn.toFixed(2)}% (B&H: ${results.buyHoldReturn.toFixed(2)}%)`);
            
            updateElementText('max-drawdown-stat',
                `${results.maxDrawdown.toFixed(2)}%`);
            
            updateElementText('profit-factor-stat',
                `${results.profitFactor.toFixed(2)}`);
            
            updateElementText('win-rate-stat',
                `${results.winRate.toFixed(2)}% (${results.winningTrades}/${results.totalTrades})`);
            
            updateElementText('total-trades-stat',
                `${results.totalTrades} (SL:${results.stopLossExits} PT:${results.profitTargetExits} EOD:${results.dayEndExits})`);
        } catch (error) {
            console.error("Error updating statistics:", error);
        }
    }
    
    // Helper function to update text content safely
    function updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        } else {
            console.log(`Element ${elementId} not found`);
        }
    }
    
    function updateTradesTable(trades) {
        try {
            // Get table body
            const tbody = document.getElementById('trades-body');
            
            if (!tbody) {
                console.error("Trades table body element not found");
                return;
            }
            
            // Clear existing rows
            tbody.innerHTML = '';
            
            // Sort trades by entry date
            const sortedTrades = [...trades].sort((a, b) => a.entryDate - b.entryDate);
            
            // Add a row for each trade
            sortedTrades.forEach(trade => {
                const row = document.createElement('tr');
                
                // Format dates
                const entryDate = formatDateTime(trade.entryDate);
                const exitDate = formatDateTime(trade.exitDate);
                
                // Format prices and P&L
                const entryPrice = trade.entryPrice.toFixed(2);
                const exitPrice = trade.exitPrice.toFixed(2);
                const pnl = trade.pnl.toFixed(2);
                
                // Add class based on P&L
                row.classList.add(trade.pnl >= 0 ? 'trade-win' : 'trade-loss');
                
                // Create cells
                // Format monthly profit for display
                const monthlyProfit = trade.monthlyProfit ? `$${trade.monthlyProfit.toFixed(2)}` : '--';
                
                row.innerHTML = `
                    <td>${entryDate}</td>
                    <td>${exitDate}</td>
                    <td>${trade.position}</td>
                    <td>$${entryPrice}</td>
                    <td>$${exitPrice}</td>
                    <td>$${pnl}</td>
                    <td>${trade.exitReason}</td>
                    <td>${monthlyProfit}</td>
                `;
                
                tbody.appendChild(row);
            });
            
            // If no trades, show a message
            if (trades.length === 0) {
                const row = document.createElement('tr');
                
                // Count number of columns in the header
                const headerCols = document.querySelectorAll('#trades-table thead th').length;
                const colSpan = headerCols || 8; // Default to 8 if we can't determine
                
                row.innerHTML = `<td colspan="${colSpan}" style="text-align: center;">No trades for selected period</td>`;
                tbody.appendChild(row);
            }
        } catch (error) {
            console.error("Error updating trades table:", error);
        }
    }
    
    // Helper function to format date time
    function formatDateTime(date) {
        try {
            return date.toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric'
            });
        } catch (error) {
            console.error("Error formatting date:", error, date);
            return "Invalid Date";
        }
    }
    
    // Function to show/hide ATR-related controls based on selected exit strategy
    function updateExitStrategyControls() {
        try {
            const exitStrategySelect = document.getElementById('exit-strategy');
            if (!exitStrategySelect) return;
            
            exitStrategy = exitStrategySelect.value;
            console.log(`Exit strategy changed to: ${exitStrategy}`);
            
            // Get all ATR-specific controls
            const atrControls = document.querySelectorAll('.atr-controls');
            
            // Show or hide based on selected strategy
            if (exitStrategy === 'atr') {
                atrControls.forEach(element => {
                    element.style.display = 'block';
                });
            } else {
                atrControls.forEach(element => {
                    element.style.display = 'none';
                });
            }
        } catch (error) {
            console.error("Error updating exit strategy controls:", error);
        }
    }
    
    // Function to update the monthly analytics tab
    function updateMonthlyAnalytics() {
        try {
            const selectedYear = parseInt(yearSelect.value);
            if (isNaN(selectedYear) || !monthlyProfits[selectedYear]) {
                console.log("No monthly data available");
                return;
            }
            
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            
            // Process monthly data
            const monthlyData = [];
            let bestMonth = { month: '', profit: -Infinity };
            let worstMonth = { month: '', profit: Infinity };
            let mostActiveMonth = { month: '', trades: 0 };
            let totalMonthlyReturns = 0;
            let profitableMonths = 0;
            
            // Collect monthly data
            for (let month = 0; month < 12; month++) {
                if (monthlyProfits[selectedYear][month]) {
                    const data = monthlyProfits[selectedYear][month];
                    const monthName = monthNames[month];
                    const monthYear = `${monthName} ${selectedYear}`;
                    
                    // Calculate win rate
                    const totalTrades = data.trades || 0;
                    const winRate = data.winCount ? ((data.winCount / totalTrades) * 100).toFixed(1) : 0;
                    
                    // Calculate profit factor
                    const profitFactor = data.losses && data.losses > 0 ? (data.wins / data.losses).toFixed(2) : 
                                        data.wins > 0 ? 'Inf' : 0;
                    
                    // Push monthly data
                    monthlyData.push({
                        month: monthName,
                        monthYear,
                        trades: totalTrades,
                        profit: data.profit || 0,
                        winRate: winRate,
                        profitFactor: profitFactor
                    });
                    
                    // Track best and worst months
                    if (data.profit > bestMonth.profit) {
                        bestMonth = { month: monthYear, profit: data.profit };
                    }
                    if (data.profit < worstMonth.profit && totalTrades > 0) {
                        worstMonth = { month: monthYear, profit: data.profit };
                    }
                    
                    // Track most active month
                    if (totalTrades > mostActiveMonth.trades) {
                        mostActiveMonth = { month: monthYear, trades: totalTrades };
                    }
                    
                    // Track metrics for average calculation
                    if (totalTrades > 0) {
                        totalMonthlyReturns += data.profit;
                        if (data.profit > 0) profitableMonths++;
                    }
                } else {
                    // Add empty data for months with no trades
                    monthlyData.push({
                        month: monthNames[month],
                        monthYear: `${monthNames[month]} ${selectedYear}`,
                        trades: 0,
                        profit: 0,
                        winRate: 0,
                        profitFactor: 0
                    });
                }
            }
            
            // Calculate average monthly return and consistency
            const activeMonths = monthlyData.filter(m => m.trades > 0).length;
            const avgMonthlyReturn = activeMonths > 0 ? totalMonthlyReturns / activeMonths : 0;
            const monthlyConsistency = activeMonths > 0 ? (profitableMonths / activeMonths) * 100 : 0;
            
            // Update the monthly analytics stats
            updateElementText('best-month-stat', bestMonth.profit !== -Infinity ? 
                `${bestMonth.month}: $${bestMonth.profit.toFixed(2)}` : '--');
                
            updateElementText('worst-month-stat', worstMonth.profit !== Infinity ? 
                `${worstMonth.month}: $${worstMonth.profit.toFixed(2)}` : '--');
                
            updateElementText('avg-monthly-return-stat', activeMonths > 0 ? 
                `$${avgMonthlyReturn.toFixed(2)}` : '--');
                
            updateElementText('monthly-consistency-stat', activeMonths > 0 ? 
                `${monthlyConsistency.toFixed(1)}% of months profitable` : '--');
                
            updateElementText('most-active-month-stat', mostActiveMonth.trades > 0 ? 
                `${mostActiveMonth.month}: ${mostActiveMonth.trades} trades` : '--');
            
            // Update monthly breakdown table
            updateMonthlyTable(monthlyData);
            
            // Update monthly performance chart
            updateMonthlyChart(monthlyData);
            
        } catch (error) {
            console.error("Error updating monthly analytics:", error);
        }
    }
    
    // Update the monthly breakdown table
    function updateMonthlyTable(monthlyData) {
        try {
            const tbody = document.getElementById('monthly-body');
            if (!tbody) return;
            
            // Clear existing rows
            tbody.innerHTML = '';
            
            // Add a row for each month
            monthlyData.forEach(data => {
                const row = document.createElement('tr');
                
                // Format profit with colors
                const profitClass = data.profit > 0 ? 'positive-pnl' : 
                                   data.profit < 0 ? 'negative-pnl' : '';
                
                row.innerHTML = `
                    <td>${data.month}</td>
                    <td>${data.trades}</td>
                    <td>${data.winRate}%</td>
                    <td class="${profitClass}">$${data.profit.toFixed(2)}</td>
                    <td>${data.profitFactor}</td>
                `;
                
                tbody.appendChild(row);
            });
        } catch (error) {
            console.error("Error updating monthly table:", error);
        }
    }
    
    // Update the monthly performance chart
    function updateMonthlyChart(monthlyData) {
        try {
            const chartCanvas = document.getElementById('monthly-performance-chart');
            if (!chartCanvas) return;
            
            // Prepare chart data
            const months = monthlyData.map(d => d.month);
            const profits = monthlyData.map(d => d.profit);
            const trades = monthlyData.map(d => d.trades);
            
            // Define chart colors
            const profitColors = profits.map(p => p >= 0 ? 'rgba(39, 174, 96, 0.7)' : 'rgba(231, 76, 60, 0.7)');
            
            // Check if chart instance exists and destroy if it does
            if (window.monthlyChart instanceof Chart) {
                window.monthlyChart.destroy();
            }
            
            // Create new chart instance
            window.monthlyChart = new Chart(chartCanvas, {
                type: 'bar',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: 'Monthly P&L',
                            data: profits,
                            backgroundColor: profitColors,
                            borderColor: profitColors.map(c => c.replace('0.7', '1')),
                            borderWidth: 1,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Trades',
                            data: trades,
                            type: 'line',
                            borderColor: 'rgba(52, 152, 219, 1)',
                            backgroundColor: 'rgba(52, 152, 219, 0.2)',
                            borderWidth: 2,
                            pointRadius: 4,
                            fill: false,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: `Monthly Performance Analysis - ${yearSelect ? yearSelect.value : 'Current Year'}`,
                            font: {
                                size: 16
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    if (label === 'Monthly P&L') {
                                        return `P&L: $${context.parsed.y.toFixed(2)}`;
                                    } else {
                                        return `Trades: ${context.parsed.y}`;
                                    }
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Month'
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'P&L ($)'
                            },
                            grid: {
                                drawOnChartArea: false
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Number of Trades'
                            },
                            min: 0,
                            grid: {
                                drawOnChartArea: false
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error("Error updating monthly chart:", error);
        }
    }
});