// Downloads StatMuse headshots for rostered players into client/public/images.
// Usage: node scripts/fetch-player-images.js [--refresh]
//   --refresh  re-download images that already exist (e.g. after a team change)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
    getCurrentLeague,
    getLeagueRosters,
} from "../services/league.service.js";
import { getAllPlayers } from "../services/player.service.js";

const IMAGE_DIR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../client/public/images",
);
const REFRESH = process.argv.includes("--refresh");

const TEAM_NAMES = {
    ARI: "arizona-cardinals",
    ATL: "atlanta-falcons",
    BAL: "baltimore-ravens",
    BUF: "buffalo-bills",
    CAR: "carolina-panthers",
    CHI: "chicago-bears",
    CIN: "cincinnati-bengals",
    CLE: "cleveland-browns",
    DAL: "dallas-cowboys",
    DEN: "denver-broncos",
    DET: "detroit-lions",
    GB: "green-bay-packers",
    HOU: "houston-texans",
    IND: "indianapolis-colts",
    JAX: "jacksonville-jaguars",
    KC: "kansas-city-chiefs",
    LAC: "los-angeles-chargers",
    LAR: "los-angeles-rams",
    LV: "las-vegas-raiders",
    MIA: "miami-dolphins",
    MIN: "minnesota-vikings",
    NE: "new-england-patriots",
    NO: "new-orleans-saints",
    NYG: "new-york-giants",
    NYJ: "new-york-jets",
    PHI: "philadelphia-eagles",
    PIT: "pittsburgh-steelers",
    SEA: "seattle-seahawks",
    SF: "san-francisco-49ers",
    TB: "tampa-bay-buccaneers",
    TEN: "tennessee-titans",
    WAS: "washington-commanders",
};

// Must match getPlayerImage in client/src/components/PlayerImage/PlayerImage.jsx
const getImageFileName = (name) =>
    `${name.toLowerCase().replaceAll(".", "").replaceAll("'", "").split(" ").join("-")}.png`;

const squash = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

const slugify = (text) =>
    text
        .toLowerCase()
        .replace(/['.]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

const findStatMuseImageOnPage = async (query, { full_name, team }) => {
    const response = await fetch(`https://www.statmuse.com/nfl/ask/${query}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
    });
    const html = await response.text();

    const urls = [
        ...new Set(
            html.match(
                /https:\/\/cdn\.statmuse\.com\/img\/nfl\/players\/[a-z0-9-]+?--[a-z0-9]+\.png/g,
            ) || [],
        ),
    ];

    // Image slugs look like "<team-name>-<player-name>[-01]--<id>"
    const matches = urls.filter((url) => {
        const slug = url
            .split("/")
            .at(-1)
            .split("--")[0]
            .replace(/-\d+$/, "")
            .replace(/-(jr|sr|ii|iii|iv)$/, "");
        return squash(slug).endsWith(squash(full_name));
    });

    return (
        matches.find((url) => url.includes(`/${TEAM_NAMES[team]}-`)) ||
        matches[0]
    );
};

// Players new to a team may only have a silhouette this season, so fall back
// to last season's page
const findStatMuseImage = async (player) => {
    const slug = slugify(player.full_name);
    const lastSeason = new Date().getFullYear() - 1;

    return (
        (await findStatMuseImageOnPage(`${slug}-stats`, player)) ||
        (await findStatMuseImageOnPage(`${slug}-stats-${lastSeason}`, player))
    );
};

const main = async () => {
    const { league_id } = await getCurrentLeague();
    const [rosters, allPlayers] = await Promise.all([
        getLeagueRosters(league_id),
        getAllPlayers(),
    ]);

    const players = rosters
        .flatMap(({ players }) => players || [])
        .map((id) => allPlayers[id])
        .filter((player) => player?.full_name && player.position !== "DEF");

    const todo = players.filter(
        ({ full_name }) =>
            REFRESH ||
            !fs.existsSync(path.join(IMAGE_DIR, getImageFileName(full_name))),
    );

    console.log(`${todo.length} of ${players.length} players need images`);

    const notFound = [];

    for (const player of todo) {
        const url = await findStatMuseImage(player);

        if (!url) {
            notFound.push(player.full_name);
            continue;
        }

        const image = await fetch(url);
        fs.writeFileSync(
            path.join(IMAGE_DIR, getImageFileName(player.full_name)),
            Buffer.from(await image.arrayBuffer()),
        );
        console.log(`  saved ${player.full_name}`);

        // Be polite to StatMuse
        await new Promise((resolve) => setTimeout(resolve, 400));
    }

    if (notFound.length) {
        console.log(`No StatMuse image found for: ${notFound.join(", ")}`);
    }
};

main();
