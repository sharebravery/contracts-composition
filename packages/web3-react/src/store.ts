import { create } from 'zustand';

import type { TransactionSnapshot } from './transaction';

type TransactionStore = {
  current?: TransactionSnapshot;
  setCurrent: (snapshot: TransactionSnapshot) => void;
  reset: () => void;
};

export const useTransactionStore = create<TransactionStore>((set) => ({
  current: undefined,
  setCurrent: (snapshot) => set({ current: snapshot }),
  reset: () => set({ current: undefined }),
}));
