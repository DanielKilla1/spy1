// SPY Trading Simulation
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const yearSelect = document.getElementById('year-select');
    const rangeSelect = document.getElementById('range-select');
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
    
    // Initialize application
    initApp();
    
    async function initApp() {
        try {
            // Show loading indicator
            dataLoading.style.display = 'block';
            
            // Load data
            await loadData();
            
            // Hide loading indicator
            dataLoading.style.display = 'none';
            
            // Set up event listeners
            setupEventListeners();
            
            // Run simulation for most recent year by default
            const latestYear = years[years.length - 1];
            yearSelect.value = latestYear;
            runSimulation();
        } catch (error) {
            console.error('Error initializing app:', error);
            alert('Error loading application data. Please try again later.');
        }
    }
    
    async function loadData() {
        try {
            // Show loading indicator
            loadingBar.value = 10;
            loadingProgress.textContent = '10%';
            
            // Try to fetch the actual SPY data file
            try {
                loadingProgress.textContent = '20%';
                loadingBar.value = 20;
                
                const response = await fetch('SPY_full_1hour_adjsplit.txt');
                
                loadingProgress.textContent = '50%';
                loadingBar.value = 50;
                
                const csvText = await response.text();
                
                loadingProgress.textContent = '70%';
                loadingBar.value = 70;
                
                // Parse the CSV data
                Papa.parse(csvText, {
                    header: false,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    delimiter: ",", // Explicitly set the delimiter to comma
                    complete: function(results) {
                        // Process the data - format matches:
                        // datetime, open, high, low, close, volume
                        // e.g.: 2023-03-23 17:00:00,394.35,394.64,393.17,394.47,576169
                        fullData = results.data.map(row => ({
                            datetime: new Date(row[0]),
                            open: parseFloat(row[1]),
                            high: parseFloat(row[2]),
                            low: parseFloat(row[3]),
                            close: parseFloat(row[4]),
                            volume: parseInt(row[5]),
                            date: new Date(new Date(row[0]).setHours(0, 0, 0, 0)),
                            time: row[0].split(' ')[1].substring(0, 5)
                        }));
                        
                        console.log("Data loaded successfully. Sample:", fullData[0]);
                        
                        loadingProgress.textContent = '90%';
                        loadingBar.value = 90;
                        
                        // Continue with data processing
                        processData();
                        populateYears();
                        
                        loadingProgress.textContent = '100%';
                        loadingBar.value = 100;
                    },
                    error: function(error) {
                        console.error('Error parsing CSV:', error);
                        // Fall back to mock data
                        generateMockData();
                        processData();
                        populateYears();
                    }
                });
            } catch (fileError) {
                console.warn('Could not load SPY data file:', fileError);
                console.log('Falling back to mock data generation');
                
                // If file loading fails, fall back to mock data
                generateMockData();
                
                loadingProgress.textContent = '90%';
                loadingBar.value = 90;
                
                // Process the data
                processData();
                
                // Populate year selection dropdown
                populateYears();
                
                loadingProgress.textContent = '100%';
                loadingBar.value = 100;
            }
            
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }
    
    function generateMockData() {
        // Generate 5 years of mock hourly data (2020-2024)
        const startDate = new Date(2020, 0, 2, 9, 30);
        const endDate = new Date(2024, 11, 31, 16, 0);
        
        let currentDate = new Date(startDate);
        let price = 320; // Starting price for SPY
        
        while (currentDate <= endDate) {
            // Skip weekends
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                currentDate.setDate(currentDate.getDate() + 1);
                continue;
            }
            
            // Only include market hours (9:30 AM - 4:00 PM)
            const hour = currentDate.getHours();
            const minute = currentDate.getMinutes();
            if ((hour < 9 || (hour === 9 && minute < 30)) || hour > 16) {
                // Advance by 1 hour
                currentDate.setHours(currentDate.getHours() + 1);
                continue;
            }
            
            // Generate random price movements
            const randomChange = (Math.random() - 0.5) * 2; // Between -1 and 1
            price += randomChange;
            
            // Sometimes add larger moves for volatility
            if (Math.random() < 0.05) {
                price += (Math.random() - 0.5) * 8;
            }
            
            // Add data point
            const open = price;
            const high = open + Math.random() * 1;
            const low = open - Math.random() * 1;
            const close = low + Math.random() * (high - low);
            const volume = Math.floor(Math.random() * 1000000);
            
            fullData.push({
                datetime: new Date(currentDate),
                open: open,
                high: high,
                low: low,
                close: close,
                volume: volume,
                date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
                time: `${currentDate.getHours()}:${currentDate.getMinutes()}`
            });
            
            // Advance by 1 hour
            currentDate.setHours(currentDate.getHours() + 1);
        }
    }
    
    function processData() {
        // Extract unique years
        years = [...new Set(fullData.map(d => d.datetime.getFullYear()))].sort();
        
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
        
        // Log potential trading opportunities
        let tradingOpportunities = 0;
        
        fullData.forEach(row => {
            if (row.is_first_candle && row.candle_range >= rangeRequirement && row.prev_day_close !== null) {
                // Ensure it's not exactly equal to previous day's close
                if (row.close !== row.prev_day_close) {
                    tradingOpportunities++;
                    console.log(`Potential trade on ${row.datetime.toISOString()}: ` +
                              `Range=${row.candle_range.toFixed(2)}, ` +
                              `Close=${row.close.toFixed(2)}, ` +
                              `PrevClose=${row.prev_day_close.toFixed(2)}, ` +
                              `Direction: ${row.close > row.prev_day_close ? 'Long' : 'Short'}`);
                }
            }
        });
        
        console.log(`Found ${tradingOpportunities} potential trading opportunities across all data`);
    }
    
    function populateYears() {
        // Clear existing options
        yearSelect.innerHTML = '';
        
        // Add an option for each year
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
    }
    
    function setupEventListeners() {
        // Run simulation when button is clicked
        runButton.addEventListener('click', runSimulation);
        
        // Also run when year selection changes
        yearSelect.addEventListener('change', runSimulation);
        
        // Update range requirement when selection changes
        rangeSelect.addEventListener('change', function() {
            rangeRequirement = parseFloat(rangeSelect.value);
            runSimulation();
        });
    }
    
    function runSimulation() {
        const selectedYear = parseInt(yearSelect.value);
        rangeRequirement = parseFloat(rangeSelect.value);
        
        // Filter data for selected year
        const yearData = fullData.filter(d => d.datetime.getFullYear() === selectedYear);
        
        // Run the trading algorithm
        const { yearTrades, tradingResults } = runTradingAlgorithm(yearData);
        
        // Update the UI with results
        updateCharts(yearData, yearTrades);
        updateStatistics(tradingResults);
        updateTradesTable(yearTrades);
    }
    
    function runTradingAlgorithm(data) {
        // Reset trades for this simulation
        const yearTrades = [];
        
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
            
            // Check entry conditions
            if (firstCandle.is_first_candle && 
                firstCandle.candle_range >= rangeRequirement && 
                firstCandle.prev_day_close !== null && 
                firstCandle.close !== firstCandle.prev_day_close) {
                
                // Determine direction
                const isLong = firstCandle.close > firstCandle.prev_day_close;
                const direction = isLong ? 'Long' : 'Short';
                
                console.log(`ENTRY on ${dateStr}: ${direction} at ${firstCandle.close.toFixed(2)}`);
                
                // Set up trade parameters
                const entryPrice = firstCandle.close;
                const stopPrice = isLong ? firstCandle.low : firstCandle.high;
                const targetPrice = isLong ? (entryPrice + 20.0) : (entryPrice - 20.0);
                
                // Mark the entry on first candle
                firstCandle.position = isLong ? 1 : -1;
                firstCandle.entry_price = entryPrice;
                firstCandle.stop_price = stopPrice;
                firstCandle.target_price = targetPrice;
                
                console.log(`Trade details: Entry=${entryPrice.toFixed(2)}, Stop=${stopPrice.toFixed(2)}, Target=${targetPrice.toFixed(2)}`);
                
                // Track if trade has been exited
                let isExited = false;
                let exitPrice = null;
                let exitCandle = null;
                let exitReason = '';
                
                // Process subsequent candles for exit conditions
                for (let i = 1; i < dayCandles.length; i++) {
                    const currentCandle = dayCandles[i];
                    
                    // Continue tracking position until exit
                    if (!isExited) {
                        currentCandle.position = isLong ? 1 : -1;
                        currentCandle.entry_price = entryPrice;
                        currentCandle.stop_price = stopPrice;
                        currentCandle.target_price = targetPrice;
                        
                        // Check stop loss
                        if ((isLong && currentCandle.low <= stopPrice) || 
                            (!isLong && currentCandle.high >= stopPrice)) {
                            // Stop loss hit
                            isExited = true;
                            exitPrice = stopPrice;
                            exitCandle = currentCandle;
                            exitReason = 'Stop Loss';
                            
                            // Mark the exit on this candle
                            currentCandle.position = 0;
                            currentCandle.exit_reason = exitReason;
                            
                            console.log(`EXIT on ${currentCandle.datetime.toISOString()}: Stop Loss at ${exitPrice.toFixed(2)}`);
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
                
                // If trade wasn't exited during the day, exit at the close of the last candle
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
                    
                    if (isLong) { // Long position
                        tradePnl = (exitPrice - entryPrice) * (10000 / entryPrice);
                    } else { // Short position
                        tradePnl = (entryPrice - exitPrice) * (10000 / entryPrice);
                    }
                    
                    // Record the P&L on the exit candle
                    exitCandle.trade_pnl = tradePnl;
                    
                    // Record the trade
                    yearTrades.push({
                        entryDate: firstCandle.datetime,
                        exitDate: exitCandle.datetime,
                        position: direction,
                        entryPrice: entryPrice,
                        exitPrice: exitPrice,
                        pnl: tradePnl,
                        exitReason: exitReason
                    });
                    
                    console.log(`Trade completed: P&L=${tradePnl.toFixed(2)}`);
                }
            }
        });
        
        console.log(`Total trades executed: ${yearTrades.length}`);
        
        // Calculate trading statistics
        const tradingResults = calculateTradingResults(data, yearTrades);
        
        return { yearTrades, tradingResults };
    }
    
    function calculateTradingResults(data, trades) {
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
        const firstPrice = data[0].close;
        const lastPrice = data[data.length - 1].close;
        const buyHoldReturn = ((lastPrice / firstPrice) - 1) * 100;
        
        // Calculate max drawdown
        let peak = initialValue;
        let maxDrawdown = 0;
        let currentValue = initialValue;
        
        // Sort trades by exit date
        const sortedTrades = [...trades].sort((a, b) => a.exitDate - b.exitDate);
        
        sortedTrades.forEach(trade => {
            currentValue += trade.pnl;
            peak = Math.max(peak, currentValue);
            const drawdown = ((peak - currentValue) / peak) * 100;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        });
        
        // Trade statistics
        const totalTrades = trades.length;
        const winningTrades = trades.filter(t => t.pnl > 0).length;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        
        const totalProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
        const totalLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
        const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : Infinity;
        
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
    }
    
    function updateCharts(data, trades) {
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
        
        // Create or update price chart
        const priceCtx = document.getElementById('price-chart').getContext('2d');
        
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
                        text: `SPY Price with Entry/Exit Points - ${yearSelect.value} (Range Req: ${rangeRequirement} pts)`,
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
        const perfCtx = document.getElementById('performance-chart').getContext('2d');
        
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
                        text: `Performance Comparison - ${yearSelect.value} (Range Req: ${rangeRequirement} pts)`,
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
    }
    
    function updateStatistics(results) {
        // Update DOM elements with statistics
        document.getElementById('annual-return-stat').textContent = 
            `Strategy: ${results.strategyReturn.toFixed(2)}% (B&H: ${results.buyHoldReturn.toFixed(2)}%)`;
        
        document.getElementById('max-drawdown-stat').textContent = 
            `${results.maxDrawdown.toFixed(2)}%`;
        
        document.getElementById('profit-factor-stat').textContent = 
            `${results.profitFactor.toFixed(2)}`;
        
        document.getElementById('win-rate-stat').textContent = 
            `${results.winRate.toFixed(2)}% (${results.winningTrades}/${results.totalTrades})`;
        
        document.getElementById('total-trades-stat').textContent = 
            `${results.totalTrades} (SL:${results.stopLossExits} PT:${results.profitTargetExits} EOD:${results.dayEndExits})`;
    }
    
    function updateTradesTable(trades) {
        // Get table body
        const tbody = document.getElementById('trades-body');
        
        // Clear existing rows
        tbody.innerHTML = '';
        
        // Sort trades by entry date
        const sortedTrades = [...trades].sort((a, b) => a.entryDate - b.entryDate);
        
        // Add a row for each trade
        sortedTrades.forEach(trade => {
            const row = document.createElement('tr');
            
            // Format dates
            const entryDate = trade.entryDate.toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric'
            });
            
            const exitDate = trade.exitDate.toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric'
            });
            
            // Format prices and P&L
            const entryPrice = trade.entryPrice.toFixed(2);
            const exitPrice = trade.exitPrice.toFixed(2);
            const pnl = trade.pnl.toFixed(2);
            
            // Add class based on P&L
            row.classList.add(trade.pnl >= 0 ? 'trade-win' : 'trade-loss');
            
            // Create cells
            row.innerHTML = `
                <td>${entryDate}</td>
                <td>${exitDate}</td>
                <td>${trade.position}</td>
                <td>$${entryPrice}</td>
                <td>$${exitPrice}</td>
                <td>$${pnl}</td>
                <td>${trade.exitReason}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        // If no trades, show a message
        if (trades.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align: center;">No trades for selected period</td>';
            tbody.appendChild(row);
        }
    }
});