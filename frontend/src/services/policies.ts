/**
 * src/services/policies.ts
 * Typed API service for the Policies entity.
 * Talks to: GET/POST/PUT /api/v1/policies
 */
import { api } from '../utils/api';

export interface Policy {
  id: string;
  lead_id: string | null;
  policy_number: string;
  provider: string;
  type: string;
  premium_amount: number;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface PolicyCreate {
  lead_id?: string;
  policy_number: string;
  provider: string;
  type: string;
  premium_amount: number;
  start_date: string;
  end_date: string;
  status?: string;
}

export interface PolicyUpdate {
  provider?: string;
  type?: string;
  premium_amount?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
}

const BASE = '/policies';

export const policiesService = {
  list: (params: { skip?: number; limit?: number } = {}): Promise<Policy[]> => {
    const qs = new URLSearchParams();
    if (params.skip !== undefined) qs.set('skip', String(params.skip));
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs}` : '';
    return api.get<Policy[]>(`${BASE}/${query}`);
  },

  getById: (id: string): Promise<Policy> =>
    api.get<Policy>(`${BASE}/${id}`),

  create: (data: PolicyCreate): Promise<Policy> =>
    api.post<Policy>(`${BASE}/`, data),

  update: (id: string, data: PolicyUpdate): Promise<Policy> =>
    api.put<Policy>(`${BASE}/${id}`, data),
};
