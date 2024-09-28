import WebService from "./web_service"
import type {exposeOptions} from "./web_service"
import VtmlDocument from "../document"

export
function serveVtmlDocument(vtmlDocument:VtmlDocument, options:exposeOptions) {
	const service = new WebService(vtmlDocument, options)
	return service.Listen()
}
