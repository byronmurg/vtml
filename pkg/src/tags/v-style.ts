import CreateDisplayTag from "./display"
import type {Element} from "../html"

function minifyCss(css:string) {
	const stripped = css
		.replace(/\n/g, ' ') // Remove newlines
		.replace(/\t/g, ' ') // Replace tabs
		.replace(/\/\*.*?\*\//g, '') // Remove comments
		.replace(/\s*}\s*/g, '}') // remove space after backets
		.replace(/\s*{\s*/g, '{') // remove space before backets
		.replace(/;\s+/g, ';') // remove space after semi-colons
		.replace(/:\s+/g, ':') // remove space after colons
		.trim() // Just trim


	return stripped
}


export 
const vStyle = CreateDisplayTag({
	name: "v-style",

	attributes: {
		"src": { special:true, relative:true },
		"minify": { special:true },
	},
	bodyPolicy: "allowTextOnly",

	prepareRender(block) {
		const el = block.element()
		const src = block.bodyOrSrc()

		if (block.attr("src") && block.hasChildren()) {
			throw Error(`cannot have a body when src is set`)
		}

		const css = block.boolAttr("minify") ? minifyCss(src) : src

		const resp: Element = {
			type: "element",
			name: "style",
			filename: el.filename,
			linenumber: el.linenumber,
			attributes: {},
			elements: [
				{
					type: "text",
					text: css,
					filename: el.filename,
					linenumber: el.linenumber,
				},
			],
		}

		return async (ctx) => ({ ctx, elements:[resp] })
	}
})
