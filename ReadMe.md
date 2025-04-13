# SPY Trading Simulation

A web-based application for backtesting a specific SPY trading strategy across different years.

## Overview

This application simulates a trading strategy for SPY (S&P 500 ETF) using 5-minute candle data, with the following rules:

### First Trade of the Day (9:30 AM Candle)
1. Enter a trade on the first candle at or after market open (9:30 AM ET) if:
   - The candle range (high - low) is at least the selected range requirement
   - If close > previous day's close: enter a long position
   - If close < previous day's close: enter a short position

2. Exit conditions for first trade:
   - RSI-Based Exit Strategy:
     - Uses Relative Strength Index (RSI) to determine exit points based on overbought/oversold conditions
     - Configurable RSI overbought and oversold levels
     - Configurable RSI period for calculation
   - Default Strategy: Exit when the market open candle's high/low is breached
   - Profit target: Configurable profit target (default: 20 points)
   - Market close (4:00 PM ET) if neither stop loss nor profit target is hit

### Additional Trades (Breakout Strategy)
1. Enter additional trades throughout the day if:
   - For Short: Current bar breaks the low of the previous N bars (configurable) by X points (configurable, default: 0.5 points)
   - For Long: Current bar breaks the high of the previous N bars (configurable) by X points (configurable, default: 0.5 points)

2. Exit conditions for additional trades:
   - For Short: Exit if price breaks the high of the previous two bars
   - For Long: Exit if price breaks the low of the previous two bars
   - Alternate exit: If no stop loss is triggered, exit when price breaks previous bar's high (for shorts) or low (for longs)
   - Profit target: Same as first trade (configurable from 0.1 to 30 points)
   - Market close (4:00 PM ET) if no exit condition is met

## Features

- Year-by-year backtesting using real historical SPY data
- Highly adjustable trading parameters:
  - Range requirement (0 to 3 points)
  - Profit target (0.1 to 30 points with fine-grained options)
  - RSI-based exit parameters:
    - RSI period (7 to 28)
    - Overbought level (65 to 85)
    - Oversold level (15 to 35)
  - Trades per day options (1, 5, 10, or unlimited)
  - Position size options ($100, $1,000, or $10,000)
  - Additional trade parameters:
    - Breakout requirement (0.1 to 1.5 points)
    - Bars lookback (1 to 5 bars)
- Trading strictly during market hours (9:30 AM - 4:00 PM ET)
- Military time (24-hour) format to avoid AM/PM confusion
- Interactive price charts with entry and exit points
- Detailed trading statistics (returns, drawdown, win rate, etc.)
- Trade-by-trade breakdown with P&L information
- Monthly performance analytics

## File Structure

- `index.html`: Main HTML structure
- `styles.css`: CSS styling for the application
- `script.js`: JavaScript code containing the simulation logic and visualization
- `debug.js`: Debugging utilities to help verify application functionality
- `debug.html`: Debug console to test and verify components
- `SPY_full_5min_adjsplit.txt`: Real historical SPY 5-minute candle data file

## How to Run

### Using VS Code Live Server (Recommended for development)

