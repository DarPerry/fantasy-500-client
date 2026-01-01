import { useState } from "react";
import Select from "react-select";
import _ from "lodash";
import styles from "./KeeperPrices.module.scss";

import Page from "../components/Page/Page";
import PlayerRow from "../components/PlayerRow/PlayerRow";
import { getPlayersFromApiResponse } from "../helpers/players.helper";
import classNames from "classnames";
import PositionBadge from "../components/PositionBadge/PositionBadge";

const KeeperPricesPage = ({ data }) => {
    // console.log(2, data);
    const [rosterFilter, setRosterFilter] = useState("All");
    const [positionFilter, setPositionFilter] = useState("ALL");

    const [valueFilter, setValueFilter] = useState(false);
    const [ineligibleFilter, setIneligibleFilter] = useState(true);

    const [sort, setSort] = useState({
        key: "adp",
        direction: "asc",
    });

    const keyMap = {
        Cost: "keeperValueForCurrentTeam",
        Value: "diff",
        ADP: "adp",
        Name: "name",
    };

    const SortOption = ({ label }) => {
        const keyMap = {
            Cost: "keeperValueForCurrentTeam",
            Value: "diff",
            ADP: "adp",
            Name: "name",
        };

        return (
            <div
                className={styles.sortOption}
                onClick={() => {
                    if (sort.key === keyMap[label]) {
                        setSort({
                            ...sort,
                            direction:
                                sort.direction === "asc" ? "desc" : "asc",
                        });
                    } else {
                        setSort({ ...sort, key: keyMap[label] });
                    }
                }}
            >
                {sort.key === keyMap[label] ? (
                    <i
                        className={classNames(
                            `fa-solid fa-caret-${
                                sort.direction === "asc" ? "up" : "down"
                            }`
                        )}
                    />
                ) : (
                    <i
                        className={classNames("fa-solid fa-dash", styles.dash)}
                    />
                )}
                <div className={styles.optionLabel}>{label}</div>
            </div>
        );
    };

    const players = getPlayersFromApiResponse(data, sort, {
        position: positionFilter,
        roster: rosterFilter,
        ineligible: ineligibleFilter,
        value: valueFilter,
    });

    const hcThreshold = 20;

    const filtered = _.flattenDeep(Object.values(data || {})).filter(
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

    return (
        <Page isLoading={data === null}>
            <>
                <div className={styles.toolbar}>
                    <div className={styles.filters}>
                        <div className={styles.filterTitle}>Filters</div>
                        <div className={styles.filter}>
                            <div className={styles.filterLabel}>
                                Rostered By
                            </div>
                            <div className={styles.filterBadges}>
                                {_.orderBy(
                                    [
                                        { value: "All", label: "All" },
                                        {
                                            value: "Darius",
                                            label: "Darius",
                                        },
                                        { value: "Nick", label: "Nick" },
                                        { value: "Jack", label: "Jack" },
                                        { value: "Hues", label: "Hues" },
                                        { value: "Quast", label: "Quast" },
                                        {
                                            value: "Jeremiah",
                                            label: "Jeremiah",
                                        },
                                        {
                                            value: "Diego",
                                            label: "Diego",
                                        },
                                        {
                                            value: "T Cool",
                                            label: "T Cool",
                                        },
                                        { value: "Bob", label: "Bob" },
                                        { value: "Zack", label: "Zack" },
                                        { value: "Joel", label: "Joel" },
                                        { value: "Tri", label: "Tri" },
                                    ],
                                    "label"
                                ).map(({ value }) => (
                                    <PositionBadge
                                        key={value}
                                        position={value}
                                        filled={rosterFilter === value}
                                        onClick={() => setRosterFilter(value)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className={styles.filter}>
                            <div className={styles.filterLabel}>Position</div>
                            <div className={styles.filterBadges}>
                                {[
                                    "ALL",
                                    "QB",
                                    "RB",
                                    "WR",
                                    "TE",
                                    "K",
                                    "DEF",
                                ].map((position) => (
                                    <PositionBadge
                                        position={position}
                                        filled={positionFilter === position}
                                        onClick={() =>
                                            setPositionFilter(position)
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                        <div className={styles.checkboxes}>
                            <div>
                                <input
                                    className={styles.checkbox}
                                    type="checkbox"
                                    checked={ineligibleFilter}
                                    onChange={() =>
                                        setIneligibleFilter(!ineligibleFilter)
                                    }
                                />
                                <label className={styles.checkboxLabel}>
                                    Only Show Players Who Can Be Kept
                                </label>
                            </div>
                            <div>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    value={valueFilter}
                                    onChange={(checked) => {
                                        // console.log(checked);
                                        setValueFilter(!valueFilter);
                                    }}
                                />
                                <label className={styles.checkboxLabel}>
                                    Hide Players With Negative Value
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className={styles.filters}>
                        <div className={styles.filterTitle}>Sort By</div>
                        <div className={styles.sortOptions}>
                            <div className={styles.left}>
                                {["Name", "Cost", "Value", "ADP"].map(
                                    (label) => (
                                        <PositionBadge
                                            position={label}
                                            filled={sort.key === keyMap[label]}
                                            onClick={() =>
                                                setSort({
                                                    ...sort,
                                                    key: keyMap[label],
                                                })
                                            }
                                        />
                                    )
                                )}
                            </div>

                            <PositionBadge
                                sortBadge
                                position={
                                    <>
                                        <i
                                            className={classNames(
                                                `fa-solid fa-caret-${
                                                    sort.direction === "asc"
                                                        ? "up"
                                                        : "down"
                                                }`,
                                                styles.arrow
                                            )}
                                        />

                                        {sort.direction === "asc"
                                            ? "ASC"
                                            : "DESC"}
                                    </>
                                }
                                filled={true}
                                onClick={() =>
                                    setSort({
                                        ...sort,
                                        direction:
                                            sort.direction === "desc"
                                                ? "asc"
                                                : "desc",
                                    })
                                }
                            />

                            {/* <SortOption label="Position" /> */}
                        </div>
                    </div>
                </div>
                <body className={styles.body}>
                    {players.map((player) => {
                        return (
                            <PlayerRow
                                {...player}
                                hotColdPlayers={hotColdPlayers}
                            />
                        );
                    })}
                </body>
            </>
        </Page>
    );
};

export default KeeperPricesPage;
