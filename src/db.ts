import * as knex from "knex";
import * as l from "lodash";

import {
  Dictionary,
} from "lodash";

import {
  promiseQueue,
  logger,
} from "./utils";

export interface IDatabaseConfig {
  host: string;
  database: string;
  user: string;
  password: string;
}

export const connect = (database: IDatabaseConfig) => knex({
  client: "mysql",
  connection: database,
});

export const select = <TRecord>(db: knex) => {
  return (tableName: string, columnNames: string | string[], columnName: string, values: any | any[]): Promise<TRecord[]> => {
    const sql = db
      .select([].concat(columnNames))
      .from(tableName)
      .whereIn(columnName, [].concat(values));

    logger.info(sql.toQuery(), 1);

    return sql;
  }
};

export const del = <TRecord>(db: knex) => {
  return (tableName: string, columnName: string, values: any | any[]): Promise<TRecord[]> => {
    const sql = db
      .delete()
      .from(tableName)
      .whereIn(columnName, [].concat(values));

    logger.danger(sql.toQuery(), 1);

    return sql;
  }
};

interface ITableKeyColumnUsage {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  REFERENCED_TABLE_NAME: string;
  REFERENCED_COLUMN_NAME: string;
}

export type TTableRelations = Dictionary<Dictionary<Dictionary<Dictionary<true>>>>;

export const getTableRelations = (db: knex): Promise<TTableRelations> => {
  const dbName = db.client.connectionSettings.database;

  logger.warning(`Get relations of \`${dbName}\` ...`);

  return select(db)(
    "INFORMATION_SCHEMA.KEY_COLUMN_USAGE",
    "*",
    "CONSTRAINT_SCHEMA",
    dbName,
  )
    .then((results: ITableKeyColumnUsage[]) => {
      const tables = {};

      l.forEach(results, (result) => {
        if (result.REFERENCED_TABLE_NAME && result.REFERENCED_COLUMN_NAME) {
          l.set(
            tables,
            [result.REFERENCED_TABLE_NAME, result.REFERENCED_COLUMN_NAME, result.TABLE_NAME, result.COLUMN_NAME],
            true,
          );
        }
      });

      return tables;
    })
};


export interface IQueryResult {
  table: string;
  ids: number[];
  records: any[];
}

const patchRowsWithTableName = (rows: any[], tableName: string): IQueryResult => {
  return {
    table: tableName,
    ids: l.map(rows, (row) => row.id),
    records: rows,
  }
};

export const selectWithRelations = (db: knex, relations: TTableRelations) => {
  logger.warning(`Querying related records ...`);

  const selectDeps = (tableName: string, columnNames: string | string [], columnName: string, values: any | any[]): Promise<IQueryResult[]> => {
    return select(db)(tableName, columnNames, columnName, values)
      .then((rows) => {
        if (rows.length) {
          const deps = relations[tableName];

          if (deps) {
            // "id": { // primaryKey
            //   "agent": { // depTableName
            //      "account_id": true // depTableColumnName
            //   },
            // }
            const getDeps: Array<Promise<any>> = l.flattenDeep<any>(
              l.map(deps, (depTables, primaryKey) => {
                const primaryValues = l.uniq(l.map(rows, (row) => (row as any)[primaryKey]));
                return l.map(depTables, (depTableColumnNames, depTableName) => {
                  return l.map(depTableColumnNames, (_, depTableColumnName) => {
                    return selectDeps(depTableName, ["id", depTableColumnName], depTableColumnName, primaryValues);
                  });
                });
              })
            );

            return Promise.all(getDeps)
              .then((results) => {
                return []
                  .concat(l.filter(l.flattenDeep(results), (record) => record.records.length))
                  .concat(patchRowsWithTableName(rows, tableName))
              });
          }

        }

        return Promise.resolve([
          patchRowsWithTableName(rows, tableName)
        ])
      });
  };

  return selectDeps;
};

const execMap = (dels: Array<() => Promise<any>>) => l.map(dels, (fn) => fn());

export const deleteQueryResults = (db: knex, queryResults: IQueryResult[], dryRun: boolean = false) => {
  const target = l.last(queryResults);
  if (target.ids.length) {
    logger.warning(`Deleting \`${target.table}\` and its relations...`);
    const dels = l.map(queryResults, (queryResult) => () => del(db)(queryResult.table, "id", queryResult.ids));
    return dryRun ? Promise.resolve(execMap(dels)) : promiseQueue(dels);
  }
  logger.warning(`No results for \`${target.table}\` ...`);
  return Promise.resolve();
};