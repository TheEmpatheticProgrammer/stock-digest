import axios from 'axios';

let cachedList = null;
let cacheExpiry = 0;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Normalise a ticker to Yahoo Finance format (dots → hyphens).
 * BRK.B → BRK-B, BF.B → BF-B
 */
export function toYahooTicker(ticker) {
  return ticker.replace('.', '-');
}

/**
 * Normalise a ticker to Tastytrade format (removes hyphen suffix for equities).
 * BRK-B → BRK/B (Tastytrade uses slash notation for share classes)
 */
export function toTastyTicker(ticker) {
  return ticker.replace('-', '/');
}

/**
 * Fetch the current S&P 500 constituent list from Wikipedia.
 * Returns [{ticker, name, sector}] in Yahoo Finance ticker format.
 */
export async function getSP500List() {
  if (cachedList && Date.now() < cacheExpiry) return cachedList;

  try {
    const resp = await axios.get(
      'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies',
      {
        headers: { 'User-Agent': 'stock-digest/1.0 (educational project)' },
        timeout: 15000,
      }
    );

    const html = resp.data;
    const stocks = [];

    // Parse the HTML table with regex (avoids cheerio dependency)
    // Target: <table id="constituents"> rows
    const tableMatch = html.match(/id="constituents"[\s\S]*?<\/table>/);
    if (!tableMatch) throw new Error('Could not find constituents table');

    const rowRegex = /<tr>[\s\S]*?<\/tr>/g;
    const rows = tableMatch[0].match(rowRegex) || [];

    for (const row of rows.slice(1)) {
      // Extract <td> contents
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
      const cells = [];
      let m;
      while ((m = tdRegex.exec(row)) !== null) {
        // Strip HTML tags, decode entities
        const text = m[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&#160;/g, ' ')
          .trim();
        cells.push(text);
      }
      if (cells.length >= 3) {
        const rawTicker = cells[0].trim();
        const name = cells[1].trim();
        const sector = cells[2].trim();
        if (rawTicker && /^[A-Z.\-]+$/.test(rawTicker)) {
          stocks.push({ ticker: toYahooTicker(rawTicker), name, sector });
        }
      }
    }

    if (stocks.length < 400) throw new Error(`Only parsed ${stocks.length} tickers`);

    cachedList = stocks;
    cacheExpiry = Date.now() + CACHE_TTL;
    console.log(`[sp500] Loaded ${stocks.length} S&P 500 constituents`);
    return stocks;
  } catch (err) {
    console.warn(`[sp500] Wikipedia fetch failed: ${err.message} — using fallback`);
    return getFallbackList();
  }
}

// Fallback: top 100 S&P 500 stocks by market cap
function getFallbackList() {
  const fallback = [
    { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Information Technology' },
    { ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'Information Technology' },
    { ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Information Technology' },
    { ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Discretionary' },
    { ticker: 'META', name: 'Meta Platforms Inc.', sector: 'Communication Services' },
    { ticker: 'GOOGL', name: 'Alphabet Inc. Class A', sector: 'Communication Services' },
    { ticker: 'GOOG', name: 'Alphabet Inc. Class C', sector: 'Communication Services' },
    { ticker: 'BRK-B', name: 'Berkshire Hathaway Inc.', sector: 'Financials' },
    { ticker: 'LLY', name: 'Eli Lilly and Co.', sector: 'Health Care' },
    { ticker: 'AVGO', name: 'Broadcom Inc.', sector: 'Information Technology' },
    { ticker: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Discretionary' },
    { ticker: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financials' },
    { ticker: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Staples' },
    { ticker: 'V', name: 'Visa Inc.', sector: 'Financials' },
    { ticker: 'UNH', name: 'UnitedHealth Group Inc.', sector: 'Health Care' },
    { ticker: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy' },
    { ticker: 'ORCL', name: 'Oracle Corporation', sector: 'Information Technology' },
    { ticker: 'MA', name: 'Mastercard Inc.', sector: 'Financials' },
    { ticker: 'COST', name: 'Costco Wholesale Corp.', sector: 'Consumer Staples' },
    { ticker: 'HD', name: 'Home Depot Inc.', sector: 'Consumer Discretionary' },
    { ticker: 'PG', name: 'Procter & Gamble Co.', sector: 'Consumer Staples' },
    { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Health Care' },
    { ticker: 'ABBV', name: 'AbbVie Inc.', sector: 'Health Care' },
    { ticker: 'NFLX', name: 'Netflix Inc.', sector: 'Communication Services' },
    { ticker: 'BAC', name: 'Bank of America Corp.', sector: 'Financials' },
    { ticker: 'CRM', name: 'Salesforce Inc.', sector: 'Information Technology' },
    { ticker: 'KO', name: 'Coca-Cola Co.', sector: 'Consumer Staples' },
    { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'Information Technology' },
    { ticker: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer Staples' },
    { ticker: 'TMO', name: 'Thermo Fisher Scientific', sector: 'Health Care' },
    { ticker: 'ACN', name: 'Accenture plc', sector: 'Information Technology' },
    { ticker: 'MRK', name: 'Merck & Co. Inc.', sector: 'Health Care' },
    { ticker: 'CSCO', name: 'Cisco Systems Inc.', sector: 'Information Technology' },
    { ticker: 'WFC', name: 'Wells Fargo & Co.', sector: 'Financials' },
    { ticker: 'LIN', name: 'Linde plc', sector: 'Materials' },
    { ticker: 'ABT', name: 'Abbott Laboratories', sector: 'Health Care' },
    { ticker: 'MCD', name: "McDonald's Corp.", sector: 'Consumer Discretionary' },
    { ticker: 'IBM', name: 'International Business Machines', sector: 'Information Technology' },
    { ticker: 'GE', name: 'GE Aerospace', sector: 'Industrials' },
    { ticker: 'NOW', name: 'ServiceNow Inc.', sector: 'Information Technology' },
    { ticker: 'INTU', name: 'Intuit Inc.', sector: 'Information Technology' },
    { ticker: 'CAT', name: 'Caterpillar Inc.', sector: 'Industrials' },
    { ticker: 'GS', name: 'Goldman Sachs Group', sector: 'Financials' },
    { ticker: 'TXN', name: 'Texas Instruments Inc.', sector: 'Information Technology' },
    { ticker: 'ISRG', name: 'Intuitive Surgical Inc.', sector: 'Health Care' },
    { ticker: 'PM', name: 'Philip Morris International', sector: 'Consumer Staples' },
    { ticker: 'RTX', name: 'RTX Corporation', sector: 'Industrials' },
    { ticker: 'BKNG', name: 'Booking Holdings Inc.', sector: 'Consumer Discretionary' },
    { ticker: 'T', name: 'AT&T Inc.', sector: 'Communication Services' },
    { ticker: 'SPGI', name: 'S&P Global Inc.', sector: 'Financials' },
    { ticker: 'AMGN', name: 'Amgen Inc.', sector: 'Health Care' },
    { ticker: 'DHR', name: 'Danaher Corporation', sector: 'Health Care' },
    { ticker: 'PFE', name: 'Pfizer Inc.', sector: 'Health Care' },
    { ticker: 'HON', name: 'Honeywell International', sector: 'Industrials' },
    { ticker: 'VRTX', name: 'Vertex Pharmaceuticals', sector: 'Health Care' },
    { ticker: 'BLK', name: 'BlackRock Inc.', sector: 'Financials' },
    { ticker: 'C', name: 'Citigroup Inc.', sector: 'Financials' },
    { ticker: 'PANW', name: 'Palo Alto Networks', sector: 'Information Technology' },
    { ticker: 'AXP', name: 'American Express Co.', sector: 'Financials' },
    { ticker: 'MS', name: 'Morgan Stanley', sector: 'Financials' },
    { ticker: 'UNP', name: 'Union Pacific Corp.', sector: 'Industrials' },
    { ticker: 'LOW', name: "Lowe's Companies Inc.", sector: 'Consumer Discretionary' },
    { ticker: 'BSX', name: 'Boston Scientific Corp.', sector: 'Health Care' },
    { ticker: 'TMUS', name: 'T-Mobile US Inc.', sector: 'Communication Services' },
    { ticker: 'ETN', name: 'Eaton Corporation', sector: 'Industrials' },
    { ticker: 'SYK', name: 'Stryker Corporation', sector: 'Health Care' },
    { ticker: 'MDT', name: 'Medtronic plc', sector: 'Health Care' },
    { ticker: 'CB', name: 'Chubb Limited', sector: 'Financials' },
    { ticker: 'ADI', name: 'Analog Devices Inc.', sector: 'Information Technology' },
    { ticker: 'SBUX', name: 'Starbucks Corporation', sector: 'Consumer Discretionary' },
    { ticker: 'MMC', name: 'Marsh & McLennan Companies', sector: 'Financials' },
    { ticker: 'ADP', name: 'Automatic Data Processing', sector: 'Information Technology' },
    { ticker: 'GILD', name: 'Gilead Sciences Inc.', sector: 'Health Care' },
    { ticker: 'DE', name: 'Deere & Company', sector: 'Industrials' },
    { ticker: 'BMY', name: 'Bristol-Myers Squibb', sector: 'Health Care' },
    { ticker: 'REGN', name: 'Regeneron Pharmaceuticals', sector: 'Health Care' },
    { ticker: 'TJX', name: 'TJX Companies Inc.', sector: 'Consumer Discretionary' },
    { ticker: 'LRCX', name: 'Lam Research Corp.', sector: 'Information Technology' },
    { ticker: 'MU', name: 'Micron Technology Inc.', sector: 'Information Technology' },
    { ticker: 'PLD', name: 'Prologis Inc.', sector: 'Real Estate' },
    { ticker: 'KLAC', name: 'KLA Corporation', sector: 'Information Technology' },
    { ticker: 'MDLZ', name: 'Mondelez International', sector: 'Consumer Staples' },
    { ticker: 'SO', name: 'Southern Company', sector: 'Utilities' },
    { ticker: 'CVX', name: 'Chevron Corporation', sector: 'Energy' },
    { ticker: 'NEE', name: 'NextEra Energy Inc.', sector: 'Utilities' },
    { ticker: 'CI', name: 'Cigna Group', sector: 'Health Care' },
    { ticker: 'ANET', name: 'Arista Networks Inc.', sector: 'Information Technology' },
    { ticker: 'ZTS', name: 'Zoetis Inc.', sector: 'Health Care' },
    { ticker: 'INTC', name: 'Intel Corporation', sector: 'Information Technology' },
    { ticker: 'EQIX', name: 'Equinix Inc.', sector: 'Real Estate' },
    { ticker: 'CME', name: 'CME Group Inc.', sector: 'Financials' },
    { ticker: 'USB', name: 'U.S. Bancorp', sector: 'Financials' },
    { ticker: 'CDNS', name: 'Cadence Design Systems', sector: 'Information Technology' },
    { ticker: 'SNPS', name: 'Synopsys Inc.', sector: 'Information Technology' },
    { ticker: 'ICE', name: 'Intercontinental Exchange', sector: 'Financials' },
    { ticker: 'DUK', name: 'Duke Energy Corporation', sector: 'Utilities' },
    { ticker: 'APH', name: 'Amphenol Corporation', sector: 'Information Technology' },
    { ticker: 'SHW', name: 'Sherwin-Williams Co.', sector: 'Materials' },
  ];
  console.warn(`[sp500] Using fallback list of ${fallback.length} tickers`);
  return fallback;
}
