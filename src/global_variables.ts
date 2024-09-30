
const providedGlobals = [
	"params.",
	"body.",
]

const implicitGlobals = [
	"path",
	"matchedPath",
	"query.",
	"method",
	"search",
	"headers.",
	"cookies.",
	"action",
]

const validGlobals = [
	...implicitGlobals,
	...providedGlobals,
]

export
function isValidGlobal(str:string) {
	return !!validGlobals.find((glob) => str.startsWith(`$.${glob}`))
}

export
function isProvidedGlobal(str:string) {
	return !!providedGlobals.find((glob) => str.startsWith(`$.${glob}`))
}
