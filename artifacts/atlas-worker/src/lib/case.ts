function snakeToCamelStr(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

type CamelCase<T extends string> = T extends `${infer A}_${infer B}`
  ? `${A}${Capitalize<CamelCase<B>>}`
  : T;

type KeysToCamel<T> = T extends object
  ? {
      [K in keyof T as K extends string ? CamelCase<K> : K]: T[K] extends object
        ? KeysToCamel<T[K]>
        : T[K];
    }
  : T;

export function toCamel<T extends Record<string, unknown>>(obj: T): KeysToCamel<T> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[snakeToCamelStr(key)] = value;
  }
  return result as KeysToCamel<T>;
}

export function rowsToCamel<T extends Record<string, unknown>>(
  rows: T[],
): KeysToCamel<T>[] {
  return rows.map(toCamel);
}

export function omitSensitive<T extends Record<string, unknown>>(row: T): T {
  const { submitter_email: _se, delete_token: _dt, delete_token_expires_at: _dtea, ...rest } = row;
  return rest as T;
}
