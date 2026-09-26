import classNames from "classnames";

import styles from "./Header.module.scss";
import { Link, useLocation } from "react-router-dom";
import { REIGNING_CHAMPION } from "../../constants";

const pages = [
    { path: "/keeperPrices", label: "Keeper Prices" },
    { path: "/rules", label: "Rules" },
];

const Header = () => {
    const { pathname } = useLocation();
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
                        <div className={styles.leagueName}>The Fantasy 500</div>
                        <div className={styles.champ}>
                            <i className="fa-solid fa-user-crown" />
                            <span>Reigning Champ</span>
                            <span className={styles.champName}>
                                {REIGNING_CHAMPION}
                            </span>
                        </div>
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
