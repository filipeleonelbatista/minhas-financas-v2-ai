import { useContext } from "react";
import { StockContext } from "../context/stock-context";

export function useStock() {
  const value = useContext(StockContext);
  return value;
}
