import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

const SESSION_STORAGE_KEY = 'atproto-user-did';

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
      
      // Persist the DID for session restoration
      localStorage.setItem(SESSION_STORAGE_KEY, result.session.did);
      
      return {
        did: result.session.did,
        handle: storedHandle || result.session.did,
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
  const storedDid = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!storedDid) return null;
  
  try {
    const client = getOAuthClient();
    const session = await client.restore(storedDid);
    if (session) {
      return {
        did: session.did,
        session,
      };
    }
  } catch (error) {
    console.error('Failed to restore persisted session:', error);
    // Clear invalid session
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
  return null;
};

export const revokeOAuthSession = async (did: string) => {
  const client = getOAuthClient();
  try {
    await client.revoke(did);
  } catch (error) {
    console.error('Failed to revoke session:', error);
  }
  // Clear persisted session
  localStorage.removeItem(SESSION_STORAGE_KEY);
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

  // Get the user's PDS URL from the DID document
  const pdsUrl = 'https://pds.madebydanny.uk'; // Default for now
  
  // Upload blob using the session's fetch (handles DPoP automatically)
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
  
  // Create record
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
