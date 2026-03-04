import { fredClient } from '../utils/httpClient.js';

const API_KEY = process.env.FRED_API_KEY;

// Series IDs
const SERIES = {
  dgs10: 'DGS10',       // 10-Year Treasury yield
  dgs2: 'DGS2',         // 2-Year Treasury yield
  dtb3: 'DTB3',         // 3-Month Treasury bill
  hySpread: 'BAMLH0A0HYM2',  // ICE BofA HY OAS (credit spread)
  igSpread: 'BAMLC0A0CM',    // ICE BofA IG OAS (credit spread)
};

let macroCache = null;
let macroCacheExpiry = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function fetchSeries(seriesId) {
  const resp = await fredClient.get('/fred/series/observations', {
    params: {
      series_id: seriesId,
      api_key: API_KEY,
      sort_order: 'desc',
      limit: 5,
      file_type: 'json',
    },
  });
  const observations = resp.data.observations || [];
  // Find most recent non-null value
  for (const obs of observations) {
    const val = parseFloat(obs.value);
    if (!isNaN(val)) return val;
  }
  return null;
}

/**
 * Fetch all macro data needed for Regime scoring.
 * Results are cached for 24 hours per scan.
 */
export async function getMacroData() {
  if (macroCache && Date.now() < macroCacheExpiry) return macroCache;

  if (!API_KEY) {
    console.warn('[fred] No FRED_API_KEY — using placeholder macro data');
    return getPlaceholderMacro();
  }

  try {
    const [dgs10, dgs2, dtb3, hySpread, igSpread] = await Promise.all([
      fetchSeries(SERIES.dgs10),
      fetchSeries(SERIES.dgs2),
      fetchSeries(SERIES.dtb3),
      fetchSeries(SERIES.hySpread),
      fetchSeries(SERIES.igSpread),
    ]);

    const macro = {
      dgs10: dgs10 ?? 4.3,
      dgs2: dgs2 ?? 4.1,
      dtb3: dtb3 ?? 4.0,
      hySpread: hySpread ?? 3.5,
      igSpread: igSpread ?? 1.1,
      // Computed
      yieldCurveSlope: (dgs10 ?? 4.3) - (dtb3 ?? 4.0),
      hyIgSpread: (hySpread ?? 3.5) - (igSpread ?? 1.1),
    };

    macroCache = macro;
    macroCacheExpiry = Date.now() + CACHE_TTL;
    console.log('[fred] Macro data fetched:', macro);
    return macro;
  } catch (err) {
    console.warn(`[fred] Fetch failed: ${err.message} — using placeholder`);
    return getPlaceholderMacro();
  }
}

function getPlaceholderMacro() {
  return {
    dgs10: 4.3,
    dgs2: 4.1,
    dtb3: 4.0,
    hySpread: 3.5,
    igSpread: 1.1,
    yieldCurveSlope: 0.3,
    hyIgSpread: 2.4,
  };
}
