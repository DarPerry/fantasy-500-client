import styles from "./MobileApp.module.scss";

import { useCallback, useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";

import Header from "../Header/Header";
import KeeperPricesPage from "../../pages/KeeperPrices.page";
import RulesPage from "../../pages/RulesPage/RulesPage";

const API_URL =
    window.location.hostname === "localhost"
        ? "http://localhost:1739/"
        : "https://indy-ff-site-server.onrender.com/";

const MobileApp = () => {
    const [data, setData] = useState(null);
    const [hasError, setHasError] = useState(false);
    const { pathname } = useLocation();

    const getData = useCallback(async () => {
        setHasError(false);

        try {
            const response = await fetch(API_URL);

            if (!response.ok) throw new Error(response.statusText);

            setData(await response.json());
        } catch (error) {
            console.error(error);
            setHasError(true);
        }
    }, []);

    useEffect(() => {
        getData();
    }, [getData]);

    // Start each page at the top instead of the previous page's scroll position
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    const keeperPricesPage = (
        <KeeperPricesPage data={data} hasError={hasError} onRetry={getData} />
    );

    return (
        <div className={styles.mobileApp}>
            <Header />
            <Routes>
                <Route path="/" element={keeperPricesPage} />
                <Route path="keeperPrices" element={keeperPricesPage} />
                <Route path="rules" element={<RulesPage />} />
            </Routes>
        </div>
    );
};

export default MobileApp;
