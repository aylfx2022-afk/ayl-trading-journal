
const trades = [
  // (Paste the JSON provided by the user)
  // Need to handle the timestamp format in user's JSON
  {
    "rr": -1,
    "openTime": { "seconds": 1776274200 }, "ticket": "MANUAL-1"
  },
  {
    "rr": -0.27,
    "openTime": { "seconds": 1776015000 }, "ticket": "MANUAL-2"
  },
  {
    "rr": -1,
    "openTime": { "seconds": 1776274200 }, "ticket": "MANUAL-3"
  },
  {
    "rr": 2,
    "openTime": { "seconds": 1777630138 }, "ticket": "MANUAL-4"
  },
  {
    "rr": -1,
    "openTime": { "seconds": 1776792600 }, "ticket": "MANUAL-5"
  },
  {
    "rr": -1,
    "openTime": { "seconds": 1776619800 }, "ticket": "MANUAL-6"
  },
  {
    "rr": -1,
    "openTime": { "seconds": 1777467250 }, "ticket": "MANUAL-7"
  },
  {
    "rr": 2,
    "openTime": { "seconds": 1776101400 }, "ticket": "MANUAL-8"
  },
  {
    "rr": 2,
    "openTime": { "seconds": 1776706200 }, "ticket": "MANUAL-9"
  },
  {
    "rr": 2,
    "openTime": { "seconds": 1775755800 }, "ticket": "MANUAL-10"
  },
  {
    "rr": -1,
    "openTime": { "seconds": 1777552160 }, "ticket": "MANUAL-11"
  },
  {
    "rr": 0.3,
    "openTime": { "seconds": 1776015000 }, "ticket": "MANUAL-12"
  },
  {
    "rr": -1,
    "openTime": { "seconds": 1776015000 }, "ticket": "MANUAL-13"
  },
  {
    "rr": 2.07,
    "openTime": { "seconds": 1775669400 }, "ticket": "MANUAL-14"
  },
  {
    "rr": -1,
    "openTime": { "seconds": 1777384385 }, "ticket": "MANUAL-15"
  },
  {
    "rr": null,
    "openTime": { "seconds": 1777700254 }, "ticket": "MANUAL-16"
  },
  {
    "rr": -1,
    "openTime": { "seconds": 1776965400 }, "ticket": "MANUAL-17"
  },
  {
    "rr": 2,
    "openTime": { "seconds": 1777285778 }, "ticket": "MANUAL-18"
  },
  {
    "rr": 2,
    "openTime": { "seconds": 1776187800 }, "ticket": "MANUAL-19"
  },
  {
    "rr": -0.29,
    "openTime": { "seconds": 1775755800 }, "ticket": "MANUAL-20"
  },
  {
    "rr": 0.29,
    "openTime": { "seconds": 1776619800 }, "ticket": "MANUAL-21"
  },
  {
    "rr": -1,
    "openTime": { "seconds": 1776360600 }, "ticket": "MANUAL-22"
  },
  {
    "rr": -1,
    "openTime": { "seconds": 1776187800 }, "ticket": "MANUAL-23"
  }
];

const getSafeDate = (time: any) => {
  if (!time) return null;
  if ('seconds' in time) return new Date(time.seconds * 1000);
  return new Date(time);
};

const allClosedTrades = [...trades]
  .filter(t => t.rr !== undefined && t.rr !== null)
  .sort((a, b) => {
    const timeA = getSafeDate(a.openTime);
    const timeB = getSafeDate(b.openTime);
    if (!timeA || !timeB) return 0;
    return timeA.getTime() - timeB.getTime();
  });

let currentWin = 0;
let maxWin = 0;
let currentLoss = 0;
let maxLoss = 0;

allClosedTrades.forEach(t => {
  const rr = Number(t.rr || 0);
  const status = rr > 0 ? 'win' : (rr < 0 ? 'loss' : 'be');
  console.log(`Ticket: ${t.ticket}, Date: ${getSafeDate(t.openTime)?.toISOString()}, RR: ${rr}, Status: ${status}`);

  if (status === 'win') {
    currentWin += 1;
    currentLoss = 0;
    if (currentWin > maxWin) maxWin = currentWin;
  } else if (status === 'loss') {
    currentLoss += 1;
    currentWin = 0;
    if (currentLoss > maxLoss) maxLoss = currentLoss;
  } else {
    currentWin = 0;
    currentLoss = 0;
  }
});

console.log('Max Win Streak:', maxWin);
console.log('Max Loss Streak:', maxLoss);
