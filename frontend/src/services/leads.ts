/**
 * src/services/leads.ts
 * Typed API & Offline-First SQLite service for the Leads entity.
 * Talks to: GET/POST/PUT /api/v1/leads and local SQLite database.
 */
import { api } from '../utils/api';
import { getLocalLeads, upsertLocalLead } from '../lib/db';
import { logCallOffline, syncAll } from '../lib/sync-engine';

export interface Lead {
  id: string;
  assigned_to: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  vehicle_no?: string | null;
  vehicle_no_normalized?: string | null;
  status: string;
  city?: string | null;
  expiry_date?: string | null;
  remarks?: string | null;
  created_at?: string;
  updated_at?: string;
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
  /**
   * Reads leads directly from local SQLite database (instant offline rendering).
   */
  listLocal: async (options: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Lead[]> => {
    try {
      const rows = await getLocalLeads(options);
      return rows.map(r => ({
        id: r.id,
        client_name: r.client_name,
        client_phone: r.client_phone,
        client_email: r.client_email,
        vehicle_no: r.vehicle_no,
        vehicle_no_normalized: r.vehicle_no_normalized,
        status: r.status,
        city: r.city,
        assigned_to: r.assigned_to,
        expiry_date: r.expiry_date,
        remarks: r.remarks,
        created_at: r.updated_at,
        updated_at: r.updated_at
      }));
    } catch (err) {
      console.warn('[LeadsService] Local SQLite read failed, falling back to remote API:', err);
      return leadsService.list({ limit: options.limit || 50, skip: options.offset || 0 });
    }
  },

  /**
   * Fetches paginated leads from the server with limit/max constraints (default 50, max 100).
   */
  list: (params: { skip?: number; limit?: number; search?: string; status?: string } = {}): Promise<Lead[]> => {
    const qs = new URLSearchParams();
    if (params.skip !== undefined) qs.set('skip', String(params.skip));
    if (params.limit !== undefined) qs.set('limit', String(Math.min(params.limit, 100)));
    if (params.search) qs.set('search', params.search);
    if (params.status) qs.set('status', params.status);
    const query = qs.toString() ? `?${qs}` : '';
    return api.get<Lead[]>(`${BASE}${query}`).then(res => {
      // Background save to local SQLite
      const leads = Array.isArray(res) ? res : (res as any)?.data || [];
      leads.forEach((l: any) => upsertLocalLead(l).catch(() => {}));
      return leads;
    });
  },

  getById: (id: string): Promise<Lead> =>
    api.get<Lead>(`${BASE}/${id}`),

  create: (data: LeadCreate): Promise<Lead> =>
    api.post<Lead>(`${BASE}/`, data),

  update: (id: string, data: LeadUpdate): Promise<Lead> =>
    api.put<Lead>(`${BASE}/${id}`, data),

  /**
   * Phase 11 Offline Call Logging
   * Optimistically writes to SQLite and enqueues sync mutation.
   */
  logCallOffline: (params: {
    leadId: string;
    userId: string;
    outcome: string;
    notes?: string;
    duration?: number;
  }) => logCallOffline(params),

  /**
   * Triggers bidirectional synchronization
   */
  sync: () => syncAll(),
};
