/**
 * Roamly Centralized Currency Formatting Utilities
 * Standardizes monetary displays across the frontend, supporting Indian Numbering System (en-IN)
 * and multi-currency formats with clean symbol placement and zero fractional drift.
 */

/**
 * Formats a monetary amount using the specified currency.
 * Defaults to Indian Rupee (INR, ₹) with en-IN numbering grouping (e.g., ₹1,25,000).
 *
 * @param {number|string} amount - The numeric monetary value
 * @param {string} [currency='INR'] - 3-letter currency code (e.g., 'INR', 'USD', 'EUR')
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount) || 0;
  const targetCurrency = (currency || 'INR').toUpperCase();

  try {
    if (targetCurrency === 'INR') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(num);
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: targetCurrency,
      maximumFractionDigits: targetCurrency === 'JPY' ? 0 : 0
    }).format(num);
  } catch (err) {
    // Graceful fallback in case of unsupported currency code
    return targetCurrency === 'INR'
      ? `₹${num.toLocaleString('en-IN')}`
      : `${num.toLocaleString('en-US')} ${targetCurrency}`;
  }
}

/**
 * Convenience helper specifically for Indian Rupee amounts.
 *
 * @param {number|string} amount
 * @returns {string} e.g. "₹50,000"
 */
export function formatINR(amount) {
  return formatCurrency(amount, 'INR');
}

/**
 * Converts budget tier codes ('$', '$$', '$$$') to Indian Rupee tier notation ('₹', '₹₹', '₹₹₹')
 * for user-facing UI badges, cards, and filter pills while preserving database key compatibility.
 *
 * @param {string} tier - e.g. '$', '$$', '$$$'
 * @returns {string} e.g. '₹', '₹₹', '₹₹₹'
 */
export function formatBudgetTier(tier) {
  if (!tier || typeof tier !== 'string') return tier || '';
  return tier.replace(/\$/g, '₹');
}
