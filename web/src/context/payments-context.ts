import { createContext } from "react";
import type { PaymentsContextValue } from "@/types/contexts";

export const PaymentsContext = createContext({} as PaymentsContextValue);
