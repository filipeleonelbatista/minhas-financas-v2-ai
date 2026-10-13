import { useContext } from "react";
import { RunsContext } from "../context/runs-context";

export function useRuns() {
  const value = useContext(RunsContext);
  return value;
}
