import { ValidationError } from "./types"
import {red, cyan, yellow} from "./color"

function printValidationError(error:ValidationError) {
	console.error(
		red("error"),
		error.message,
		`\n\t in <${error.tag}> at`,
		`${cyan(error.filename)}:${yellow(error.linenumber.toString())}`,
	)
}

export default
function printValidationErrors(errors:ValidationError[]) {
	errors.forEach(printValidationError)
}

