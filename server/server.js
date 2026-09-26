import cors from "cors";
import _ from "lodash";
import express from "express";

import {
    getAllDraftsForLeague,
    getDraftOrder,
    getDraftPicks,
} from "./services/draft.service.js";
import {
    getLeagueMatchups,
    getLeagueRosters,
    getLeagueSeasons,
    getLeagueTransactions,
    getNflState,
    getPlayoffResults,
    getSeasonManagers,
} from "./services/league.service.js";
import { getAdp, getAllPlayers } from "./services/player.service.js";
import { ROUNDS_IN_DRAFT } from "./config/index.config.js";
import { cached, TTL } from "./util/cache.js";

const PORT = process.env.PORT || 1739;
// Players drafted before this round can't be kept
const FIRST_KEEPABLE_ROUND = 3;
// Most recent moves shown in a player's history
const HISTORY_LENGTH = 6;

const app = express();

app.use(cors());

const ordinal = (number) => {
    const suffixes = ["th", "st", "nd", "rd"];
    const lastTwo = number % 100;

    return `${number}${
        suffixes[(lastTwo - 20) % 10] || suffixes[lastTwo] || suffixes[0]
    }`;
};

const HistoryEntry = ({ rosterId, season, week, type, timestamp }) => ({
    rosterId,
    season: Number(season),
    week,
    type,
    timestamp,
});

const getDraftPicksByPlayerId = async (seasons) => {
    const allDraftPicks = [];

    await Promise.all(
        seasons.map(async (league) => {
            const drafts = await getAllDraftsForLeague(league.league_id);

            await Promise.all(
                drafts.map(async (draft) => {
                    const { season, start_time, last_picked } = draft;
                    const draftPicks = await getDraftPicks(draft);

                    allDraftPicks.push(
                        ...draftPicks.map((pick) => {
                            const {
                                is_keeper,
                                round,
                                roster_id,
                                pick_no,
                                draft_slot,
                                player_id,
                            } = pick;

                            return {
                                player_id,
                                season: Number(season),
                                week: 0,
                                timestamp: last_picked || start_time,
                                type: `DRAFT_${is_keeper ? "KEEPER" : "PICK"}`,
                                round,
                                pick: draft_slot,
                                overall: pick_no,
                                draftedBy: roster_id,
                            };
                        }),
                    );
                }),
            );
        }),
    );

    return _.groupBy(allDraftPicks, "player_id");
};

const getTransactionByPlayerIDs = async (seasons) => {
    const transactions = await Promise.all(
        seasons.map(async (league) => {
            const weeks = await Promise.all(
                _.times(19).map((week) => getLeagueTransactions(league, week)),
            );

            return _.flatten(weeks).map((transaction) => ({
                ...transaction,
                season: league.season,
            }));
        }),
    );

    return _.flatten(transactions)
        .filter(({ status }) => status === "complete")
        .reduce((acc, { leg, adds, drops, type, season, status_updated }) => {
            if (type === "commissioner") return acc;

            const isWaiverMove = ["waiver", "free_agent"].includes(type);

            const addEntries = (moves, waiverType, tradeType) =>
                Object.entries(moves || {}).forEach(([playerId, rosterId]) => {
                    acc[playerId] = acc[playerId] || [];
                    acc[playerId].push(
                        HistoryEntry({
                            rosterId,
                            season,
                            week: leg,
                            timestamp: status_updated,
                            type: isWaiverMove
                                ? waiverType
                                : type === "trade"
                                  ? tradeType
                                  : "DRAFT_PICK",
                        }),
                    );
                });

            addEntries(adds, "WAIVER_ADD", "TRADED_IN");
            addEntries(drops, "WAIVER_DROP", "TRADED_OUT");

            return acc;
        }, {});
};

const mergePlayerTransactions = (draftPicks = [], transactions = []) => {
    return _.orderBy(
        [...draftPicks, ...transactions],
        ["season", "timestamp"],
        ["desc", "desc"],
    );
};

// Rounds added for the next keep: 1, 2, 3, 5, 8, ... (Fibonacci)
const getKeeperAdjustment = (timesKept) => {
    let [prev, curr] = [1, 1];

    for (let i = 0; i < timesKept; i++) {
        [prev, curr] = [curr, prev + curr];
    }

    return curr;
};

