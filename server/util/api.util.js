import axios from "axios";

import { DOMAIN } from "../config/sleeperAPI.config.js";
import { cached, TTL } from "./cache.js";

const RETRIES = 3;

// Loading keeper data makes ~150 requests at once, and Sleeper occasionally
// drops one, so retry with a short backoff
const getWithRetry = async (url, attempt = 1) => {
    try {
        const { data } = await axios.get(url, { timeout: 15000 });

        return data;
    } catch (error) {
        if (attempt >= RETRIES || error.response?.status === 404) throw error;

        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));

        return getWithRetry(url, attempt + 1);
    }
};

// Pass a longer ttl for data that no longer changes (e.g. finished seasons)
export const fetchFromSleeperEndpoint = (endpoint, ttl = TTL.SHORT) =>
    cached(endpoint, ttl, () => getWithRetry(`${DOMAIN}${endpoint}`));
