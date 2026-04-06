export const fmtInt = (v: number | null | undefined): string => {
  if (v === null || v === undefined || Number.isNaN(v)) {
    return 'unavailable';
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v);
};

export const fmtFloat = (v: number | null | undefined, digits = 2): string => {
  if (v === null || v === undefined || Number.isNaN(v)) {
    return 'unavailable';
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  }).format(v);
};

export const fmtNs = (v: number | null | undefined): string => {
  if (v === null || v === undefined || Number.isNaN(v)) {
    return 'unavailable';
  }
  if (v >= 1_000) {
    return `${fmtFloat(v / 1_000, 2)} micro seconds`;
  }
  return `${fmtFloat(v, 2)} nano seconds`;
};

export const fmtBool = (v: boolean | null | undefined): string => {
  if (v === null || v === undefined) {
    return 'unavailable';
  }
  return v ? 'pass' : 'fail';
};

export const fmtDate = (iso?: string): string => {
  if (!iso) {
    return 'unavailable';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString();
};

export const fmtCompact = (v: number | null | undefined): string => {
  if (v === null || v === undefined || Number.isNaN(v)) {
    return 'unavailable';
  }
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(v);
};

export const fmtPrice = (v: number | null | undefined): string => {
  if (v === null || v === undefined || Number.isNaN(v)) {
    return 'unavailable';
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(v);
};
