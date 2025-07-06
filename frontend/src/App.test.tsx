import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/react';
import App from './App';

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

  // Helper to pick a date from react-datepicker calendar
  async function pickDate(label: string, date: Date) {
    const input = screen.getByPlaceholderText(label);
    await userEvent.click(input);
    // Wait for calendar popup
    const calendar = await screen.findByRole('dialog', { name: /calendar/i });
    // Find the day button by visible text, matching the correct month/year
    const day = date.getDate().toString();
    // Find the month and year label
    const monthYearLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    // Ensure the calendar is showing the correct month/year
    await waitFor(() => {
      expect(within(calendar).getByText(monthYearLabel)).toBeInTheDocument();
    });
    // Find all day buttons with the correct text
    const dayButtons = within(calendar).getAllByRole('button', { name: new RegExp(`^${day}$`) });
    // Pick the one that is not disabled and is visible
    const validDayButton = dayButtons.find(btn => !btn.hasAttribute('disabled') && btn.offsetParent !== null);
    if (!validDayButton) throw new Error('Valid day button not found');
    await userEvent.click(validDayButton);
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

  it('shows error if funds is not positive', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Select start time (UTC)')).toBeInTheDocument();
    });
    await pickDate('Select start time (UTC)', new Date('2025-07-05T00:00:00Z'));
    await pickDate('Select end time (UTC)', new Date('2025-07-05T01:00:00Z'));
    await waitFor(() => {
      expect(screen.queryByText(/Please specify both start and end times/i)).not.toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText(/e.g. 1000/i), { target: { value: '-5' } });
    fireEvent.click(screen.getByRole('button', { name: /Find Optimal Trade/i }));
    expect(await screen.findByText(/Available funds must be a positive number/i)).toBeInTheDocument();
  });

  it('shows error if start time is after end time', async () => {
    render(<App />);
    await pickDate('Select start time (UTC)', new Date('2025-07-05T01:00:00Z'));
    await pickDate('Select end time (UTC)', new Date('2025-07-05T00:00:00Z'));
    await waitFor(() => {
      expect(screen.queryByText(/Please specify both start and end times/i)).not.toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText(/e.g. 1000/i), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /Find Optimal Trade/i }));
    expect(await screen.findByText(/Start time must be before end time/i)).toBeInTheDocument();
  });

  it('shows error if API returns error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, text: async () => 'API error' });
    render(<App />);
    await pickDate('Select start time (UTC)', new Date('2025-07-05T00:00:00Z'));
    await pickDate('Select end time (UTC)', new Date('2025-07-05T01:00:00Z'));
    await waitFor(() => {
      expect(screen.queryByText(/Please specify both start and end times/i)).not.toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText(/e.g. 1000/i), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /Find Optimal Trade/i }));
    expect(await screen.findByText(/API error/i)).toBeInTheDocument();
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
    await pickDate('Select start time (UTC)', new Date('2025-07-05T00:00:00Z'));
    await pickDate('Select end time (UTC)', new Date('2025-07-05T00:00:02Z'));
    await waitFor(() => {
      expect(screen.queryByText(/Please specify both start and end times/i)).not.toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText(/e.g. 1000/i), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: /Find Optimal Trade/i }));
    await waitFor(() => {
      expect(screen.getByText(/Buy Time/i)).toBeInTheDocument();
    });
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
    await pickDate('Select start time (UTC)', new Date('2025-07-05T00:00:00Z'));
    await pickDate('Select end time (UTC)', new Date('2025-07-05T00:00:02Z'));
    await waitFor(() => {
      expect(screen.queryByText(/Please specify both start and end times/i)).not.toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText(/e.g. 1000/i), { target: { value: '250' } });
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
    await pickDate('Select start time (UTC)', new Date('2025-07-05T00:00:00Z'));
    await pickDate('Select end time (UTC)', new Date('2025-07-05T00:00:02Z'));
    await waitFor(() => {
      expect(screen.queryByText(/Please specify both start and end times/i)).not.toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText(/e.g. 1000/i), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /Find Optimal Trade/i }));
    await waitFor(() => {
      expect(screen.getByText(/Insufficient funds to buy any stocks/i)).toBeInTheDocument();
    });
  });
});
