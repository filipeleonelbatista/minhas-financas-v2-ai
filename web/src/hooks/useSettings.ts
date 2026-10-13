import { useContext } from "react";
import { SettingsContext } from "../context/settings-context";

export function useSettings() {
  const value = useContext(SettingsContext);
  return value;
}
