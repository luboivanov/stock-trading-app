import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface ApiResponse {
  buyTime: string | null;
  sellTime: string | null;
  buyPrice: number | null;
  sellPrice: number | null;
}

const App: React.FC = () => {
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [funds, setFunds] = useState('');
  const [result, setResult] = useState<{
    buyTime: string;
    sellTime: string;
    buyPrice: number;
    sellPrice: number;
    stocksBought: number;
    profit: number;
  } | null>(null);
  const [error, setError] = useState('');

  const handleQuery = async () => {
    setError('');
    setResult(null);

    if (!startTime || !endTime) {
      setError('Please specify both start and end times.');
      return;
    }
    if (startTime >= endTime) {
      setError('Start time must be before end time.');
      return;
    }
    const fundsNum = parseFloat(funds);
    if (isNaN(fundsNum) || fundsNum <= 0) {
      setError('Available funds must be a positive number.');
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/best-trade?start=${encodeURIComponent(startTime.toISOString())}&end=${encodeURIComponent(endTime.toISOString())}`
      );

      if (!response.ok) {
        const errMsg = await response.text();
        throw new Error(errMsg || 'Failed to get data');
      }
      const data: ApiResponse = await response.json();

      if (!data.buyTime || !data.sellTime || data.buyPrice === null || data.sellPrice === null) {
        setError('No profitable trade found for the given time period.');
        return;
      }

      const stocksBought = Math.floor(fundsNum / data.buyPrice);
      if (stocksBought === 0) {
        setError('Insufficient funds to buy any stocks at the buy price.');
        return;
      }
      const profit = stocksBought * (data.sellPrice - data.buyPrice);

      setResult({
        buyTime: data.buyTime,
        sellTime: data.sellTime,
        buyPrice: data.buyPrice,
        sellPrice: data.sellPrice,
        stocksBought,
        profit,
      });
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>Stock Trading Profit Finder</h1>

      <label>
        Start Time:
        <DatePicker
          selected={startTime}
          onChange={date => setStartTime(date)}
          showTimeSelect
          timeFormat="HH:mm:ss"
          timeIntervals={1}
          dateFormat="yyyy-MM-dd HH:mm:ss"
          placeholderText="Select start time"
        />
      </label>

      <label style={{ display: 'block', marginTop: 10 }}>
        End Time:
        <DatePicker
          selected={endTime}
          onChange={date => setEndTime(date)}
          showTimeSelect
          timeFormat="HH:mm:ss"
          timeIntervals={1}
          dateFormat="yyyy-MM-dd HH:mm:ss"
          placeholderText="Select end time"
          minDate={startTime || undefined}
        />
      </label>

      <label style={{ display: 'block', marginTop: 10 }}>
        Available Funds:
        <input
          type="number"
          min="0"
          step="0.01"
          value={funds}
          onChange={e => setFunds(e.target.value)}
          placeholder="e.g. 1000"
        />
      </label>

      <button style={{ marginTop: 20 }} onClick={handleQuery}>
        Find Optimal Trade
      </button>

      {error && <p style={{ color: 'red', marginTop: 20 }}>{error}</p>}

      {result && (
        <div
          style={{
            marginTop: 20,
            border: '1px solid #ccc',
            padding: 10,
            borderRadius: 5,
            backgroundColor: '#f9f9f9',
          }}
        >
          <h2>Result:</h2>
          <p>
            Buy Time: <strong>{result.buyTime}</strong> at price <strong>${result.buyPrice.toFixed(2)}</strong>
          </p>
          <p>
            Sell Time: <strong>{result.sellTime}</strong> at price <strong>${result.sellPrice.toFixed(2)}</strong>
          </p>
          <p>
            Stocks Bought: <strong>{result.stocksBought}</strong>
          </p>
          <p>
            Profit: <strong>${result.profit.toFixed(2)}</strong>
          </p>
        </div>
      )}
    </div>
  );
};

export default App;
