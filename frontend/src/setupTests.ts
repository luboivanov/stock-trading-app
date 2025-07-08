import '@testing-library/jest-dom';

// Mock ResizeObserver for react-datepicker and other components
if (typeof window.ResizeObserver === 'undefined') {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
