import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { orderBy, sortBy } from "lodash-es";
import classNames from "classnames";
import styles from "./KeeperPrices.module.scss";

import Page from "../components/Page/Page";
import PlayerRow from "../components/PlayerRow/PlayerRow";
import { getPlayersFromApiResponse } from "../helpers/players.helper";
import { readStorage, writeStorage } from "../helpers/storage.helper";
import { useLeague } from "../context/league";
import { Chip, ChipRow } from "../components/Chip/Chip";
import Icon from "../components/Icon/Icon";

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "K", "DEF"];

const ALL_SORT_OPTIONS = [
    { id: "adp", label: "ADP", key: "adp" },
    { id: "cost", label: "Cost", key: "keeperValueForCurrentTeam" },
    { id: "name", label: "Name", key: "name" },
    { id: "value", label: "Value", key: "diff", offseasonOnly: true },
];

const FILTERS_STORAGE_KEY = "keeperFilters";

const Toggle = ({ checked, onChange, label }) => (
    <label className={styles.toggle}>
        <input
            type="checkbox"
            checked={checked}
            onChange={() => onChange(!checked)}
        />
        <span className={styles.toggleTrack} aria-hidden="true" />
        {label}
    </label>
);

// Filters live in the URL so a filtered view can be shared as a link, and are
// remembered for the session when switching pages
const useKeeperFilters = (defaultTeam) => {
    const [params, setParams] = useSearchParams();

    useLayoutEffect(() => {
        const saved = readStorage(sessionStorage, FILTERS_STORAGE_KEY, "");

        if (!params.toString() && saved) {
            setParams(saved, { replace: true });
        }
        // Only restore once, on arrival
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        writeStorage(sessionStorage, FILTERS_STORAGE_KEY, params.toString());
    }, [params]);

    const update = (key, value, defaultValue) => {
        const next = new URLSearchParams(params);

        if (value === defaultValue || value === "") {
            next.delete(key);
        } else {
            next.set(key, value);
        }

        setParams(next, { replace: true });
    };

    return {
        team: params.get("team") || defaultTeam,
        position: params.get("pos") || "ALL",
        sortId: params.get("sort") || "adp",
        direction: params.get("dir") === "desc" ? "desc" : "asc",
        keepableOnly: params.get("all") !== "1",
        hideNegative: params.get("hideneg") === "1",
        search: params.get("q") || "",
        setTeam: (team) => update("team", team, defaultTeam),
        setPosition: (position) => update("pos", position, "ALL"),
        setSortId: (sortId) => update("sort", sortId, "adp"),
        setDirection: (direction) => update("dir", direction, "asc"),
        setKeepableOnly: (keepableOnly) =>
            update("all", keepableOnly ? "0" : "1", "0"),
        setHideNegative: (hide) => update("hideneg", hide ? "1" : "0", "0"),
        setSearch: (search) => update("q", search, ""),
    };
};

