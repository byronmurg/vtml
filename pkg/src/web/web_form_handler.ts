import WebRouter from "./web_router"
import WebService from "./web_service"
import type WebClient from "./web_client"
import type {FormDescriptor} from "../isolates/form"
import Multer from "multer"
import Debug from "debug"
import {CreateResponseError} from "./web_utils"

const multer = Multer({ storage:Multer.memoryStorage() })

const debug = Debug("vtml:web")


export default
class WebFormHandler extends WebRouter {
	constructor(private service:WebService, private form:FormDescriptor) {
		super()
		this.prepare()
	}

	prepare() {

		if (this.form.encoding === "multipart/form-data") {
			debug("Multipart form", this.form.name)

			const uploadFields = this.form.uploadFields
			const fields = uploadFields.map((field) => ({ name:field.name, maxCount:1 }))

			const fileHandler = uploadFields.length
				? multer.fields(fields)
				: multer.none()
				
			this.use(fileHandler)
		}

		const {method, path} = this.form

		this.handle(method, path, this.FormAction)
		this.handle(method, `/_ajax${path}`, this.FormAjax)
		this.handle(method, `/_api${path}`, this.FormApi)
	}


	executeFormEncoded(client:WebClient) {
		const rootDataset = client.createActionDataset()
		const files = client.parseFiles()
		const body = client.body

		return this.form.executeFormEncoded(rootDataset, body, files)
	}

	FormAction = async (client:WebClient) => {
		const formRes = await this.executeFormEncoded(client)

		client.setCookies(formRes.cookies)

		if (formRes.status < 400) {
			client.redirectOrReturn(formRes.redirect)
		} else {
			const error = CreateResponseError(formRes.status, formRes.error)
			this.service.renderError(client, error)
		}
	}

	FormAjax = async (client:WebClient) => {
		const formRes = await this.executeFormEncoded(client)
		client.sendAjaxReponse(formRes)
	}

	FormApi = async (client:WebClient) => {
		const dataset = client.createActionDataset()
		const formRes = await this.form.execute(dataset, client.body)

		client.setCookies(formRes.cookies)
		client.setStatus(formRes.status)

		if (formRes.status < 400) {
			if (this.form.outputSchema) {
				client.sendJson(formRes.output)
			} else {
				client.sendJson({
					code: formRes.status,
					message: formRes.error,
				})
			}
		} else {
			client.sendJson({})
		} 
	}

}


