export const formatToCr = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null) return '0.00 CR';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0.00 CR';
  
  const crValue = num / 10000000;
  
  // Use a high maximumFractionDigits to avoid rounding
  return crValue.toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 20 
  }) + ' CR';
};
