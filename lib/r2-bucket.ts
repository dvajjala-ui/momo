// Private S3 access. Photos are served only through the existing media route.
import {AwsClient} from 'aws4fetch';

type Settings = Record<string, string | undefined>;
type R2Config = {accountId: string; bucket: string; accessKeyId: string; secretAccessKey: string};

export function r2Config(settings: Settings = process.env): R2Config | null {
  const names = ['R2_BUCKET_NAME', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'] as const;
  if (!names.some(name => settings[name])) return null;
  const accountId = settings.CLOUDFLARE_ACCOUNT_ID?.trim() || '';
  const bucket = settings.R2_BUCKET_NAME?.trim() || '';
  const accessKeyId = settings.R2_ACCESS_KEY_ID?.trim() || '';
  const secretAccessKey = settings.R2_SECRET_ACCESS_KEY?.trim() || '';
  if (!/^[a-f0-9]{32}$/.test(accountId) || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket) || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 settings are incomplete.');
  }
  return {accountId, bucket, accessKeyId, secretAccessKey};
}

export function createR2Bucket(config: R2Config, transport: typeof fetch = fetch) {
  const client = new AwsClient({...config, service: 's3', region: 'auto', retries: 0});
  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/`;
  async function request(key: string, method: string, body?: Uint8Array, contentType?: string) {
    if (!key || /[\\\u0000-\u001f]/.test(key)) throw new Error('Invalid photo key.');
    const url = endpoint + key.split('/').map(encodeURIComponent).join('/');
    const signed = await client.sign(url, {
      method,
      headers: contentType ? {'Content-Type': contentType} : undefined,
      body: body ? new Uint8Array(body).buffer : undefined,
    });
    return transport(signed, {cache: 'no-store', signal: AbortSignal.timeout(15000)});
  }
  return {
    async put(key: string, body: Uint8Array, options?: {httpMetadata?: {contentType?: string}}) {
      const response = await request(key, 'PUT', body, options?.httpMetadata?.contentType);
      if (!response.ok) throw new Error(`Photo storage request failed (${response.status}).`);
    },
    async get(key: string) {
      const response = await request(key, 'GET');
      if (response.status === 404) return null;
      if (!response.ok || !response.body) throw new Error(`Photo storage request failed (${response.status}).`);
      return {body: response.body, httpMetadata: {contentType: response.headers.get('content-type') || 'application/octet-stream'}};
    },
    async delete(key: string) {
      const response = await request(key, 'DELETE');
      if (!response.ok) throw new Error(`Photo storage request failed (${response.status}).`);
    },
  };
}
