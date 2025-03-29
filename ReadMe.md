# SPY Trading Simulation

A web-based application for backtesting a specific SPY trading strategy across different years.

## Overview

This application simulates a trading strategy for SPY (S&P 500 ETF) with the following rules:

1. Enter a trade on the first candle of the day if:
   - The candle range (high - low) is at least 2.0 points
   - If close > previous day's close: enter a long position
   - If close < previous day's close: enter a short position

2. Exit conditions:
   - Stop loss: Low of the entry candle for long positions, high of the entry candle for short positions
   - Profit target: Entry price + 20 points for long positions, entry price - 20 points for short positions
   - End of trading day if neither stop loss nor profit target is hit

## Features

- Year-by-year backtesting
- Interactive price charts with entry and exit points
- Performance comparison between the strategy and buy & hold
- Detailed trading statistics (returns, drawdown, win rate, etc.)
- Trade-by-trade breakdown with P&L information

## File Structure

- `index.html`: Main HTML structure
- `styles.css`: CSS styling for the application
- `script.js`: JavaScript code containing the simulation logic and visualization

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
- Exit immediately if any following 1-hour candle breaks below the first candle's low (stop loss)
- OR if 20 points profit is reached intraday (profit target)

#### Short Trade:
- Exit immediately if any following 1-hour candle breaks above the first candle's high (stop loss)
- OR if 20 points profit is reached intraday (profit target)

- If no stop loss or profit target is hit, exit the trade at the last 1-hour candle of the day

### Trade Management
- Position Size: $10,000 per trade (not adjusted for price or leverage)
- Maximum Trades per Day: 1
- No compounding or reinvestment of gains

The script is configured to read this file and use it for the backtesting calculations. If the data file is missing or in a different format, the application will fall back to using generated mock data.
```

## Notes

- The application simulates investing $10,000 in the strategy
- All P&L calculations are based on a fixed position size of $10,000
- The application is designed for educational and research purposes only