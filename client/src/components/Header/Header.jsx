import classNames from "classnames";

import styles from "./Header.module.scss";
import { useState } from "react";
import { Link } from "react-router-dom";

const pageLabelMap = {
    keeperPrices: "Keeper Prices",
    rules: "Rules",
};

const Header = () => {
    const [activePage, setActivePage] = useState("keeperPrices");

    const PageNavOption = ({ pageKey }) => {
        const active = activePage === pageKey;

        return (
            <Link
                className={classNames(styles.page, active && styles.active)}
                onClick={() => setActivePage(pageKey)}
                to={pageKey}
            >
                {pageLabelMap[pageKey]}
            </Link>
        );
    };

    return (
        <header>
            <div className={styles.header}>
                <div className={styles.middle}>
                    <img
                        className={styles.leagueImage}
                        src="/images/league-picture.jpg"
                    />
                    <div>
                        <div className={styles.leagueInfo}>
                            <div className={styles.leagueName}>
                                The Fantasy 500
                            </div>
                        </div>
                        <div className={styles.champ}>
                            <i
                                className={classNames(
                                    "fa-solid fa-user-crown",
                                    styles.crownIcon
                                )}
                            />
                            <span>Reigning Champion:</span>
                            <span className={styles.champName}>Jeremiah</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles.pages}>
                <PageNavOption pageKey="keeperPrices" />
                <PageNavOption pageKey="rules" />
            </div>
        </header>
    );
};

export default Header;
