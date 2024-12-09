import type {Branch, Block, TagBlock, ChainResult, BlockReport, IsolateReponse, Chain, ValidationError, InitializationResponse} from "../types"
import * as HTML from "../html"
import * as Vars from "../variables"
import * as GlobalVars from "../global_variables"
import {Ok} from "../utils"
import FilterContext from "../filter_context"

export default
class TextBlock implements Block {

	private bodyVars: Vars.VarMatches
	private safeText: string
	

	private constructor(private el:HTML.TextElement, private seq:number, private parent:Block) {
		this.bodyVars = this.getVarsInBody()
		this.safeText = HTML.escapeHtml(el.text)
	}

	static Init(el:HTML.TextElement, seq:number, parent:Block) {
		const block = new TextBlock(el, seq, parent)
		return Ok(block)
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

	mkError(message:string): ValidationError {
		return {
			message,
			tag: '#text',
			filename: this.el.filename,
			linenumber: this.el.linenumber,
		}
	}

	checkConsumers(inputs:string[], globals:string[]): InitializationResponse<void> {
		const errors: ValidationError[] = []
		const error = (message:string) => {
			errors.push(this.mkError(message))
		}

		for (const consume of this.bodyVars.locals) {
			if (!inputs.includes(consume)) {
				error(`${consume} not defined`)
			}
		}

		for (const glob of this.bodyVars.globals) {
			if (!GlobalVars.isValidGlobal(glob)) {
				error(`invalid global ${glob}`)
			}

			if (GlobalVars.isProvidedGlobal(glob) && !globals.includes(glob)) {
				error(`global ${glob} not found`)
			}
		}

		if (errors.length) {
			return { ok:false, errors }
		} else {
			return { ok:true, result:undefined }
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

	CheckContains(): Promise<ChainResult> {
		throw Error(`CheckContains called on TextBlock`)
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


