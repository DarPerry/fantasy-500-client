import classNames from "classnames";
import PositionBadge from "../PositionBadge/PositionBadge";
import styles from "./PlayerRow.module.scss";
import { getSnakeDraftPick } from "../../helpers/draft.helper";
import { USE_PRESEASON_MODE } from "../../constants";

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

const rosteredByPickMap = {
    Joel: 1,
    Tri: 2,
    Hues: 3,
    Jack: 4,
    Jeremiah: 5,
    Bob: 6,
    "T Cool": 7,
    Darius: 8,
    Quast: 9,
    Zack: 10,
    Nick: 11,
    Diego: 12,
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
}) => {
    const keeperAdpCost = getSnakeDraftPick(
        rosteredByPickMap[rosteredBy],
        keeperCost
    );

    const pickCostForPlayer = getSnakeDraftPickNumberForPlayer(
        rosteredBy,
        keeperCost
    );

    const pickValue = Math.round(pickCostForPlayer - adp);

    const SHOW_KEEPEER_VALUE = false;

    return (
        <div className={styles.playerRow}>
            <div className={styles.left2}>
                <div
                    className={styles.imageContainer}
                    style={{
                        borderColor: teamColors[team],
                    }}
                >
                    <img
                        className={classNames(
                            styles.playerImage,
                            position === "DEF" && styles.defense
                        )}
                        src={getPlayerImage(name)}
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/images/missing-player.png";
                        }}
                    />
                </div>
                <div className={styles.playerInfo}>
                    <div className={styles.player}>
                        <div className={styles.playerName}>{name}</div>
                    </div>
                    <div className={styles.rosteredBy}>
                        Rostered By:
                        <span className={styles.playerOwner}>{rosteredBy}</span>
                    </div>
                    <div className={styles.badges}>
                        <PositionBadge position={position} filled />

                        <div className={classNames(styles.playerPosition)}>
                            {team || "FA"}
                        </div>
                        {!USE_PRESEASON_MODE && (
                            <div className={classNames(styles.playerPosition)}>
                                ADP {adp || "UDFA"} ({adr}
                                {getNumberSuffix(adr)})
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className={styles.right}>
                <div className={styles.keeperCost}>
                    {!USE_PRESEASON_MODE && (
                        <HotColdIcon type={hotColdPlayers[id]} />
                    )}
                    <div className={styles.inside}>
                        <div className={styles.keeperValue}>
                            {keeperCost ? (
                                <div>
                                    {keeperCost}
                                    <span className={styles.valueSuffix}>
                                        {getNumberSuffix(keeperCost)}
                                    </span>
                                </div>
                            ) : (
                                <i className="fa-solid fa-ban" />
                            )}
                        </div>
                        <div className={styles.keeperLabel}>
                            {!keeperCost ? "Ineligible" : " Round Pick"}
                        </div>
                    </div>
                </div>
                {USE_PRESEASON_MODE ? (
                    <div className={classNames(styles.value)}>Keeper Cost</div>
                ) : (
                    <>
                        <div
                            className={classNames(
                                styles.value,
                                adp && keeperCost - adr > 0 && styles.green,
                                adp && keeperCost - adr < 0 && styles.red
                            )}
                        >
                            {!adr || !keeperCost
                                ? " "
                                : `${keeperCost - adr} Round Value`}
                        </div>
                        <div
                            className={classNames(
                                styles.value,
                                adp && keeperCost - adr > 0 && styles.green,
                                adp && keeperCost - adr < 0 && styles.red
                            )}
                        >
                            {!adr || !keeperCost
                                ? " "
                                : `${pickValue} Pick Value`}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PlayerRow;
