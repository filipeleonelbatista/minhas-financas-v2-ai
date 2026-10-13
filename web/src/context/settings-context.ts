import { createContext } from "react";
import type { SettingsContextValue } from "@/types/contexts";

export const SettingsContext = createContext({} as SettingsContextValue);
