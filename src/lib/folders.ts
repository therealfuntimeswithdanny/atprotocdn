import { getOAuthClient, resolvePdsUrl } from './oauth';

const FOLDER_COLLECTION = 'net.blueat.drive.folder';

export interface FolderRecord {
  $type: string;
  name: string;
  items: string[]; // Array of AT URIs (backlinks to image/video records)
  createdAt: string;
}

interface ListRecordsResponse {
  records: Array<{
    uri: string;
    cid: string;
    value: FolderRecord;
  }>;
  cursor?: string;
}

export interface FolderWithMeta {
  uri: string;
  rkey: string;
  name: string;
  items: string[];
  createdAt: string;
}

// Create a new folder on PDS
export const createFolder = async (
  did: string,
  name: string
): Promise<{ success: boolean; uri?: string; error?: string }> => {
  try {
    const client = getOAuthClient();
    const session = await client.restore(did);
    if (!session) return { success: false, error: 'No active session' };

    const pdsUrl = await resolvePdsUrl(did);

    const record: FolderRecord = {
      $type: FOLDER_COLLECTION,
      name,
      items: [],
      createdAt: new Date().toISOString(),
    };

    const response = await session.fetchHandler(pdsUrl + '/xrpc/com.atproto.repo.createRecord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo: did,
        collection: FOLDER_COLLECTION,
        record,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to create folder: ${error}` };
    }

    const data = await response.json();
    return { success: true, uri: data.uri };
  } catch (error) {
    console.error('Failed to create folder:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Delete a folder from PDS
export const deleteFolder = async (
  did: string,
  rkey: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const client = getOAuthClient();
    const session = await client.restore(did);
    if (!session) return { success: false, error: 'No active session' };

    const pdsUrl = await resolvePdsUrl(did);

    const response = await session.fetchHandler(pdsUrl + '/xrpc/com.atproto.repo.deleteRecord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo: did,
        collection: FOLDER_COLLECTION,
        rkey,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to delete folder: ${error}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to delete folder:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Add an item (AT URI backlink) to a folder by updating the record
export const addItemToFolder = async (
  did: string,
  rkey: string,
  subjectUri: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const client = getOAuthClient();
    const session = await client.restore(did);
    if (!session) return { success: false, error: 'No active session' };

    const pdsUrl = await resolvePdsUrl(did);

    // Fetch current folder record
    const getResponse = await fetch(
      `${pdsUrl}/xrpc/com.atproto.repo.getRecord?repo=${did}&collection=${FOLDER_COLLECTION}&rkey=${rkey}`
    );
    if (!getResponse.ok) return { success: false, error: 'Folder not found' };

    const current = await getResponse.json();
    const folder = current.value as FolderRecord;

    // Don't add duplicates
    if (folder.items.includes(subjectUri)) {
      return { success: true };
    }

    const updatedRecord: FolderRecord = {
      ...folder,
      items: [...folder.items, subjectUri],
    };

    const response = await session.fetchHandler(pdsUrl + '/xrpc/com.atproto.repo.putRecord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo: did,
        collection: FOLDER_COLLECTION,
        rkey,
        record: updatedRecord,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to add item: ${error}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to add item to folder:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Remove an item from a folder
export const removeItemFromFolder = async (
  did: string,
  rkey: string,
  subjectUri: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const client = getOAuthClient();
    const session = await client.restore(did);
    if (!session) return { success: false, error: 'No active session' };

    const pdsUrl = await resolvePdsUrl(did);

    const getResponse = await fetch(
      `${pdsUrl}/xrpc/com.atproto.repo.getRecord?repo=${did}&collection=${FOLDER_COLLECTION}&rkey=${rkey}`
    );
    if (!getResponse.ok) return { success: false, error: 'Folder not found' };

    const current = await getResponse.json();
    const folder = current.value as FolderRecord;

    const updatedRecord: FolderRecord = {
      ...folder,
      items: folder.items.filter(uri => uri !== subjectUri),
    };

    const response = await session.fetchHandler(pdsUrl + '/xrpc/com.atproto.repo.putRecord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo: did,
        collection: FOLDER_COLLECTION,
        rkey,
        record: updatedRecord,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to remove item: ${error}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to remove item from folder:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// List all folders from PDS
export const listFolders = async (did: string): Promise<FolderWithMeta[]> => {
  try {
    const pdsUrl = await resolvePdsUrl(did);
    const allRecords: ListRecordsResponse['records'] = [];
    let cursor: string | undefined;

    do {
      const params = new URLSearchParams({
        repo: did,
        collection: FOLDER_COLLECTION,
        limit: '100',
      });
      if (cursor) params.set('cursor', cursor);

      const response = await fetch(`${pdsUrl}/xrpc/com.atproto.repo.listRecords?${params}`);
      if (!response.ok) break;

      const data: ListRecordsResponse = await response.json();
      allRecords.push(...data.records);
      cursor = data.cursor;
    } while (cursor);

    return allRecords.map(r => ({
      uri: r.uri,
      rkey: r.uri.split('/').pop()!,
      name: r.value.name,
      items: r.value.items || [],
      createdAt: r.value.createdAt,
    }));
  } catch (error) {
    console.error('Failed to list folders:', error);
    return [];
  }
};

// Resolve an AT URI to get the image/video record details
export const resolveRecordFromUri = async (uri: string): Promise<{
  cid: string;
  mimeType: string;
  did: string;
} | null> => {
  try {
    // Parse at://did/collection/rkey
    const parts = uri.replace('at://', '').split('/');
    if (parts.length < 3) return null;

    const [recordDid, collection, rkey] = parts;
    const pdsUrl = await resolvePdsUrl(recordDid);

    const response = await fetch(
      `${pdsUrl}/xrpc/com.atproto.repo.getRecord?repo=${recordDid}&collection=${collection}&rkey=${rkey}`
    );
    if (!response.ok) return null;

    const data = await response.json();
    const blob = data.value?.blob;
    if (!blob?.ref?.$link) return null;

    return {
      cid: blob.ref.$link,
      mimeType: blob.mimeType || 'image/jpeg',
      did: recordDid,
    };
  } catch (error) {
    console.error('Failed to resolve record:', error);
    return null;
  }
};
