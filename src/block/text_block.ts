import type {Branch, Block, TagBlock, ChainResult, BlockReport, IsolateReponse, Chain} from "../types"
import * as HTML from "../html"
import * as Vars from "../variables"
import * as GlobalVars from "../global_variables"
import FilterContext from "../filter_context"

export default
class TextBlock implements Block {

	private bodyVars: Vars.VarMatches
	private safeText: string
	

	constructor(private el:HTML.TextElement, private seq:number, private parent:Block) {
		this.bodyVars = this.getVarsInBody()
		this.safeText = HTML.escapeHtml(el.text)
	}

	getName() {
		return "#text"
	}


	isDynamic(): boolean {
		return this.bodyVars.all.length > 0
	}

	getVarsInBody() {
		return Vars.basicTemplate.findAllVars(this.el.text)
	}

	async Render(ctx:FilterContext): Promise<Branch> {
		const text = ctx.templateStringSafe(this.safeText)
		const resp:HTML.Element = {
			...this.el,
			text,
		}
		return { ctx, elements:[resp] }
	}

	RenderConstant(): HTML.TextElement {
		const safeText = Vars.basicTemplate.sanitize(this.safeText)
		const resp:HTML.Element = {
			...this.el,
			text: safeText,
		}
		return resp
	}

	checkConsumers(inputs:string[], globals:string[]) {
		for (const consume of this.bodyVars.locals) {
			if (!inputs.includes(consume)) {
				this.error(`${consume} not defined`)
			}
		}

		for (const glob of this.bodyVars.globals) {
			if (!GlobalVars.isValidGlobal(glob)) {
				this.error(`invalid global ${glob}`)
			}

			if (GlobalVars.isProvidedGlobal(glob) && !globals.includes(glob)) {
				this.error(`global ${glob} not found`)
			}
		}
	}

	report(): BlockReport {
		return {
			id: `#text(${this.seq})`,
			provides: [],
			injects: [],
			consumes: this.bodyVars.locals,
			globals: this.bodyVars.globals,
			doesConsumeError: false,
		}
	}

	Find() {
		// Will never find inside a text block
		return undefined
	}

	FindAll() {
		return []
	}

	FindChildren() {
		return []
	}

	getPath() {
		const ancestorPath = this.parent.getPath()
		return ancestorPath.concat(`#text(${this.seq})`)
	}

	getPathString() {
		return this.getPath().join("->")
	}

	error(message:string): never {
		const linenumber = this.el.linenumber
		const filename = this.el.filename
		const parentName = this.parent.getName()
		throw Error(`${message} in ${parentName} at ${filename}:${linenumber}`)
	}

	CheckContains(): Promise<ChainResult> {
		this.error(`CheckContains called on TextBlock`)
	}

	CheckPreceeds(ctx:FilterContext): Promise<FilterContext> {
		// Always just pass ctx
		return Promise.resolve(ctx)
	}

	getRenderDescription() {
		return []
	}

	// @NOTE Can never contain children
	createChildChain(): Chain {
		throw Error(`createChildChain called in TextBlock`)
	}

	Isolate() {
		const report = this.report()

		const parentChain = this.parent.createChildChain(this.seq, report.consumes)

		const run = async (ctx:FilterContext): Promise<IsolateReponse> => {
			const parentResult = await parentChain.run(ctx)
			if (!parentResult.found) {
				return { found:false, elements:[], ctx:parentResult.ctx }
			}

			const renderOutput = await this.Render(parentResult.ctx)
			return { found: true, ctx:renderOutput.ctx, elements:renderOutput.elements }
		}

		const globals = report.globals.concat(parentChain.globals)

		return { run, globals }
	}

	findAncestor(check:(el:TagBlock) => boolean): TagBlock|undefined {
		return this.parent.findAncestor(check)
	}

}


