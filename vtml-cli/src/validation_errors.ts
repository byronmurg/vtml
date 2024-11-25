import { ValidationError } from "@vtml/lib/dist/types"

type formatter = (msg:string) => string

function colour(code:string): formatter {
	return (msg:string) => `\x1b[${code}m${msg}\x1b[0m`
}

const red = colour("91")
const yellow = colour("93")
const cyan = colour("96")

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

