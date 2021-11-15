import * as app from "./configs.js";
import {FastifyInstance} from 'fastify'

let server : FastifyInstance

(async()=>{
    app.loadDB()
    app.Table.load
    server = await app.Route.load()
    app.start(server)
    
})()
