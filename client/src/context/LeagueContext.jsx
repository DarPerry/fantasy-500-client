import { useCallback, useEffect, useMemo, useState } from "react";
import { flattenDeep } from "lodash-es";

import { fetchJson } from "../api";
import { SEASON_MODE_OVERRIDE } from "../constants";
import { useLocalState } from "../helpers/storage.helper";
import { LeagueContext } from "./league";

export const LeagueProvider = ({ children }) => {
    const [rosters, setRosters] = useState(null);
    const [league, setLeague] = useState(null);
    const [hasError, setHasError] = useState(false);
    // Sleeper user id of whoever uses this device
    const [myUserId, setMyUserId] = useLocalState("myUserId", null);

    const load = useCallback(async () => {
        setHasError(false);

        try {
            const [rosterData, leagueData] = await Promise.all([
                fetchJson("/"),
                fetchJson("/league"),
            ]);

            setRosters(rosterData);
            setLeague(leagueData);
        } catch (error) {
            console.error(error);
            setHasError(true);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const value = useMemo(() => {
        const isInSeason =
            SEASON_MODE_OVERRIDE === null
                ? (league?.isInSeason ?? true)
                : SEASON_MODE_OVERRIDE === "IN_SEASON";

        const players = flattenDeep(Object.values(rosters || {}));
        const managers = league?.managers || [];
        const myTeam =
            managers.find(({ userId }) => userId === myUserId) || null;

        return {
            league,
            rosters,
            players,
            managers,
            isInSeason,
            isLoading: !hasError && (rosters === null || league === null),
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
