import axios from 'axios';
import axiosRetry from 'axios-retry';

export function createClient(baseURL, defaultHeaders = {}) {
  const client = axios.create({
    baseURL,
    headers: defaultHeaders,
    timeout: 20000,
  });

  axiosRetry(client, {
    retries: 3,
    retryDelay: (retryCount, error) => {
      const retryAfter = error.response?.headers?.['retry-after'];
      if (retryAfter) return parseInt(retryAfter) * 1000;
      return axiosRetry.exponentialDelay(retryCount);
    },
    retryCondition: (error) =>
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      [429, 502, 503, 504].includes(error.response?.status),
  });

  return client;
}

export const fredClient = createClient('https://api.stlouisfed.org');
export const finnhubClient = createClient('https://finnhub.io/api/v1');
export const tastyClient = createClient('https://api.tastyworks.com');
export const capitalTradesClient = createClient('https://www.capitoltrades.com');
