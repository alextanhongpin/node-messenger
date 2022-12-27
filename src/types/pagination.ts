import type { Sql } from "infra/postgres";

const DEFAULT_PAGINATION: Pagination = {
  limit: 20,
  offset: 0,
};

export type Pagination = {
  limit: number;
  offset: number;
};

export function paginate(sql: Sql, pagination?: Pagination) {
  const { limit, offset } = pagination ?? DEFAULT_PAGINATION;
  return sql`limit ${limit} offset ${offset}`;
}
