import {STATUS_CODES} from "http"

export default
function getDefaultError(code:number): string {
	return STATUS_CODES[code] || STATUS_CODES[500] || ""
}

export
const ServerError:string = getDefaultError(500)
