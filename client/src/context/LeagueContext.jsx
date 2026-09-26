import { useCallback, useEffect, useMemo, useState } from "react";
import { sortBy, uniqBy } from "lodash-es";

import { fetchJson } from "../api";
import { SEASON_MODE_OVERRIDE } from "../constants";
import { useLocalState } from "../helpers/storage.helper";
import { LeagueContext } from "./league";

// Used when /league isn't available (e.g. the server hasn't been redeployed
// yet), so keeper prices still work without the extras
const getFallbackLeague = (players) => {
    const managers = sortBy(
        uniqBy(players, "rosterId").map(({ rosterId, rosteredBy }) => ({
            rosterId,
            userId: `roster-${rosterId}`,
            name: rosteredBy,
            draftSlot: null,
        })),
        "name"
    );

    return {
        name: "The Fantasy 500",
        champion: null,
        isInSeason: true,
        keeperDraftYear: players[0]?.keeperDraftYear,
        teams: managers.length,
        rounds: 16,
        draftOrderSeason: null,
        managers,
        declaredKeepers: {},
    };
};

export const LeagueProvider = ({ children }) => {
    const [rosters, setRosters] = useState(null);
    // undefined while loading, null if /league couldn't be loaded
    const [league, setLeague] = useState(undefined);
    const [hasError, setHasError] = useState(false);
    // Sleeper user id of whoever uses this device
    const [myUserId, setMyUserId] = useLocalState("myUserId", null);

    const load = useCallback(async () => {
        setHasError(false);

        const [rosterResult, leagueResult] = await Promise.allSettled([
            fetchJson("/"),
            fetchJson("/league"),
        ]);

        if (rosterResult.status === "rejected") {
            console.error(rosterResult.reason);
            setHasError(true);
            return;
        }

        if (leagueResult.status === "rejected") {
            console.warn("League info unavailable:", leagueResult.reason);
        }

        setRosters(rosterResult.value);
        setLeague(
            leagueResult.status === "fulfilled" ? leagueResult.value : null
        );
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const value = useMemo(() => {
        // Roster id comes from the response key for older servers
        const players = Object.entries(rosters || {}).flatMap(
            ([rosterId, rosterPlayers]) =>
                rosterPlayers.map((player) => ({
                    ...player,
                    rosterId: player.rosterId ?? Number(rosterId),
                }))
        );

        const leagueInfo =
            league || (rosters ? getFallbackLeague(players) : null);

        const isInSeason =
            SEASON_MODE_OVERRIDE === null
                ? (leagueInfo?.isInSeason ?? true)
                : SEASON_MODE_OVERRIDE === "IN_SEASON";

        const managers = leagueInfo?.managers || [];
        const myTeam =
            managers.find(({ userId }) => userId === myUserId) || null;

        return {
            league: leagueInfo,
            rosters,
            players,
            managers,
            isInSeason,
            isLoading: !hasError && (rosters === null || league === undefined),
            hasError,
            reload: load,
            myTeam,
            setMyUserId,
        };
    }, [league, rosters, hasError, load, myUserId, setMyUserId]);

    return (
        <LeagueContext.Provider value={value}>
            {children}
        </LeagueContext.Provider>
    );
};
