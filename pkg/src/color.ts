
type formatter = (msg:string) => string

function colour(code:string): formatter {
	return (msg:string) => `\x1b[${code}m${msg}\x1b[0m`
}

export const red = colour("91")
export const orange = colour("33")
export const yellow = colour("93")
export const cyan = colour("96")
