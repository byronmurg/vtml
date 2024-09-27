import type {Branch, Block, TagBlock, ChainResult, BlockReport, IsolateReponse} from "../types"
import * as HTML from "../html"
import * as Vars from "../variables"
import FilterContext from "../filter_context"

export default
class TextBlock implements Block {

	private bodyVars: string[]
	private bodyTemplates: string[]
	

	constructor(private el:HTML.TextElement, private seq:number, private parent:Block) {
		this.bodyVars = this.getVarsInBody()
		this.bodyTemplates = this.getTemplatesInBody()
	}

	getName() {
		return "#text"
	}


	isDynamic(): boolean {
		return this.bodyTemplates.length > 0
	}

	getVarsInBody(): string[] {
		return Vars.basicTemplate.findVars(this.el.text)
	}

	getTemplatesInBody(): string[] {
		return Vars.basicTemplate.findTemplates(this.el.text)
	}

	async Render(ctx:FilterContext): Promise<Branch> {
		const text = ctx.templateStringSafe(this.el.text)
		const resp:HTML.Element = {
			...this.el,
			text,
		}
		return { ctx, elements:[resp] }
	}

	RenderConstant(): HTML.TextElement {
		const safeText = Vars.basicTemplate.sanitize(this.el.text)
		const resp:HTML.Element = {
			...this.el,
			text: safeText,
		}
		return resp
	}

	checkConsumers(inputs:string[]) {
		const consumes = this.bodyVars
		for (const consume of consumes) {
			if (!inputs.includes(consume)) {
				this.error(`${consume} not defined`)
			}
		}
	}

	report(): BlockReport {
		return {
			id: `#text(${this.seq})`,
			provides: [],
			injects: [],
			consumes: this.bodyVars,
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
		throw Error(`${message} in ${filename}:${linenumber}`)
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
	createChildChain(): (ctx:FilterContext) => Promise<ChainResult> {
		throw Error(`createChildChain called in TextBlock`)
	}

	Isolate() {
		const report = this.report()

		const parentChain = this.parent.createChildChain(this.seq, report.consumes)

		return async (ctx:FilterContext): Promise<IsolateReponse> => {
			const parentResult = await parentChain(ctx)
			if (!parentResult.found) {
				return { found:false, elements:[], ctx:parentResult.ctx }
			}

			const renderOutput = await this.Render(parentResult.ctx)
			return { found: true, ctx:renderOutput.ctx, elements:renderOutput.elements }
		}
	}

	findAncestor(check:(el:TagBlock) => boolean): TagBlock|undefined {
		return this.parent.findAncestor(check)
	}

}


