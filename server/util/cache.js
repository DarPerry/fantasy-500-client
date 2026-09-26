const MINUTE = 60 * 1000;

export const TTL = {
    SHORT: 10 * MINUTE,
    DAY: 24 * 60 * MINUTE,
};

const entries = new Map();

// Returns a cached value, refreshing it in the background once it's older than
// `ttl` so callers never wait on a refresh. Concurrent first calls share one
// request.
export const cached = async (key, ttl, load) => {
    const entry = entries.get(key);
    const now = Date.now();

    if (entry?.value !== undefined) {
        if (now - entry.updatedAt > ttl && !entry.pending) {
            refresh(key, load).catch((error) =>
                console.error(`Refreshing ${key} failed:`, error.message),
            );
        }

        return entry.value;
    }

    return entry?.pending || refresh(key, load);
};

const refresh = (key, load) => {
    const entry = entries.get(key) || {};

    entry.pending = load()
        .then((value) => {
            entries.set(key, { value, updatedAt: Date.now() });
            return value;
        })
        .finally(() => {
            const current = entries.get(key);
            if (current) delete current.pending;
        });

    entries.set(key, entry);

    return entry.pending;
};
