import { apiClient } from '../lib/axios';

export interface User {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authService = {
  async register(body: Record<string, any>): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/register', body);
  },

  async login(body: Record<string, any>): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/login', body);
  },

  async getCurrentUser(): Promise<User> {
    return apiClient.get<User>('/api/auth/me');
  },
};
