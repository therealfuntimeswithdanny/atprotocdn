import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

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
      responseMode: 'fragment', // Use fragment for hash-based redirects
    });
  }
  return oauthClient;
};

export const initiateOAuthLogin = async (handle: string) => {
  const client = getOAuthClient();
  
  // Store the handle we're logging in with
  sessionStorage.setItem('oauth-login-handle', handle);
  
  // signIn will redirect the user automatically
  await client.signIn(handle, {
    state: handle,
  });
};

export const handleOAuthCallback = async () => {
  const client = getOAuthClient();
  
  // Check for hash parameters (OAuth returns in fragment)
  const hash = window.location.hash.slice(1); // Remove the # symbol
  const hashParams = new URLSearchParams(hash);
  
  // Check if we're returning from OAuth flow
  if (hashParams.has('code') && hashParams.has('state')) {
    try {
      const result = await client.callback(hashParams);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      const storedHandle = sessionStorage.getItem('oauth-login-handle');
      
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

export const restoreOAuthSession = async (did: string) => {
  const client = getOAuthClient();
  try {
    const session = await client.restore(did);
    return session;
  } catch (error) {
    console.error('Failed to restore session:', error);
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
};

export const getAccessToken = async (did: string): Promise<string | null> => {
  try {
    const client = getOAuthClient();
    const session = await client.restore(did);
    if (!session) return null;
    
    // Get the access token from the session
    // The session is an OAuthSession which can be used directly with atproto API
    return JSON.stringify({ did: session.did });
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
};