const KeeperPricesPage = () => {
    const {
        players: allPlayers,
        managers,
        league,
        isInSeason,
        isLoading,
        hasError,
        reload,
        myTeam,
        setMyUserId,
    } = useLeague();

    const filters = useKeeperFilters(myTeam?.name || "All");
    const [toast, setToast] = useState(null);

    // Value compares against ADP, which is stale during the season
    const sortOptions = ALL_SORT_OPTIONS.filter(
        ({ offseasonOnly }) => !(offseasonOnly && isInSeason)
    );
    const sortOption =
        sortOptions.find(({ id }) => id === filters.sortId) || sortOptions[0];

    const players = getPlayersFromApiResponse(
        allPlayers,
        { key: sortOption.key, direction: filters.direction },
        {
            position: filters.position,
            roster: filters.team,
            ineligible: filters.keepableOnly,
            value: !isInSeason && filters.hideNegative,
            search: filters.search,
        }
    );

    // Show a slim summary bar once the filters scroll off screen
    const controlsRef = useRef(null);
    const [showSummaryBar, setShowSummaryBar] = useState(false);

    useEffect(() => {
        if (!controlsRef.current) return;

        const observer = new IntersectionObserver(([entry]) =>
            setShowSummaryBar(
                !entry.isIntersecting && entry.boundingClientRect.top < 0
            )
        );
        observer.observe(controlsRef.current);

        return () => observer.disconnect();
    }, [isLoading, hasError]);

    useEffect(() => {
        if (!toast) return;

        const timeout = setTimeout(() => setToast(null), 2500);
        return () => clearTimeout(timeout);
    }, [toast]);

    const owners = sortBy(managers.map(({ name }) => name));
    // Your team first
    const teamChips = [
        "All",
        ...(myTeam ? [myTeam.name] : []),
        ...owners.filter((name) => name !== myTeam?.name),
    ];

    const draftSlots = managers.reduce((acc, { name, draftSlot }) => {
        acc[name] = draftSlot;
        return acc;
    }, {});

    const hcThreshold = 20;

    const withValue = allPlayers.filter(
        ({ adp, keeperValueForCurrentTeam }) => adp && keeperValueForCurrentTeam
    );

    const hotColdPlayers = orderBy(withValue, ["diff", "adp"]).reduce(
        (acc, { playerId }, index) => {
            if (index < hcThreshold) {
                acc[playerId] = "HOT";
            } else if (index > withValue.length - hcThreshold) {
                acc[playerId] = "COLD";
            }

            return acc;
        },
        {}
    );

    const playerCount = `${players.length} ${
        players.length === 1 ? "player" : "players"
    }`;

    const summary = [
        filters.team === "All" ? "All teams" : filters.team,
        filters.position === "ALL" ? "All positions" : filters.position,
        filters.search && `“${filters.search}”`,
    ]
        .filter(Boolean)
        .join(" · ");

    const selectedManager = managers.find(({ name }) => name === filters.team);
    const isMyTeamSelected = !!myTeam && myTeam.name === filters.team;

    const share = async () => {
        const url = new URL(window.location.href);
        // Always include the team so the link shows the same view for others
        url.searchParams.set("team", filters.team);

        try {
            if (navigator.share) {
                await navigator.share({
                    title: `${summary} keepers`,
                    url: url.toString(),
                });
            } else {
                await navigator.clipboard.writeText(url.toString());
                setToast("Link copied");
            }
        } catch (error) {
            if (error?.name !== "AbortError") setToast("Couldn't share link");
        }
    };

    return (
        <Page isLoading={isLoading} hasError={hasError} onRetry={reload}>
            <div
                className={classNames(
                    styles.summaryBar,
                    showSummaryBar && styles.visible
                )}
                aria-hidden={!showSummaryBar}
            >
                <div className={styles.summaryInner}>
                    <div className={styles.summaryText}>
                        <b>{summary}</b>
                        <span>
                            {playerCount} · {sortOption.label}{" "}
                            {filters.direction === "asc" ? "↑" : "↓"}
                        </span>
                    </div>
                    <button
                        type="button"
                        className={styles.summaryButton}
                        tabIndex={showSummaryBar ? 0 : -1}
                        onClick={() =>
                            window.scrollTo({ top: 0, behavior: "smooth" })
                        }
                    >
                        <Icon name="sliders" />
                        Filters
                    </button>
                </div>
            </div>

            <section className={styles.controls} ref={controlsRef}>
                <div className={styles.search}>
                    <Icon name="magnifying-glass" />
                    <input
                        type="search"
                        placeholder="Search players"
                        aria-label="Search players"
                        value={filters.search}
                        onChange={(event) =>
                            filters.setSearch(event.target.value)
                        }
                        enterKeyHint="search"
                        autoComplete="off"
                    />
                    {filters.search && (
                        <button
                            type="button"
                            className={styles.clearSearch}
                            aria-label="Clear search"
                            onClick={() => filters.setSearch("")}
                        >
                            <Icon name="xmark" />
                        </button>
                    )}
                </div>

                <div className={styles.filterRow}>
                    <div className={styles.filterLabel}>Team</div>
                    <ChipRow fade>
                        {teamChips.map((owner) => (
                            <Chip
                                key={owner}
                                active={filters.team === owner}
                                onClick={() => filters.setTeam(owner)}
                                starred={owner === myTeam?.name}
                            >
                                {owner}
                            </Chip>
                        ))}
                    </ChipRow>
                </div>

                <div className={styles.filterRow}>
                    <div className={styles.filterLabel}>Position</div>
                    <ChipRow>
                        {POSITIONS.map((position) => (
                            <Chip
                                key={position}
                                active={filters.position === position}
                                onClick={() => filters.setPosition(position)}
                                variant={position}
                            >
                                {position === "ALL" ? "All" : position}
                            </Chip>
                        ))}
                    </ChipRow>
                </div>

                <div className={styles.filterRow}>
                    <div className={styles.filterLabel}>Sort</div>
                    <div className={styles.sortRow}>
                        <div className={styles.segmented}>
                            {sortOptions.map(({ id, label }) => (
                                <button
                                    type="button"
                                    key={id}
                                    className={classNames(
                                        styles.segment,
                                        sortOption.id === id && styles.active
                                    )}
                                    aria-pressed={sortOption.id === id}
                                    onClick={() => filters.setSortId(id)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            className={styles.direction}
                            aria-label={`Sort ${
                                filters.direction === "asc"
                                    ? "descending"
                                    : "ascending"
                            }`}
                            onClick={() =>
                                filters.setDirection(
                                    filters.direction === "asc" ? "desc" : "asc"
                                )
                            }
                        >
                            <Icon
                                name={`arrow-${
                                    filters.direction === "asc" ? "up" : "down"
                                }-short-wide`}
                            />
                            {filters.direction === "asc" ? "Asc" : "Desc"}
                        </button>
                    </div>
                </div>

                <div className={styles.toggles}>
                    <Toggle
                        checked={filters.keepableOnly}
                        onChange={filters.setKeepableOnly}
                        label="Keepable only"
                    />
                    {!isInSeason && (
                        <Toggle
                            checked={filters.hideNegative}
                            onChange={filters.setHideNegative}
                            label="Hide negative value"
                        />
                    )}
                </div>
            </section>

            <div className={styles.resultsBar}>
                <span>
                    <b>{players.length}</b>{" "}
                    {players.length === 1 ? "player" : "players"}
                </span>
                <div className={styles.resultsActions}>
                    {selectedManager && (
                        <button
                            type="button"
                            className={classNames(
                                styles.textButton,
                                isMyTeamSelected && styles.active
                            )}
                            aria-pressed={isMyTeamSelected}
                            onClick={() =>
                                setMyUserId(
                                    isMyTeamSelected
                                        ? null
                                        : selectedManager.userId
                                )
                            }
                        >
                            <Icon name="star" />
                            {isMyTeamSelected ? "My team" : "Set as my team"}
                        </button>
                    )}
                    <button
                        type="button"
                        className={styles.textButton}
                        onClick={share}
                    >
                        <Icon name="arrow-up-from-bracket" />
                        Share
                    </button>
                </div>
            </div>

            <div className={styles.list}>
                {players.map((player) => (
                    <PlayerRow
                        key={player.playerId}
                        {...player}
                        hotColdPlayers={hotColdPlayers}
                        draftSlot={draftSlots[player.rosteredBy]}
                        teams={league?.teams}
                        isInSeason={isInSeason}
                    />
                ))}
                {players.length === 0 && (
                    <div className={styles.empty}>
                        No players match these filters.
                    </div>
                )}
            </div>

            <div
                className={classNames(styles.toast, toast && styles.visible)}
                role="status"
            >
                {toast}
            </div>
        </Page>
    );
};

export default KeeperPricesPage;
