/** Formatting + label helpers shared across components. */

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const formatINR = (amount: number): string => inr.format(amount);

/** Compact INR for tight spaces: "₹13k", "₹18.5k". */
export const formatINRCompact = (amount: number): string => {
  if (amount >= 1000) {
    const k = amount / 1000;
    return `₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `₹${amount}`;
};

/** "2.1 km" / "850 m" from metres. */
export const formatDistance = (meters: number): string => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
};

export const formatDeposit = (amount: number): string => `₹${amount.toLocaleString('en-IN')}`;

/**
 * Normalize a stored phone number to an international (E.164-ish) digit string
 * for `wa.me/<number>` and `tel:+<number>` links.
 *
 * Indian mobiles are the common case (10 digits starting 6–9 → `91…`); other
 * plausible lengths pass through, and anything that cannot be a phone number
 * returns null so a bad profile value can never become a link.
 */
export const contactNumber = (raw: string | null | undefined): string | null => {
  const d = (raw ?? '').replace(/\D/g, '');
  if (d.length === 10) return /^[6-9]\d{9}$/.test(d) ? `91${d}` : null;
  if (d.length === 11 && d.startsWith('0')) return `91${d.slice(1)}`;
  if (d.length === 12 && d.startsWith('91')) return d;
  if (d.length >= 10 && d.length <= 15) return d;
  return null;
};

/** Human-readable Indian format for display: `+91 98765 43210`. */
export const formatPhone = (raw: string | null | undefined): string => {
  const d = (raw ?? '').replace(/\D/g, '');
  if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  if (d.length === 12 && d.startsWith('91')) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return raw?.trim() || '';
};
