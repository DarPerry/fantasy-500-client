import { useCallback, useEffect, useState } from "react";
import { orderBy } from "lodash-es";
import classNames from "classnames";

import styles from "./HistoryPage.module.scss";
import Page from "../../components/Page/Page";
import { fetchJson } from "../../api";
import { PAYOUTS } from "../../constants";
import { useLeague } from "../../context/league";
import Icon from "../../components/Icon/Icon";

const formatPoints = (points) =>
    points?.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

// Trophy case awards, in ranking order. `getName` reads the winner from a season.
const AWARDS = [
    {
        key: "champion",
        label: "Champion",
        icon: "trophy",
        tone: "gold",
        getName: ({ champion }) => champion,
    },
    {
        key: "runnerUp",
        label: "Runner-up",
        icon: "medal",
        tone: "silver",
        getName: ({ runnerUp }) => runnerUp,
    },
    {
        key: "third",
        label: "3rd place",
        icon: "medal",
        tone: "bronze",
        getName: ({ third }) => third,
    },
    {
        key: "pointsLeader",
        label: "Most points",
        icon: "ranking-star",
        tone: "points",
        getName: ({ pointsLeader }) => pointsLeader?.name,
    },
    {
        key: "highScore",
        label: "High game",
        icon: "fire",
        tone: "fire",
        getName: ({ highScore }) => highScore?.name,
    },
];

// Award counts per manager from finished seasons only
const getTrophyCase = (seasons = []) => {
    const counts = {};

    seasons
        .filter(({ status }) => status === "complete")
        .forEach((season) =>
            AWARDS.forEach(({ key, getName }) => {
                const name = getName(season);
                if (!name) return;

                counts[name] = counts[name] || { name };
                counts[name][key] = (counts[name][key] || 0) + 1;
            })
        );

    return orderBy(
        Object.values(counts),
        [
            ...AWARDS.map(
                ({ key }) =>
                    (row) =>
                        row[key] || 0
            ),
            "name",
        ],
        [...AWARDS.map(() => "desc"), "asc"]
    );
};

const AwardBadge = ({ award, count }) => (
    <span
        className={classNames(styles.award, styles[award.tone])}
        title={`${award.label}${count > 1 ? ` ×${count}` : ""}`}
        aria-label={`${count} ${award.label}`}
    >
        <Icon name={award.icon} />
        {count}
    </span>
);

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
    const isCurrentFinished = current?.status === "complete";

    const trophyCase = getTrophyCase(history?.seasons);

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
                                        {current.pointsLeader && (
                                            <p
                                                className={classNames(
                                                    styles.seasonStat,
                                                    styles.points
                                                )}
                                            >
                                                <Icon name="ranking-star" />
                                                <span>
                                                    Most points so far:{" "}
                                                    <b>
                                                        {
                                                            current.pointsLeader
                                                                .name
                                                        }
                                                    </b>
                                                    ,{" "}
                                                    {formatPoints(
                                                        current.pointsLeader
                                                            .points
                                                    )}
                                                </span>
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p className={styles.muted}>
                                        No finished weeks yet.
                                    </p>
                                )}
                            </section>
                        )}

                        {trophyCase.length > 0 && (
                            <section className={styles.card}>
                                <div className={styles.eyebrow}>
                                    Trophy case
                                </div>
                                <ul
                                    className={styles.legend}
                                    aria-label="Awards"
                                >
                                    {AWARDS.map((award) => (
                                        <li
                                            key={award.key}
                                            className={styles[award.tone]}
                                        >
                                            <Icon name={award.icon} />
                                            {award.label}
                                        </li>
                                    ))}
                                </ul>
                                <ul className={styles.trophies}>
                                    {trophyCase.map((row) => (
                                        <li
                                            key={row.name}
                                            className={classNames(
                                                isMine(row.name) && styles.mine
                                            )}
                                        >
                                            <span className={styles.rowName}>
                                                {row.name}
                                            </span>
                                            <span className={styles.awards}>
                                                {AWARDS.filter(
                                                    ({ key }) => row[key]
                                                ).map((award) => (
                                                    <AwardBadge
                                                        key={award.key}
                                                        award={award}
                                                        count={row[award.key]}
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
                            .filter(({ status }) => status === "complete")
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
                                        {season.champion && (
                                            <li className={styles.gold}>
                                                <Icon name="trophy" />
                                                <span
                                                    className={styles.rowName}
                                                >
                                                    {season.champion}
                                                </span>
                                                <span className={styles.muted}>
                                                    Champion
                                                </span>
                                            </li>
                                        )}
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
                                    <div className={styles.seasonStats}>
                                        {season.pointsLeader && (
                                            <p
                                                className={classNames(
                                                    styles.seasonStat,
                                                    styles.points
                                                )}
                                            >
                                                <Icon name="ranking-star" />
                                                <span>
                                                    Most points:{" "}
                                                    <b>
                                                        {
                                                            season.pointsLeader
                                                                .name
                                                        }
                                                    </b>
                                                    ,{" "}
                                                    {formatPoints(
                                                        season.pointsLeader
                                                            .points
                                                    )}
                                                </span>
                                            </p>
                                        )}
                                        {season.highScore && (
                                            <p
                                                className={classNames(
                                                    styles.seasonStat,
                                                    styles.fire
                                                )}
                                            >
                                                <Icon name="fire" />
                                                <span>
                                                    High game:{" "}
                                                    <b>
                                                        {season.highScore.name}
                                                    </b>
                                                    ,{" "}
                                                    {formatPoints(
                                                        season.highScore.points
                                                    )}{" "}
                                                    (wk {season.highScore.week})
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                </section>
                            ))}
                    </div>
                </>
            )}
        </Page>
    );
};

export default HistoryPage;
