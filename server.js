import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// Get current month start and end (UTC)
function getCurrentMonthRangeUTC() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
  return [start, end];
}

// Mask usernames (first 2 letters + *** + last 2)
function maskUsername(username) {
  if (!username) return '';
  const str = String(username).trim();
  if (str.length <= 4) return str;
  return str.slice(0, 2) + '***' + str.slice(-2);
}

const [START_TIME, END_TIME] = getCurrentMonthRangeUTC();

// === /api/leaderboard/stake ===
app.get('/api/leaderboard/stake', async (req, res) => {
  try {
    const response = await fetch('https://hurmostv.com/wp-json/affiliate-leaderboard/v1/data');
    const payload = await response.json();

    if (!payload || !Array.isArray(payload.data)) {
      return res.status(500).json({ error: 'Invalid data format' });
    }

    let leaderboard = payload.data.map(entry => ({
      name: maskUsername(entry.username_original || entry.username),
      wager: parseFloat(entry.wagered)
    }));

    // Sort by wager (descending)
    leaderboard.sort((a, b) => b.wager - a.wager);

    // Limit to top 10
    leaderboard = leaderboard.slice(0, 30);

    // Prize mapping
    const prizes = [
      5000, 3000, 1500, 1000, 700, 500, 400, 400, 300, 300, 200, 200, 200, 200, 200, 100, 100, 100, 100, 100, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40
    ].map((reward, i) => ({ position: i + 1, reward }));

    res.json({
      leaderboard,
      prizes,
      startTime: START_TIME.toISOString(),
      endTime: END_TIME.toISOString()
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
});

// === /api/countdown/stake ===
app.get('/api/countdown/stake', (req, res) => {
  const now = new Date();
  const total = END_TIME - START_TIME;
  const remaining = END_TIME - now;
  const percentageLeft = Math.max(0, Math.min(100, (remaining / total) * 100));
  res.json({ percentageLeft: parseFloat(percentageLeft.toFixed(2)) });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
