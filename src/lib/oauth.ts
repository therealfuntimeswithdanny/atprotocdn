import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

const ACCOUNTS_STORAGE_KEY = 'atproto-accounts';
const ACTIVE_ACCOUNT_KEY = 'atproto-active-did';

export interface StoredAccount {
  did: string;
  handle: string;
  avatar?: string;
}

let oauthClient: BrowserOAuthClient | null = null;

export const getOAuthClient = () => {
  if (!oauthClient) {
    const origin = window.location.origin;
    const redirectUri = `${origin}/`;
    const clientId = `${origin}/client-metadata.json`;
    
    oauthClient = new BrowserOAuthClient({
      handleResolver: 'https://pds.madebydanny.uk',
      clientMetadata: {
        client_id: clientId,
        client_name: 'ATProto CDN Tool',
        client_uri: origin,
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

// Upload blob using OAuth session directly (for authenticated users)
export const uploadBlobWithOAuth = async (did: string, file: File): Promise<{
  blob: { ref: { $link: string }; mimeType: string; size: number };
  uri: string;
}> => {
  const client = getOAuthClient();
  const session = await client.restore(did);
  
  if (!session) {
    throw new Error('No active session');
  }

  const pdsUrl = 'https://pds.madebydanny.uk';
  
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
  
  const record = {
    blob: blobData.blob,
    $type: 'uk.madebydanny.cdn.img',
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
      collection: 'uk.madebydanny.cdn.img',
      record,
    }),
  });
  
  if (!recordResponse.ok) {
    const error = await recordResponse.text();
    throw new Error(`Failed to create record: ${error}`);
  }
  
  const recordData = await recordResponse.json();
  
  return {
    blob: blobData.blob,
    uri: recordData.uri,
  };
};

// Fetch all uploads for a user
export const fetchUserUploads = async (did: string): Promise<{
  cid: string;
  uri: string;
  mimeType: string;
  createdAt: string;
}[]> => {
  try {
    const response = await fetch(
      `https://pds.madebydanny.uk/xrpc/com.atproto.repo.listRecords?repo=${did}&collection=uk.madebydanny.cdn.img&limit=100`
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    return data.records.map((record: any) => ({
      cid: record.value.blob?.ref?.$link || '',
      uri: record.uri,
      mimeType: record.value.blob?.mimeType || 'image/jpeg',
      createdAt: record.value.createdAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Failed to fetch uploads:', error);
    return [];
  }
};
