/**
 * src/services/leads.ts
 * Typed API service for the Leads entity.
 * Talks to: GET/POST/PUT /api/v1/leads
 */
import { api } from '../utils/api';

export interface Lead {
  id: string;
  assigned_to: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface LeadCreate {
  client_name: string;
  client_email?: string;
  client_phone?: string;
  status?: string;
}

export interface LeadUpdate {
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  status?: string;
  assigned_to?: string;
}

const BASE = '/leads';

export const leadsService = {
  list: (params: { skip?: number; limit?: number } = {}): Promise<Lead[]> => {
    const qs = new URLSearchParams();
    if (params.skip !== undefined) qs.set('skip', String(params.skip));
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs}` : '';
    return api.get<Lead[]>(`${BASE}/${query}`);
  },

  getById: (id: string): Promise<Lead> =>
    api.get<Lead>(`${BASE}/${id}`),

  create: (data: LeadCreate): Promise<Lead> =>
    api.post<Lead>(`${BASE}/`, data),

  update: (id: string, data: LeadUpdate): Promise<Lead> =>
    api.put<Lead>(`${BASE}/${id}`, data),
};
