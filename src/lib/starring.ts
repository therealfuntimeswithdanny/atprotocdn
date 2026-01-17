import { getOAuthClient, resolvePdsUrl } from './oauth';
import { supabase } from '@/integrations/supabase/client';

const STAR_RECORD_TYPE = 'uk.madebydanny.cdn.star';

export interface StarRecord {
  $type: string;
  subject: string; // URI of the starred upload record
  createdAt: string;
}

// Star an upload by creating an ATProto record
export const starUpload = async (
  did: string, 
  uploadId: string,
  subjectUri: string
): Promise<{ success: boolean; rkey?: string; error?: string }> => {
  try {
    const client = getOAuthClient();
    const session = await client.restore(did);
    
    if (!session) {
      return { success: false, error: 'No active session' };
    }

    const pdsUrl = await resolvePdsUrl(did);
    
    const record: StarRecord = {
      $type: STAR_RECORD_TYPE,
      subject: subjectUri,
      createdAt: new Date().toISOString(),
    };
    
    const response = await session.fetchHandler(pdsUrl + '/xrpc/com.atproto.repo.createRecord', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repo: did,
        collection: STAR_RECORD_TYPE,
        record,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to create star record: ${error}` };
    }
    
    const data = await response.json();
    const rkey = data.uri.split('/').pop();
    
    // Track in database
    await supabase
      .from('starred_uploads')
      .insert({
        user_did: did,
        upload_id: uploadId,
      });
    
    return { success: true, rkey };
  } catch (error) {
    console.error('Failed to star upload:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Unstar an upload by deleting the ATProto record
export const unstarUpload = async (
  did: string,
  uploadId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Remove from database
    const { error: dbError } = await supabase
      .from('starred_uploads')
      .delete()
      .eq('user_did', did)
      .eq('upload_id', uploadId);
    
    if (dbError) {
      console.error('Failed to remove star from database:', dbError);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to unstar upload:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Check if an upload is starred
export const isUploadStarred = async (
  did: string,
  uploadId: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('starred_uploads')
      .select('id')
      .eq('user_did', did)
      .eq('upload_id', uploadId)
      .maybeSingle();
    
    if (error) {
      console.error('Failed to check star status:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Failed to check star status:', error);
    return false;
  }
};

// Get all starred upload IDs for a user
export const getStarredUploadIds = async (did: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('starred_uploads')
      .select('upload_id')
      .eq('user_did', did);
    
    if (error) {
      console.error('Failed to fetch starred uploads:', error);
      return [];
    }
    
    return data?.map(s => s.upload_id) || [];
  } catch (error) {
    console.error('Failed to fetch starred uploads:', error);
    return [];
  }
};

// Fetch starred uploads with full details
export const fetchStarredUploads = async (did: string): Promise<{
  id: string;
  cid: string;
  mimeType: string;
  createdAt: string;
  filename: string | null;
  sizeBytes: number;
  starredAt: string;
}[]> => {
  try {
    const { data, error } = await supabase
      .from('starred_uploads')
      .select(`
        id,
        created_at,
        upload_id,
        uploads!inner (
          id,
          blob_cid,
          mime_type,
          created_at,
          filename,
          size_bytes
        )
      `)
      .eq('user_did', did)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Failed to fetch starred uploads:', error);
      return [];
    }
    
    return (data || []).map((item: any) => ({
      id: item.uploads.id,
      cid: item.uploads.blob_cid,
      mimeType: item.uploads.mime_type,
      createdAt: item.uploads.created_at,
      filename: item.uploads.filename,
      sizeBytes: item.uploads.size_bytes,
      starredAt: item.created_at,
    }));
  } catch (error) {
    console.error('Failed to fetch starred uploads:', error);
    return [];
  }
};

// Toggle star status
export const toggleStar = async (
  did: string,
  uploadId: string,
  subjectUri: string = ''
): Promise<{ starred: boolean; error?: string }> => {
  const isCurrentlyStarred = await isUploadStarred(did, uploadId);
  
  if (isCurrentlyStarred) {
    const result = await unstarUpload(did, uploadId);
    return { starred: false, error: result.error };
  } else {
    const result = await starUpload(did, uploadId, subjectUri);
    return { starred: true, error: result.error };
  }
};
