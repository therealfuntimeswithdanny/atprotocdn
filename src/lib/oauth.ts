import { BrowserOAuthClient } from '@atproto/oauth-client-browser';
import { supabase } from '@/integrations/supabase/client';

const ACCOUNTS_STORAGE_KEY = 'atproto-accounts';
const ACTIVE_ACCOUNT_KEY = 'atproto-active-did';

const LEGACY_COLLECTION_PREFIXES = ['uk.madebydanny.cdn', 'uk.madebydanny.dcn'] as const;
const NEW_COLLECTION_PREFIX = 'net.blueat.drive';

export interface StoredAccount {
  did: string;
  handle: string;
  avatar?: string;
}

let oauthClient: BrowserOAuthClient | null = null;

export const getOAuthClient = () => {
  if (!oauthClient) {
    const origin = window.location.origin;
    const redirectUri = 'https://drive.blueat.net/';
    const clientId = 'https://drive.blueat.net/client-metadata.json';
    
    oauthClient = new BrowserOAuthClient({
      // Use the public Bluesky handle resolver to support any PDS
      handleResolver: 'https://bsky.social',
      clientMetadata: {
        client_id: clientId,
        client_name: 'BlueAT Drive',
        client_uri: 'https://drive.blueat.net',
        redirect_uris: [redirectUri],
        scope: 'atproto transition:generic',
        response_types: ['code'],
        grant_types: ['authorization_code', 'refresh_token'],
        token_endpoint_auth_method: 'none',
        application_type: 'web',
        dpop_bound_access_tokens: true,
      },
      responseMode: 'fragment',
    });
  }
  return oauthClient;
};

// Resolve a user's PDS URL from their DID
export const resolvePdsUrl = async (did: string): Promise<string> => {
  try {
    // Fetch the DID document to get the PDS endpoint
    const didDocUrl = did.startsWith('did:plc:')
      ? `https://plc.directory/${did}`
      : `https://${did.replace('did:web:', '')}/.well-known/did.json`;
    
    const response = await fetch(didDocUrl);
    if (!response.ok) {
      throw new Error('Failed to resolve DID document');
    }
    
    const didDoc = await response.json();
    
    // Find the atproto PDS service endpoint
    const pdsService = didDoc.service?.find(
      (s: { id: string; type: string; serviceEndpoint: string }) => 
        s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer'
    );
    
    if (pdsService?.serviceEndpoint) {
      return pdsService.serviceEndpoint;
    }
    
    // Fallback to bsky.social if no PDS found
    return 'https://bsky.social';
  } catch (error) {
    console.error('Failed to resolve PDS URL:', error);
    // Default fallback
    return 'https://bsky.social';
  }
};

// Fetch user profile from any PDS
export const fetchUserProfile = async (did: string): Promise<{ handle: string; avatar?: string }> => {
  let handle = did;
  let avatar: string | undefined;
  
  const pdsUrl = await resolvePdsUrl(did);
  
  try {
    const describeResponse = await fetch(
      `${pdsUrl}/xrpc/com.atproto.repo.describeRepo?repo=${did}`
    );
    if (describeResponse.ok) {
      const describeData = await describeResponse.json();
      handle = describeData.handle || did;
    }
  } catch (error) {
    console.error('Failed to fetch handle:', error);
  }
  
  try {
    const profileResponse = await fetch(
      `${pdsUrl}/xrpc/com.atproto.repo.getRecord?repo=${did}&collection=app.bsky.actor.profile&rkey=self`
    );
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      if (profileData.value?.avatar?.ref?.$link) {
        avatar = `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${profileData.value.avatar.ref.$link}`;
      }
    }
  } catch (error) {
    console.error('Failed to fetch profile:', error);
  }
  
  return { handle, avatar };
};

// Multi-account storage helpers
export const getStoredAccounts = (): StoredAccount[] => {
  const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveAccount = (account: StoredAccount) => {
  const accounts = getStoredAccounts();
  const existingIndex = accounts.findIndex(a => a.did === account.did);
  if (existingIndex >= 0) {
    accounts[existingIndex] = account;
  } else {
    accounts.push(account);
  }
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
};

export const removeAccount = (did: string) => {
  const accounts = getStoredAccounts().filter(a => a.did !== did);
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  
  const activeDid = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  if (activeDid === did) {
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, accounts[0]?.did || '');
  }
};

