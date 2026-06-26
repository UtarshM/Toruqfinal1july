/**
 * src/services/storage.ts
 * Typed API service for Supabase Storage (file upload & signed URLs).
 * Talks to: POST /api/v1/storage/upload, GET /api/v1/storage/{id}/signed-url
 */
import { supabase } from '../lib/supabase';

const BASE_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export interface UploadedDocument {
  id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_path: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface SignedUrlResponse {
  document_id: string;
  file_name: string;
  signed_url: string;
  expires_in_seconds: number;
}

export const storageService = {
  /**
   * Upload a file linked to an entity (lead, policy, quotation, kyc, claim).
   * Uses FormData so the file bytes are sent as multipart/form-data.
   */
  upload: async (
    entityType: string,
    entityId: string,
    file: { uri: string; name: string; type: string }
  ): Promise<UploadedDocument> => {
    const token = await getToken();

    const formData = new FormData();
    formData.append('entity_type', entityType);
    formData.append('entity_id', entityId);
    // React Native / Expo File object
    formData.append('file', { uri: file.uri, name: file.name, type: file.type } as any);

    const response = await fetch(`${BASE_URL}/api/v1/storage/upload`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        // Do NOT set Content-Type — fetch sets it automatically with the boundary for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }

    return response.json() as Promise<UploadedDocument>;
  },

  /**
   * Get a temporary signed URL for a document (valid for 1 hour by default).
   * Use this to display PDFs or images without exposing the storage path.
   */
  getSignedUrl: async (documentId: string, expiresIn = 3600): Promise<SignedUrlResponse> => {
    const token = await getToken();
    const response = await fetch(
      `${BASE_URL}/api/v1/storage/${documentId}/signed-url?expires_in=${expiresIn}`,
      { headers: { Authorization: token ? `Bearer ${token}` : '' } }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to get signed URL' }));
      throw new Error(err.detail || 'Failed to get signed URL');
    }

    return response.json() as Promise<SignedUrlResponse>;
  },

  /** Delete a document record and its file from Supabase Storage. */
  delete: async (documentId: string): Promise<void> => {
    const token = await getToken();
    const response = await fetch(`${BASE_URL}/api/v1/storage/${documentId}`, {
      method: 'DELETE',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Delete failed' }));
      throw new Error(err.detail || 'Delete failed');
    }
  },
};
