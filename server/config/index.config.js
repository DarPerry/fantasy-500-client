// Any season of the league works: the server follows Sleeper's
// previous_league_id links back and finds newer seasons automatically
export const LEAGUE_ID = "1351646791015071744";

// Sleeper user whose leagues are searched for new seasons
export const COMMISSIONER_USER_ID = "444630794862850048";

// Names shown on the site, by Sleeper user ID. Anyone missing falls back to
// their Sleeper display name, so only new managers need adding here.
export const MANAGER_NAMES = {
    "444630794862850048": "Darius", // ParlayPerry
    "460332022380883968": "Zack", // ztsmith1993
    "460332228702892032": "Nick", // ScrodoBaggins
    "460880713810440192": "Jeremiah", // HarrisBueller
    "460924851629060096": "Bob", // bclone12
    "461322426198781952": "Hues", // bighues
    "998645013057789952": "Diego", // dmon1
    "461748431803641856": "Jack", // jstrebing
    "463030709112532992": "Quast", // ATCIQ
    "399297882890440704": "T Cool", // TCoolDaGoat
    "975254025824153600": "Tri", // tringuyen22
    "858471878824685568": "Joel", // McKinnon20
};

export const ROUNDS_IN_DRAFT = 16;
