import { useState } from "react";
import classNames from "classnames";

import styles from "./PlayerImage.module.scss";

const teamColors = {
    ARI: "#9b2743",
    ATL: "#a6192e",
    BAL: "#241773",
    BUF: "#c60c30",
    CAR: "#0085ca",
    CHI: "#c83803",
    CIN: "#fc4c02",
    CLE: "#fb4f14",
    DAL: "#b0b7bc",
    DEN: "#0c2340",
    DET: "#0069b1",
    GB: "#ffb611",
    HOU: "#a71930",
    IND: "#a5acaf",
    JAX: "#9f792c",
    KC: "#ffb611",
    LAC: "#127dc5",
    LAR: "#063992",
    LV: "#87909a",
    MIA: "#008c95",
    MIN: "#ffc72c",
    NE: "#c60c30",
    NO: "#9f8958",
    NYG: "#a71930",
    NYJ: "#115740",
    PHI: "#a5acaf",
    PIT: "#ffb81c",
    SEA: "#69be29",
    SF: "#b3995d",
    TB: "#c91331",
    TEN: "#4b92db",
    WAS: "#ffb611",
};

// Must match getImageFileName in server/scripts/fetch-player-images.js
const getPlayerImage = (name) =>
    `/images/${name
        ?.toLowerCase()
        ?.replaceAll(".", "")
        ?.replaceAll("'", "")
        ?.split(" ")
        .join("-")}.png`;

const PlayerImage = ({ name, team, position, size = "large" }) => {
    const [hasError, setHasError] = useState(false);
    const isDefense = position === "DEF";

    const initials = name
        ?.split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2);

    return (
        <div
            className={classNames(styles.imageContainer, styles[size])}
            style={{ "--team": teamColors[team] || "#54585a" }}
        >
            {hasError ? (
                <span className={styles.imageFallback}>
                    {isDefense ? team : initials}
                </span>
            ) : (
                <img
                    className={classNames(
                        styles.playerImage,
                        isDefense && styles.defense
                    )}
                    src={getPlayerImage(name)}
                    alt=""
                    loading="lazy"
                    onError={() => setHasError(true)}
                />
            )}
        </div>
    );
};

export default PlayerImage;
