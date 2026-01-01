import styles from "./MobileApp.module.scss";

import { useEffect, useState } from "react";
import { Outlet, Route, Routes } from "react-router-dom";

import Header from "../Header/Header";
import KeeperPricesPage from "../../pages/KeeperPrices.page";
import RulesPage from "../../pages/RulesPage/RulesPage";

const MobileApp = () => {
    const [data, setData] = useState(null);
    const isLocalhost = window.location.hostname === "localhost";

    useEffect(() => {
        const getData = async () => {
            const response = await fetch(
                isLocalhost
                    ? "http://localhost:1739/"
                    : "https://indy-ff-site-server.onrender.com/"
            );
            const data = await response.json();
            setData(data);
        };

        getData();
    }, []);

    return (
        <div className={styles.mobileApp}>
            {/* <div
                style={{
                    background: "red",
                    width: "100%",
                    backgroundImage:
                        "url('https://heavy.com/wp-content/uploads/2025/11/caleb-williams-chicago-bears_ae84c4.jpg?quality=65&strip=all&w=780')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    height: "200px",
                }}
            ></div> */}
            <Header />
            <Routes>
                <Route path="/" element={<KeeperPricesPage data={data} />} />
                <Route
                    index
                    path="keeperPrices"
                    element={<KeeperPricesPage data={data} />}
                />
                <Route path="rules" element={<RulesPage />} />
            </Routes>
            <Outlet />
        </div>
    );
};

export default MobileApp;
