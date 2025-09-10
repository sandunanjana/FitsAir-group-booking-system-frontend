import { create } from "zustand";

export type Role = "GROUP_DESK" | "ROUTE_CONTROLLER" | "ADMIN";

type State = {
  token: string | null;
  role: Role | null;
  username: string | null;
  login: (token: string, role: Role, username: string) => void;
  logout: () => void;
};

export const useAuthStore = create<State>((set) => ({
  token: null,
  role: null,
  username: null,
  login: (token, role, username) => set({ token, role, username }),
  logout: () => set({ token: null, role: null, username: null }),
}));
