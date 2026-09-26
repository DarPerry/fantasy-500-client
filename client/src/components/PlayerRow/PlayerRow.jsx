import classNames from "classnames";
import PositionBadge from "../PositionBadge/PositionBadge";
import styles from "./PlayerRow.module.scss";
import { useState } from "react";
import { IS_IN_SEASON } from "../../constants";

const teamColors = {
    CLE: "#fb4f14",
    NE: "#c60c30",
    CHI: "#c83803",
    DAL: "#b0b7bc",
    NYJ: "#115740",
    LAC: "#127dc5",
    NYG: "#a71930",
    ATL: "#a6192e",
    MIA: "#008c95",
    NO: "#9f8958",
    JAX: "#9f792c",
    CAR: "#0085ca",
    SEA: "#69be29",
    PHI: "#a5acaf",
    DET: "#0069b1",
    SF: "#b3995d",
    MIN: "#ffc72c",
    IND: "#a5acaf",
    LV: "#87909a",
    HOU: "#a71930",
    CIN: "#fc4c02",
    DEN: "#0c2340",
    BAL: "#241773",
    GB: "#ffb611",
    TB: "#c91331",
    ARI: "#9b2743",
    PIT: "#ffb81c",
    KC: "#ffb611",
    TEN: "#4b92db",
    BUF: "#c60c30",
    WAS: "#ffb611",
    LAR: "#063992",
};

const getPlayerImage = (name) => {
    const path = `/images/${name
        ?.toLowerCase()
        ?.replaceAll(".", "")
        ?.replaceAll("'", "")
        ?.split(" ")
        .join("-")}.png`;

    return path;
};

const HotColdIcon = ({ type }) => {
    if (!type) return;

    return type === "HOT" ? (
        <div className={classNames(styles.hot, styles.hcIcon)}>
            <i className="fa-duotone fa-fire" />
        </div>
    ) : (
        <div className={classNames(styles.cold, styles.hcIcon)}>
            <i className="fa-duotone fa-snowflake" />
        </div>
    );
};

const getNumberSuffix = (number) => {
    switch (number) {
        case 1:
            return "st";
        case 2:
            return "nd";
        case 3:
            return "rd";
        default:
            return "th";
    }
};

const pickOrderMap = {
    Joel: 0,
    Tri: 7,
    Hues: 1,
    Jack: 6,
    Jeremiah: 12,
    Bob: 3,
    "T Cool": 4,
    Darius: 11,
    Quast: 8,
    Zack: 2,
    Nick: 9,
    Diego: 5,
};

const getSnakeDraftPickNumberForPlayer = (player, round) => {
    //Darius shoudl be 11, 14, 35, 38

    const pickSlot = pickOrderMap[player];
    const isOddRound = round % 2 === 1;

    if (isOddRound) return (round - 1) * 12 + pickSlot;

    //2 -- 2 , 23, 26, 47

    return round * 12 - pickSlot + 1;

    return "TBD";
};

const PlayerImage = ({ name, team, position }) => {
    const [hasError, setHasError] = useState(false);
    const isDefense = position === "DEF";

    const initials = name
        ?.split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2);

    return (
        <div
            className={styles.imageContainer}
            style={{ "--team": teamColors[team] || "#54585a" }}
        >
            {hasError ? (
                <span className={styles.imageFallback}>
                    {isDefense ? team : initials}
                </span>
            ) : (
                <img
                    className={classNames(
                        styles.playerImage,
                        isDefense && styles.defense
                    )}
                    src={getPlayerImage(name)}
                    alt=""
                    loading="lazy"
                    onError={() => setHasError(true)}
                />
            )}
        </div>
    );
};

const KeeperCost = ({ keeperCost, showAdpCost }) => {
    if (!keeperCost) {
        return (
            <div className={classNames(styles.keeperCost, styles.ineligible)}>
                <i className="fa-solid fa-ban" />
                <div className={styles.keeperLabel}>Not Keepable</div>
            </div>
        );
    }

    return (
        <div className={styles.keeperCost}>
            <div className={styles.keeperValue}>
                {showAdpCost ? "ADP" : keeperCost}
                <span className={styles.valueSuffix}>
                    {showAdpCost ? "+1" : getNumberSuffix(keeperCost)}
                </span>
            </div>
            <div className={styles.keeperLabel}>Round</div>
        </div>
    );
};

const PlayerRow = ({
    keeperValueForCurrentTeam: keeperCost,
    name,
    position,
    rosteredBy,
    adr,
    team,
    adp,
    hotColdPlayers,
    playerId: id,
    isWaiverCost,
    keeperDraftYear,
}) => {
    // Next year's ADP isn't known during the season
    const showAdpCost = IS_IN_SEASON && isWaiverCost;

    const pickCostForPlayer = getSnakeDraftPickNumberForPlayer(
        rosteredBy,
        keeperCost
    );

    const pickValue = Math.round(pickCostForPlayer - adp);
    const roundValue = keeperCost - adr;
    const hasValue = !!(adp && adr && keeperCost);

    return (
        <article className={styles.playerRow}>
            <PlayerImage name={name} team={team} position={position} />

            <div className={styles.playerInfo}>
                <div className={styles.playerName}>{name}</div>
                <div className={styles.badges}>
                    <PositionBadge position={position} />
                    <span className={styles.team}>{team || "FA"}</span>
                    {!IS_IN_SEASON && (
                        <span className={styles.adp}>
                            ADP {adp || "UDFA"}
                            {adr && (
                                <>
                                    {" "}
                                    · {adr}
                                    {getNumberSuffix(adr)}
                                </>
                            )}
                        </span>
                    )}
                </div>
                <div className={styles.rosteredBy}>
                    <i className="fa-solid fa-user" />
                    {rosteredBy}
                </div>
            </div>

            <div className={styles.right}>
                {!IS_IN_SEASON && <HotColdIcon type={hotColdPlayers[id]} />}
                <KeeperCost keeperCost={keeperCost} showAdpCost={showAdpCost} />
                {IS_IN_SEASON
                    ? keeperCost > 0 && (
                          <div className={styles.caption}>
                              '{String(keeperDraftYear).slice(-2)} Keeper Cost
                          </div>
                      )
                    : hasValue && (
                          <div
                              className={classNames(
                                  styles.caption,
                                  roundValue > 0 && styles.green,
                                  roundValue < 0 && styles.red
                              )}
                          >
                              {roundValue > 0 && "+"}
                              {roundValue} rd · {pickValue > 0 && "+"}
                              {pickValue} pk
                          </div>
                      )}
            </div>
        </article>
    );
};

export default PlayerRow;
