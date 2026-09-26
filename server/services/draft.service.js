import { fetchFromSleeperEndpoint } from "../util/api.util.js";
import { TTL } from "../util/cache.js";

export const getAllDraftsForLeague = async (leagueId) =>
    fetchFromSleeperEndpoint(`/league/${leagueId}/drafts`);

// Picks never change once a draft is complete
export const getDraftPicks = async (draft) =>
    fetchFromSleeperEndpoint(
        `/draft/${draft.draft_id}/picks`,
        draft.status === "complete" ? TTL.DAY : TTL.SHORT,
    );

// Sleeper user id -> draft slot for the next draft, falling back to the most
// recent draft order until the commissioner sets the new one
export const getDraftOrder = async (leagues) => {
    for (const league of [...leagues].reverse()) {
        const drafts = await getAllDraftsForLeague(league.league_id);
        const order = drafts?.find(
            ({ draft_order }) => draft_order,
        )?.draft_order;

        if (order) return { season: Number(league.season), order };
    }

    return { season: null, order: {} };
};
