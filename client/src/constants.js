// Season mode is automatic: values show once Sleeper publishes next year's
// ADP. Set to "IN_SEASON" or "OFFSEASON" to force a mode.
export const SEASON_MODE_OVERRIDE = null;

export const ENTRY_COST = 75;

export const PAYOUTS = {
    champion: ENTRY_COST * (20 / 3),
    runnerUp: ENTRY_COST * (8 / 3),
    third: ENTRY_COST,
    weeklyHighScore: 125,
};

export const MAX_KEEPERS = 4;