// Returns the keeper round (0 = can't be kept) and a plain-English reason
const getPlayerKeeperValue = (
    transactions,
    playerAdr,
    keeperSeason,
    adpIsForDraftYear,
) => {
    const nonTradedTransactions = transactions.filter(
        ({ type }) => !type.includes("TRADE"),
    );

    const lastTransaction = nonTradedTransactions.at(0);

    if (!lastTransaction) {
        return { value: 0, reason: "No draft or pickup history." };
    }

    const { season, type, round, week } = lastTransaction;

    if (Number(season) !== keeperSeason) {
        return { value: 0, reason: `Last acquired in ${season}.` };
    }

    if (type === "WAIVER_DROP") {
        return { value: 0, reason: `Dropped in week ${week}.` };
    }

    if (type.startsWith("DRAFT") && round < FIRST_KEEPABLE_ROUND) {
        return {
            value: 0,
            reason: `${type === "DRAFT_KEEPER" ? "Kept" : "Drafted"} in the ${ordinal(
                round,
            )} round. Players from rounds 1–2 can't be kept.`,
        };
    }

    let value;
    let reason;

    if (type === "DRAFT_PICK") {
        value = round - 1;
        reason = `Drafted in the ${ordinal(round)} round in ${season}, so keeping costs 1 round earlier.`;
    } else if (type === "DRAFT_KEEPER") {
        // Trades are included here so a trade resets the keeper streak
        const streakEnd = transactions.findIndex(
            ({ type }) => type !== "DRAFT_KEEPER",
        );
        const timesKept = streakEnd === -1 ? transactions.length : streakEnd;
        const adjustment = getKeeperAdjustment(timesKept);

        value = round - adjustment;
        reason =
            timesKept === 0
                ? `Kept in the ${ordinal(round)} round, then traded, so the keeper count reset: 1 round earlier.`
                : `Kept in the ${ordinal(round)} round (${timesKept} ${
                      timesKept === 1 ? "year" : "years in a row"
                  }), so the next keep costs ${adjustment} rounds earlier.`;
    } else if (!adpIsForDraftYear) {
        value = playerAdr ? playerAdr + 1 : ROUNDS_IN_DRAFT;
        reason = `Picked up in week ${week}, so the cost is 1 round after next year's ADP.`;
    } else if (playerAdr) {
        value = playerAdr + 1;
        reason = `Picked up in week ${week}, so the cost is 1 round after ADP (${ordinal(
            playerAdr,
        )} round).`;
    } else {
        value = ROUNDS_IN_DRAFT;
        reason = `Picked up in week ${week} with no ADP, so the cost is the last round.`;
    }

    if (value <= 0) {
        return { value: 0, reason: `${reason} No earlier round is left.` };
    }

    return { value: Math.min(value, ROUNDS_IN_DRAFT), reason };
};

// A player's recent moves, newest first, for the "why this cost" panel
const getPlayerHistory = (transactions, managersBySeason) =>
    transactions
        // A trade shows up as a drop and an add; the add says who got him
        .filter(({ type }) => type !== "TRADED_OUT")
        .slice(0, HISTORY_LENGTH)
        .map(({ season, week, type, round, rosterId, draftedBy }) => ({
            season,
            week,
            type,
            round: round || null,
            manager:
                managersBySeason[season]?.[rosterId || draftedBy]?.name || null,
        }));

const getManagersBySeason = async (seasons) => {
    const managers = await Promise.all(seasons.map(getSeasonManagers));

    return seasons.reduce((acc, { season }, index) => {
        acc[season] = managers[index];
        return acc;
    }, {});
};

const getKeeperData = () =>
    cached("keepers", TTL.SHORT, async () => {
        const seasons = await getLeagueSeasons();
        const draftedSeasons = seasons.filter(
            ({ status }) => status !== "pre_draft",
        );
        const currentLeague = seasons.at(-1);

        // Keeper costs are based on the latest season that has drafted
        const keeperSeason = Number(draftedSeasons.at(-1).season);
        const keeperDraftYear = keeperSeason + 1;

        const [
            allPlayers,
            adp,
            draftPicksByPlayerId,
            transactionsByPlayerId,
            managersBySeason,
            rosters,
        ] = await Promise.all([
            getAllPlayers(),
            getAdp(keeperDraftYear, keeperSeason),
            getDraftPicksByPlayerId(draftedSeasons),
            getTransactionByPlayerIDs(draftedSeasons),
            getManagersBySeason(seasons),
            getLeagueRosters(currentLeague.league_id),
        ]);

        const currentManagers = managersBySeason[currentLeague.season];

        const getPlayer = (playerId, rosterId) => {
            const player = allPlayers[playerId];

            if (!player) return null;

            const { full_name, position, team } = player;

            const adpValue = adp.adpMap[playerId] || null;
            const adr = adpValue ? Math.ceil(adpValue / 12) : null;

            const transactions = mergePlayerTransactions(
                draftPicksByPlayerId[playerId],
                transactionsByPlayerId[playerId],
            );

            const { value: keeperValueForCurrentTeam, reason } =
                getPlayerKeeperValue(
                    transactions,
                    adr,
                    keeperSeason,
                    adp.isForDraftYear,
                );

            // Waiver pickups cost ADP + 1, so their price depends on next year's ADP
            const lastAcquisition = transactions.find(
                ({ type }) => !type.includes("TRADE"),
            );
            const isWaiverCost =
                keeperValueForCurrentTeam > 0 &&
                lastAcquisition?.type === "WAIVER_ADD";

            return {
                playerId,
                team,
                adp: adpValue,
                adr,
                name: full_name || `${team} DST`,
                position,
                keeperValueForCurrentTeam,
                costReason: reason,
                history: getPlayerHistory(transactions, managersBySeason),
                isWaiverCost,
                keeperDraftYear,
                rosterId,
                rosteredBy: currentManagers[rosterId]?.name,
                diff:
                    keeperValueForCurrentTeam <= 0 || !adr
                        ? 999
                        : adr - keeperValueForCurrentTeam,
            };
        };

        const rostersById = rosters.reduce((acc, { roster_id, players }) => {
            acc[roster_id] = (players || [])
                .map((playerId) => getPlayer(playerId, roster_id))
                .filter(Boolean);

            return acc;
        }, {});

        return {
            seasons,
            currentLeague,
            keeperSeason,
            keeperDraftYear,
            adp,
            rosters,
            rostersById,
            managersBySeason,
        };
    });

