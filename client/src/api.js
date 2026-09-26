const API_URL =
    window.location.hostname === "localhost"
        ? "http://localhost:1739"
        : "https://indy-ff-site-server.onrender.com";

export const fetchJson = async (path) => {
    const response = await fetch(`${API_URL}${path}`);

    if (!response.ok) throw new Error(response.statusText);

    return response.json();
};
