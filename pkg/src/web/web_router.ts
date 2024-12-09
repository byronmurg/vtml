import Express from "express"
import WebClient from "./web_client"
import type {WebHandler} from "./web_client"
import Debug from "debug"

const debug = Debug("vtml:web")

type PathType = string | RegExp
type ExpressMethod = "get"|"post"|"put"|"patch"|"delete"|"head"|"all"

export default
class WebRouter {
	/*
	 * This is just a wrapper around Express.Router that gives us some
	 * debug logs and converts to WebHandler
	 */

	private router: Express.Router

	constructor() {
		this.router = Express.Router()
	}

	handle(method:ExpressMethod, path:PathType, handler:WebHandler) {
		debug(method, path)
		return this.router[method](path, WebClient.Wrap(handler))
	}
	
	private handler(method:ExpressMethod) {
		return (path:PathType, handler:WebHandler) => this.handle(method, path, handler)
	}

	all = this.handler("all")
	get = this.handler("get")
	put = this.handler("put")
	post = this.handler("post")
	delete = this.handler("delete")

	use(handler: Express.Handler|Express.ErrorRequestHandler) {
		this.router.use(handler)
	}

	Router() {
		return this.router
	}
}
