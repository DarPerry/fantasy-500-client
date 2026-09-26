import axios from "axios";
import _ from "lodash";

import { fetchFromSleeperEndpoint } from "../util/api.util.js";
import { cached, TTL } from "../util/cache.js";

// ~5MB, and Sleeper asks that it be fetched at most once a day
export const getAllPlayers = async () =>
    fetchFromSleeperEndpoint(`/players/nfl`, TTL.DAY);

// Player id -> superflex ADP from Sleeper's projections for a season
const getSleeperAdpMap = (season) =>
    cached(`adp-${season}`, TTL.SHORT, async () => {
        const { data } = await axios.get(
            `https://api.sleeper.com/projections/nfl/${season}?season_type=regular&position[]=DEF&position[]=K&position[]=QB&position[]=RB&position[]=TE&position[]=WR&order_by=adp_2qb`,
        );

        return data.reduce((acc, { player_id, stats }) => {
            if (stats?.adp_2qb) _.set(acc, player_id, stats.adp_2qb);

            return acc;
        }, {});
    });

// Uses next draft's ADP once Sleeper publishes it, otherwise the latest season's
export const getAdp = async (draftYear, latestSeason) => {
    const nextDraftAdp = await getSleeperAdpMap(draftYear);

    if (Object.keys(nextDraftAdp).length) {
        return {
            season: draftYear,
            adpMap: nextDraftAdp,
            isForDraftYear: true,
        };
    }

    return {
        season: latestSeason,
        adpMap: await getSleeperAdpMap(latestSeason),
        isForDraftYear: false,
    };
};
