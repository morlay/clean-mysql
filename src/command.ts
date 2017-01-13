import {
  start,
  IConfig,
} from "./index";

import * as yargs from "yargs";

const argv: IConfig = yargs(process.argv.slice(2))
  .usage("Usage: $0 [options]")
  .example("clean-mysql")
  .options({
    configFile: {
      type: "string",
      alias: "c",
      default: "./clean-mysql.config.json"
    },
    init: {
      type: "boolean",
      description: "create clean-mysql.config.json",
    },
    dryRun: {
      type: "boolean",
      description: "only print sqls",
    }
  })
  .help("help").alias("help", "h")
  .showHelpOnFail(false, "whoops, something went wrong! run with --help")
  .argv;

start(argv);
