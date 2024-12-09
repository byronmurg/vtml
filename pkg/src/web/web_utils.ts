import type {ResponseError} from "../types"
import DefaultError from "../default_errors"

export
function CreateResponseError(code:number, message:string|undefined = undefined): ResponseError {
	return {
		code,
		message: message || DefaultError(code),
	}	
}

