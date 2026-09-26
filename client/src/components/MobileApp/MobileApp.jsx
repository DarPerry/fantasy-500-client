import styles from "./MobileApp.module.scss";

import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";

import Header from "../Header/Header";
import KeeperPricesPage from "../../pages/KeeperPrices.page";
import PlannerPage from "../../pages/Planner/PlannerPage";
import HistoryPage from "../../pages/History/HistoryPage";
import RulesPage from "../../pages/RulesPage/RulesPage";
import { LeagueProvider } from "../../context/LeagueContext";

const MobileApp = () => {
    const { pathname } = useLocation();

    // Start each page at the top instead of the previous page's scroll position
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <LeagueProvider>
            <div className={styles.mobileApp}>
                <Header />
                <Routes>
                    <Route path="/" element={<KeeperPricesPage />} />
                    <Route path="keeperPrices" element={<KeeperPricesPage />} />
                    <Route path="planner" element={<PlannerPage />} />
                    <Route path="history" element={<HistoryPage />} />
                    <Route path="rules" element={<RulesPage />} />
                </Routes>
            </div>
        </LeagueProvider>
    );
};

export default MobileApp;
