import { useCallback, useEffect, useState } from "react";
import classNames from "classnames";

import styles from "./RivalsPage.module.scss";
import Page from "../../components/Page/Page";
import Icon from "../../components/Icon/Icon";
import { Chip, ChipRow } from "../../components/Chip/Chip";
import { fetchJson } from "../../api";
import { useLeague } from "../../context/league";

const formatRecord = ({ wins, losses, ties }) =>
    `${wins}–${losses}${ties ? `–${ties}` : ""}`;

const formatRate = (winRate) => `${Math.round(winRate * 100)}%`;

const RivalCard = ({ title, icon, tone, opponent, emptyText }) => (
    <section className={classNames(styles.rivalCard, styles[tone])}>
        <div className={styles.rivalTitle}>
            <Icon name={icon} />
            {title}
        </div>
        {opponent ? (
            <>
                <div className={styles.rivalName}>{opponent.name}</div>
                <div className={styles.rivalRecord}>
                    {formatRecord(opponent)} · {formatRate(opponent.winRate)}
                </div>
            </>
        ) : (
            <div className={styles.rivalEmpty}>{emptyText}</div>
        )}
    </section>
);

const RivalsPage = () => {
    const { myTeam } = useLeague();
    const [rivals, setRivals] = useState(null);
    const [hasError, setHasError] = useState(false);
    const [chosenUserId, setChosenUserId] = useState(null);

    const load = useCallback(async () => {
        setHasError(false);

        try {
            setRivals(await fetchJson("/rivals"));
        } catch (error) {
            console.error(error);
            setHasError(true);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // Current managers only, your team first
    const managers = (rivals?.managers || [])
        .filter(({ isCurrent }) => isCurrent)
        .sort((a, b) =>
            a.userId === myTeam?.userId
                ? -1
                : b.userId === myTeam?.userId
                  ? 1
                  : a.name.localeCompare(b.name)
        );

    const manager =
        managers.find(({ userId }) => userId === chosenUserId) ||
        managers.find(({ userId }) => userId === myTeam?.userId) ||
        managers[0];

    const findOpponent = (userId) =>
        manager?.opponents.find((opponent) => opponent.userId === userId);

    return (
        <Page
            isLoading={!rivals && !hasError}
            hasError={hasError}
            onRetry={load}
            narrow
        >
            {manager && (
                <>
                    <div className={styles.intro}>
                        <h1 className={styles.title}>Rivals</h1>
                        <p className={styles.subtitle}>
                            Regular-season head-to-head records,{" "}
                            {rivals.firstSeason}–{rivals.lastSeason}.
                        </p>
                    </div>

                    <ChipRow fade>
                        {managers.map(({ userId, name }) => (
                            <Chip
                                key={userId}
                                active={userId === manager.userId}
                                starred={userId === myTeam?.userId}
                                onClick={() => setChosenUserId(userId)}
                            >
                                {name}
                            </Chip>
                        ))}
                    </ChipRow>

                    <section className={styles.overall}>
                        <div>
                            <div className={styles.eyebrow}>
                                {manager.name} vs the league
                            </div>
                            <div className={styles.overallRecord}>
                                {formatRecord(manager.overall)}
                            </div>
                        </div>
                        <div className={styles.overallRate}>
                            {formatRate(manager.overall.winRate)}
                            <span>win rate</span>
                        </div>
                    </section>

                    <div className={styles.rivalGrid}>
                        <RivalCard
                            title="Nemesis"
                            icon="skull"
                            tone="nemesis"
                            opponent={findOpponent(manager.nemesis)}
                            emptyText="No losing record against anyone yet"
                        />
                        <RivalCard
                            title="Favorite opponent"
                            icon="crosshairs"
                            tone="favorite"
                            opponent={findOpponent(manager.favorite)}
                            emptyText="No winning record against anyone yet"
                        />
                    </div>

                    <section className={styles.card}>
                        <div className={styles.eyebrow}>Head-to-head</div>
                        <ul className={styles.opponents}>
                            {manager.opponents.map((opponent) => (
                                <li key={opponent.userId}>
                                    <div className={styles.opponentTop}>
                                        <span className={styles.opponentName}>
                                            {opponent.name}
                                            {!opponent.isCurrent && (
                                                <span className={styles.former}>
                                                    Former
                                                </span>
                                            )}
                                        </span>
                                        <span className={styles.opponentRecord}>
                                            {formatRecord(opponent)}
                                        </span>
                                        <span
                                            className={classNames(
                                                styles.opponentRate,
                                                opponent.winRate > 0.5 &&
                                                    styles.winning,
                                                opponent.winRate < 0.5 &&
                                                    styles.losing
                                            )}
                                        >
                                            {formatRate(opponent.winRate)}
                                        </span>
                                    </div>
                                    {/* Win rate bar with a tick at .500 */}
                                    <div
                                        className={styles.bar}
                                        role="img"
                                        aria-label={`${formatRate(
                                            opponent.winRate
                                        )} win rate over ${opponent.games} games`}
                                    >
                                        <div
                                            className={classNames(
                                                styles.barFill,
                                                opponent.winRate > 0.5 &&
                                                    styles.winning,
                                                opponent.winRate < 0.5 &&
                                                    styles.losing
                                            )}
                                            style={{
                                                width: `${opponent.winRate * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <div className={styles.opponentMeta}>
                                        {opponent.games}{" "}
                                        {opponent.games === 1
                                            ? "game"
                                            : "games"}{" "}
                                        · avg{" "}
                                        {(
                                            opponent.pointsFor / opponent.games
                                        ).toFixed(1)}{" "}
                                        to{" "}
                                        {(
                                            opponent.pointsAgainst /
                                            opponent.games
                                        ).toFixed(1)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <p className={styles.footnote}>
                            Nemesis and favorite need at least {rivals.minGames}{" "}
                            games. Results use final scores, so a couple of
                            games later flipped by stat corrections can differ
                            from Sleeper&apos;s records.
                        </p>
                    </section>
                </>
            )}
        </Page>
    );
};

export default RivalsPage;
