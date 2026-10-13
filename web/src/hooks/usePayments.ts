import { useContext } from "react";
import { PaymentsContext } from "../context/payments-context";

export function usePayments() {
  const value = useContext(PaymentsContext);
  return value;
}
