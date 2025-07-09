import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

/**
 * @jest-environment jsdom
 */

// Mock react-datepicker to a simple input for test reliability
jest.mock('react-datepicker', () => {
  // eslint-disable-next-line react/display-name
  return ({ selected, onChange, ...props }: any) => {
    // Format value as 'YYYY-MM-DDTHH:mm:ss' for datetime-local
    let value = '';
    if (selected instanceof Date && !isNaN(selected.getTime())) {
      const pad = (n: number) => n.toString().padStart(2, '0');
      value = `${selected.getFullYear()}-${pad(selected.getMonth() + 1)}-${pad(selected.getDate())}T${pad(selected.getHours())}:${pad(selected.getMinutes())}:${pad(selected.getSeconds())}`;
    }
    return (
      <input
        type="datetime-local"
        value={value}
        aria-label={props.placeholderText}
        onChange={(e) => {
          // Always parse as UTC by appending 'Z'
          let v = e.target.value;
          if (v && v.length === 16) v += ':00';
          const date = v ? new Date(v + 'Z') : null;
          onChange(date);
        }}
        {...props}
      />
    );
  };
});

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('App', () => {
  let originalError: typeof console.error;
  let errorLogs: any[] = [];

  beforeAll(() => {
    originalError = console.error;
    console.error = (...args: any[]) => {
      errorLogs.push(args);
    };
  });

  afterEach(() => {
    errorLogs = [];
    jest.clearAllMocks();
  });

  afterAll(() => {
    console.error = originalError;
  });

  // Print error logs only if a test fails
  afterEach(function (this: any) {
    if (this.currentTest && this.currentTest.state === 'failed' && errorLogs.length > 0) {
      // eslint-disable-next-line no-console
      originalError('Console error output during failed test:', ...errorLogs);
    }
  });

  // Helper to set a date value directly in the input using userEvent
  async function setDateInput(label: string, value: string) {
    // Always type full datetime with seconds
    let v = value;
    if (v.length === 16) v += ':00';
    const input = screen.getByLabelText(label);
    await userEvent.clear(input);
    await userEvent.type(input, v);
    // Fire change event to ensure mock's onChange is triggered
    fireEvent.change(input, { target: { value: v } });
  }

  it('renders form fields and button', () => {
    render(<App />);
    expect(screen.getByText(/Stock Trading Profit Finder/i)).toBeInTheDocument();
    expect(screen.getByText(/Start Time/i)).toBeInTheDocument();
    expect(screen.getByText(/End Time/i)).toBeInTheDocument();
    expect(screen.getByText(/Available Funds/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Allow fractional shares/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Find Optimal Trade/i })).toBeInTheDocument();
  });

  it('shows error if fields are missing', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Find Optimal Trade/i }));
    expect(await screen.findByText(/Please specify both start and end times/i)).toBeInTheDocument();
  });

  it('shows info message if funds is empty but API returns valid result', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        buyTime: '2025-07-05T00:00:00.000Z',
        sellTime: '2025-07-05T00:00:02.000Z',
        buyPrice: 100,
        sellPrice: 120,
      }),
    });
    render(<App />);
    await setDateInput('Select start time (UTC)', '2025-07-05T00:00:00');
    await setDateInput('Select end time (UTC)', '2025-07-05T00:00:02');
    // Do not enter funds
    fireEvent.click(screen.getByRole('button', { name: /Find Optimal Trade/i }));
    await screen.findByText(/Buy Time/i);
    expect(screen.getByText(/Sell Time/i)).toBeInTheDocument();
    expect(screen.getByText(/If you enter Available Funds/i)).toBeInTheDocument();
  });

  it('shows error if funds is negative or zero', async () => {
    render(<App />);
    await setDateInput('Select start time (UTC)', '2025-07-05T00:00:00');
    await setDateInput('Select end time (UTC)', '2025-07-05T01:00:01');
    const fundsInput = screen.getByPlaceholderText(/e.g. 1000/i);
    await userEvent.clear(fundsInput);
    await userEvent.type(fundsInput, '-100');
    fireEvent.click(screen.getByRole('button', { name: /Find Optimal Trade/i }));
    expect(await screen.findByText(/Available funds must be a positive number\./i)).toBeInTheDocument();
    await userEvent.clear(fundsInput);
    await userEvent.type(fundsInput, '0');
    fireEvent.click(screen.getByRole('button', { name: /Find Optimal Trade/i }));
    expect(await screen.findByText(/Available funds must be a positive number\./i)).toBeInTheDocument();
  });

  it('shows error if start time is after end time', async () => {
    render(<App />);
    // Fill required fields with valid funds
    await setDateInput('Select start time (UTC)', '2025-07-05T01:00:01');
    await setDateInput('Select end time (UTC)', '2025-07-05T00:00:00');
    const fundsInput = screen.getByPlaceholderText(/e.g. 1000/i);
    await userEvent.clear(fundsInput);
    await userEvent.type(fundsInput, '100');
    // Submit the form to trigger validation
    fireEvent.click(screen.getByRole('button', { name: /Find Optimal Trade/i }));
    // Match the exact error message
    const errorMsg = await screen.findByText(/Start time must be before end time\./i);
    expect(errorMsg).toBeInTheDocument();
  });

  it('shows error if API returns error', async () => {
    //simulate failed API call
    mockFetch.mockResolvedValueOnce({ ok: false, text: async () => 'API error' });
    render(<App />);
    await setDateInput('Select start time (UTC)', '2025-07-05T00:00:00');
    await setDateInput('Select end time (UTC)', '2025-07-05T01:00:00');
    const fundsInput = screen.getByPlaceholderText(/e.g. 1000/i);
    await userEvent.clear(fundsInput);
    await userEvent.type(fundsInput, '100');
    fireEvent.click(screen.getByRole('button', { name: /Find Optimal Trade/i }));
    expect(await screen.findByText(/API error/i)).toBeInTheDocument();
  });

  it('shows raw error if error is invalid JSON', async () => {
    // Simulate an invalid JSON error string
    mockFetch.mockResolvedValueOnce({ ok: false, text: async () => '{not valid json}' });
    render(<App />);
    await setDateInput('Select start time (UTC)', '2025-07-05T00:00:00');
    await setDateInput('Select end time (UTC)', '2025-07-05T01:00:00');
    const fundsInput = screen.getByPlaceholderText(/e.g. 1000/i);
    await userEvent.clear(fundsInput);
    await userEvent.type(fundsInput, '100');
    fireEvent.click(screen.getByRole('button', { name: /Find Optimal Trade/i }));
    expect(await screen.findByText(/{not valid json}/i)).toBeInTheDocument();
  });

  it('shows error message from JSON error with message property', async () => {
    // Simulate a JSON error string with a message property
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ message: 'API exploded' }),
    });
    render(<App />);
    await setDateInput('Select start time (UTC)', '2025-07-05T00:00:00');
    await setDateInput('Select end time (UTC)', '2025-07-05T01:00:00');
    const fundsInput = screen.getByPlaceholderText(/e.g. 1000/i);
    await userEvent.clear(fundsInput);
    await userEvent.type(fundsInput, '100');
    fireEvent.click(screen.getByRole('button', { name: /Find Optimal Trade/i }));
    expect(await screen.findByText(/API exploded/i)).toBeInTheDocument();
  });

  it('shows result for valid API response (integer shares)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        buyTime: '2025-07-05T00:00:00.000Z',
        sellTime: '2025-07-05T00:00:02.000Z',
        buyPrice: 100,
        sellPrice: 120,
      }),
    });
    render(<App />);
    await setDateInput('Select start time (UTC)', '2025-07-05T00:00:00');
    await setDateInput('Select end time (UTC)', '2025-07-05T00:00:02');
    const fundsInput = screen.getByPlaceholderText(/e.g. 1000/i);
    await userEvent.clear(fundsInput);
    await userEvent.type(fundsInput, '250');
    fireEvent.click(screen.getByRole('button', { name: /Find Optimal Trade/i }));
    // Wait for result fields
    await screen.findByText(/Buy Time/i);
    expect(screen.getByText(/Sell Time/i)).toBeInTheDocument();
    expect(screen.getByText(/Stocks You can Buy/i)).toBeInTheDocument();
    expect(screen.getByText(/Potential Profit/i)).toBeInTheDocument();
  });

  it('shows result for valid API response (fractional shares)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        buyTime: '2025-07-05T00:00:00.000Z',
        sellTime: '2025-07-05T00:00:02.000Z',
        buyPrice: 100,
        sellPrice: 120,
      }),
    });
    render(<App />);
    await setDateInput('Select start time (UTC)', '2025-07-05T00:00:00');
    await setDateInput('Select end time (UTC)', '2025-07-05T00:00:02');
    await waitFor(() => {
      expect(
        screen.queryByText(/Please specify both start and end times/i),
      ).not.toBeInTheDocument();
    });
    const fundsInput = screen.getByPlaceholderText(/e.g. 1000/i);
    await userEvent.clear(fundsInput);
    await userEvent.type(fundsInput, '250');
    fireEvent.click(screen.getByLabelText(/Allow fractional shares/i));
    fireEvent.click(screen.getByRole('button', { name: /Find Optimal Trade/i }));
    await waitFor(() => {
      expect(screen.getByText(/Stocks You can Buy/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Potential Profit/i)).toBeInTheDocument();
  });

  it('shows insufficient funds message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        buyTime: '2025-07-05T00:00:00.000Z',
        sellTime: '2025-07-05T00:00:02.000Z',
        buyPrice: 1000,
        sellPrice: 1200,
      }),
    });
    render(<App />);
    await setDateInput('Select start time (UTC)', '2025-07-05T00:00:00');
    await setDateInput('Select end time (UTC)', '2025-07-05T00:00:02');
    await waitFor(() => {
      expect(
        screen.queryByText(/Please specify both start and end times/i),
      ).not.toBeInTheDocument();
    });
    const fundsInput = screen.getByPlaceholderText(/e.g. 1000/i);
    await userEvent.clear(fundsInput);
    await userEvent.type(fundsInput, '5');
    fireEvent.click(screen.getByRole('button', { name: /Find Optimal Trade/i }));
    await waitFor(() => {
      expect(screen.getByText(/Insufficient funds to buy any stocks/i)).toBeInTheDocument();
    });
  });

  it('shows no good deal if API returns null values', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        buyTime: null, // Simulate missing buyTime
        sellTime: null, // Simulate missing sellTime
        buyPrice: null, // Simulate missing buyPrice
        sellPrice: null, // Simulate missing sellPrice
      }),
    });
    render(<App />);
    await setDateInput('Select start time (UTC)', '2025-07-05T00:00:00');
    await setDateInput('Select end time (UTC)', '2025-07-05T00:00:02');
    const fundsInput = screen.getByPlaceholderText(/e.g. 1000/i);
    await userEvent.clear(fundsInput);
    await userEvent.type(fundsInput, '100');
    fireEvent.click(screen.getByRole('button', { name: /Find Optimal Trade/i }));
    expect(
      await screen.findByText(/No profitable trade found for the given time period\./i),
    ).toBeInTheDocument();
  });
});
