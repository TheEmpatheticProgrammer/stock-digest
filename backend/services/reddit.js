/**
 * Reddit sentiment service using snoowrap.
 * Fetches top posts from WSB and r/stocks ONCE per scan,
 * then scores each ticker offline from the cached corpus.
 */

let postCorpus = null; // combined text from all fetched posts
let corpusExpiry = 0;
const CORPUS_TTL = 60 * 60 * 1000; // 1 hour

const BULLISH_KEYWORDS = [
  'calls', 'long', 'bull', 'bullish', 'moon', 'buy', 'buying', 'yolo',
  'tendies', 'squeeze', 'breakout', 'upside', 'outperform', 'rocket',
];
const BEARISH_KEYWORDS = [
  'puts', 'short', 'bear', 'bearish', 'crash', 'dump', 'dumping', 'bag',
  'bagholder', 'rekt', 'sell', 'selling', 'downside', 'underperform',
];

/**
 * Initialise Reddit client if credentials are available.
 */
async function getRedditClient() {
  if (
    !process.env.REDDIT_CLIENT_ID ||
    !process.env.REDDIT_CLIENT_SECRET ||
    !process.env.REDDIT_USERNAME ||
    !process.env.REDDIT_PASSWORD
  ) {
    return null;
  }
  try {
    // Dynamic import to avoid crashing if snoowrap has issues
    const { default: Snoowrap } = await import('snoowrap');
    return new Snoowrap({
      userAgent: process.env.REDDIT_USER_AGENT || 'stock-digest/1.0',
      clientId: process.env.REDDIT_CLIENT_ID,
      clientSecret: process.env.REDDIT_CLIENT_SECRET,
      username: process.env.REDDIT_USERNAME,
      password: process.env.REDDIT_PASSWORD,
    });
  } catch (err) {
    console.warn('[reddit] Failed to init snoowrap:', err.message);
    return null;
  }
}

/**
 * Fetch and cache the post corpus from WSB and r/stocks.
 * Returns a string of combined post titles + selftext.
 */
async function fetchCorpus() {
  if (postCorpus && Date.now() < corpusExpiry) return postCorpus;

  const client = await getRedditClient();
  if (!client) {
    console.warn('[reddit] No credentials configured — skipping Reddit sentiment');
    postCorpus = '';
    corpusExpiry = Date.now() + CORPUS_TTL;
    return '';
  }

  try {
    const [wsb, stocks] = await Promise.all([
      client.getSubreddit('wallstreetbets').getTop({ time: 'week', limit: 100 }),
      client.getSubreddit('stocks').getTop({ time: 'week', limit: 100 }),
    ]);

    const posts = [...wsb, ...stocks];
    postCorpus = posts
      .map((p) => `${p.title || ''} ${p.selftext || ''}`)
      .join('\n')
      .toLowerCase();
    corpusExpiry = Date.now() + CORPUS_TTL;
    console.log(`[reddit] Fetched corpus: ${posts.length} posts`);
  } catch (err) {
    console.warn('[reddit] Corpus fetch failed:', err.message);
    postCorpus = '';
    corpusExpiry = Date.now() + CORPUS_TTL;
  }
  return postCorpus;
}

/**
 * Pre-warm the corpus at scan start (call once, not per ticker).
 */
export async function prewarmCorpus() {
  await fetchCorpus();
}

/**
 * Score a ticker's Reddit sentiment from the cached corpus.
 * Returns { mentions, sentimentScore } where sentimentScore is -1 to 1.
 */
export function getTickerSentiment(ticker) {
  if (!postCorpus) return { mentions: 0, sentimentScore: 0 };

  const tickerLower = ticker.toLowerCase();
  // Split corpus into individual posts
  const posts = postCorpus.split('\n').filter((p) => p.includes(tickerLower));
  const mentions = posts.length;
  if (mentions === 0) return { mentions: 0, sentimentScore: 0 };

  let bullish = 0;
  let bearish = 0;
  for (const post of posts) {
    const words = post.split(/\s+/);
    for (const word of words) {
      if (BULLISH_KEYWORDS.includes(word)) bullish++;
      if (BEARISH_KEYWORDS.includes(word)) bearish++;
    }
  }

  const total = bullish + bearish;
  const sentimentScore = total === 0 ? 0 : (bullish - bearish) / total;
  return { mentions, sentimentScore };
}
