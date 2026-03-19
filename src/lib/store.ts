// ===========================================
// Zustand Store — ContractLens
// ===========================================
// Persistent state untuk pilihan user (provider, language, history)
// Disimpan ke localStorage agar tetap ada setelah refresh
//
// HYDRATION NOTE:
// Next.js renders di server tanpa localStorage. Zustand persist
// membaca localStorage hanya setelah client mount. Kita track
// _hasHydrated agar komponen tahu kapan nilai dari localStorage
// sudah benar-benar di-load sebelum melakukan logika apapun.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AIProvider, Language } from './types';

const MAX_HISTORY = 20;

export interface HistoryEntry {
  address: string;
  contractName: string; // nama kontrak dari hasil analisis
  scannedAt: string;    // ISO timestamp
}

interface PreferencesState {
  provider: AIProvider;
  language: Language;
  history: HistoryEntry[];
  // Flag: true setelah Zustand selesai baca localStorage
  _hasHydrated: boolean;
  setProvider: (provider: AIProvider) => void;
  setLanguage: (language: Language) => void;
  addHistory: (entry: HistoryEntry) => void;
  removeHistory: (address: string) => void;
  clearHistory: () => void;
  setHasHydrated: (val: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      provider: 'anthropic',
      language: 'en',
      history: [],
      _hasHydrated: false,
      setProvider: (provider) => set({ provider }),
      setLanguage: (language) => set({ language }),
      // Tambah ke history, pastikan tidak duplikat, max 20 item
      addHistory: (entry) =>
        set((state) => {
          const filtered = state.history.filter((h) => h.address.toLowerCase() !== entry.address.toLowerCase());
          return {
            history: [entry, ...filtered].slice(0, MAX_HISTORY),
          };
        }),
      removeHistory: (address) =>
        set((state) => ({
          history: state.history.filter((h) => h.address.toLowerCase() !== address.toLowerCase()),
        })),
      clearHistory: () => set({ history: [] }),
      setHasHydrated: (val) => set({ _hasHydrated: val }),
    }),
    {
      name: 'contractlens-preferences',
      storage: createJSONStorage(() => localStorage),
      // Hanya persist data — bukan _hasHydrated atau setter
      partialize: (state) => ({
        provider: state.provider,
        language: state.language,
        history: state.history,
      }),
      // Dipanggil setelah localStorage selesai dibaca
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
