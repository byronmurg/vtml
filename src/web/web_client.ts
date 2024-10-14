import Express from "express"
import type {RootDataset, ResponseError, CookieMap, RenderResponse, ExposeResult, SubscribeResult, ResponseBasic} from "../types"
import type {FileMap} from "../form"
import {URL} from "node:url"
import * as HTML from "../html"
import {CreateResponseError} from "./web_utils"
import EventStream from "../event_stream"

export type WebHandler = (client:WebClient) => Promise<void>|void

export default
class WebClient {
	constructor(
		private req:Express.Request,
		private res:Express.Response,
	) {}

	static Wrap(handler:WebHandler) {
		return (req:Express.Request, res:Express.Response) => {
			const client = new WebClient(req, res)
			return handler(client)
		}
	}

	get headersSent() {
		return this.res.headersSent
	}

 	get search(): string {
		return (this.req.originalUrl.match(/\?(.+)/)||[])[1]
	}

	get body() {
		return this.req.body
	}

	private createRootDataset(action:boolean): RootDataset {
		const req = this.req
		return {
			query: req.query,
			params: req.params,
			search: this.search,
			matchedPath: req.route.path,
			path: req.path,
			method: req.method,
			headers: req.headers,
			cookies: req.cookies,
			action,
		}
	}

	createActionDataset() {
		return this.createRootDataset(true)
	}

	createLoaderDataset() {
		return this.createRootDataset(false)
	}

	setCookies(cookies:CookieMap) {
		for (const k in cookies) {
			const v = cookies[k]
			const maxAge = v.maxAge || undefined
			this.res.cookie(k, v.value, {maxAge, sameSite:true})
		}
	}


	parseFiles(): FileMap {
		const files = this.req.files
		if (files === undefined) return {}
		if (Array.isArray(files)) return {}

		const map:FileMap = {}

		for (const name in files) {
			map[name] = files[name][0].buffer.toString("hex")
		}
		return map
	}

	redirect(href:string) {
		this.res.redirect(307, href)
	}

	get safeReferer() {
		const referer = new URL(this.req.get("Referrer") || "/")
		return referer.pathname
	}

	redirectOrReturn(href:string|undefined) {
		this.redirect(href || this.safeReferer)
	}

	setStatus(code:number) {
		this.res.status(code)
	}

	sendRenderResponse(response:RenderResponse) {
		this.setCookies(response.cookies)
		if (response.redirect) {
			this.redirect(response.redirect)
		} else {
			this.setStatus(response.status)
			this.sendDocument(response.elements)
		}
	}

	sendDocument(elements:HTML.Element[]) {
		this.res.contentType("text/html")
		HTML.serializeHTML(elements, this.res)
	}

	sendJson(value:unknown) {
		this.res.json(value)
	}

	sendJsonError(err:ResponseError) {
		this.setStatus(err.code)
		this.sendJson({
			code: err.code,
			message: err.message,
		})
	}

	sendFile(path:string) {
		this.res.sendFile(path, { root:process.cwd() })
	}

	sendExpose(response:ExposeResult) {
		if (response.contentType) {
			this.res.contentType(response.contentType)
		}
		this.sendFile(response.sendFile)
	}

	sendHTMLString(html:string) {
		this.res.contentType("text/html")
		this.res.send(html)
	}

	sendBasicError(error:ResponseError) {
		this.setStatus(error.code)
		this.sendHTMLString(`<h3>${error.message}</h3>`)
	}

	sendBasicErrorResponse(response:ResponseBasic) {
		const error = CreateResponseError(response.status, response.error)
		this.setCookies(response.cookies)
		this.sendBasicError(error)
	}

	sendAjaxReponse(response:RenderResponse) {
		if (response.status < 400) {
			this.sendRenderResponse(response)
		} else {
			this.sendBasicErrorResponse(response)
		}
	}

	sendExposeResponse(response:ExposeResult) {
		if (response.status < 400) {
			this.sendExpose(response)
		} else {
			this.sendBasicErrorResponse(response)
		}
	}

	sendSubscribeResponse(response:SubscribeResult) {
		if (response.status < 400) {
			this.subscribe(response)
		} else {
			this.sendBasicErrorResponse(response)
		}
	}

	async subscribe(response:SubscribeResult) {
		const res = this.res

		res.on("close", () => {
			connection.disconnect()
			res.end()
		})

		res.set({
		  'Cache-Control': 'no-cache',
		  'Content-Type': 'text/event-stream',
		  'Connection': 'keep-alive',
		})

		res.flushHeaders()
		
		res.write('retry: 2000\n\n')

		const connection = EventStream.connectClient(response.channel)

		connection.onMessage((message:string) => {
			message = message || "change"
			res.write(`event: notify\ndata: ${message}\n\n`)
		})

	}
}

