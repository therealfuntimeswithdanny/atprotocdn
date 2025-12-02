import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

let oauthClient: BrowserOAuthClient | null = null;

export const getOAuthClient = () => {
  if (!oauthClient) {
    const redirectUri = 'https://danny-cdn-magic.lovable.app/';
    const clientId = 'https://danny-cdn-magic.lovable.app/client-metadata.json';
    
    oauthClient = new BrowserOAuthClient({
      handleResolver: 'https://pds.madebydanny.uk',
      clientMetadata: {
        client_id: clientId,
        client_name: 'ATProto CDN Tool',
        client_uri: 'https://danny-cdn-magic.lovable.app',
        redirect_uris: [redirectUri],
        scope: 'atproto transition:generic',
        response_types: ['code'],
        grant_types: ['authorization_code', 'refresh_token'],
        token_endpoint_auth_method: 'none',
        application_type: 'web',
        dpop_bound_access_tokens: true,
      },
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
  const params = new URLSearchParams(window.location.search);
  
  // Check if we're returning from OAuth flow
  if (params.has('code') && params.has('state')) {
    try {
      const result = await client.callback(params);
      
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
