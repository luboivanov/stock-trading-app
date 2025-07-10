import csv
import random
from datetime import datetime, timedelta
import argparse

# Default config
CSV_FILE = 'price_data.csv'
DEFAULT_ROWS = 86400
DEFAULT_START = '2025-07-01T10:00:40Z'
DEFAULT_PRICE_MIN = 0.01
DEFAULT_PRICE_MAX = 10.0
DEFAULT_INTERVAL_SEC = 1

def parse_args():
    parser = argparse.ArgumentParser(description='Generate and append stock price data to CSV.')
    parser.add_argument('--rows', type=int, default=DEFAULT_ROWS, help='Number of rows to generate')
    parser.add_argument('--start', type=str, default=DEFAULT_START, help='Start datetime (ISO 8601, UTC, e.g. 2025-01-01T00:00:00Z)')
    parser.add_argument('--min', type=float, default=DEFAULT_PRICE_MIN, help='Minimum price')
    parser.add_argument('--max', type=float, default=DEFAULT_PRICE_MAX, help='Maximum price')
    parser.add_argument('--interval', type=int, default=DEFAULT_INTERVAL_SEC, help='Seconds between rows')
    return parser.parse_args()

def main():
    args = parse_args()
    start_dt = datetime.strptime(args.start, '%Y-%m-%dT%H:%M:%SZ')
    rows = []
    for i in range(args.rows):
        ts = start_dt + timedelta(seconds=i * args.interval)
        #random price generation
        price = round(random.uniform(args.min, args.max), 2)

        #descending price generation
        #price = round((args.max - i/100), 2)

        #ascending price generation
        #price = round((args.min + i/100), 2)

        #flat price generation
        #price = round(args.min, 2)

        rows.append([ts.strftime('%Y-%m-%dT%H:%M:%SZ'), price])
    # Append to CSV
    with open(CSV_FILE, 'a', newline='') as f:
        writer = csv.writer(f)
        writer.writerows(rows)
    print(f'Appended {args.rows} rows to {CSV_FILE}')

if __name__ == '__main__':
    main()
