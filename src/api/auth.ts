import { api } from "./client";
import type { Role } from "@/auth/store";

export type LoginRequest = { username: string; password: string };
export type LoginResponse = { token: string; role: Role };

export async function login(body: LoginRequest) {
  const { data } = await api.post<LoginResponse>("/api/auth/login", body);
  return data;
}
