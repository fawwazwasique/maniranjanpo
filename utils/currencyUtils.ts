export const truncateToTwoDecimals = (val: number | string | undefined | null): number => {
  if (val === undefined || val === null) return 0;
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return 0;
  return Math.trunc(num * 100) / 100;
};

export const formatToCr = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null) return '0.00 CR';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0.00 CR';
  
  const crValue = num / 10000000;
  const truncated = truncateToTwoDecimals(crValue);
  
  return truncated.toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }) + ' CR';
};

export const formatCurrency = (val: number | string | undefined | null, options: Intl.NumberFormatOptions = {}): string => {
  const truncated = truncateToTwoDecimals(val);
  
  return truncated.toLocaleString('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2,
    ...options
  });
};
