import { useCallback, useEffect, useState } from "react";
import { countBy, orderBy, times } from "lodash-es";
import classNames from "classnames";

import styles from "./HistoryPage.module.scss";
import Page from "../../components/Page/Page";
import { fetchJson } from "../../api";
import { PAYOUTS } from "../../constants";
import { useLeague } from "../../context/league";
import Icon from "../../components/Icon/Icon";

const formatPoints = (points) => points?.toFixed(2);

const HistoryPage = () => {
    const { myTeam } = useLeague();
    const [history, setHistory] = useState(null);
    const [hasError, setHasError] = useState(false);

    const load = useCallback(async () => {
        setHasError(false);

        try {
            setHistory(await fetchJson("/history"));
        } catch (error) {
            console.error(error);
            setHasError(true);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const current = history?.seasons.find(
        ({ season }) => season === history.latestSeason
    );
    const isCurrentFinished = !!current?.champion;

    const titles = orderBy(
        Object.entries(
            countBy(
                history?.seasons.filter(({ champion }) => champion),
                "champion"
            )
        ),
        [([, count]) => count, ([name]) => name],
        ["desc", "asc"]
    );

    const isMine = (name) => !!myTeam && name === myTeam.name;

    return (
        <Page
            isLoading={!history && !hasError}
            hasError={hasError}
            onRetry={load}
        >
            {history && (
                <>
                    <div className={styles.intro}>
                        <h1 className={styles.title}>League History</h1>
                    </div>

                    <div className={styles.grid}>
                        {current && !isCurrentFinished && (
                            <section className={styles.card}>
                                <div className={styles.eyebrow}>
                                    {current.season} weekly high score · $
                                    {PAYOUTS.weeklyHighScore}
                                </div>
                                {current.highScore ? (
                                    <>
                                        <div className={styles.leader}>
                                            <span className={styles.leaderName}>
                                                {current.highScore.name}
                                            </span>
                                            <span
                                                className={styles.leaderPoints}
                                            >
                                                {formatPoints(
                                                    current.highScore.points
                                                )}
                                            </span>
                                        </div>
                                        <p className={styles.muted}>
                                            Leads the race (week{" "}
                                            {current.highScore.week}). Regular
                                            season only.
                                        </p>
                                        <ol className={styles.rankList}>
                                            {current.topScores.map(
                                                (
                                                    { name, week, points },
                                                    index
                                                ) => (
                                                    <li
                                                        key={`${name}-${week}`}
                                                        className={classNames(
                                                            isMine(name) &&
                                                                styles.mine
                                                        )}
                                                    >
                                                        <span
                                                            className={
                                                                styles.rank
                                                            }
                                                        >
                                                            {index + 1}
                                                        </span>
                                                        <span
                                                            className={
                                                                styles.rowName
                                                            }
                                                        >
                                                            {name}
                                                        </span>
                                                        <span
                                                            className={
                                                                styles.muted
                                                            }
                                                        >
                                                            Wk {week}
                                                        </span>
                                                        <b>
                                                            {formatPoints(
                                                                points
                                                            )}
                                                        </b>
                                                    </li>
                                                )
                                            )}
                                        </ol>
                                    </>
                                ) : (
                                    <p className={styles.muted}>
                                        No finished weeks yet.
                                    </p>
                                )}
                            </section>
                        )}

                        {titles.length > 0 && (
                            <section className={styles.card}>
                                <div className={styles.eyebrow}>
                                    Trophy case
                                </div>
                                <ul className={styles.trophies}>
                                    {titles.map(([name, count]) => (
                                        <li
                                            key={name}
                                            className={classNames(
                                                isMine(name) && styles.mine
                                            )}
                                        >
                                            <span className={styles.rowName}>
                                                {name}
                                            </span>
                                            <span
                                                className={styles.trophyIcons}
                                                aria-label={`${count} titles`}
                                            >
                                                {times(count, (i) => (
                                                    <Icon
                                                        key={i}
                                                        name="trophy"
                                                    />
                                                ))}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>

                    <h2 className={styles.sectionTitle}>Past seasons</h2>
                    <div className={styles.seasons}>
                        {history.seasons
                            .filter(({ champion }) => champion)
                            .map((season) => (
                                <section
                                    key={season.season}
                                    className={styles.seasonCard}
                                >
                                    <div className={styles.seasonHeader}>
                                        <span className={styles.year}>
                                            {season.season}
                                        </span>
                                        <span className={styles.leagueName}>
                                            {season.leagueName}
                                        </span>
                                    </div>
                                    <ol className={styles.podium}>
                                        <li className={styles.gold}>
                                            <Icon name="trophy" />
                                            <span className={styles.rowName}>
                                                {season.champion}
                                            </span>
                                            <span className={styles.muted}>
                                                Champion
                                            </span>
                                        </li>
                                        {season.runnerUp && (
                                            <li className={styles.silver}>
                                                <Icon name="medal" />
                                                <span
                                                    className={styles.rowName}
                                                >
                                                    {season.runnerUp}
                                                </span>
                                                <span className={styles.muted}>
                                                    Runner-up
                                                </span>
                                            </li>
                                        )}
                                        {season.third && (
                                            <li className={styles.bronze}>
                                                <Icon name="medal" />
                                                <span
                                                    className={styles.rowName}
                                                >
                                                    {season.third}
                                                </span>
                                                <span className={styles.muted}>
                                                    3rd place
                                                </span>
                                            </li>
                                        )}
                                    </ol>
                                    {season.highScore && (
                                        <p className={styles.highScore}>
                                            <Icon name="fire" />
                                            <span>
                                                High score:{" "}
                                                <b>{season.highScore.name}</b>,{" "}
                                                {formatPoints(
                                                    season.highScore.points
                                                )}{" "}
                                                (wk {season.highScore.week})
                                            </span>
                                        </p>
                                    )}
                                </section>
                            ))}
                    </div>
                </>
            )}
        </Page>
    );
};

export default HistoryPage;
