// ATProto CDN Upload Function

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ATPROTO_DID = 'did:plc:l37td5yhxl2irrzrgvei4qay';
const ATPROTO_SERVICE = 'https://altq.net';

interface BlobRef {
  $link: string;
}

interface BlobData {
  $type: 'blob';
  ref: BlobRef;
  mimeType: string;
  size: number;
}

interface FileRecord {
  blob: BlobData;
  $type: 'uk.madebydanny.cdn.file';
  langs: string[];
  createdAt: string;
}

async function createATProtoSession(password: string) {
  console.log('Creating ATProto session...');
  const response = await fetch(`${ATPROTO_SERVICE}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      identifier: ATPROTO_DID,
      password: password,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Session creation failed:', error);
    throw new Error(`Failed to create session: ${error}`);
  }

  const data = await response.json();
  console.log('Session created successfully');
  return data.accessJwt;
}

async function uploadBlob(accessToken: string, fileData: Uint8Array, mimeType: string) {
  console.log('Uploading blob to ATProto...');
  const response = await fetch(`${ATPROTO_SERVICE}/xrpc/com.atproto.repo.uploadBlob`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': mimeType,
    },
    body: fileData as any,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Blob upload failed:', error);
    throw new Error(`Failed to upload blob: ${error}`);
  }

  const data = await response.json();
  console.log('Blob uploaded successfully, CID:', data.blob.ref.$link);
  return data.blob;
}

async function createRecord(accessToken: string, blobData: BlobData) {
  console.log('Creating ATProto record...');
  
  const record: FileRecord = {
    blob: blobData,
    $type: 'uk.madebydanny.cdn.file',
    langs: ['en'],
    createdAt: new Date().toISOString(),
  };

  const response = await fetch(`${ATPROTO_SERVICE}/xrpc/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      repo: ATPROTO_DID,
      collection: 'uk.madebydanny.cdn.file',
      record: record,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Record creation failed:', error);
    throw new Error(`Failed to create record: ${error}`);
  }

  const data = await response.json();
  console.log('Record created successfully');
  return { ...data, record };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Upload request received');
    const password = Deno.env.get('ATPROTO_PASSWORD');
    
    if (!password) {
      throw new Error('ATPROTO_PASSWORD not configured');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);

    // Read file data
    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    // Create session
    const accessToken = await createATProtoSession(password);

    // Upload blob
    const blobData = await uploadBlob(accessToken, fileData, file.type);

    // Create record
    const recordData = await createRecord(accessToken, blobData);

    console.log('Upload completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        blob: blobData,
        record: recordData.record,
        uri: recordData.uri,
        cid: recordData.cid,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in upload-to-atproto function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