1. Install [Visual Studio Code](https://code.visualstudio.com/)
2. Install the "Live Server" extension by Ritwick Dey
3. Open the project folder in VS Code
4. Right-click on `index.html` and select "Open with Live Server"
5. The application will open in your default browser

### Using a Local Web Server

```bash
# Using Python's built-in server
python -m http.server

# Or with Python 3
python3 -m http.server
```

Then visit `http://localhost:8000` in your browser.

## Debug Mode

To help diagnose and verify functionality, the application includes debugging tools:

1. Open `debug.html` in your browser to access the debug console
2. Use the debugging panel to:
   - Check dependencies and libraries
   - Test data loading functionality
   - Verify market hours filtering works correctly
   - Test trade recording functionality
   - Run a complete integration test

When using the regular application, a debug panel is available in the top-right corner to:
- Check if trades are being correctly recorded
- Test market hours detection
- Inspect data loading

## Trading Strategy Rules

The application implements the following trading strategy:

### First Trade of the Day (9:30 AM Candle)

#### Entry Conditions
The first trade of the day is entered only if all of the following are true:
1. The first candle at or after market open (9:30 AM ET) has a range of at least the selected SPY points (High - Low >= selected range)
2. Long trade → if the market open candle closes above the previous day's close
3. Short trade → if the market open candle closes below the previous day's close
4. No trade is taken if the candle closes exactly equal to the previous day's close

Trade Entry occurs at the close of the market open candle.

#### Exit Conditions for First Trade

**RSI-Based Exit (Optional):**
- For Long Positions: Exit when the RSI reaches the overbought threshold
- For Short Positions: Exit when the RSI reaches the oversold threshold
- Also uses a standard stop loss as a safety measure

**Default Exit Strategy:**
- For Long Positions: Exit if any candle breaks below the market open candle's low
- For Short Positions: Exit if any candle breaks above the market open candle's high
- OR if profit target is reached (configurable, default 20 points)
- OR at market close (4:00 PM ET) if neither condition is met

### Additional Trades (Intraday Breakout Strategy)

If maximum trades per day is set to more than 1, the system will look for additional trading opportunities throughout the day.

#### Entry Conditions for Additional Trades
1. For Short Entry: Current bar breaks the low of the previous N bars (configurable) by at least X points (default: 0.5 points)
2. For Long Entry: Current bar breaks the high of the previous N bars (configurable) by at least X points (default: 0.5 points)

#### Exit Conditions for Additional Trades
1. For Short Positions:
   - Exit if price breaks the high of the previous two bars (stop loss)
   - If no stop loss is triggered, exit when price breaks the previous bar's high
   
2. For Long Positions:
   - Exit if price breaks the low of the previous two bars (stop loss)
   - If no stop loss is triggered, exit when price breaks the previous bar's low

3. Common exit conditions:
   - Exit at profit target (same as first trade)
   - Exit at market close (4:00 PM ET) if no other exit condition is met

### Trade Management
- Position Size: Configurable ($100, $1,000, or $10,000 per trade)
- Maximum Trades Per Day: Configurable (1, 5, 10, or unlimited)
- No compounding or reinvestment of gains
- All P&L calculations are based on the selected position size

The application uses real historical 5-minute SPY data for all calculations and backtests.

## Recent Updates

### Additional Trades Strategy
The application now supports multiple trades per day with a configurable breakout strategy:

- **How it works:** Identifies potential breakout opportunities throughout the trading day
- **For short trades:** Enters when price breaks below the low of previous N bars by X points
- **For long trades:** Enters when price breaks above the high of previous N bars by X points
- **Customizable:** Adjust breakout requirement (0.1-1.5 points) and lookback periods (1-5 bars)
- **Smart exit strategy:** Exits based on previous bars' highs/lows to protect profits

### RSI-Based Exit Strategy
The application now offers an RSI-based exit strategy as an alternative to the default fixed-stop approach:

- **How it works:** Monitors the Relative Strength Index (RSI) to identify potential reversal points
- **For long trades:** Exits when RSI reaches an overbought condition (default: 70)
- **For short trades:** Exits when RSI reaches an oversold condition (default: 30)
- **Customizable:** Adjust RSI period, overbought, and oversold levels to match your trading style

### Market Hours Enforcement
Trades are now strictly limited to regular market hours (9:30 AM - 4:00 PM ET):

- Only candles during market hours are considered for trading
- Entry signals occur at the first candle at or after market open
- All trades are closed by market close (4:00 PM ET)
- Time calculations correctly handle Eastern Time

### Bug Fixes
A critical issue with the market hours filtering was fixed:
- Fixed incorrect variable reference causing trades not to be recorded
- Trade entry dates now correctly reference the market open candle
- Added debugging tools to verify correct functionality
- Fixed maximal trades per day functionality to properly respect limits

## Notes

- The application simulates investing using the selected position size
- All P&L calculations are based on the selected position size per trade
- Times are displayed in 24-hour (military) format for clarity
- The application is designed for educational and research purposes only