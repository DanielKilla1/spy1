// Create a debug.js file to diagnose loading issues
console.log("Debug script initialized");

// Execute when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Debug: DOM loaded");
    
    // Add event listener to manually attempt data loading
    document.querySelector('body').insertAdjacentHTML('afterbegin', 
        '<div style="background:yellow; padding:10px; position:fixed; top:0; left:0; z-index:9999;">' +
        '<button id="debug-load">Debug Load</button>' +
        '<div id="debug-output" style="max-height:200px; overflow:auto;"></div>' +
        '</div>'
    );
    
    document.getElementById('debug-load').addEventListener('click', async function() {
        const debugOutput = document.getElementById('debug-output');
        
        // Append debug message
        function log(msg) {
            const timestamp = new Date().toLocaleTimeString();
            debugOutput.innerHTML += `<div>${timestamp}: ${msg}</div>`;
            console.log(`${timestamp}: ${msg}`);
        }
        
        log("Starting debug data load");
        
        try {
            // Try to load the data file
            log("Fetching SPY data file...");
            const response = await fetch('SPY_full_1hour_adjsplit.txt');
            
            if (!response.ok) {
                log(`Error: Server returned ${response.status} ${response.statusText}`);
                return;
            }
            
            log("File fetch successful, reading text...");
            const dataText = await response.text();
            log(`Received ${dataText.length} bytes of data`);
            
            // Log sample of data
            log(`Data sample: ${dataText.substring(0, 100)}...`);
            
            // Check if Papa Parse is loaded
            if (typeof Papa === 'undefined') {
                log("Error: Papa Parse library not loaded!");
                return;
            }
            
            log("Parsing CSV data...");
            Papa.parse(dataText, {
                header: false,
                dynamicTyping: true,
                skipEmptyLines: true,
                delimiter: ",",
                complete: function(results) {
                    log(`CSV parsing complete: Found ${results.data.length} rows`);
                    
                    if (results.errors && results.errors.length > 0) {
                        log(`CSV parsing errors: ${JSON.stringify(results.errors)}`);
                        return;
                    }
                    
                    if (results.data.length === 0) {
                        log("Error: No data rows found");
                        return;
                    }
                    
                    log(`Sample data row: ${JSON.stringify(results.data[0])}`);
                    
                    // Try to process the first row
                    try {
                        const sampleRow = results.data[0];
                        const processed = {
                            datetime: new Date(sampleRow[0]),
                            open: parseFloat(sampleRow[1]),
                            high: parseFloat(sampleRow[2]),
                            low: parseFloat(sampleRow[3]),
                            close: parseFloat(sampleRow[4]),
                            volume: parseInt(sampleRow[5]),
                            date: new Date(new Date(sampleRow[0]).setHours(0, 0, 0, 0)),
                            time: sampleRow[0].split(' ')[1].substring(0, 5)
                        };
                        log(`Processed row: ${JSON.stringify(processed)}`);
                        log("Data processing succeeded!");
                    } catch (error) {
                        log(`Error processing row: ${error.message}`);
                    }
                },
                error: function(error) {
                    log(`CSV parsing error: ${error}`);
                }
            });
        } catch (error) {
            log(`Error: ${error.message}`);
        }
    });
    
    console.log("Debug setup complete");
});

// Check if libraries are loaded
window.addEventListener('load', function() {
    console.log("Debug: Window loaded");
    setTimeout(function() {
        console.log("Debug: Libraries loaded check");
        console.log("Papa Parse loaded:", typeof Papa !== 'undefined');
        console.log("Chart.js loaded:", typeof Chart !== 'undefined');
        console.log("Luxon loaded:", typeof luxon !== 'undefined');
    }, 1000);
});