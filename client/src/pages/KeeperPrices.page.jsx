import { useEffect, useRef, useState } from "react";
import _ from "lodash";
import classNames from "classnames";
import styles from "./KeeperPrices.module.scss";

import Page from "../components/Page/Page";
import PlayerRow from "../components/PlayerRow/PlayerRow";
import { getPlayersFromApiResponse } from "../helpers/players.helper";
import { IS_IN_SEASON } from "../constants";

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "K", "DEF"];

const SORT_OPTIONS = [
    { label: "ADP", key: "adp" },
    { label: "Cost", key: "keeperValueForCurrentTeam" },
    { label: "Name", key: "name" },
    // Value compares against ADP, which is stale during the season
    ...(IS_IN_SEASON ? [] : [{ label: "Value", key: "diff" }]),
];

// Keeps filters when switching to the rules page and back
const useSessionState = (key, initialValue) => {
    const [value, setValue] = useState(() => {
        try {
            const saved = sessionStorage.getItem(key);
            return saved === null ? initialValue : JSON.parse(saved);
        } catch {
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
        } catch {
            // Storage can be unavailable (e.g. private browsing)
        }
    }, [key, value]);

    return [value, setValue];
};

const Chip = ({ active, onClick, children, className }) => (
    <button
        type="button"
        className={classNames(styles.chip, active && styles.active, className)}
        aria-pressed={active}
        onClick={onClick}
    >
        {children}
    </button>
);

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

const KeeperPricesPage = ({ data, hasError, onRetry }) => {
    const [rosterFilter, setRosterFilter] = useSessionState("team", "All");
    const [positionFilter, setPositionFilter] = useSessionState(
        "position",
        "ALL"
    );

    const [valueFilter, setValueFilter] = useSessionState(
        "hideNegative",
        false
    );
    const [ineligibleFilter, setIneligibleFilter] = useSessionState(
        "keepableOnly",
        true
    );

    const [sort, setSort] = useSessionState("sort", {
        key: "adp",
        direction: "asc",
    });

    // Show a slim summary bar once the filters scroll off screen
    const controlsRef = useRef(null);
    const [showSummaryBar, setShowSummaryBar] = useState(false);
    const isLoading = data === null;

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

    // A saved offseason sort/filter (e.g. Value) may not apply in season
    const sortOption =
        SORT_OPTIONS.find(({ key }) => key === sort.key) || SORT_OPTIONS[0];

    const players = getPlayersFromApiResponse(
        data,
        { ...sort, key: sortOption.key },
        {
            position: positionFilter,
            roster: rosterFilter,
            ineligible: ineligibleFilter,
            value: !IS_IN_SEASON && valueFilter,
        }
    );

    const allPlayers = _.flattenDeep(Object.values(data || {}));

    const owners = _.sortBy(
        _.uniq(allPlayers.map(({ rosteredBy }) => rosteredBy)).filter(Boolean)
    );

    const hcThreshold = 20;

    const filtered = allPlayers.filter(
        ({ adp, keeperValueForCurrentTeam }) => adp && keeperValueForCurrentTeam
    );

    const hotColdPlayers = _.orderBy(filtered, ["diff", "adp"]).reduce(
        (acc, { playerId }, index) => {
            if (index < hcThreshold) {
                acc[playerId] = "HOT";
            } else if (index > filtered.length - hcThreshold) {
                acc[playerId] = "COLD";
            } else {
                acc[playerId] = null;
            }

            return acc;
        },
        {}
    );

    const sortLabel = sortOption.label;

    const summary = [
        rosterFilter === "All" ? "All teams" : rosterFilter,
        positionFilter === "ALL" ? "All positions" : positionFilter,
    ].join(" · ");

    return (
        <Page isLoading={isLoading} hasError={hasError} onRetry={onRetry}>
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
                            {players.length} players · {sortLabel}{" "}
                            {sort.direction === "asc" ? "↑" : "↓"}
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
                        <i className="fa-solid fa-sliders" />
                        Filters
                    </button>
                </div>
            </div>

            <section className={styles.controls} ref={controlsRef}>
                <div className={styles.filterRow}>
                    <div className={styles.filterLabel}>Team</div>
                    <div className={classNames(styles.chips, styles.fade)}>
                        {["All", ...owners].map((owner) => (
                            <Chip
                                key={owner}
                                active={rosterFilter === owner}
                                onClick={() => setRosterFilter(owner)}
                            >
                                {owner}
                            </Chip>
                        ))}
                    </div>
                </div>

                <div className={styles.filterRow}>
                    <div className={styles.filterLabel}>Position</div>
                    <div className={styles.chips}>
                        {POSITIONS.map((position) => (
                            <Chip
                                key={position}
                                active={positionFilter === position}
                                onClick={() => setPositionFilter(position)}
                                className={styles[position]}
                            >
                                {position === "ALL" ? "All" : position}
                            </Chip>
                        ))}
                    </div>
                </div>

                <div className={styles.filterRow}>
                    <div className={styles.filterLabel}>Sort</div>
                    <div className={styles.sortRow}>
                        <div className={styles.segmented}>
                            {SORT_OPTIONS.map(({ label, key }) => (
                                <button
                                    type="button"
                                    key={key}
                                    className={classNames(
                                        styles.segment,
                                        sortOption.key === key && styles.active
                                    )}
                                    aria-pressed={sortOption.key === key}
                                    onClick={() => setSort({ ...sort, key })}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            className={styles.direction}
                            aria-label={`Sort ${
                                sort.direction === "asc"
                                    ? "descending"
                                    : "ascending"
                            }`}
                            onClick={() =>
                                setSort({
                                    ...sort,
                                    direction:
                                        sort.direction === "asc"
                                            ? "desc"
                                            : "asc",
                                })
                            }
                        >
                            <i
                                className={`fa-solid fa-arrow-${
                                    sort.direction === "asc" ? "up" : "down"
                                }-short-wide`}
                            />
                            {sort.direction === "asc" ? "Asc" : "Desc"}
                        </button>
                    </div>
                </div>

                <div className={styles.toggles}>
                    <Toggle
                        checked={ineligibleFilter}
                        onChange={setIneligibleFilter}
                        label="Keepable only"
                    />
                    {!IS_IN_SEASON && (
                        <Toggle
                            checked={valueFilter}
                            onChange={setValueFilter}
                            label="Hide negative value"
                        />
                    )}
                </div>
            </section>

            <div className={styles.resultsBar}>
                <span>
                    <b>{players.length}</b> players
                </span>
                <span>Sorted by {sortLabel}</span>
            </div>

            <div className={styles.list}>
                {players.map((player) => (
                    <PlayerRow
                        key={player.playerId}
                        {...player}
                        hotColdPlayers={hotColdPlayers}
                    />
                ))}
                {players.length === 0 && (
                    <div className={styles.empty}>
                        No players match these filters.
                    </div>
                )}
            </div>
        </Page>
    );
};

export default KeeperPricesPage;
