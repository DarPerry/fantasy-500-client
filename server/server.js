import dayjs from "dayjs";
import cors from "cors";

import _ from "lodash";
import axios from "axios";
import express from "express";
import * as cheerio from "cheerio";
import {
    getAllDraftsForLeague,
    getDraftPicks,
} from "./services/draft.service.js";
import {
    getAllLeagueSeasons,
    getCurrentLeagueId,
    getLeagueManagers,
    getLeagueRosters,
    getLeagueTransactions,
} from "./services/league.service.js";

const ROUNDS_IN_DRAFT = 16;
// Players drafted before this round can't be kept
const FIRST_KEEPABLE_ROUND = 3;
const PORT = process.env.PORT || 1739;

import {
    getAllPlayers,
    normalizePlayerName,
} from "./services/player.service.js";
import { FANTASY_POSITIONS, LEAGUE_ID } from "./config/index.config.js";

const app = express();

app.use(cors());

const HistoryEntry = ({
    playerName,
    rosterId,
    season,
    week,
    type,
    round,
    pick,
    overall,
    keeper,
    timestamp,
}) => {
    const draftMetadata =
        round || pick || overall || keeper
            ? {
                  round,
                  pick,
                  overall,
                  keeper,
              }
            : null;

    return {
        rosterId,
        season: Number(season),
        week,
        type,
        timestamp,
        draftMetadata,
    };
};

const getValidPlayers = async () => {
    const allPlayers = await getAllPlayers();

    const playerIdMap = {};

    const teamNameMap = {
        ARI: "Arizona Cardinals",
        ATL: "Atlanta Falcons",
        BAL: "Baltimore Ravens",
        BUF: "Buffalo Bills",
        CAR: "Carolina Panthers",
        CHI: "Chicago Bears",
        CIN: "Cincinnati Bengals",
        CLE: "Cleveland Browns",
        DAL: "Dallas Cowboys",
        DEN: "Denver Broncos",
        DET: "Detroit Lions",
        GB: "Green Bay Packers",
        HOU: "Houston Texans",
        IND: "Indianapolis Colts",
        JAX: "Jacksonville Jaguars",
        KC: "Kansas City Chiefs",
        LAC: "Los Angeles Chargers",
        LAR: "Los Angeles Rams",
        LV: "Las Vegas Raiders",
        MIA: "Miami Dolphins",
        MIN: "Minnesota Vikings",
        NE: "New England Patriots",
        NO: "New Orleans Saints",
        NYG: "New York Giants",
        NYJ: "New York Jets",
        PHI: "Philadelphia Eagles",
        PIT: "Pittsburgh Steelers",
        SEA: "Seattle Seahawks",
        SF: "San Francisco 49ers",
        TB: "Tampa Bay Buccaneers",
        TEN: "Tennessee Titans",
        WAS: "Washington Commanders",
    };

    const additionalIdsToInclude = ["jamesonwilliams"];

    const players = Object.values(allPlayers).reduce((acc, player) => {
        const { status, position, active } = player;

        const isActive =
            additionalIdsToInclude.includes(player.search_full_name) ||
            ["Active", "Injured Reserve"].includes(status) ||
            (position === "DEF" && active);

        if (FANTASY_POSITIONS.includes(position)) {
            playerIdMap[
                normalizePlayerName(player.full_name) ||
                    `${teamNameMap[player.team]
                        .replaceAll(/ /g, "_")
                        .toUpperCase()}_DST`
            ] = player.player_id || `${player.team}_DST`;

            return acc.concat(player);
        }

        return acc;
    }, []);

    return { players, playerIdMap, playerIdMap };
};

const getAllDrafts = async () => {
    const allLeagueSeasons = await getAllLeagueSeasons();

    const allDrafts = await Promise.all(
        allLeagueSeasons.map(
            async ({ league_id }) => await getAllDraftsForLeague(league_id),
        ),
    );

    return _.flatten(allDrafts).filter(({ metadata: { name } }) => {
        return (
            !name.toUpperCase().includes("FANDUEL") &&
            !name.toUpperCase().includes("ADYEN")
        );
    });
};

const getDraftPicksByPlayerId = async () => {
    const allDrafts = await getAllDrafts();

    const allDraftPicks = [];

    await Promise.all(
        allDrafts.map(async ({ season, draft_id, start_time, last_picked }) => {
            const draftPicks = await getDraftPicks(draft_id);

            const picksWithSeason = draftPicks.map((pick) => {
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
            });

            allDraftPicks.push(...picksWithSeason);
        }),
    );

    return _.groupBy(allDraftPicks, "player_id");
};

