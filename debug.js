// deno-lint-ignore-file no-window
// Trading App Debug Helper
console.log("Debug script initialized");

// Execute when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Debug: DOM loaded");
    
    // Create a debug panel
    document.querySelector('body').insertAdjacentHTML('afterbegin', 
        '<div style="background:rgba(255,255,0,0.8); padding:10px; position:fixed; top:0; right:0; z-index:9999; width:400px; font-family:monospace; font-size:12px;">' +
        '<h3>Trading Debug Panel</h3>' +
        '<div>' +
        '<button id="debug-check-trades">Check Trades</button> ' +
        '<button id="debug-market-hours">Test Market Hours</button> ' +
        '<button id="debug-inspect-data">Inspect Data</button>' +
        '</div>' +
        '<div style="margin-top:5px; display:flex; align-items:center;">' +
        '<label for="debug-mode-toggle" style="margin-right:10px;">Debug Mode:</label>' +
        '<input type="checkbox" id="debug-mode-toggle" ' + (window.MARKET_HOURS_DEBUG_MODE ? 'checked' : '') + '>' +
        '<span style="margin-left:5px;">Toggle market hours debug mode</span>' +
        '</div>' +
        '<div style="margin-top:5px; display:flex; align-items:center;">' +
        '<label for="tolerance-setting" style="margin-right:10px;">Tolerance (min):</label>' +
        '<input type="number" id="tolerance-setting" value="' + (window.MARKET_HOURS_TOLERANCE_MINUTES || 30) + '" min="0" max="120" style="width:60px;">' +
        '<button id="apply-tolerance" style="margin-left:5px;">Apply</button>' +
        '</div>' +
        '<div id="debug-output" style="max-height:300px; overflow:auto; margin-top:10px; background:#fff; padding:5px;"></div>' +
        '</div>'
    );
    
    const debugOutput = document.getElementById('debug-output');
    
    // Utility function to log messages to debug panel
    function log(msg, type = "info") {
        const timestamp = new Date().toLocaleTimeString();
        const typeStyles = {
            info: "color:black",
            success: "color:green; font-weight:bold",
            warning: "color:orange; font-weight:bold",
            error: "color:red; font-weight:bold"
        };
        const style = typeStyles[type] || typeStyles.info;
        
        debugOutput.innerHTML += `<div style="${style}">${timestamp}: ${msg}</div>`;
        debugOutput.scrollTop = debugOutput.scrollHeight;
        
        console.log(`${timestamp}: ${msg}`);
    }
    
    // Add the log function to window for use in other places
    window.debugLog = log;
    
    // Check trades button - examines the trades array
    document.getElementById('debug-check-trades').addEventListener('click', function() {
        log("Checking trades...");
        
        try {
            // Check if application is initialized
            if (!window.appStatus || !window.appStatus.initialized) {
                log("Application not fully initialized. Current status:", "error");
                log(JSON.stringify(window.appStatus || {initialized: false, message: "Status object not found"}), "error");
                log("Please wait for application to initialize or reload the page.", "warning");
                return;
            }
            
            // Check if we can access the trades array from the main script - now globally accessible
            if (typeof window.trades === 'undefined') {
                log("No global trades array found. Make sure the simulation has run.", "error");
                
                // Check if simulation was run
                if (window.appStatus && !window.appStatus.simulationRun) {
                    log("Simulation has not been run yet. Click 'Run Simulation' button first.", "warning");
                }
                return;
            }
            
            log(`Found ${window.trades.length} trades in the global trades array`, "success");
            
            if (window.trades.length === 0) {
                log("No trades have been recorded. The trade recording functionality may still have issues.", "warning");
                
                // Try to examine possible issues
                log("Attempting to debug why no trades were generated...", "info");
                
                // Check for data issues
                if (!window.fullData || window.fullData.length === 0) {
                    log("No data loaded. Check data loading functionality.", "error");
                    return;
                }
                
                // Check for market hours data
                const marketHoursData = window.fullData.filter(d => d.duringMarketHours);
                if (marketHoursData.length === 0) {
                    log("No candles during market hours found in the dataset!", "error");
                    log("This is likely why no trades are being generated.", "error");
                    return;
                }
                
                // Check if market hours verification was run
                log("Market hours constants:", "info");
                log(`Market Open: ${window.marketOpenHour}:${window.marketOpenMinute}`, "info");
                log(`Market Close: ${window.marketCloseHour}:${window.marketCloseMinute}`, "info");
                
                // Encourage running the simulation if needed
                log("Please try running the simulation by clicking the 'Run Simulation' button", "warning");
                log("Then click 'Check Trades' again to see if trades are generated", "warning");
                return;
            }
            
            // Display the first few trades to examine
            log("Sample trade records:", "info");
            window.trades.slice(0, 3).forEach((trade, i) => {
                log(`Trade ${i+1}:`, "info");
                
                // Format timestamps in Eastern Time for better readability
                const entryTimeET = trade.entryDate.toLocaleTimeString('en-US', {
                    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York'
                });
                const exitTimeET = trade.exitDate.toLocaleTimeString('en-US', {
                    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York'
                });
                
                log(`- Entry: ${entryTimeET} ET (${trade.entryDate.toISOString()})`, "info");
                log(`- Exit: ${exitTimeET} ET (${trade.exitDate.toISOString()})`, "info");
                log(`- Position: ${trade.position}`, "info");
                log(`- P&L: $${trade.pnl.toFixed(2)}`, trade.pnl >= 0 ? "success" : "warning");
                log(`- Exit Reason: ${trade.exitReason}`, "info");
                log("------------------------", "info");
            });
            
            // Check if any trades have the market open candle date
            const tradesWithMarketOpenDate = window.trades.filter(t => {
                const hours = t.entryDate.getHours();
                const minutes = t.entryDate.getMinutes();
                
                // Check if trade entry is at/after market open time
                return (hours > window.marketOpenHour || 
                       (hours === window.marketOpenHour && minutes >= window.marketOpenMinute)) &&
                       (hours < window.marketCloseHour || 
                       (hours === window.marketCloseHour && minutes < window.marketCloseMinute));
            });
            
            // Specifically look for trades right at market open
            const tradesAtMarketOpen = window.trades.filter(t => {
                const hours = t.entryDate.getHours();
                const minutes = t.entryDate.getMinutes();
                return hours === window.marketOpenHour && minutes === window.marketOpenMinute;
            });
            
            log(`Trades during market hours: ${tradesWithMarketOpenDate.length}/${window.trades.length}`, "info");
            log(`Trades exactly at market open (${window.marketOpenHour}:${window.marketOpenMinute}): ${tradesAtMarketOpen.length}`, "info");
            
            if (tradesWithMarketOpenDate.length === window.trades.length) {
                log("✅ All trades are during market hours! Market hours filtering is working correctly.", "success");
            } else if (tradesWithMarketOpenDate.length > 0 && tradesWithMarketOpenDate.length < window.trades.length) {
                log(`⚠️ ${window.trades.length - tradesWithMarketOpenDate.length} trades are outside market hours!`, "warning");
                log("Market hours filtering may not be working correctly.", "warning");
            } else if (tradesWithMarketOpenDate.length === 0 && window.trades.length > 0) {
                log("❌ NO trades are during market hours! Market hours filtering is NOT working.", "error");
            }
            
            // Analyze trade distribution by hour
            const tradesByHour = {};
            window.trades.forEach(trade => {
                const hour = trade.entryDate.getHours();
                tradesByHour[hour] = (tradesByHour[hour] || 0) + 1;
            });
            
            log("Trade distribution by hour:", "info");
            Object.keys(tradesByHour).sort((a, b) => a - b).forEach(hour => {
                log(`Hour ${hour}: ${tradesByHour[hour]} trades`, "info");
            });
            
        } catch (error) {
            log(`Error checking trades: ${error.message}`, "error");
            console.error(error);
        }
    });
    
    // Test market hours function
    document.getElementById('debug-market-hours').addEventListener('click', function() {
        log("Testing market hours detection...");
        
        try {
            // Check if application is initialized
            if (!window.appStatus || !window.appStatus.initialized) {
                log("Application not fully initialized. Current status:", "error");
                log(JSON.stringify(window.appStatus || {initialized: false, message: "Status object not found"}), "error");
                log("Please wait for application to initialize or reload the page.", "warning");
            }
            
            // Check if relevant variables and functions are defined - now globally accessible
            if (typeof window.marketOpenHour === 'undefined' || typeof window.marketOpenMinute === 'undefined') {
                log("Market hours variables not found. Make sure the simulation has initialized.", "error");
                return;
            }
            
            // Log current market hours settings
            log("Current market hours settings:", "info");
            log(`Market Open: ${window.marketOpenHour}:${window.marketOpenMinute < 10 ? '0' + window.marketOpenMinute : window.marketOpenMinute} ET`, "info");
            log(`Market Close: ${window.marketCloseHour}:${window.marketCloseMinute < 10 ? '0' + window.marketCloseMinute : window.marketCloseMinute} ET`, "info");
            
            // Create test times to check - explicitly set to Eastern Time
            const testTimes = [
                new Date("2023-01-01T09:29:00-05:00"), // Before market open
                new Date("2023-01-01T09:30:00-05:00"), // Exactly at market open
                new Date("2023-01-01T09:45:00-05:00"), // During trading hours
                new Date("2023-01-01T12:00:00-05:00"), // Midday
                new Date("2023-01-01T15:55:00-05:00"), // Near close
                new Date("2023-01-01T16:00:00-05:00"), // At market close
                new Date("2023-01-01T16:05:00-05:00")  // After market close
            ];
            
            // Test global isDuringMarketHours function
            if (typeof window.isDuringMarketHours === 'function') {
                log("Testing isDuringMarketHours function with various times:", "info");
                
                // Create results table
                let tableHtml = `
                    <table class="debug-table" style="width:100%; margin-top:10px; border-collapse:collapse;">
                        <tr>
                            <th style="border:1px solid #ddd; padding:8px;">Time (ET)</th>
                            <th style="border:1px solid #ddd; padding:8px;">Hours:Minutes</th>
                            <th style="border:1px solid #ddd; padding:8px;">Expected</th>
                            <th style="border:1px solid #ddd; padding:8px;">Result</th>
                            <th style="border:1px solid #ddd; padding:8px;">Status</th>
                        </tr>
                `;
                
                // Expected results based on market hours 9:30 AM - 4:00 PM ET
                const expectedResults = [
                    false, // 9:29 AM - before market open
                    true,  // 9:30 AM - at market open (should be included)
                    true,  // 9:45 AM - during market hours
                    true,  // 12:00 PM - during market hours
                    true,  // 3:55 PM - during market hours
                    false, // 4:00 PM - at market close (should be excluded)
                    false  // 4:05 PM - after market close
                ];
                
                // Run the tests
                const testResults = testTimes.map((time, i) => {
                    const expected = expectedResults[i];
                    const result = window.isDuringMarketHours(time);
                    
                    // Format time for display
                    const timeStr = time.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'America/New_York',
                        hour12: false
                    });
                    
                    // Log result
                    log(`Time: ${timeStr} ET - During market hours: ${result}`, 
                        result === expected ? "success" : "error");
                    
                    // Add to results table
                    const hours = time.getHours();
                    const minutes = time.getMinutes();
                    
                    tableHtml += `
                        <tr>
                            <td style="border:1px solid #ddd; padding:8px;">${timeStr}</td>
                            <td style="border:1px solid #ddd; padding:8px;">${hours}:${minutes < 10 ? '0' + minutes : minutes}</td>
                            <td style="border:1px solid #ddd; padding:8px;">${expected ? 'Yes' : 'No'}</td>
                            <td style="border:1px solid #ddd; padding:8px;">${result ? 'Yes' : 'No'}</td>
                            <td style="border:1px solid #ddd; padding:8px; ${result === expected ? 'color:green' : 'color:red'}">${result === expected ? '✅ Correct' : '❌ Wrong'}</td>
                        </tr>
                    `;
                    
                    return { time, expected, result, correct: result === expected };
                });
                
                tableHtml += `</table>`;
                
                // Count correct results
                const correctResults = testResults.filter(r => r.correct).length;
                
                // Add results summary at end of table
                tableHtml += `
                    <div style="margin-top:10px; font-weight:bold; ${correctResults === testResults.length ? 'color:green' : 'color:red'}">
                        Result: ${correctResults}/${testResults.length} tests passed
                    </div>
                `;
                
                // Add the table to the debug output
                log(tableHtml, correctResults === testResults.length ? "success" : "error");
                
                if (correctResults === testResults.length) {
                    log("✅ Market hours detection is working correctly!", "success");
                } else {
                    log("❌ Market hours detection has issues! Check the results above.", "error");
                }
            } else {
                log("isDuringMarketHours function not found", "error");
            }
            
            // Test market open candle finder - globally accessible
            if (typeof window.findMarketOpenCandle === 'function') {
                log("Testing findMarketOpenCandle function...", "info");
                
                // Create a test array of candles
                const testCandles = testTimes.map(time => ({
                    datetime: time,
                    open: 100,
                    high: 101,
                    low: 99,
                    close: 100.5,
                    duringMarketHours: window.isDuringMarketHours(time) // Pre-compute this flag
                }));
                
                // Print sample candles
                log("Test candles:", "info");
                testCandles.forEach((candle, i) => {
                    const timeStr = candle.datetime.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'America/New_York',
                        hour12: false
                    });
                    log(`Candle ${i+1}: ${timeStr} ET (during market hours: ${candle.duringMarketHours ? 'Yes' : 'No'})`, "info");
                });
                
                const marketOpenCandle = window.findMarketOpenCandle(testCandles);
                
                if (marketOpenCandle) {
                    const timeStr = marketOpenCandle.datetime.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'America/New_York',
                        hour12: false
                    });
                    
                    // Check if this is the expected candle (9:30 AM ET)
                    const hours = marketOpenCandle.datetime.getHours();
                    const minutes = marketOpenCandle.datetime.getMinutes();
                    const isAtMarketOpen = hours === window.marketOpenHour && minutes === window.marketOpenMinute;
                    
                    log(`Market open candle found at: ${timeStr} ET`, isAtMarketOpen ? "success" : "warning");
                    
                    if (isAtMarketOpen) {
                        log("✅ findMarketOpenCandle correctly identified the 9:30 AM ET candle", "success");
                    } else {
                        log(`⚠️ findMarketOpenCandle returned a candle at ${timeStr} ET instead of 9:30 AM ET`, "warning");
                    }
                } else {
                    log("❌ No market open candle found", "error");
                }
            } else {
                log("findMarketOpenCandle function not found", "error");
            }
            
            // If we have real data, test with that too
            if (window.fullData && window.fullData.length > 0) {
                log("Testing with actual data from dataset...", "info");
                
                // Get first day of data
                const firstDate = window.fullData[0].date.toISOString().split('T')[0];
                const firstDayCandles = window.fullData.filter(d => 
                    d.date.toISOString().split('T')[0] === firstDate);
                
                log(`Found ${firstDayCandles.length} candles for ${firstDate}`, "info");
                
                // Count candles during market hours
                const marketHoursCandles = firstDayCandles.filter(c => window.isDuringMarketHours(c.datetime));
                log(`Candles during market hours: ${marketHoursCandles.length}/${firstDayCandles.length}`, "info");
                
                // Try to find market open candle
                const actualMarketOpenCandle = window.findMarketOpenCandle(firstDayCandles);
                
                if (actualMarketOpenCandle) {
                    const timeStr = actualMarketOpenCandle.datetime.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'America/New_York',
                        hour12: false
                    });
                    
                    log(`Actual market open candle found at: ${timeStr} ET`, "success");
                } else {
                    log("❌ No market open candle found in actual data", "error");
                }
            }
            
        } catch (error) {
            log(`Error testing market hours: ${error.message}`, "error");
            console.error(error);
        }
    });
    
    // Inspect data button
    document.getElementById('debug-inspect-data').addEventListener('click', function() {
        log("Inspecting data...");
        
        // Add a direct check of specific timepoints
        log("DIRECT MARKET HOURS CHECK TEST", "info");
        
        // Create test dates at specific hours
        const testTimes = [
            {hour: 9, minute: 0},   // 9:00 - before market open
            {hour: 9, minute: 29},  // 9:29 - before market open
            {hour: 9, minute: 30},  // 9:30 - market open
            {hour: 9, minute: 31},  // 9:31 - after market open
            {hour: 10, minute: 0},  // 10:00 - during market hours
            {hour: 12, minute: 0},  // 12:00 - during market hours
            {hour: 15, minute: 59}, // 15:59 - during market hours
            {hour: 16, minute: 0},  // 16:00 - market close (outside)
            {hour: 16, minute: 1}   // 16:01 - after market close
        ];
        
        // Create test date objects
        const testDate = new Date(2023, 0, 1); // January 1, 2023
        const testDateObj = [];
        
        testTimes.forEach(time => {
            const date = new Date(testDate);
            date.setHours(time.hour, time.minute);
            testDateObj.push(date);
        });
        
        // Direct check using JS comparison
        log("Testing with simple direct comparison:", "info");
        testDateObj.forEach((date, i) => {
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const isMarketHours = (hours === 9 && minutes >= 30) || (hours > 9 && hours < 16);
            
            // Format time
            const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            
            log(`${timeStr} - Market hours: ${isMarketHours ? 'YES ✅' : 'NO ❌'}`, isMarketHours ? "success" : "warning");
        });
        
        // Check using the app's function
        if (typeof isDuringMarketHours === 'function') {
            log("\nTesting with isDuringMarketHours function:", "info");
            testDateObj.forEach((date, i) => {
                const result = isDuringMarketHours(date);
                const hours = date.getHours();
                const minutes = date.getMinutes();
                
                // Format time
                const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                
                log(`${timeStr} - isDuringMarketHours: ${result ? 'YES ✅' : 'NO ❌'}`, result ? "success" : "warning");
            });
        }
        
        log("Inspecting data...");
        
        try {
            // Check if we can access the fullData array
            if (typeof fullData === 'undefined') {
                log("No global fullData array found. Make sure the simulation has run.", "error");
                return;
            }
            
            log(`Found ${fullData.length} data points in the fullData array`, "success");
            
            if (fullData.length === 0) {
                log("Data array is empty. Check data loading functionality.", "error");
                return;
            }
            
            // Examine the time range of the data
            const firstDate = fullData[0].datetime;
            const lastDate = fullData[fullData.length - 1].datetime;
            
            log(`Data time range: ${firstDate.toISOString()} to ${lastDate.toISOString()}`, "info");
            
            // Verify some data points
            const sampleData = fullData.slice(0, 3);
            log("Sample data points:", "info");
            sampleData.forEach((data, i) => {
                log(`Data point ${i+1}:`, "info");
                log(`- Datetime: ${data.datetime.toISOString()}`, "info");
                log(`- OHLC: ${data.open.toFixed(2)}, ${data.high.toFixed(2)}, ${data.low.toFixed(2)}, ${data.close.toFixed(2)}`, "info");
                log(`- Volume: ${data.volume}`, "info");
                if (data.rsi !== undefined) {
                    log(`- RSI: ${data.rsi.toFixed(2)}`, "info");
                }
                log("------------------------", "info");
            });
            
            // Verify data during market hours for a sample day
            const sampleDateStr = fullData[0].date.toISOString().split('T')[0];
            log(`Checking candles for sample date: ${sampleDateStr}`, "info");
            
            const sampleDayCandles = fullData.filter(d => {
                return d.date.toISOString().split('T')[0] === sampleDateStr;
            });
            
            log(`Found ${sampleDayCandles.length} candles for this day`, "info");
            
            // Filter to market hours
            if (typeof isDuringMarketHours === 'function') {
                const marketHoursCandles = sampleDayCandles.filter(candle => isDuringMarketHours(candle.datetime));
                log(`Candles during market hours: ${marketHoursCandles.length}`, "info");
                
                // Find market open candle
                if (typeof findMarketOpenCandle === 'function') {
                    const marketOpenCandle = findMarketOpenCandle(sampleDayCandles);
                    
                    if (marketOpenCandle) {
                        const timeStr = marketOpenCandle.datetime.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'America/New_York',
                            hour12: false
                        });
                        
                        log(`Market open candle for this day found at: ${timeStr} ET`, "success");
                    } else {
                        log("No market open candle found for this day", "error");
                    }
                }
            }
            
        } catch (error) {
            log(`Error inspecting data: ${error.message}`, "error");
            console.error(error);
        }
    });
    
    // Helper function to format date time (ensure consistent with main app)
    function formatDateTime(date) {
        try {
            // Convert to Eastern Time with 24-hour format
            const options = {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/New_York', // Eastern Time
                hour12: false // Use 24-hour format (military time)
            };
            return date.toLocaleString('en-US', options) + ' ET';
        } catch (error) {
            console.error("Error formatting date:", error, date);
            return "Invalid Date";
        }
    }
    
    // Toggle market hours debug mode
    document.getElementById('debug-mode-toggle').addEventListener('change', function() {
        const isDebugModeOn = this.checked;
        window.MARKET_HOURS_DEBUG_MODE = isDebugModeOn;
        
        log(`Market hours debug mode ${isDebugModeOn ? 'enabled' : 'disabled'}`, isDebugModeOn ? "warning" : "success");
        
        if (isDebugModeOn) {
            log("Debug mode will consider all candles regardless of time as valid market hours data", "warning");
            
            // Update all candles if debug mode is enabled
            if (window.fullData && window.fullData.length > 0) {
                const updatedCount = window.fullData.filter(candle => !candle.duringMarketHours).length;
                
                window.fullData.forEach(candle => {
                    // In debug mode, all candles are considered during market hours
                    candle.duringMarketHours = true;
                    candle.marketHoursReason = candle.marketHoursReason || "DEBUG_MODE";
                });
                
                log(`Updated ${updatedCount} candles to be considered during market hours`, "info");
                log("Re-run the simulation to see the effect of this change", "info");
            }
        } else {
            log("Strict market hours mode will only use candles between 9:30 AM - 4:00 PM ET", "info");
            log("Re-run the simulation to see the effect of this change", "info");
        }
    });
    
    // Apply tolerance setting
    document.getElementById('apply-tolerance').addEventListener('click', function() {
        const toleranceInput = document.getElementById('tolerance-setting');
        const newTolerance = parseInt(toleranceInput.value, 10);
        
        if (isNaN(newTolerance) || newTolerance < 0 || newTolerance > 120) {
            log("Invalid tolerance value. Please enter a number between 0 and 120 minutes.", "error");
            return;
        }
        
        const oldTolerance = window.MARKET_HOURS_TOLERANCE_MINUTES;
        window.MARKET_HOURS_TOLERANCE_MINUTES = newTolerance;
        
        log(`Market hours tolerance updated from ${oldTolerance} to ${newTolerance} minutes`, "success");
        log("Re-run the simulation to see the effect of this change", "info");
    });
    
    log("Debug panel ready. Use buttons above to analyze trading functionality.", "success");
});

// Check if libraries are loaded
window.addEventListener('load', function() {
    console.log("Debug: Window loaded");
    setTimeout(function() {
        console.log("Debug: Libraries loaded check");
        console.log("Papa Parse loaded:", typeof Papa !== 'undefined');
        console.log("Chart.js loaded:", typeof Chart !== 'undefined');
        console.log("Luxon loaded:", typeof luxon !== 'undefined');
        
        // Check if our debug panel is working
        if (typeof window.debugLog === 'function') {
            window.debugLog("All libraries loaded successfully", "success");
        }
    }, 1000);
});