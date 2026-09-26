import { fetchFromSleeperEndpoint } from "../util/api.util.js";
import { TTL } from "../util/cache.js";
import {
    COMMISSIONER_USER_ID,
    LEAGUE_ID,
    MANAGER_NAMES,
} from "../config/index.config.js";

// Finished seasons don't change, so they can be cached for longer
const ttlFor = (league) =>
    league?.status === "complete" ? TTL.DAY : TTL.SHORT;

export const getNflState = () => fetchFromSleeperEndpoint(`/state/nfl`);

const getLeague = (leagueId) => fetchFromSleeperEndpoint(`/league/${leagueId}`);

const getLeaguesForUser = (userId, season) =>
    fetchFromSleeperEndpoint(`/user/${userId}/leagues/nfl/${season}`);

export const getLeagueRosters = (leagueId) =>
    fetchFromSleeperEndpoint(`/league/${leagueId}/rosters`);

const getLeagueUsers = (leagueId) =>
    fetchFromSleeperEndpoint(`/league/${leagueId}/users`);

export const getLeagueTransactions = (league, week) =>
    fetchFromSleeperEndpoint(
        `/league/${league.league_id}/transactions/${week}`,
        ttlFor(league),
    );

export const getLeagueMatchups = (league, week) =>
    fetchFromSleeperEndpoint(
        `/league/${league.league_id}/matchups/${week}`,
        ttlFor(league),
    );

const getWinnersBracket = (league) =>
    fetchFromSleeperEndpoint(
        `/league/${league.league_id}/winners_bracket`,
        ttlFor(league),
    );

// Every season of the league, oldest first. Walks back through
// previous_league_id and forward through the commissioner's newer leagues, so
// a renewed league is picked up without a code change.
export const getLeagueSeasons = async () => {
    const anchor = await getLeague(LEAGUE_ID);
    const seasons = [anchor];

    let previousId = anchor.previous_league_id;
    while (previousId && previousId !== "0") {
        const league = await getLeague(previousId);
        if (!league) break;
        seasons.unshift(league);
        previousId = league.previous_league_id;
    }

    const { league_season } = await getNflState();
    let latest = anchor;

    for (
        let season = Number(anchor.season) + 1;
        season <= Number(league_season) + 1;
        season++
    ) {
        const leagues = await getLeaguesForUser(COMMISSIONER_USER_ID, season);
        const next = leagues?.find(
            ({ previous_league_id }) => previous_league_id === latest.league_id,
        );

        if (!next) break;

        seasons.push(next);
        latest = next;
    }

    return seasons;
};

export const getCurrentLeague = async () => (await getLeagueSeasons()).at(-1);

// Roster id -> manager info for one season
export const getSeasonManagers = async (league) => {
    const [rosters, users] = await Promise.all([
        getLeagueRosters(league.league_id),
        getLeagueUsers(league.league_id),
    ]);

    return rosters.reduce((acc, { roster_id, owner_id }) => {
        const user = users.find(({ user_id }) => user_id === owner_id);

        acc[roster_id] = {
            rosterId: roster_id,
            userId: owner_id,
            name:
                MANAGER_NAMES[owner_id] ||
                user?.display_name ||
                `Team ${roster_id}`,
            avatar: user?.avatar || null,
        };

        return acc;
    }, {});
};

// Roster ids of the top three finishers, or null before the playoffs finish
export const getPlayoffResults = async (league) => {
    const bracket = await getWinnersBracket(league);

    const championship = bracket?.find(({ p }) => p === 1);
    const thirdPlace = bracket?.find(({ p }) => p === 3);

    if (!championship?.w) return null;

    return {
        champion: championship.w,
        runnerUp: championship.l,
        third: thirdPlace?.w || null,
    };
};
