import { useLocalState } from "./storage.helper";

// Keeper plans saved on this device: { [rosterId]: { selected, protectedId } }
export const useKeeperPlans = () => useLocalState("keeperPlans", {});

export const EMPTY_PLAN = { selected: [], protectedId: null };
