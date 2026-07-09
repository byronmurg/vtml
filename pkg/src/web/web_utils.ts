import Multer from "multer"
import type {ResponseError} from "../types"
import DefaultError from "../default_errors"

export
function CreateResponseError(code:number, message:string|undefined = undefined): ResponseError {
	return {
		code,
		message: message || DefaultError(code),
	}
}

// Middleware such as body-parser (via http-errors) sets a numeric
// status/statusCode on errors it throws (400 bad json, 413 payload too
// large, 415 unsupported charset, etc). Multer's own errors don't carry a
// status, so any of those are treated as a bad request. Anything else is
// a genuinely unexpected error and falls back to 500.
export
function getErrorStatus(err:Error): number {
	const { status, statusCode } = err as { status?:unknown, statusCode?:unknown }
	const declaredStatus = status ?? statusCode

	if (typeof declaredStatus === "number" && declaredStatus >= 400 && declaredStatus < 600) {
		return declaredStatus
	}

	if (err instanceof Multer.MulterError) {
		return 400
	}

	return 500
}

