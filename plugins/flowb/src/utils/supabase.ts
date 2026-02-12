/**
 * Shared Supabase REST helpers for FlowB plugins.
 * Extracted from DANZ plugin pattern - raw fetch against PostgREST API.
 */

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export async function query<T>(
  config: SupabaseConfig,
  table: string,
  params: Record<string, string>,
): Promise<T | null> {
  if (!config.supabaseUrl || !config.supabaseKey) return null;

  const url = new URL(`${config.supabaseUrl}/rest/v1/${table}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      apikey: config.supabaseKey,
      Authorization: `Bearer ${config.supabaseKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export async function insert<T>(
  config: SupabaseConfig,
  table: string,
  data: Record<string, any>,
): Promise<T | null> {
  if (!config.supabaseUrl || !config.supabaseKey) return null;

  const res = await fetch(`${config.supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: config.supabaseKey,
      Authorization: `Bearer ${config.supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) return null;
  const result = await res.json();
  return Array.isArray(result) ? result[0] : result;
}

export async function update(
  config: SupabaseConfig,
  table: string,
  params: Record<string, string>,
  data: Record<string, any>,
): Promise<boolean> {
  if (!config.supabaseUrl || !config.supabaseKey) return false;

  const url = new URL(`${config.supabaseUrl}/rest/v1/${table}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      apikey: config.supabaseKey,
      Authorization: `Bearer ${config.supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });

  return res.ok;
}

export async function upsert<T>(
  config: SupabaseConfig,
  table: string,
  data: Record<string, any>,
  onConflict: string,
): Promise<T | null> {
  if (!config.supabaseUrl || !config.supabaseKey) return null;

  const res = await fetch(`${config.supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: config.supabaseKey,
      Authorization: `Bearer ${config.supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: `return=representation,resolution=merge-duplicates`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) return null;
  const result = await res.json();
  return Array.isArray(result) ? result[0] : result;
}
