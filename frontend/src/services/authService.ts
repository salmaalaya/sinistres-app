import api from './api';
import type { AuthResponse } from '../types';

export async function login(username: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { username, password });
  return data;
}

export interface RegisterPayload {
  username: string;
  password: string;
  nom: string;
  prenom: string;
  email: string;
  role: 'ADMIN' | 'GESTIONNAIRE';
}

export async function register(payload: RegisterPayload): Promise<void> {
  await api.post('/auth/register', payload);
}

export interface ForgotPasswordResponse {
  message: string;
  destinationMasquee: string | null;
}

export async function forgotPassword(identifiant: string): Promise<ForgotPasswordResponse> {
  const { data } = await api.post<ForgotPasswordResponse>('/auth/forgot-password', { identifiant });
  return data;
}

export async function verifyOtp(identifiant: string, code: string): Promise<string> {
  const { data } = await api.post<{ resetToken: string }>('/auth/verify-otp', { identifiant, code });
  return data.resetToken;
}

export async function resetPassword(resetToken: string, newPassword: string): Promise<void> {
  await api.post('/auth/reset-password', { resetToken, newPassword });
}
