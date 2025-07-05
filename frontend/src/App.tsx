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
  const [startTimeStr, setStartTimeStr] = useState<string | null>(null);
  const [endTimeStr, setEndTimeStr] = useState<string | null>(null);
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
    // Use the UTC string for API
    if (!startTimeStr || !endTimeStr) {
      setError('Please specify both start and end times.');
      return;
    }
    const startTime = new Date(startTimeStr);
    const endTime = new Date(endTimeStr);
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
        `http://localhost:8000/api/v1/best-trade?start=${encodeURIComponent(startTimeStr)}&end=${encodeURIComponent(endTimeStr)}`
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

  // Helper: create a local Date object from a UTC string (so picker shows the correct time)
  function utcStringToLocalDate(utcString: string): Date {
    const [datePart, timePart] = utcString.replace('Z', '').split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute, second);
  }

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>Stock Trading Profit Finder</h1>
      <p style={{ color: '#555', fontSize: 13, marginBottom: 20 }}>
        All times are in <strong>UTC</strong>.
      </p>
      <label>
        Start Time:
        <DatePicker
          selected={startTimeStr ? utcStringToLocalDate(startTimeStr) : null}
          onChange={date => {
            if (date) {
              // Use local time components to build a UTC ISO string
              const year = date.getFullYear();
              const month = date.getMonth();
              const day = date.getDate();
              const hour = date.getHours();
              const minute = date.getMinutes();
              const second = date.getSeconds();
              const isoString = `${year.toString().padStart(4, '0')}-${(month+1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}Z`;
              setStartTimeStr(isoString);
            } else {
              setStartTimeStr(null);
            }
          }}
          showTimeSelect
          timeFormat="HH:mm:ss"
          timeIntervals={1}
          dateFormat="yyyy-MM-dd HH:mm:ss 'UTC'"
          placeholderText="Select start time (UTC)"
        />
      </label>
      <label style={{ display: 'block', marginTop: 10 }}>
        End Time:
        <DatePicker
          selected={endTimeStr ? utcStringToLocalDate(endTimeStr) : null}
          onChange={date => {
            if (date) {
              const year = date.getFullYear();
              const month = date.getMonth();
              const day = date.getDate();
              const hour = date.getHours();
              const minute = date.getMinutes();
              const second = date.getSeconds();
              const isoString = `${year.toString().padStart(4, '0')}-${(month+1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}Z`;
              setEndTimeStr(isoString);
            } else {
              setEndTimeStr(null);
            }
          }}
          showTimeSelect
          timeFormat="HH:mm:ss"
          timeIntervals={1}
          dateFormat="yyyy-MM-dd HH:mm:ss 'UTC'"
          placeholderText="Select end time (UTC)"
          minDate={startTimeStr ? utcStringToLocalDate(startTimeStr) : undefined}
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
            Buy Time: <strong>{new Date(result.buyTime).toLocaleString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}</strong> at price <strong>${result.buyPrice.toFixed(2)}</strong>
          </p>
          <p>
            Sell Time: <strong>{new Date(result.sellTime).toLocaleString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}</strong> at price <strong>${result.sellPrice.toFixed(2)}</strong>
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