export const getActiveAccountDid = (): string | null => {
  return localStorage.getItem(ACTIVE_ACCOUNT_KEY) || null;
};

export const setActiveAccountDid = (did: string) => {
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, did);
};

export const initiateOAuthLogin = async (handle: string) => {
  const client = getOAuthClient();
  sessionStorage.setItem('oauth-login-handle', handle);
  await client.signIn(handle, {
    state: handle,
  });
};

export const handleOAuthCallback = async () => {
  const client = getOAuthClient();
  
  const hash = window.location.hash.slice(1);
  const hashParams = new URLSearchParams(hash);
  
  if (hashParams.has('code') && hashParams.has('state')) {
    try {
      const result = await client.callback(hashParams);
      window.history.replaceState({}, document.title, window.location.pathname);
      
      const storedHandle = sessionStorage.getItem('oauth-login-handle');
      const handle = storedHandle || result.session.did;
      
      // Set as active and save to accounts
      setActiveAccountDid(result.session.did);
      
      return {
        did: result.session.did,
        handle,
        session: result.session,
      };
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    } finally {
      sessionStorage.removeItem('oauth-login-handle');
    }
  }
  
  return null;
};

export const restorePersistedSession = async () => {
  const activeDid = getActiveAccountDid();
  if (!activeDid) return null;
  
  try {
    const client = getOAuthClient();
    const session = await client.restore(activeDid);
    if (session) {
      return {
        did: session.did,
        session,
      };
    }
  } catch (error) {
    console.error('Failed to restore persisted session:', error);
    removeAccount(activeDid);
  }
  return null;
};

export const restoreSessionForDid = async (did: string) => {
  try {
    const client = getOAuthClient();
    const session = await client.restore(did);
    return session;
  } catch (error) {
    console.error('Failed to restore session for DID:', did, error);
    removeAccount(did);
    return null;
  }
};

export const revokeOAuthSession = async (did: string) => {
  const client = getOAuthClient();
  try {
    await client.revoke(did);
  } catch (error) {
    console.error('Failed to revoke session:', error);
  }
  removeAccount(did);
};

// Helper to determine if a file is a video
export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith('video/');
};

// Helper to determine if a mime type is video
export const isVideoMimeType = (mimeType: string): boolean => {
  return mimeType.startsWith('video/');
};

// Upload blob using OAuth session directly (for authenticated users)
export const uploadBlobWithOAuth = async (did: string, file: File): Promise<{
  blob: { ref: { $link: string }; mimeType: string; size: number };
  uri: string;
  uploadId: string;
}> => {
  const client = getOAuthClient();
  const session = await client.restore(did);
  
  if (!session) {
    throw new Error('No active session');
  }

  // Dynamically resolve the user's PDS URL
  const pdsUrl = await resolvePdsUrl(did);
  
  const arrayBuffer = await file.arrayBuffer();
  const fileData = new Uint8Array(arrayBuffer);
  
  const blobResponse = await session.fetchHandler(pdsUrl + '/xrpc/com.atproto.repo.uploadBlob', {
    method: 'POST',
    headers: {
      'Content-Type': file.type,
    },
    body: fileData,
  });
  
  if (!blobResponse.ok) {
    const error = await blobResponse.text();
    throw new Error(`Failed to upload blob: ${error}`);
  }
  
  const blobData = await blobResponse.json();
  
  // Determine the record type based on file type
  const isVideo = isVideoFile(file);
  const recordType = isVideo ? 'net.blueat.drive.video' : 'net.blueat.drive.img';
  
  const record = {
    blob: blobData.blob,
    $type: recordType,
    langs: ['en'],
    createdAt: new Date().toISOString(),
  };
  
  const recordResponse = await session.fetchHandler(pdsUrl + '/xrpc/com.atproto.repo.createRecord', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      repo: did,
      collection: recordType,
      record,
    }),
  });
  
  if (!recordResponse.ok) {
    const error = await recordResponse.text();
    throw new Error(`Failed to create record: ${error}`);
  }
  
  const recordData = await recordResponse.json();
  
  // Track upload in Supabase
  const { data: uploadData, error: uploadError } = await supabase
    .from('uploads')
    .insert({
      user_did: did,
      blob_cid: blobData.blob.ref.$link,
      mime_type: file.type,
      size_bytes: file.size,
      filename: file.name,
      record_uri: recordData.uri,
    })
    .select('id')
    .single();
    
  if (uploadError) {
    console.error('Failed to track upload:', uploadError);
  }
  
  return {
    blob: blobData.blob,
    uri: recordData.uri,
    uploadId: uploadData?.id || '',
  };
};

