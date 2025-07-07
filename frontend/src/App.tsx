import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface ApiResponse {
  buyTime: string | null;
  sellTime: string | null;
  buyPrice: number | null;
  sellPrice: number | null;
}
//temp comment to push github actions workflow for e2e - test try 5
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const App: React.FC = () => {
  const [startTimeStr, setStartTimeStr] = useState<string | null>(null);
  const [endTimeStr, setEndTimeStr] = useState<string | null>(null);
  const [funds, setFunds] = useState('');
  const [fractional, setFractional] = useState(false);
  const [result, setResult] = useState<{
    buyTime: string;
    sellTime: string;
    buyPrice: number;
    sellPrice: number;
    stocksBought: number;
    profit: number | null;
  } | null>(null);
  const [error, setError] = useState('');


  //async function to handle the query and wait for the response
  //fetches data from the backend API and processes the response
  //validates inputs and handles errors
  //calculates the optimal trade based on the provided time range and available funds
  //uses UTC strings for API requests to ensure consistent time handling
  //calculates the number of stocks that can be bought based on the available funds and buy price
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
        `${API_BASE_URL}/api/v1/best-trade?start=${encodeURIComponent(startTimeStr)}&end=${encodeURIComponent(endTimeStr)}`
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

      const stocksBought = fractional
        ? Math.floor((fundsNum / data.buyPrice) * 100) / 100 // round down to 2 decimals
        : Math.floor(fundsNum / data.buyPrice);
      let profit = null;
      if (stocksBought === 0) {
        setResult({
          buyTime: data.buyTime,
          sellTime: data.sellTime,
          buyPrice: data.buyPrice,
          sellPrice: data.sellPrice,
          stocksBought: 0,
          profit: null,
        });
        return;
      }
      profit = stocksBought * (data.sellPrice - data.buyPrice);
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
      <h1 style={{ textAlign: 'center' }}>Stock Trading Profit Finder</h1>

      <form
        style={{
          background: '#f9f9f9', // match result card
          border: '1px solid #ccc', // match result card
          borderRadius: 5, // match result card
          padding: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          marginBottom: 24,
        }}
        onSubmit={e => { e.preventDefault(); handleQuery(); }} //prevent default form submission, no reload
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <tbody>
            <tr style={{ height: 33 }}>
              <td style={{ minWidth: 160, width: 180, fontWeight: 500, textAlign: 'right', padding: '0 16px 0 0', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Start Time (UTC):</td>
              <td style={{ width: '100%' }}>
                <DatePicker
                  selected={startTimeStr ? utcStringToLocalDate(startTimeStr) : null}
                  onChange={date => {
                    if (date) {
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
                  popperPlacement="bottom"
                  //value="2025-07-06 18:03:00 UTC"
                />
              </td>
            </tr>
            <tr style={{ height: 33 }}>
              <td style={{ minWidth: 160, width: 180, fontWeight: 500, textAlign: 'right', padding: '0 16px 0 0', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>End Time (UTC):</td>
              <td style={{ width: '100%' }}>
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
                  popperPlacement="bottom"
                  //value="2025-07-06 18:03:03 UTC"
                />
              </td>
            </tr>
            <tr style={{ height: 33 }}>
              <td style={{ minWidth: 160, width: 180, fontWeight: 500, textAlign: 'right', padding: '0 16px 0 0', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Available Funds:</td>
              <td style={{ width: '100%' }}>
                <input
                  type="number"
                  min="-10000000" // Allow negative for testing, but should be positive in production
                  step="0.01"
                  value={funds}
                  onChange={e => setFunds(e.target.value)}
                  placeholder="e.g. 1000"
                  style={{
                    width: 170,
                    height: 22,
                    padding: '0 36px 0 10px',
                    borderRadius: 0,
                    border: '1px solid black',
                    fontSize: 14, // 1px smaller than before
                    boxSizing: 'border-box',
                    display: 'block',
                    marginTop: 0,
                    marginBottom: 0,
                  }}
                />
              </td>
            </tr>
            <tr style={{ height: 33 }}>
              <td style={{ minWidth: 160, width: 180, fontWeight: 500, textAlign: 'right', padding: '0 16px 0 0', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Allow fractional shares:</td>
              <td style={{ width: '100%' }}>
                <label style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={fractional}
                    onChange={e => setFractional(e.target.checked)}
                    style={{ marginRight: 6, verticalAlign: 'middle' }}
                  />
                  Allow fractional shares
                </label>
              </td>
            </tr>
          </tbody>
        </table>
        <button
          type="submit"
          style={{
            marginTop: 10,
            padding: '10px 0',
            borderRadius: 6,
            border: 'none',
            background: 'linear-gradient(90deg, #6366f1 0%, #60a5fa 100%)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 17,
            cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(99,102,241,0.08)'
          }}
        >
          Find Optimal Trade
        </button>
      </form>
      {error && (
        <div
          style={{
            color: '#222', // Match label color
            background: '#f3f4f6',
            border: '1px solid #ff5858',
            borderRadius: 6,
            padding: '16px 20px',
            marginTop: 24,
            fontWeight: 500,
            fontSize: 16,
            fontFamily: 'Arial, sans-serif', // Match label font
            boxShadow: '0 2px 8px rgba(255,88,88,0.08)'
          }}
        >
          <span style={{ marginRight: 8, fontSize: 20, verticalAlign: 'middle' }}>⚠️</span>
          {(() => {
            try {
              const parsed = JSON.parse(error);
              if (parsed && parsed.message) return parsed.message;
            } catch {}
            return error;
          })()}
        </div>
      )}
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
          <h2>Recommended Action:</h2>
          <p>
            Buy Time: <strong>{new Date(result.buyTime).toLocaleString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong> at price <strong>${result.buyPrice.toFixed(2)}</strong>
          </p>
          <p>
            Sell Time: <strong>{new Date(result.sellTime).toLocaleString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong> at price <strong>${result.sellPrice.toFixed(2)}</strong>
          </p>
          {result.stocksBought === 0 ? (
            <p style={{ color: '#b91c1c', fontWeight: 500, marginTop: 12 }}>Insufficient funds to buy any stocks at the buy price.</p>
          ) : (
            <>
              <p>
                Stocks You can Buy: <strong>{fractional ? result.stocksBought.toFixed(2) : result.stocksBought}</strong>
              </p>
              <p>
                Potential Profit: <strong>${result.profit?.toFixed(2) || 0}</strong>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
