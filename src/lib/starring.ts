import { getOAuthClient, resolvePdsUrl } from './oauth';

const STAR_COLLECTION = 'uk.madebydanny.cdn.star';

export interface StarRecord {
  $type: string;
  subject: string; // AT URI backlink to the original image/video record
  createdAt: string;
}

interface ListRecordsResponse {
  records: Array<{
    uri: string;
    cid: string;
    value: StarRecord;
  }>;
  cursor?: string;
}

// Create a star record on PDS as a backlink to the original upload
export const starUpload = async (
  did: string,
  subjectUri: string
): Promise<{ success: boolean; uri?: string; error?: string }> => {
  try {
    const client = getOAuthClient();
    const session = await client.restore(did);
    if (!session) return { success: false, error: 'No active session' };

    const pdsUrl = await resolvePdsUrl(did);

    const record: StarRecord = {
      $type: STAR_COLLECTION,
      subject: subjectUri,
      createdAt: new Date().toISOString(),
    };

    const response = await session.fetchHandler(pdsUrl + '/xrpc/com.atproto.repo.createRecord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo: did,
        collection: STAR_COLLECTION,
        record,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to create star: ${error}` };
    }

    const data = await response.json();
    return { success: true, uri: data.uri };
  } catch (error) {
    console.error('Failed to star:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Delete a star record from PDS by finding it via subject URI
export const unstarUpload = async (
  did: string,
  subjectUri: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const client = getOAuthClient();
    const session = await client.restore(did);
    if (!session) return { success: false, error: 'No active session' };

    const pdsUrl = await resolvePdsUrl(did);

    // Find the star record for this subject
    const stars = await listStarRecords(did);
    const starRecord = stars.find(s => s.value.subject === subjectUri);

    if (!starRecord) {
      return { success: true }; // Already not starred
    }

    const rkey = starRecord.uri.split('/').pop();

    const response = await session.fetchHandler(pdsUrl + '/xrpc/com.atproto.repo.deleteRecord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo: did,
        collection: STAR_COLLECTION,
        rkey,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to unstar: ${error}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to unstar:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// List all star records from PDS
export const listStarRecords = async (did: string): Promise<ListRecordsResponse['records']> => {
  try {
    const pdsUrl = await resolvePdsUrl(did);
    const allRecords: ListRecordsResponse['records'] = [];
    let cursor: string | undefined;

    do {
      const params = new URLSearchParams({
        repo: did,
        collection: STAR_COLLECTION,
        limit: '100',
      });
      if (cursor) params.set('cursor', cursor);

      const response = await fetch(`${pdsUrl}/xrpc/com.atproto.repo.listRecords?${params}`);
      if (!response.ok) break;

      const data: ListRecordsResponse = await response.json();
      allRecords.push(...data.records);
      cursor = data.cursor;
    } while (cursor);

    return allRecords;
  } catch (error) {
    console.error('Failed to list stars:', error);
    return [];
  }
};

// Check if a subject URI is starred
export const isUploadStarred = async (did: string, subjectUri: string): Promise<boolean> => {
  const stars = await listStarRecords(did);
  return stars.some(s => s.value.subject === subjectUri);
};

// Get all starred subject URIs
export const getStarredSubjectUris = async (did: string): Promise<string[]> => {
  const stars = await listStarRecords(did);
  return stars.map(s => s.value.subject);
};

// Toggle star status
export const toggleStar = async (
  did: string,
  subjectUri: string
): Promise<{ starred: boolean; error?: string }> => {
  const starred = await isUploadStarred(did, subjectUri);

  if (starred) {
    const result = await unstarUpload(did, subjectUri);
    return { starred: false, error: result.error };
  } else {
    const result = await starUpload(did, subjectUri);
    return { starred: true, error: result.error };
  }
};