// Upload multiple blobs with progress callback
export const uploadMultipleBlobsWithOAuth = async (
  did: string, 
  files: File[],
  onProgress: (index: number, status: 'uploading' | 'completed' | 'failed', error?: string) => void
): Promise<{ successCount: number; failedCount: number }> => {
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < files.length; i++) {
    onProgress(i, 'uploading');
    try {
      await uploadBlobWithOAuth(did, files[i]);
      successCount++;
      onProgress(i, 'completed');
    } catch (error) {
      failedCount++;
      onProgress(i, 'failed', error instanceof Error ? error.message : 'Upload failed');
    }
  }

  return { successCount, failedCount };
};

export interface UploadFiltersParams {
  search?: string;
  dateRange?: 'all' | 'today' | 'week' | 'month';
  mimeType?: string;
  sizeRange?: 'all' | 'small' | 'medium' | 'large';
  sortBy?: 'date' | 'size' | 'name';
  sortOrder?: 'asc' | 'desc';
}


interface PdsListRecord {
  uri: string;
  value: Record<string, unknown>;
}

interface PdsListRecordsResponse {
  records?: PdsListRecord[];
  cursor?: string;
}

interface OAuthSessionLike {
  fetchHandler: (input: string, init?: RequestInit) => Promise<Response>;
}

const legacyCollectionToNew = (collection: string): string => {
  for (const prefix of LEGACY_COLLECTION_PREFIXES) {
    if (collection.startsWith(`${prefix}.`)) {
      return collection.replace(prefix, NEW_COLLECTION_PREFIX);
    }
  }
  return collection;
};

const migrateLegacyUri = (uri: string): string => {
  if (!uri.startsWith('at://')) return uri;
  const parts = uri.replace('at://', '').split('/');
  if (parts.length < 3) return uri;

  const [uriDid, collection, rkey] = parts;
  const newCollection = legacyCollectionToNew(collection);
  if (newCollection === collection) return uri;

  return `at://${uriDid}/${newCollection}/${rkey}`;
};

const listRecordsForCollection = async (
  pdsUrl: string,
  did: string,
  collection: string,
  limit = '100'
): Promise<PdsListRecord[]> => {
  const all: PdsListRecord[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({
      repo: did,
      collection,
      limit,
    });

    if (cursor) params.set('cursor', cursor);

    const response = await fetch(`${pdsUrl}/xrpc/com.atproto.repo.listRecords?${params.toString()}`);
    if (!response.ok) break;

    const data = (await response.json()) as PdsListRecordsResponse;
    all.push(...(data.records || []));
    cursor = data.cursor;
  } while (cursor && limit !== '1');

  return all;
};

const upsertMigratedRecord = async (
  session: OAuthSessionLike,
  pdsUrl: string,
  did: string,
  collection: string,
  rkey: string,
  record: Record<string, unknown>
) => {
  await session.fetchHandler(`${pdsUrl}/xrpc/com.atproto.repo.putRecord`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repo: did,
      collection,
      rkey,
      record,
    }),
  });
};

export const hasLegacyRecords = async (did: string): Promise<boolean> => {
  const pdsUrl = await resolvePdsUrl(did);

  for (const prefix of LEGACY_COLLECTION_PREFIXES) {
    for (const suffix of ['img', 'video', 'star', 'folder']) {
      const records = await listRecordsForCollection(pdsUrl, did, `${prefix}.${suffix}`, '1');
      if (records.length > 0) return true;
    }
  }

  return false;
};

