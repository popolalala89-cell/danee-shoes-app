// Danee Shoes Care — Upload Service
// Ported from GAS uploadImageToDrive()
// Uses Supabase Storage instead of Google Drive

import { getSupabase } from '../supabase';
import type { ServiceResponse } from '../types-supabase';

const BUCKET_NAME = 'images';

/**
 * Upload a base64 image to Supabase Storage
 * @param base64Data - Full data URL (e.g., "data:image/png;base64,iVBOR...")
 * @param fileName - Desired file name
 * @returns Public URL of the uploaded image
 */
export async function uploadImage(
  base64Data: string,
  fileName?: string
): Promise<ServiceResponse<{ url: string }>> {
  try {
    const supabase = getSupabase();

    // Parse base64 data URL
    const matches = base64Data.match(/^data:(.+?);base64,(.+)$/);
    if (!matches) {
      return { success: false, error: 'Format data URL tidak valid.' };
    }

    const mimeType = matches[1];
    const base64Content = matches[2];
    const fileExt = mimeType.split('/')[1] || 'png';

    // Generate unique filename if not provided
    const uniqueName = fileName || `upload_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${fileExt}`;

    // Decode base64 to binary — use minimal chunking to avoid TS strict type issues
    const byteChars = atob(base64Content);
    const len = byteChars.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    const file = new File([blob], uniqueName, { type: mimeType });

    // Upload to Supabase Storage
    const { data: _data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(`public/${uniqueName}`, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      // If bucket doesn't exist, try to create it
      if (error.message?.includes('bucket') || String(error.statusCode) === '404') {
        return { success: false, error: `Bucket '${BUCKET_NAME}' belum dibuat. Jalankan SQL migration di Supabase Dashboard > SQL Editor.` };
      }
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(`public/${uniqueName}`);

    return { success: true, data: { url: publicUrl } };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengunggah gambar.' };
  }
}

/**
 * Delete an image from Supabase Storage by its public URL
 */
export async function deleteImage(publicUrl: string): Promise<ServiceResponse> {
  try {
    const supabase = getSupabase();

    // Extract path from public URL
    const urlObj = new URL(publicUrl);
    const pathParts = urlObj.pathname.split('/');
    // Path is usually: /storage/v1/object/public/images/public/filename.ext
    const storageIndex = pathParts.indexOf(BUCKET_NAME);
    if (storageIndex === -1) {
      // Try alternate path format
      const objIndex = pathParts.indexOf('object');
      if (objIndex !== -1) {
        const path = pathParts.slice(objIndex + 2).join('/');
        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([path]);
        if (error) return { success: false, error: error.message };
        return { success: true };
      }
      return { success: false, error: 'Path tidak dikenal.' };
    }
    const filePath = pathParts.slice(storageIndex + 1).join('/');
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus gambar.' };
  }
}
