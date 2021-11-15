import { config } from "dotenv";
import { FastifyInstance, FastifyPluginCallback, RouteOptions } from "fastify";
import { readdir } from "fs/promises";
import { createReadStream } from "fs";
import fastifyCors from "fastify-cors";
import path from "path";
import knex,{Knex} from "knex";
import Fastify from "fastify";
config();
const PORT = process.env.PORT ?? 4000;
const fastify = Fastify({
  logger: true,
});

export const start = async (server : FastifyInstance) => {
  try {
    server.get("/", (req, res) => {
      function sendFile(dir:string){
        dir = path.join(process.cwd(),"dist",dir)
        const stream = createReadStream(dir)
        return stream
      }
      res.type("text/html").send(sendFile('../index.html'))
    });
    await server.listen(PORT!);
    console.log(`listening on ${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

const { DB_NAME, DB_USER, DB_PASSWORD, DB_HOST } = process.env;
const db = knex({
  client: "mysql2",
  connection: {
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    host: DB_HOST,
  },
});

export async function loadDB() {
  await db.raw("show tables").catch(console.error);
  console.log("sucessufly loaded the database")
}

export async function loadFile<S>(dir: string)  {
  let fullPath = path.join(process.cwd(), "dist", dir)
  const filenames = await readdir(fullPath);
  const filepathList: string[] = [];
  for (const filename of filenames) {
    const filepath = path.join(fullPath, filename);
    filepathList.push(filepath);
  }
  const exportRaws: S[] = await Promise.all(
    filepathList.map(async (filepath) => {
      const tableFile = await import("file://" + filepath);
      return tableFile.default;
    })
  );
  return exportRaws;
}


export class Route {
  static routes : FastifyPluginCallback[] = []
  plugin: FastifyPluginCallback;
  constructor(option: RouteOptions) {
    this.plugin = async (fastifyInstance, opts, done) => {
      fastifyInstance.route(option);
      done();
    };
  }
  static async load() {
    let routes = await loadFile<Route>("routes") 
    Promise.all(routes.map(route => route.add()))
    let server = this.routes.reduce((fast,plugin)=> {
      fast.register(plugin)
      return fast
    },fastify)
    server.register(fastifyCors)
    return server
  }

  async add() {
     Route.routes.push(this.plugin)
  }
}

export interface TableOptions<Type> {
  name: string
  description: string
  priority?: number
  migrations?: { [version: number]: (table: Knex.CreateTableBuilder) => void }
  setup: (table: Knex.CreateTableBuilder) => void
}

export class Table<Type> {
  constructor(public readonly options: TableOptions<Type>) {}

  get query() {
    return db<Type>(this.options.name)
  }

  static async load() {
      let tables = await loadFile<Table<any>>("tables");
      Promise.all(
        tables
          .sort((a, b) => {
            return (b.options.priority ?? 0) - (a.options.priority ?? 0)
          })
          .map((table) => table.make())
      )
  }

  async make() {}
}


