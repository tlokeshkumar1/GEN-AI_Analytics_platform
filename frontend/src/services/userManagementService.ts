import api from './api';

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tier: string;
  status: 'Active' | 'Inactive' | 'Unknown';
  last_login: string | null;
  origin: string;
  role_collections: string[];
}

export interface ManagedUsersResponse {
  users: ManagedUser[];
  total: number;
  source: 'xsuaa';
  fetched_at: string;
}

export async function fetchManagedUsers(signal?: AbortSignal): Promise<ManagedUsersResponse> {
  const response = await api.get<ManagedUsersResponse>('/users', { signal });
  return response.data;
}
