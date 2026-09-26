import { useState } from "react";
import { orderBy, sortBy } from "lodash-es";
import classNames from "classnames";

import styles from "./PlannerPage.module.scss";
import Page from "../../components/Page/Page";
import PlayerImage from "../../components/PlayerImage/PlayerImage";
import PositionBadge from "../../components/PositionBadge/PositionBadge";
import { KeeperCost } from "../../components/PlayerRow/PlayerRow";
import { Chip, ChipRow } from "../../components/Chip/Chip";
import { useLeague } from "../../context/league";
import { EMPTY_PLAN, useKeeperPlans } from "../../helpers/plans.helper";
import {
    getSnakePick,
    ordinal,
    resolveKeeperRounds,
} from "../../helpers/draft.helper";
import { MAX_KEEPERS } from "../../constants";
import Icon from "../../components/Icon/Icon";

const PlannerPage = () => {
    const {
        players,
        managers,
        league,
        isInSeason,
        isLoading,
        hasError,
        reload,
        myTeam,
    } = useLeague();

    const [plans, setPlans] = useKeeperPlans();
    const [chosenRosterId, setChosenRosterId] = useState(null);
    const [notice, setNotice] = useState(null);

    // Your team first, then alphabetical
    const sortedManagers = sortBy(managers, ({ userId, name }) =>
        userId === myTeam?.userId ? "" : name
    );
    const rosterId =
        chosenRosterId ?? myTeam?.rosterId ?? sortedManagers[0]?.rosterId;
    const manager = managers.find((m) => m.rosterId === rosterId);

    const plan = plans[rosterId] || EMPTY_PLAN;

    const keepable = orderBy(
        players.filter(
            (player) =>
                player.rosterId === rosterId &&
                player.keeperValueForCurrentTeam > 0
        ),
        [({ adp }) => adp === null, "adp", "keeperValueForCurrentTeam"],
        ["asc", "asc", "asc"]
    );

    const selectedPlayers = plan.selected
        .map((id) => keepable.find(({ playerId }) => playerId === id))
        .filter(Boolean);

    const protectedPlayer = selectedPlayers.find(
        ({ playerId }) => playerId === plan.protectedId
    );
    const lotteryPlayers = selectedPlayers.filter(
        (player) => player !== protectedPlayer
    );

    // In season, waiver pickups cost next year's ADP + 1, which isn't known yet
    const roundFor = (player) =>
        isInSeason && player.isWaiverCost
            ? null
            : player.keeperValueForCurrentTeam;

    // Keepers in pick order; on a same-round tie the earlier one keeps it
    const resolvedRounds = resolveKeeperRounds(
        selectedPlayers
            .filter((player) => roundFor(player))
            .map((player) => ({ id: player.playerId, round: roundFor(player) }))
    );

    const picks = sortBy(
        selectedPlayers.map((player) => {
            const resolved = resolvedRounds[player.playerId];
            const round = resolved?.round ?? null;
            const wasMoved =
                !!resolved && resolved.round !== resolved.fromRound;

            // Whoever kept the round this keeper was moved out of
            const movedFor = wasMoved
                ? selectedPlayers.find(
                      ({ playerId }) =>
                          resolvedRounds[playerId]?.round === resolved.fromRound
                  )
                : null;

            return {
                player,
                round,
                noRoundLeft: !!resolved && resolved.round === null,
                fromRound: wasMoved ? resolved.fromRound : null,
                movedFor,
                pick: getSnakePick(manager?.draftSlot, round, league?.teams),
            };
        }),
        ({ round, noRoundLeft }) => (noRoundLeft ? 98 : (round ?? 99))
    );

    const updatePlan = (nextPlan) =>
        setPlans({ ...plans, [rosterId]: nextPlan });

    // Let the other keeper be the one that moves up instead
    const swapWhoMoves = (movedId, keptId) => {
        const selected = [...plan.selected];
        const movedIndex = selected.indexOf(movedId);
        const keptIndex = selected.indexOf(keptId);

        selected[movedIndex] = keptId;
        selected[keptIndex] = movedId;

        updatePlan({ ...plan, selected });
    };

    const toggleSelected = (playerId) => {
        setNotice(null);

        if (plan.selected.includes(playerId)) {
            updatePlan({
                selected: plan.selected.filter((id) => id !== playerId),
                protectedId:
                    plan.protectedId === playerId ? null : plan.protectedId,
            });
        } else if (plan.selected.length >= MAX_KEEPERS) {
            setNotice(`You can pick up to ${MAX_KEEPERS} keepers.`);
        } else {
            updatePlan({ ...plan, selected: [...plan.selected, playerId] });
        }
    };

    const toggleProtected = (playerId) => {
        setNotice(null);

        updatePlan({
            selected: plan.selected.includes(playerId)
                ? plan.selected
                : [...plan.selected, playerId].slice(0, MAX_KEEPERS),
            protectedId: plan.protectedId === playerId ? null : playerId,
        });
    };

    const declared = (league?.declaredKeepers?.[rosterId] || [])
        .map((id) => players.find(({ playerId }) => playerId === id)?.name)
        .filter(Boolean);

    const lotteryOdds = lotteryPlayers.length
        ? Math.round(100 / lotteryPlayers.length)
        : 0;

    return (
        <Page isLoading={isLoading} hasError={hasError} onRetry={reload}>
            <div className={styles.intro}>
                <h1 className={styles.title}>
                    '{String(league?.keeperDraftYear).slice(-2)} Keeper Planner
                </h1>
                <p className={styles.subtitle}>
                    Pick up to {MAX_KEEPERS} keepers and star the one to protect
                    from the lottery. Plans are saved on this device.
                </p>
            </div>

            <ChipRow fade>
                {sortedManagers.map((m) => (
                    <Chip
                        key={m.rosterId}
                        active={m.rosterId === rosterId}
                        starred={m.userId === myTeam?.userId}
                        onClick={() => {
                            setChosenRosterId(m.rosterId);
                            setNotice(null);
                        }}
                    >
                        {m.name}
                    </Chip>
                ))}
            </ChipRow>

            <div className={styles.layout}>
                <section className={styles.summary} aria-live="polite">
                    <div className={styles.summaryHeader}>
                        <div>
                            <div className={styles.eyebrow}>
                                {manager?.name}'s keepers
                            </div>
                            <div className={styles.count}>
                                {selectedPlayers.length}
                                <span> / {MAX_KEEPERS}</span>
                            </div>
                        </div>
                        {selectedPlayers.length > 0 && (
                            <button
                                type="button"
                                className={styles.clear}
                                onClick={() => updatePlan(EMPTY_PLAN)}
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {picks.length === 0 ? (
                        <p className={styles.empty}>
                            Tap players below to add them.
                        </p>
                    ) : (
                        <ol className={styles.picks}>
                            {picks.map(
                                ({
                                    player,
                                    round,
                                    pick,
                                    fromRound,
                                    movedFor,
                                    noRoundLeft,
                                }) => (
                                    <li key={player.playerId}>
                                        <span className={styles.pickRound}>
                                            {round
                                                ? `${ordinal(round)} rd`
                                                : noRoundLeft
                                                  ? "—"
                                                  : "ADP+1"}
                                        </span>
                                        <span className={styles.pickDetails}>
                                            <span className={styles.pickName}>
                                                {player.playerId ===
                                                    plan.protectedId && (
                                                    <Icon
                                                        name="lock"
                                                        className={
                                                            styles.lockIcon
                                                        }
                                                        label="Protected"
                                                    />
                                                )}
                                                {player.name}
                                            </span>
                                            {fromRound && round && (
                                                <span className={styles.moved}>
                                                    Moved up from the{" "}
                                                    {ordinal(fromRound)}
                                                    {movedFor &&
                                                        ` (same round as ${movedFor.name})`}
                                                </span>
                                            )}
                                            {noRoundLeft && (
                                                <span className={styles.moved}>
                                                    No earlier round is free
                                                </span>
                                            )}
                                            {fromRound && round && movedFor && (
                                                <button
                                                    type="button"
                                                    className={styles.swap}
                                                    onClick={() =>
                                                        swapWhoMoves(
                                                            player.playerId,
                                                            movedFor.playerId
                                                        )
                                                    }
                                                >
                                                    Move {movedFor.name} up
                                                    instead
                                                </button>
                                            )}
                                        </span>
                                        <span className={styles.pickNumber}>
                                            {pick ? `Pick ${pick}` : ""}
                                        </span>
                                    </li>
                                )
                            )}
                        </ol>
                    )}

                    {selectedPlayers.length > 0 && (
                        <div className={styles.lottery}>
                            <div className={styles.eyebrow}>Keeper lottery</div>
                            {!protectedPlayer ? (
                                <p>
                                    Tap the <Icon name="star" /> on a keeper to
                                    protect it. Every other keeper goes into the
                                    lottery.
                                </p>
                            ) : lotteryPlayers.length === 0 ? (
                                <p>
                                    <b>{protectedPlayer.name}</b> is protected,
                                    so there's no lottery.
                                </p>
                            ) : (
                                <p>
                                    <b>{protectedPlayer.name}</b> is safe. One
                                    of{" "}
                                    {lotteryPlayers
                                        .map(({ name }) => name)
                                        .join(", ")}{" "}
                                    goes back to the draft pool (
                                    <b>{lotteryOdds}%</b> chance each), so you
                                    keep <b>{selectedPlayers.length - 1}</b>.
                                </p>
                            )}
                        </div>
                    )}

                    {declared.length > 0 && (
                        <p className={styles.declared}>
                            <Icon name="circle-check" /> Declared in Sleeper:{" "}
                            {declared.join(", ")}
                        </p>
                    )}

                    {manager?.draftSlot && (
                        <p className={styles.footnote}>
                            Pick numbers use {manager.name}'s{" "}
                            {ordinal(manager.draftSlot)} draft slot
                            {league?.draftOrderSeason !==
                            league?.keeperDraftYear
                                ? ` from the ${league?.draftOrderSeason} draft until the new order is set`
                                : ""}
                            .
                        </p>
                    )}
                </section>

                <section>
                    {notice && (
                        <p className={styles.notice} role="alert">
                            {notice}
                        </p>
                    )}
                    <ul className={styles.players}>
                        {keepable.map((player) => {
                            const isSelected = plan.selected.includes(
                                player.playerId
                            );
                            const isProtected =
                                plan.protectedId === player.playerId;

                            return (
                                <li
                                    key={player.playerId}
                                    className={classNames(
                                        styles.player,
                                        isSelected && styles.selected
                                    )}
                                >
                                    <button
                                        type="button"
                                        className={styles.select}
                                        aria-pressed={isSelected}
                                        onClick={() =>
                                            toggleSelected(player.playerId)
                                        }
                                    >
                                        <span className={styles.check}>
                                            {isSelected && (
                                                <Icon name="check" />
                                            )}
                                        </span>
                                        <PlayerImage
                                            name={player.name}
                                            team={player.team}
                                            position={player.position}
                                            size="small"
                                        />
                                        <span className={styles.playerInfo}>
                                            <span className={styles.playerName}>
                                                {player.name}
                                            </span>
                                            <span className={styles.meta}>
                                                <PositionBadge
                                                    position={player.position}
                                                />
                                                {player.team || "FA"}
                                            </span>
                                        </span>
                                        <KeeperCost
                                            keeperCost={
                                                player.keeperValueForCurrentTeam
                                            }
                                            showAdpCost={
                                                isInSeason &&
                                                player.isWaiverCost
                                            }
                                            small
                                        />
                                    </button>
                                    <button
                                        type="button"
                                        className={classNames(
                                            styles.protect,
                                            isProtected && styles.active
                                        )}
                                        aria-pressed={isProtected}
                                        aria-label={`Protect ${player.name}`}
                                        onClick={() =>
                                            toggleProtected(player.playerId)
                                        }
                                    >
                                        <Icon name="star" />
                                    </button>
                                </li>
                            );
                        })}
                        {keepable.length === 0 && (
                            <li className={styles.empty}>
                                No keepable players on this roster.
                            </li>
                        )}
                    </ul>
                </section>
            </div>
        </Page>
    );
};

export default PlannerPage;