const getLeagueInfo = () =>
    cached("league", TTL.SHORT, async () => {
        const {
            seasons,
            currentLeague,
            keeperSeason,
            keeperDraftYear,
            adp,
            rosters,
            managersBySeason,
        } = await getKeeperData();

        const draftOrder = await getDraftOrder(seasons);

        // Most recent season with a finished championship
        let champion = null;
        for (const league of [...seasons].reverse()) {
            const results = await getPlayoffResults(league);

            if (results) {
                champion = {
                    season: Number(league.season),
                    name: managersBySeason[league.season][results.champion]
                        ?.name,
                };
                break;
            }
        }

        const managers = Object.values(
            managersBySeason[currentLeague.season],
        ).map((manager) => ({
            ...manager,
            draftSlot: draftOrder.order[manager.userId] || null,
        }));

        return {
            name: currentLeague.name,
            season: Number(currentLeague.season),
            status: currentLeague.status,
            keeperSeason,
            keeperDraftYear,
            // Values need next year's ADP, which Sleeper publishes in the summer
            isInSeason: !adp.isForDraftYear,
            adpSeason: adp.season,
            champion,
            teams: currentLeague.settings?.num_teams || managers.length,
            rounds: ROUNDS_IN_DRAFT,
            draftOrderSeason: draftOrder.season,
            managers: _.sortBy(managers, "name"),
            // Keepers declared in Sleeper for the next draft, by roster id
            declaredKeepers: rosters.reduce((acc, { roster_id, keepers }) => {
                acc[roster_id] = keepers || [];
                return acc;
            }, {}),
        };
    });

// Every team's score for every finished regular-season week
const getWeeklyScores = async (league, state) => {
    const { start_week, playoff_week_start } = league.settings || {};
    const firstWeek = start_week || 1;
    let lastWeek = (playoff_week_start || 15) - 1;

    // Only count finished weeks of the season in progress
    if (league.season === state.season && league.status !== "complete") {
        lastWeek = Math.min(lastWeek, Number(state.week) - 1);
    }

    const weeks = _.range(firstWeek, lastWeek + 1);
    const matchups = await Promise.all(
        weeks.map((week) => getLeagueMatchups(league, week)),
    );

    return weeks.flatMap((week, index) =>
        (matchups[index] || [])
            .filter(({ points }) => points > 0)
            .map(({ roster_id, points }) => ({
                week,
                rosterId: roster_id,
                points,
            })),
    );
};

const getHistory = () =>
    cached("history", TTL.SHORT, async () => {
        const [{ seasons, managersBySeason, currentLeague }, state] =
            await Promise.all([getKeeperData(), getNflState()]);

        const playedSeasons = seasons.filter(
            ({ status }) => status !== "pre_draft",
        );

        const seasonSummaries = await Promise.all(
            playedSeasons.map(async (league) => {
                const managers = managersBySeason[league.season];
                const nameOf = (rosterId) =>
                    rosterId ? managers[rosterId]?.name || null : null;

                const [results, scores] = await Promise.all([
                    getPlayoffResults(league),
                    getWeeklyScores(league, state),
                ]);

                const highScore = _.maxBy(scores, "points");

                return {
                    season: Number(league.season),
                    leagueName: league.name,
                    status: league.status,
                    champion: nameOf(results?.champion),
                    runnerUp: nameOf(results?.runnerUp),
                    third: nameOf(results?.third),
                    highScore: highScore && {
                        week: highScore.week,
                        name: nameOf(highScore.rosterId),
                        points: highScore.points,
                    },
                    topScores: _.orderBy(scores, "points", "desc")
                        .slice(0, 5)
                        .map(({ week, rosterId, points }) => ({
                            week,
                            name: nameOf(rosterId),
                            points,
                        })),
                };
            }),
        );

        return {
            currentSeason: Number(currentLeague.season),
            // Latest season that has been played, for the high score race
            latestSeason: Number(playedSeasons.at(-1).season),
            seasons: seasonSummaries.reverse(),
        };
    });

const handle = (getData) => async (req, res) => {
    try {
        res.send(await getData());
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Couldn't load data from Sleeper" });
    }
};

// Rosters keyed by roster id (the original endpoint, kept for older clients)
app.get(
    "/",
    handle(async () => (await getKeeperData()).rostersById),
);
app.get("/league", handle(getLeagueInfo));
app.get("/history", handle(getHistory));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

    // Warm the cache so the first visitor doesn't wait
    Promise.all([getLeagueInfo(), getHistory()]).catch((error) =>
        console.error("Warming the cache failed:", error.message),
    );
});
