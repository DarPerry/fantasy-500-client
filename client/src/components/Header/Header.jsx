import classNames from "classnames";

import styles from "./Header.module.scss";
import { Link, useLocation } from "react-router-dom";
import { useLeague } from "../../context/league";
import Icon from "../Icon/Icon";

const pages = [
    { path: "/keeperPrices", label: "Keepers" },
    { path: "/planner", label: "Planner" },
    { path: "/history", label: "History" },
    { path: "/rules", label: "Rules" },
];

const Header = () => {
    const { pathname } = useLocation();
    const { league } = useLeague();
    // "/" also shows keeper prices
    const activePath = pathname === "/" ? "/keeperPrices" : pathname;

    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <div className={styles.brand}>
                    <img
                        className={styles.leagueImage}
                        src="/images/league-picture.jpg"
                        alt=""
                    />
                    <div>
                        <div className={styles.leagueName}>
                            {league?.name || "The Fantasy 500"}
                        </div>
                        {league?.champion && (
                            <div
                                className={styles.champ}
                                title={`${league.champion.season} champion`}
                            >
                                <Icon
                                    name="trophy"
                                    className={styles.trophy}
                                />
                                <span className={styles.champLabel}>
                                    Reigning Champion
                                </span>
                                <span className={styles.champName}>
                                    {league.champion.name}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                <nav className={styles.pages}>
                    {pages.map(({ path, label }) => (
                        <Link
                            key={path}
                            to={path}
                            className={classNames(
                                styles.page,
                                activePath === path && styles.active
                            )}
                            aria-current={
                                activePath === path ? "page" : undefined
                            }
                        >
                            {label}
                        </Link>
                    ))}
                </nav>
            </div>
            <div className={styles.stripe} />
        </header>
    );
};

export default Header;