export const migrateLegacyRecords = async (did: string): Promise<{
  success: boolean;
  migratedCount: number;
  errors: string[];
}> => {
  const client = getOAuthClient();
  const session = await client.restore(did);
  if (!session) {
    return { success: false, migratedCount: 0, errors: ['No active session'] };
  }

  const pdsUrl = await resolvePdsUrl(did);
  let migratedCount = 0;
  const errors: string[] = [];

  for (const prefix of LEGACY_COLLECTION_PREFIXES) {
    for (const suffix of ['img', 'video', 'star', 'folder']) {
      const legacyCollection = `${prefix}.${suffix}`;
      const newCollection = `${NEW_COLLECTION_PREFIX}.${suffix}`;
      const records = await listRecordsForCollection(pdsUrl, did, legacyCollection);

      for (const recordEntry of records) {
        const rkey = recordEntry.uri.split('/').pop();
        if (!rkey) continue;

        const migratedRecord = { ...(recordEntry.value || {}) };
        migratedRecord.$type = newCollection;

        if (suffix === 'star' && typeof migratedRecord.subject === 'string') {
          migratedRecord.subject = migrateLegacyUri(migratedRecord.subject);
        }

        if (suffix === 'folder' && Array.isArray(migratedRecord.items)) {
          migratedRecord.items = migratedRecord.items.map((uri: string) => migrateLegacyUri(uri));
        }

        try {
          await upsertMigratedRecord(session, pdsUrl, did, newCollection, rkey, migratedRecord);
          migratedCount++;
        } catch (error) {
          errors.push(`Failed to migrate ${recordEntry.uri}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  }

  return { success: errors.length === 0, migratedCount, errors };
};


// Fetch all uploads for a user with filtering
export const fetchUserUploads = async (did: string, filters?: UploadFiltersParams): Promise<{
  id: string;
  cid: string;
  uri: string;
  mimeType: string;
  createdAt: string;
  filename: string | null;
  sizeBytes: number;
}[]> => {
  try {
    let query = supabase
      .from('uploads')
      .select('*')
      .eq('user_did', did);
    
    // Apply date range filter
    if (filters?.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      
      query = query.gte('created_at', startDate.toISOString());
    }
    
    // Apply mime type filter
    if (filters?.mimeType && filters.mimeType !== 'all') {
      if (filters.mimeType === 'images') {
        query = query.like('mime_type', 'image/%');
      } else if (filters.mimeType === 'videos') {
        query = query.like('mime_type', 'video/%');
      } else {
        query = query.eq('mime_type', filters.mimeType);
      }
    }
    
    // Apply size range filter
    if (filters?.sizeRange && filters.sizeRange !== 'all') {
      switch (filters.sizeRange) {
        case 'small':
          query = query.lt('size_bytes', 100 * 1024);
          break;
        case 'medium':
          query = query.gte('size_bytes', 100 * 1024).lt('size_bytes', 1024 * 1024);
          break;
        case 'large':
          query = query.gte('size_bytes', 1024 * 1024);
          break;
      }
    }
    
    // Apply sorting
    const sortBy = filters?.sortBy || 'date';
    const sortOrder = filters?.sortOrder || 'desc';
    const ascending = sortOrder === 'asc';
    
    switch (sortBy) {
      case 'size':
        query = query.order('size_bytes', { ascending });
        break;
      case 'name':
        query = query.order('filename', { ascending, nullsFirst: false });
        break;
      default:
        query = query.order('created_at', { ascending });
    }
    
    const { data, error } = await query;
      
    if (error) throw error;
    
    let results = (data || []).map((upload) => ({
      id: upload.id,
      cid: upload.blob_cid,
      uri: '',
      mimeType: upload.mime_type,
      createdAt: upload.created_at,
      filename: upload.filename,
      sizeBytes: upload.size_bytes,
    }));
    
    // Apply search filter (client-side for partial matching)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(upload => 
        upload.filename?.toLowerCase().includes(searchLower)
      );
    }
    
    return results;
  } catch (error) {
    console.error('Failed to fetch uploads:', error);
    return [];
  }
};
