import { create } from 'zustand';
import { type DataMode, getDataMode, setDataMode } from '../config/dataMode';

interface DataModeState {
  mode: DataMode;
  setMode: (mode: DataMode) => void;
}

export const useDataModeStore = create<DataModeState>((set) => ({
  mode: getDataMode(),
  setMode: (mode) => {
    setDataMode(mode);
    set({ mode });
  },
}));
