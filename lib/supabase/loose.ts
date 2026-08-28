import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export type LooseError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

export type LooseResult = {
  data: unknown;
  error: LooseError | null;
  count?: number | null;
};

export type LooseQuery = PromiseLike<LooseResult> & {
  select: (columns?: string, options?: { count?: "exact"; head?: boolean }) => LooseQuery;
  insert: (values: unknown) => LooseQuery;
  upsert: (values: unknown, options?: { onConflict?: string }) => LooseQuery;
  update: (values: unknown) => LooseQuery;
  delete: () => LooseQuery;
  eq: (column: string, value: unknown) => LooseQuery;
  neq: (column: string, value: unknown) => LooseQuery;
  gte: (column: string, value: unknown) => LooseQuery;
  lte: (column: string, value: unknown) => LooseQuery;
  in: (column: string, values: readonly unknown[]) => LooseQuery;
  ilike: (column: string, pattern: string) => LooseQuery;
  or: (filters: string) => LooseQuery;
  order: (column: string, options?: { ascending?: boolean }) => LooseQuery;
  limit: (count: number) => LooseQuery;
  range: (from: number, to: number) => LooseQuery;
  single: () => Promise<LooseResult>;
  maybeSingle: () => Promise<LooseResult>;
};

export type LooseClient = {
  from: (table: string) => LooseQuery;
};

export function asLooseClient(client: SupabaseClient<Database>): LooseClient {
  return client as unknown as LooseClient;
}

export function throwIfError(error: LooseError | null, fallback: string): void {
  if (error) throw new Error(error.message || fallback);
}
