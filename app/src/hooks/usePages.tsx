// @ts-nocheck
import { usePagesStore } from '../stores/pages';

export function usePages() {
  const { selectedSheet, setSelectedSheet } = usePagesStore();
  return {
    selectedSheet,
    setSelectedSheet,
  };
}
