import { createContext, useContext } from "react";

export const LeagueContext = createContext(null);

// League data, season mode and "my team", provided by LeagueProvider
export const useLeague = () => useContext(LeagueContext);
