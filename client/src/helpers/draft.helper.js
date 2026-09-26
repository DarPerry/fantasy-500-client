export const getNumberSuffix = (number) => {
    const lastTwo = number % 100;

    if (lastTwo >= 11 && lastTwo <= 13) return "th";

    switch (number % 10) {
        case 1:
            return "st";
        case 2:
            return "nd";
        case 3:
            return "rd";
        default:
            return "th";
    }
};

export const ordinal = (number) => `${number}${getNumberSuffix(number)}`;

// Overall pick number in a snake draft (slot is 1-based)
export const getSnakePick = (slot, round, teams = 12) => {
    if (!slot || !round) return null;

    return round % 2 === 1
        ? (round - 1) * teams + slot
        : round * teams - slot + 1;
};

// Two keepers can't use the same round: one moves up to the next earlier free
// round (two 11ths become an 11th and a 10th). `keepers` is in priority order;
// on a tie, the earlier keeper keeps the round. Returns id -> { round, fromRound }
// with round null when no earlier round is free.
export const resolveKeeperRounds = (keepers) => {
    const taken = new Set();
    const resolved = {};

    keepers
        .map((keeper, priority) => ({ ...keeper, priority }))
        .sort((a, b) => a.round - b.round || a.priority - b.priority)
        .forEach(({ id, round }) => {
            let finalRound = round;
            while (taken.has(finalRound)) finalRound--;

            if (finalRound < 1) {
                resolved[id] = { round: null, fromRound: round };
                return;
            }

            taken.add(finalRound);
            resolved[id] = { round: finalRound, fromRound: round };
        });

    return resolved;
};
