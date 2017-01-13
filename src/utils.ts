import * as l from "lodash";
import * as chalk from "chalk";

export const promiseQueue = (list: Array<() => Promise<any>>): Promise<any[]> =>
  l.reduce<() => Promise<any>, Promise<any[]>>(
    list,
    (promise, fn) =>
      promise
        .then((result) => fn()
          .then((ret) => {
            result.push(ret);
            return result;
          })),
    Promise.resolve([] as any[])
  );

const log = (msg: string, indent: number) => console.log(`${l.range(0, indent).map(() => "  ").join("")}${msg}`);
const highlight = (msg: string) => l.replace(msg, /`[^`]+`/g, (match: string) => chalk.magenta(match));

export const logger = {
  info: (msg: string, indent: number = 0) => log(highlight(msg), indent),
  danger: (msg: string, indent: number = 0) => log(chalk.red(highlight(msg)), indent),
  warning: (msg: string, indent: number = 0) => log(chalk.yellow(highlight(msg)), indent),
};