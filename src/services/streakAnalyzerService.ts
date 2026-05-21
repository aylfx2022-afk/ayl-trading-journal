export interface Trade {
  rr?: number | null;
  ticket?: string;
  openTime?: any;
  createdAt?: any;
}

export function calculateStreaks(trades: Trade[]) {
  if (!trades.length) return { maxWin: 0, maxLoss: 0 };

  // Sort trades by creation time primarily as requested
  const sortedTrades = [...trades]
    .filter(t => t.rr !== undefined && t.rr !== null)
    .sort((a, b) => {
      const createA = new Date(a.createdAt?.seconds * 1000 || a.createdAt || 0).getTime();
      const createB = new Date(b.createdAt?.seconds * 1000 || b.createdAt || 0).getTime();
      
      if (createA !== createB) return createA - createB;

      const timeA = new Date(a.openTime?.seconds * 1000 || a.openTime || 0).getTime();
      const timeB = new Date(b.openTime?.seconds * 1000 || b.openTime || 0).getTime();
      
      if (timeA !== timeB) return timeA - timeB;

      return (a.ticket || '').localeCompare(b.ticket || '');
    });

  let currentWin = 0;
  let maxWin = 0;
  let currentLoss = 0;
  let maxLoss = 0;

  sortedTrades.forEach(t => {
    const rr = Number(t.rr);
    
    // Ignore break-even trades entirely for streak calculations
    if (rr === 0) return;

    if (rr > 0) {
      currentWin += 1;
      currentLoss = 0; // Win resets loss streak
      if (currentWin > maxWin) maxWin = currentWin;
    } else {
      currentLoss += 1;
      currentWin = 0; // Loss resets win streak
      if (currentLoss > maxLoss) maxLoss = currentLoss;
    }
  });
  
  return { maxWin, maxLoss };
}
