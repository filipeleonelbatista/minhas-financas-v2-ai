import { createContext } from "react";
import type { StockContextValue } from "@/types/contexts";

export const StockContext = createContext({} as StockContextValue);
