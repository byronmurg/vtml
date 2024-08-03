import type { Element } from "./html"
import FilterContext from "./filter_context"

// Attributes that are stripped out
const protectedAttributes = [
	"x-name",
	"x-ajax",
]

// Attributes that cannot be templated
const passedAttributes = [
	"required",
	"name",
	"type",
	"method",
	"maxlength",
	"minlength",
	"max",
	"min",
	"pattern",
	"content-type",
	"path",
]

export default
function templateAttributes(attrs:Element["attributes"], ctx:FilterContext) {
	const cpy:Element["attributes"] = {}

	for (const k in attrs) {
		const v = attrs[k]
		// If it's a string and not a protected attribute
		if (protectedAttributes.includes(k)) {
			continue
		} else if (passedAttributes.includes(k)) {
			// Passed attributes are not templated
			cpy[k] = v
		} else if (typeof(v) === "string") {
			// Template it
			cpy[k] = ctx.templateStringSafe(v)
		} else {
			cpy[k] = v
		}
	}

	return cpy
}
