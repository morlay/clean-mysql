import {
  Dictionary,
} from "lodash";

import * as l from "lodash";
import * as fse from "fs-extra";
import * as path from "path";

import {
  connect,
  showTableUsage,
  selectWithRelations,
  getTableRelations,
  deleteQueryResults,
  IDatabaseConfig,
  IQueryResult,
} from "./db";

import {
  promiseQueue,
  logger,
} from "./utils";

export interface IConfigFile {
  db: IDatabaseConfig
  tasks: Dictionary<Dictionary<any | any[]>>
}

export interface IConfig {
  configFile?: string;
  init?: boolean;
  usage?: boolean;
  dryRun?: boolean;
}

const createConfigFile = (path: string) => {
  return fse.writeJSONSync(path, {
    db: {
      host: "",
      database: "",
      user: "",
      password: ""
    },
    tasks: {}
  } as IConfigFile)
};

export const start = (config: IConfig) => {
  const configFile = path.join(process.cwd(), config.configFile);

  if (config.init) {
    if (!fse.existsSync(configFile)) {
      return createConfigFile(configFile);
    }

    logger.warning(`Config file \`${configFile}\` already exists`);
    return;
  }


  const conf = fse.readJSONSync(configFile) as IConfigFile;

  const db = connect(conf.db);

  if (config.usage) {
    return showTableUsage(db)
      .then(() => {
        db.destroy()
      })
      .catch(console.log);
  }


  return getTableRelations(db)
    .then((relations) => {

      const tasks = l.flattenDeep<() => Promise<any>>(l.map(
        conf.tasks,
        (keyValues, tableName) => {
          return l.map(keyValues, (values, key) => {
            return () => selectWithRelations(db, relations)(tableName, "id", key, values);
          });
        },
      ));

      return promiseQueue(tasks);
    })
    .then((tasks: Array<IQueryResult[]>) => promiseQueue(
      l.map(tasks, (queryResults) => () => deleteQueryResults(db, queryResults, config.dryRun))))
    .then(() => {
      db.destroy()
    })
    .catch(console.log)
};


