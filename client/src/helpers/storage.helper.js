import { useEffect, useState } from "react";

// Storage can be unavailable (e.g. private browsing), so fall back quietly
export const readStorage = (storage, key, fallback) => {
    try {
        const saved = storage.getItem(key);
        return saved === null ? fallback : JSON.parse(saved);
    } catch {
        return fallback;
    }
};

export const writeStorage = (storage, key, value) => {
    try {
        if (value === undefined || value === null) {
            storage.removeItem(key);
        } else {
            storage.setItem(key, JSON.stringify(value));
        }
    } catch {
        // Ignore: the value just won't be remembered
    }
};

// useState that survives reloads on this device
export const useLocalState = (key, initialValue) => {
    const [value, setValue] = useState(() =>
        readStorage(localStorage, key, initialValue)
    );

    useEffect(() => {
        writeStorage(localStorage, key, value);
    }, [key, value]);

    return [value, setValue];
};