const getTransactionByPlayerIDs = async () => {
    const allLeagueSeasons = await getAllLeagueSeasons();

    const transactions = await Promise.all(
        allLeagueSeasons.map(async ({ league_id, season }) => {
            const t = [];

            const p = await Promise.all(
                _.times(18).map((i) => getLeagueTransactions(league_id, i)),
            );

            t.push(..._.flatten(p));

            return _.flattenDeep(t.map((y) => ({ ...y, season })));
        }),
    );

    return _.flatten(transactions)
        .filter(({ status }) => status === "complete")
        .reduce((acc, { leg, adds, drops, type, season, status_updated }) => {
            Object.entries(adds || {}).forEach(([playerId, rosterId]) => {
                if (!acc[playerId]) {
                    acc[playerId] = [];
                }

                if (type === "commissioner") {
                    return;
                }

                const isWaiverMove = ["waiver", "free_agent"].includes(type);

                acc[playerId].push(
                    HistoryEntry({
                        rosterId,
                        season,
                        week: leg,
                        timestamp: status_updated,
                        type: isWaiverMove
                            ? "WAIVER_ADD"
                            : type === "trade"
                              ? "TRADED_IN"
                              : "DRAFT_PICK",
                    }),
                );
            });

            Object.entries(drops || {}).forEach(([playerId, rosterId]) => {
                const isWaiverMove = ["waiver", "free_agent"].includes(type);

                if (type === "commissioner") {
                    return;
                }

                if (!acc[playerId]) {
                    acc[playerId] = [];
                }
                acc[playerId].push(
                    HistoryEntry({
                        rosterId,
                        season,
                        week: leg,
                        timestamp: status_updated,
                        type: isWaiverMove
                            ? "WAIVER_DROP"
                            : type === "trade"
                              ? "TRADED_OUT"
                              : "DRAFT_PICK",
                    }),
                );
            });

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

const getPlayerKeeperValue = (transactions, playerAdr, keeperSeason) => {
    const nonTradedTransactions = transactions.filter(
        ({ type }) => !type.includes("TRADE"),
    );

    const lastTransaction = nonTradedTransactions?.at(0);

    if (!lastTransaction) return 0;

    const {
        season: lastTransactionSeason,
        type: lastTransactionSeasonType,
        round: lastRoundDrafted,
    } = lastTransaction;

    let keeperValue = 0;

    if (
        Number(lastTransactionSeason) !== keeperSeason ||
        lastTransactionSeasonType === "WAIVER_DROP" ||
        (lastTransactionSeasonType.startsWith("DRAFT") &&
            lastRoundDrafted < FIRST_KEEPABLE_ROUND)
    ) {
        return 0;
    } else if (lastTransactionSeasonType === "DRAFT_PICK") {
        keeperValue = lastRoundDrafted - 1;
    } else if (lastTransactionSeasonType === "DRAFT_KEEPER") {
        // Trades are included here so a trade resets the keeper streak
        const streakEnd = transactions.findIndex(
            ({ type }) => type !== "DRAFT_KEEPER",
        );
        const timesKept = streakEnd === -1 ? transactions.length : streakEnd;

        keeperValue = lastRoundDrafted - getKeeperAdjustment(timesKept);
    } else {
        keeperValue = !playerAdr ? ROUNDS_IN_DRAFT : playerAdr + 1;
    }

    if (keeperValue < 0) {
        return 0;
    }

    if (keeperValue > ROUNDS_IN_DRAFT) {
        return ROUNDS_IN_DRAFT;
    }

    return keeperValue;
};

// Rounds added for the next keep: 1, 2, 3, 5, 8, ... (Fibonacci)
const getKeeperAdjustment = (timesKept) => {
    let [prev, curr] = [1, 1];

    for (let i = 0; i < timesKept; i++) {
        [prev, curr] = [curr, prev + curr];
    }

    return curr;
};

const getAllPlayersTransactions = async () => {
    const { players } = await getValidPlayers();

    const playerAdpMap = await getSleeperAdpMap();

    // Keeper costs are based on the latest season that has drafted
    const keeperSeason = _.max(
        (await getAllLeagueSeasons()).map(({ season }) => Number(season)),
    );

    const draftPicksByPlayerId = await getDraftPicksByPlayerId();
    const transactionsByPlayerId = await getTransactionByPlayerIDs();

    return players.map((player) => {
        const { player_id: playerId, full_name, position, team } = player;

        const adp = playerAdpMap[playerId] || null;
        const adr = adp ? Math.ceil(adp / 12) : null;

        const playerDraftPicks = draftPicksByPlayerId[playerId];
        const playerTransactions = transactionsByPlayerId[playerId];

        const transactions = mergePlayerTransactions(
            playerDraftPicks,
            playerTransactions,
        );

        // console.log(44444, full_name, transactions);

        const keeperValueForCurrentTeam = getPlayerKeeperValue(
            transactions,
            adr,
            keeperSeason,
        );

        // Waiver pickups cost ADP + 1, so their price depends on next year's ADP
        const lastAcquisition = transactions.find(
            ({ type }) => !type.includes("TRADE"),
        );
        const isWaiverCost =
            keeperValueForCurrentTeam > 0 &&
            lastAcquisition?.type === "WAIVER_ADD";

        return {
            // ...player,
            playerId,
            team,
            adp,
            adr,
            name: full_name || `${team} DST`,
            position,
            keeperValueForCurrentTeam,
            isWaiverCost,
            keeperDraftYear: keeperSeason + 1,
            // transactions,
            diff:
                keeperValueForCurrentTeam <= 0 || !adr
                    ? 999
                    : adr - keeperValueForCurrentTeam,
        };
    });
};

const getRostersByTeamId = async () => {
    // const currentLeagueID = await getCurrentLeagueId();
    const rosters = await getLeagueRosters(LEAGUE_ID);
    const allPlayerHistory = await getAllPlayersTransactions();

    const nameMap = {
        1: "Darius",
        2: "Zack",
        3: "Nick",
        4: "Jeremiah",
        5: "Bob",
        6: "Hues",
        7: "Diego",
        8: "Jack",
        9: "Quast",
        10: "T Cool",
        11: "Tri",
        12: "Joel",
    };

    const playerHistoryById = _.keyBy(allPlayerHistory, "playerId");

    return rosters.reduce((acc, { roster_id, players }) => {
        acc[roster_id] = players.map((playerId) => ({
            ...playerHistoryById[playerId],
            rosteredBy: nameMap[roster_id],
        }));
        return acc;
    }, {});
};

const getHighestScoringWeekTeam = async () => {
    const weeksInSeason = 17;

    const x = await Promise.all(
        _.times(weeksInSeason, async (week) => {
            return axios.get(
                `https://api.sleeper.app/v1/league/964962685274103808/matchups/${
                    week + 1
                }`,
            );

            console.log(
                `https://api.sleeper.app/v1/league/${LEAGUE_ID}/matchups/${
                    week + 1
                }`,
            );

            console.log(data);

            return data;
        }),
    );
};

app.get("/", async (req, res) => {
    return res.send(await getRostersByTeamId());

    const weeksInSeason = 17;

    const x = await Promise.all(
        _.times(weeksInSeason, async (week) => {
            return axios.get(
                `https://api.sleeper.app/v1/league/964962685274103808/matchups/${
                    week + 1
                }`,
            );

            console.log(
                `https://api.sleeper.app/v1/league/${LEAGUE_ID}/matchups/${
                    week + 1
                }`,
            );

            console.log(data);

            return data;
        }),
    );

    const data2 = x.map(({ data }, index) => ({
        week: index + 1,
        matchups: data,
    }));

    const rosterIdMap = await getLeagueManagers();

    return res.send(
        data2.reduce(
            (acc, { week, matchups }) => {
                const highestScoring = _.maxBy(matchups, "points");

                if (
                    highestScoring.points > 0 &&
                    highestScoring.points > acc.score
                ) {
                    acc.week = week;
                    acc.roster = highestScoring.roster_id;
                    acc.score = highestScoring.points;
                    acc.manager =
                        rosterIdMap[highestScoring.roster_id].display_name;
                }

                return acc;
            },
            {
                week: null,
                roster: null,
                score: 0,
                manager: null,
            },
        ),
    );
});

export const getSleeperAdpMap = async () => {
    const { data: sleeperAdp } = await axios.get(
        "https://api.sleeper.com/projections/nfl/2026?season_type=regular&position[]=DEF&position[]=K&position[]=QB&position[]=RB&position[]=TE&position[]=WR&order_by=adp_2qb",
    );

    return sleeperAdp.reduce((acc, { player_id, stats: { adp_2qb } }) => {
        _.set(acc, player_id, adp_2qb);

        return acc;
    }, {});
};

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
