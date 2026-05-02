export const getSafeDate = (time: any): Date | null => {
  if (!time) return null;
  if (typeof time.toDate === 'function') return time.toDate();
  if (time instanceof Date) return time;
  if (typeof time === 'object' && 'seconds' in time) return new Date(time.seconds * 1000);
  return new Date(time);
};
