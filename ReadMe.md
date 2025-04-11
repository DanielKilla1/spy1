# SPY Trading Simulation

A web-based application for backtesting a specific SPY trading strategy across different years.

## Overview

This application simulates a trading strategy for SPY (S&P 500 ETF) with the following rules:

1. Enter a trade on the first candle of the day if:
   - The candle range (high - low) is at least 2.0 points
   - If close > previous day's close: enter a long position
   - If close < previous day's close: enter a short position

2. Exit conditions:
   - ATR-Based Stop Loss System:
     - Uses Average True Range (ATR) to set dynamic stop losses based on market volatility
     - Configurable ATR multiplier (0.5x to 3.0x) to adjust stop distance
     - Configurable ATR period (5 to 30) for calculating ATR values
     - Monthly Profit Protection ensures you never lose more than a configurable percentage of monthly profits
     - Minimum Risk-Reward filter ensures you only take trades with favorable probability
   - Profit target: Configurable profit target (default: 20 points)
   - End of trading day if neither stop loss nor profit target is hit

## Features

- Year-by-year backtesting using real historical SPY data
- Highly adjustable trading parameters:
  - Range requirement (0 to 3 points)
  - Profit target (0.1 to 30 points with extremely fine-grained options)
  - Advanced ATR-based stop loss system:
    - Adjustable ATR multiplier (0.5x to 3.0x) 
    - Configurable ATR period (5 to 30 periods)
  - Profit Protection System:
    - Monthly profit tracking to prevent losing more than your month's gains
    - Configurable profit protection levels (25%, 50%, 75%, or 100% of monthly profit)
    - Risk-reward minimum requirements (1:1 to 3:1) to ensure favorable trade probability
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
- Stop Loss Options:
  - Fixed (Default): Exit immediately if any following 1-hour candle breaks below the first 1-hour candle's low
  - ATR-Based: Exit when price drops below entry price minus a multiple of the Average True Range
  - Trailing: Initial stop at the first candle's low, then trails upward as price rises
  - Time-Based: Ignores stop loss for specified hours after entry, then uses fixed stop
  - Percentage: Uses a maximum percentage loss for stop (e.g., 1%)
  - Partial Exit: Exits a portion of the position at the first stop, with wider stop for remainder
- OR if profit target is reached intraday (configurable, default 20 points)

#### Short Trade:
- Stop Loss Options:
  - Fixed (Default): Exit immediately if any following 1-hour candle breaks above the first 1-hour candle's high
  - ATR-Based: Exit when price rises above entry price plus a multiple of the Average True Range
  - Trailing: Initial stop at the first candle's high, then trails downward as price falls
  - Time-Based: Ignores stop loss for specified hours after entry, then uses fixed stop
  - Percentage: Uses a maximum percentage loss for stop (e.g., 1%)
  - Partial Exit: Exits a portion of the position at the first stop, with wider stop for remainder
- OR if profit target is reached intraday (configurable, default 20 points)

- If neither condition is met during the day, exit at the last 1-hour candle's close

### Trade Management
- Position Size: $10,000 per trade (not adjusted for price or leverage)
- Maximum Trades per Day: 1
- No compounding or reinvestment of gains

The application exclusively uses real historical data from the SPY_full_1hour_adjsplit.txt file for all calculations and backtests.

## ATR-Based Stop Loss and Profit Protection System

This application features an advanced risk management system designed to preserve capital and protect profits:

### ATR-Based Stop Loss

The Average True Range (ATR) is a volatility indicator that measures the average range of price movement over a specified period. Unlike fixed stop losses that don't account for market conditions, ATR-based stops automatically adjust to current volatility:

- **In high volatility:** Stops are placed further from entry to prevent being stopped out by normal market noise
- **In low volatility:** Stops are placed closer to entry to minimize risk when the market is moving less

You can customize:
- **ATR Multiplier:** Controls how aggressive your stops are (lower = tighter stops, higher = wider stops)
- **ATR Period:** Determines how many periods are used to calculate the ATR (shorter = more responsive to recent volatility, longer = more stable)

### Monthly Profit Protection

One of the most frustrating aspects of trading is making profits all month only to lose them in a few bad trades. The Monthly Profit Protection system prevents this by:

1. Tracking all profits made within each calendar month
2. Limiting the total losses you can take to a percentage of your monthly profits
3. Automatically preventing new trades once you've hit your monthly loss limit

For example, if you've made $5,000 in a month and set the Monthly Profit Protection to 50%, the system will stop taking new trades once you've lost $2,500 (50% of your profits). This ensures you always retain at least 50% of your monthly gains.

### Risk-Reward Filter

Professional traders understand that not all trading setups are equal. The Risk-Reward filter ensures you only take trades where the potential reward justifies the risk:

- **Risk:** Calculated as the dollar amount from entry to your ATR-based stop
- **Reward:** Calculated as the dollar amount from entry to your profit target
- **Risk-Reward Ratio:** The ratio of potential reward to risk

For example, with a 1.5:1 minimum requirement, a trade risking $500 would need a potential reward of at least $750 to be taken.

By combining these three protection systems, this trading application helps preserve capital during drawdowns and protects profits during winning periods, which is critical for long-term success.

## Notes

- The application simulates investing $10,000 in the strategy
- All P&L calculations are based on a fixed position size of $10,000
- Monthly profits and loss limits reset at the start of each calendar month
- The application is designed for educational and research purposes only