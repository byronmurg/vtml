import Express from "express"
import BodyParser from "body-parser"
import CookieParser from "cookie-parser"
import Compression from "compression"
import WebRouter from "./web_router"
import WebClient from "./web_client"
import WebFormHandler from "./web_form_handler"
import type VtmlDocument from "../document"
import FilterContext from "../filter_context"
import type {ResponseError} from "../types"
import {CreateResponseError} from "./web_utils"

import type {FormDescriptor} from "../form"
import type {PortalDescriptor} from "../portal"
import type {ExposeDescriptor} from "../expose"
import type {PageDescriptor} from "../page"
import type {SubscribeDescriptor} from "../subscribe"


import Debug from "debug"

const debug = Debug("vtml:web")

export type exposeOptions = {
	cliListen?: string
	cliPort?: number
}


export default
class WebService extends WebRouter {

	constructor(
		private vtmlDocument: VtmlDocument,
		private options: exposeOptions,
	) {
		super()
		this.prepare()
	}

	renderLoader = async (client:WebClient) => {
		const dataset = client.createLoaderDataset()
		const ctx = FilterContext.Init(dataset)
		
		const response = await this.vtmlDocument.renderDocument(ctx)
		client.sendRenderResponse(response)
	}

	renderError = async (client:WebClient, error:ResponseError) => {
		if (this.vtmlDocument.hasCatch) {
			const rootDataset = client.createLoaderDataset()
			const ctx = FilterContext.InitError(rootDataset, error)
			const response = await this.vtmlDocument.renderDocument(ctx)
			client.sendRenderResponse(response)
		} else {
			client.sendBasicError(error)
		}
	}

	renderPageError = (client:WebClient, code:number) => {
		const error = CreateResponseError(code)
		return this.renderError(client, error)
	}

	renderNativeError = (client:WebClient, err:Error) => {
		const error = CreateResponseError(500, err.message)
		return this.renderError(client, error)
	}

	// Single handlers
	useFormRoute = (form:FormDescriptor) => {
		debug("Expose form", form.name)
		const formHandler = new WebFormHandler(this, form)
		const router = formHandler.Router()
		this.use(router)
	}

	usePortalRoute = (portal:PortalDescriptor) => {
		this.get(portal.path, async (client) => {
			const dataset = client.createLoaderDataset()
			const response = await portal.load(dataset)
			client.sendAjaxReponse(response)
		})
	}

	usePageRoute = (page:PageDescriptor) => {
		// Render normally as the tag will handle the
		// display
		this.all(page.path, this.renderLoader)

		this.get(`/_ajax${page.path}`, async (client) => {
			const dataset = client.createLoaderDataset()
			
			// @TODO Better please
			dataset.path = dataset.path.replace(/^\/_ajax/, '')
			dataset.matchedPath = dataset.matchedPath.replace(/^\/_ajax/, '')

			const response = await page.load(dataset)
			client.sendAjaxReponse(response)
		})
	}

	useExposeRoute = (expose:ExposeDescriptor) => {
		this.get(expose.path, async (client) => {
			const dataset = client.createLoaderDataset()
			const result = await expose.load(dataset)
			client.sendExposeResponse(result)
		})
	}

	useSubscribeRoute = (subscribe:SubscribeDescriptor) => {
		this.get(subscribe.path, async (client) => {
			const dataset = client.createLoaderDataset()
			const result = await subscribe.canSubscribe(dataset)
			client.sendSubscribeResponse(result)
		})
	}

	useSinglePageRoute() {
		// Just render normally on the root
		this.all("/", this.renderLoader)
	}

	useOapiSchemaHandler() {
		this.get(
			"/_api/_schema.json",
			(client) => client.sendJson(this.vtmlDocument.oapiSchema)
		)
	}

	useApiPage() {
		const apiPage = this.createApiPage()
		this.get("/_api", (client) => client.sendHTMLString(apiPage))
	}

	notFoundError = CreateResponseError(404)

	useFaviconFallback() {
		// A fallback for favicon to avoid the whole page rendering
		this.get("/favicon.ico", (client) => client.sendBasicError(this.notFoundError))
	}

	use404Page() {
		this.all("/*", (client) => {
			if (!client.headersSent) {
				this.renderPageError(client, 404)
			}
		})
	}

	useApi404Page() {
		this.all('/_api/*', (client) => client.sendJsonError(this.notFoundError))
	}

	useExpressErrorPage() {
		// For handling express errors
		this.use((err:Error, req:Express.Request, res:Express.Response, next:Express.NextFunction) => {
			if (res.headersSent) {
				return next(err)
			}

			const client = new WebClient(req, res)
			this.renderNativeError(client, err)
		})
	}

	private prepare() {
		this.use(BodyParser.urlencoded({ extended:true }))
		this.use(CookieParser())
		this.use(Express.json())

		// Subscribes must come before compression
		this.vtmlDocument.subscribes.forEach(this.useSubscribeRoute)
		this.use(Compression())

		this.useOapiSchemaHandler()
		this.useApiPage()
		this.vtmlDocument.forms.forEach(this.useFormRoute)
		this.vtmlDocument.portals.forEach(this.usePortalRoute)
		this.vtmlDocument.exposes.forEach(this.useExposeRoute)
		this.vtmlDocument.pages.forEach(this.usePageRoute)

		// Assume a single page if no pages were found
		if (this.vtmlDocument.pages.length === 0) {
			this.useSinglePageRoute()
		}

		this.useFaviconFallback()
		this.useApi404Page()
		this.use404Page()

		this.useExpressErrorPage()

	}

	createApiPage = () => `
		<!doctype html>
		<html lang="en">
		  <head>
			<meta charset="utf-8">
			<meta name="referrer" content="same-origin">
			<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
			<title>${this.vtmlDocument.title} API</title>
		  
			<script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
			<link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
		  </head>
		  <body>

			<elements-api
			  apiDescriptionUrl="/_api/_schema.json"
			  router="hash"
			  layout="responsive"
			  tryItCredentialsPolicy="same-origin"
			/>

		  </body>
		</html>
	`

	Listen() {
		const app = Express()
		app.disable("x-powered-by")
		const port = this.port
		const listenAddress = this.listenAddress

		app.use(this.Router())
		app.listen(port, listenAddress, () => console.log(`Started on ${listenAddress}:${port}`))
	}

	get listenAddress() {
		return this.options.cliListen || "localhost"
	}

	get port(): number {
		// Determine the listen port in order of
		// - cli arg
		// - env
		// - hint
		// - default (3000)
		const cliPort = this.options.cliPort?.toString()
		const envPort = process.env["PORT"]
		const hintPort = this.vtmlDocument.findHint("v-hint-port", "port")
		const defaultPort = "3000"
	
		const portStr = cliPort || envPort || hintPort || defaultPort
		const port = parseInt(portStr)

		if (isNaN(port)) {
			throw Error(`Invalid port ${port}`)
		}

		return port
	}
}


