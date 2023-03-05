import postgres from "postgres";
// https://github.com/porsager/postgres/blob/000d058fa988d7a0e4c5679a2f84cb83f14ff32f/types/index.d.ts#L193
export type { Sql } from "postgres";
export { PostgresError } from "postgres";
import z from "zod";

const OptionsSchema = z.object({
  host: z.string(),
  port: z.number(),
  database: z.string(),
  username: z.string(),
  password: z.string(),
  debug: z.boolean(),
});

export type Options = z.infer<typeof OptionsSchema>;

export function createConn(options: Options) {
  const { debug, ...rest } = OptionsSchema.parse(options);
  const sql = postgres({
    ...rest,
    debug: debug && debugLogger,
    // Converts snakecase column names to camelcase.
    transform: postgres.camel,
  });

  return {
    sql,
    close: () => {
      console.log("closing postgres");
      return sql.end();
    },
  };
}

function debugLogger(
  connection: number,
  query: string,
  params: unknown[],
  types: unknown[]
) {
  console.log({ connection, query, params, types });
}
