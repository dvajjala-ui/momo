// Server-only D1 REST transport for the Vercel runtime and migration command.
export type Value = string | number | null;
export type Row = Record<string, unknown>;
export type Result = {rows: Row[]; changes: number};
export interface Executor {
  exec(sql: string, args: Value[]): Promise<Result>;
  batch(list: [string, Value[]][]): Promise<Result[]>;
}
type Settings = Record<string, string | undefined>;
export type D1Config = {accountId: string; databaseId: string; token: string};

export function cloudflareD1Config(settings: Settings = process.env): D1Config | null {
  // The account ID may also be used by R2 alone.
  if (!settings.CLOUDFLARE_D1_DATABASE_ID && !settings.CLOUDFLARE_D1_API_TOKEN) return null;
  const accountId = settings.CLOUDFLARE_ACCOUNT_ID?.trim() || '';
  const databaseId = settings.CLOUDFLARE_D1_DATABASE_ID?.trim() || '';
  const token = settings.CLOUDFLARE_D1_API_TOKEN?.trim() || '';
  if (!/^[a-f0-9]{32}$/.test(accountId) || !/^[a-f0-9-]{36}$/.test(databaseId) || !token) {
    throw new Error('Cloudflare D1 settings are incomplete. Refusing temporary storage fallback.');
  }
  return {accountId, databaseId, token};
}

type QueryResult = {success?: boolean; results?: Row[]; meta?: {changes?: number}};
type ApiResponse = {success?: boolean; result?: QueryResult[]};

export function cloudflareExecutor(config: D1Config, transport: typeof fetch = fetch): Executor {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;
  async function query(list: [string, Value[]][]): Promise<Result[]> {
    if (!list.length) return [];
    const batch = list.map(([sql, params]) => ({sql, params}));
    const response = await transport(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${config.token}`},
      body: JSON.stringify(list.length === 1 ? batch[0] : {batch}),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    // Do not log remote errors: SQL, parameters and credentials must stay private.
    if (!response.ok) throw new Error(`Cloudflare database request failed (${response.status}).`);
    const data = await response.json() as ApiResponse;
    if (!data.success || data.result?.length !== list.length || data.result.some(r => !r.success)) {
      throw new Error('Cloudflare database query failed.');
    }
    return data.result.map(r => ({rows: r.results || [], changes: Number(r.meta?.changes || 0)}));
  }
  return {
    async exec(sql, args) { return (await query([[sql, args]]))[0]; },
    batch: query,
  };
}
