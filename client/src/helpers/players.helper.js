import { orderBy } from "lodash-es";

// Lowercase, no accents or punctuation: "Ka'imi Fairbairn" -> "kaimi fairbairn"
const normalizeSearch = (text = "") =>
    text
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9 ]/gi, "")
        .toLowerCase()
        .trim();

// Blank values (no ADP, not keepable) sort last in either direction
const isBlank = (player, sortProp) => {
    const value = player[sortProp];

    if (sortProp === "keeperValueForCurrentTeam") return !value;
    if (sortProp === "diff") return value === 999;

    return value === null || value === undefined;
};

export const getPlayersFromApiResponse = (players, sortMetadata, filters) => {
    const { key: sortProp, direction: sortDirection } = sortMetadata;
    const {
        position: positionFilter,
        roster: rosterFilter,
        ineligible: ineligibleFilter,
        value: valueFilter,
        search = "",
    } = filters;

    const searchText = normalizeSearch(search);

    return orderBy(
        players,
        [(player) => isBlank(player, sortProp), sortProp, "adp"],
        ["asc", sortDirection, "asc"]
    ).filter(
        ({
            adp,
            keeperValueForCurrentTeam,
            position,
            rosteredBy,
            adr,
            name,
        }) => {
            const isFilteredPosition =
                positionFilter === position ||
                (positionFilter === "FLEX" &&
                    ["RB", "WR", "TE"].includes(position));
            const value = keeperValueForCurrentTeam - adr;

            return (
                (positionFilter === "ALL" || isFilteredPosition) &&
                (rosterFilter === "All" || rosteredBy === rosterFilter) &&
                (!ineligibleFilter || keeperValueForCurrentTeam) &&
                (!valueFilter || (value >= 0 && adp)) &&
                (!searchText || normalizeSearch(name).includes(searchText))
            );
        }
    );
};
