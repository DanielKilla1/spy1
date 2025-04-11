# SPY Trading Simulation

A web-based application for backtesting a specific SPY trading strategy across different years.

## Overview

This application simulates a trading strategy for SPY (S&P 500 ETF) with the following rules:

1. Enter a trade on the first candle of the day if:
   - The candle range (high - low) is at least 2.0 points
   - If close > previous day's close: enter a long position
   - If close < previous day's close: enter a short position

2. Exit conditions:
   - Stop loss: If any following 1-hour candle breaks below the first 1-hour candle's low for long positions, or above the first 1-hour candle's high for short positions
   - Profit target: Configurable profit target (default: 20 points)
   - End of trading day if neither stop loss nor profit target is hit

## Features

- Year-by-year backtesting using real historical SPY data
- Highly adjustable trading parameters:
  - Range requirement (0 to 3 points)
  - Profit target (0.1 to 30 points with extremely fine-grained options)
- Interactive price charts with entry and exit points
- Performance comparison between the strategy and buy & hold
- Detailed trading statistics (returns, drawdown, win rate, etc.)
- Trade-by-trade breakdown with P&L information

## File Structure

- `index.html`: Main HTML structure
- `styles.css`: CSS styling for the application
- `script.js`: JavaScript code containing the simulation logic and visualization
- `SPY_full_1hour_adjsplit.txt`: Real historical SPY 1-hour candle data file

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

### Static Hosting

You can also host this application on any static web hosting service:

1. GitHub Pages
2. Netlify
3. Vercel
4. Amazon S3

Simply upload the three files to your hosting provider.

## Trading Strategy Rules

The application implements the following specific trading strategy:

### Entry Conditions
A trade is entered only if all of the following are true:
1. The first 1-hour candle of the trading day has a range of at least 2.0 SPY points (High - Low >= 2.0)
2. Long trade → if the first 1-hour candle closes above the previous day's close
3. Short trade → if the first 1-hour candle closes below the previous day's close
4. No trade is taken if the first candle closes exactly equal to the previous day's close

Trade Entry occurs at the close of the first 1-hour candle.
Maximum of one trade per day.

### Exit Conditions
Trades are exited according to the following rules:

#### Long Trade:
- Exit immediately if any following 1-hour candle breaks below the first 1-hour candle's low (stop loss)
- OR if profit target is reached intraday (configurable, default 20 points)

#### Short Trade:
- Exit immediately if any following 1-hour candle breaks above the first 1-hour candle's high (stop loss)
- OR if profit target is reached intraday (configurable, default 20 points)

- If neither condition is met during the day, exit at the last 1-hour candle's close

### Trade Management
- Position Size: $10,000 per trade (not adjusted for price or leverage)
- Maximum Trades per Day: 1
- No compounding or reinvestment of gains

The application exclusively uses real historical data from the SPY_full_1hour_adjsplit.txt file for all calculations and backtests.

## Notes

- The application simulates investing $10,000 in the strategy
- All P&L calculations are based on a fixed position size of $10,000
- The application is designed for educational and research purposes only