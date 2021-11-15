import gulp from "gulp";
import esbuild from "gulp-esbuild";
import cp from "child_process";
import chalk from "chalk";
import del from "del";
import path from "path";
import { writeFile, readFile } from "fs/promises";
import { existsSync, mkdirSync } from "fs";

function _cleanDist() {
  return del(["dist/**/*"]);
}

function checkFolder() {
  const routeDir = path.join(process.cwd(), "dist", "routes");
  const tableDir = path.join(process.cwd(), "dist", "tables")
  if(!existsSync(routeDir)) mkdirSync(routeDir)
  if(!existsSync(tableDir)) mkdirSync(tableDir)
}
function _build() {
  return gulp
    .src(["src/**/*.ts"])
    .pipe(
      esbuild({
        sourcemap: "inline",
        format: "esm",
        target: "node16",
        loader: {
          ".ts": "ts",
        },
      })
    )
    .pipe(gulp.dest("dist")).pipe(checkFolder());
}

function _watch(cb) {
  const spawn = cp.spawn("nodemon dist/main --delay 1", { shell: true });

  spawn.stdout.on("data", (data) => {
    console.log(chalk.white(`${data}`.trim()));
  });

  spawn.stderr.on("data", (data) => {
    console.error(chalk.red(`${data}`.trim()));
  });

  spawn.on("close", () => cb());

  gulp.watch("src/**/*.ts", { delay: 500 }, gulp.series(_cleanDist, _build));
}

async function _makeRoute() {
  const arg = process.argv;
  let name = arg.find((_, index) => {
    return arg[index - 1] === "--name";
  });
  let template = await readFile("src/templates/route.ts", "utf8");
  template.replace("template", name);
  if (!existsSync("src/routes")) mkdirSync("src/routes");
  if (existsSync(`src/routes/${name}.route.ts`))
    return console.log("name already taken");
  await writeFile(`src/routes/${name}.route.ts`, template);
  return gulp;
}
async function _makeTable() {}

export const watch = gulp.series(_cleanDist, _build, _watch);
export const build = gulp.series(_cleanDist, _build);
gulp.task("route", _makeRoute);
gulp.task("table", _makeTable);
