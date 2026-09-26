import { useState } from "react";
import classNames from "classnames";

import PositionBadge from "../PositionBadge/PositionBadge";
import PlayerImage from "../PlayerImage/PlayerImage";
import styles from "./PlayerRow.module.scss";
import {
    getNumberSuffix,
    getSnakePick,
    ordinal,
} from "../../helpers/draft.helper";
import Icon from "../Icon/Icon";

const HotColdIcon = ({ type }) => {
    if (!type) return null;

    return type === "HOT" ? (
        <div className={classNames(styles.hot, styles.hcIcon)}>
            <Icon name="fire" duotone />
        </div>
    ) : (
        <div className={classNames(styles.cold, styles.hcIcon)}>
            <Icon name="snowflake" duotone />
        </div>
    );
};

export const KeeperCost = ({ keeperCost, showAdpCost, small }) => {
    if (!keeperCost) {
        return (
            <div
                className={classNames(
                    styles.keeperCost,
                    styles.ineligible,
                    small && styles.small
                )}
            >
                <Icon name="ban" />
                <div className={styles.keeperLabel}>Not Keepable</div>
            </div>
        );
    }

    return (
        <div className={classNames(styles.keeperCost, small && styles.small)}>
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

const describeMove = ({ type, round, manager }) => {
    const who = manager || "another team";

    switch (type) {
        case "DRAFT_PICK":
            return `Drafted in the ${ordinal(round)} round by ${who}`;
        case "DRAFT_KEEPER":
            return `Kept in the ${ordinal(round)} round by ${who}`;
        case "WAIVER_ADD":
            return `Picked up by ${who}`;
        case "WAIVER_DROP":
            return `Dropped by ${who}`;
        case "TRADED_IN":
            return `Traded to ${who}`;
        default:
            return type;
    }
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
    costReason,
    history = [],
    draftSlot,
    teams,
    isInSeason,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Next year's ADP isn't known during the season
    const showAdpCost = isInSeason && isWaiverCost;

    const pickValue = Math.round(
        getSnakePick(draftSlot, keeperCost, teams) - adp
    );
    const roundValue = keeperCost - adr;
    const hasValue = !!(adp && adr && keeperCost);

    const toggle = () => setIsExpanded(!isExpanded);

    return (
        <article
            className={classNames(
                styles.playerRow,
                isExpanded && styles.expanded
            )}
        >
            <div
                className={styles.summary}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={toggle}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggle();
                    }
                }}
            >
                <PlayerImage name={name} team={team} position={position} />

                <div className={styles.playerInfo}>
                    <div className={styles.playerName}>{name}</div>
                    <div className={styles.badges}>
                        <PositionBadge position={position} />
                        <span className={styles.team}>{team || "FA"}</span>
                        {!isInSeason && (
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
                        <Icon name="user" />
                        {rosteredBy}
                        <Icon name="chevron-down" className={styles.chevron} />
                    </div>
                </div>

                <div className={styles.right}>
                    {!isInSeason && <HotColdIcon type={hotColdPlayers?.[id]} />}
                    <KeeperCost
                        keeperCost={keeperCost}
                        showAdpCost={showAdpCost}
                    />
                    {isInSeason
                        ? keeperCost > 0 && (
                              <div className={styles.caption}>
                                  '{String(keeperDraftYear).slice(-2)} Keeper
                                  Cost
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
                                  {roundValue} rd
                                  {draftSlot && !Number.isNaN(pickValue) && (
                                      <>
                                          {" "}
                                          · {pickValue > 0 && "+"}
                                          {pickValue} pk
                                      </>
                                  )}
                              </div>
                          )}
                </div>
            </div>

            {isExpanded && (
                <div className={styles.details}>
                    <div className={styles.detailsTitle}>Why this cost?</div>
                    <p className={styles.reason}>{costReason}</p>
                    {history.length > 0 && (
                        <ol className={styles.timeline}>
                            {history.map((move, index) => (
                                <li key={index}>
                                    <span className={styles.when}>
                                        {move.season}
                                        {move.type.startsWith("DRAFT")
                                            ? " Draft"
                                            : ` · Wk ${move.week}`}
                                    </span>
                                    <span>{describeMove(move)}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            )}
        </article>
    );
};

export default PlayerRow;
