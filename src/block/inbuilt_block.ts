import TagBlockBase from "./tag_block_base"
import type {Branch, TagBlock, ChainResult, BlockReport, IsolateReponse, AttributeSpec, RenderDescription, Block} from "../types"

import uniq from "lodash/uniq"
import * as Vars from "../variables"
import * as GlobalVars from "../global_variables"
import * as HTML from "../html"
import FilterContext from "../filter_context"

const attrOps = {
	pass: { special:true },
}

const defaultAttributeSpec: AttributeSpec = {
	// @TODO half of these aren't needed
	"required":attrOps.pass,
	"name":attrOps.pass,
	"type":attrOps.pass,
	"maxlength":attrOps.pass,
	"minlength":attrOps.pass,
	"max":attrOps.pass,
	"min":attrOps.pass,
	"pattern":attrOps.pass,
	"content-type":attrOps.pass,
}



export default
class InbuiltBlock extends TagBlockBase implements TagBlock {

	private dynamic: boolean
	private constant: HTML.Element|undefined

	constructor(el:HTML.TagElement, seq:number, parent:Block) {
		super(el, seq, parent)

		const myVars = this.getVarsInAttributes()
		this.dynamic = (myVars.all.length > 0) || this.areAnyChildrenDynamic()

		if (!this.dynamic) {
			this.constant = this.RenderConstant()
		}
	}
	

	isDynamic(): boolean {
		return this.dynamic
	}

	checkConsumers(inputs:string[], globals:string[]) {
		const consumes = this.getVarsInAttributes()

		for (const consume of consumes.locals) {
			if (!inputs.includes(consume)) {
				this.error(`${consume} not defined`)
			}
		}

		for (const glob of consumes.globals) {
			if (!GlobalVars.isValidGlobal(glob)) {
				this.error(`invalid global ${glob}`)
			}

			if (GlobalVars.isProvidedGlobal(glob) && !globals.includes(glob)) {
				this.error(`global ${glob} not found`)
			}
		}

		this.children.checkAllConsumer(inputs, globals)
	}

	report(): BlockReport {
		const childReport = this.children.aggReport()
		const consumeVars = this.getVarsInAttributes()
		const id = `${this.el.name}(${this.seq})`

		return {
			id,
			provides: [],
			injects: [],
			consumes: uniq(childReport.consumes.concat(consumeVars.locals)),
			globals: uniq(childReport.globals.concat(consumeVars.globals)),
			doesConsumeError: childReport.doesConsumeError,
		}
	}

	getVarsInAttributes() {
		return Vars.basicTemplate.findAllVarsInMap(this.el.attributes)
	}

	async Render(ctx:FilterContext): Promise<Branch> {
		// If this is not a dynamic element then we can
		// just return it as-is.
		if (this.constant) {
			return { ctx, elements:[this.constant] }
		}


		const {elements} = await this.renderChildren(ctx)
		const attributes = this.templateAttributesSpec(ctx, this.el.attributes, defaultAttributeSpec)

		const resp = {
			...this.el,
			attributes,
			elements,
		}

		return { ctx, elements:[resp] }
	}

	RenderConstant(): HTML.Element {
		const children = this.children.renderAllConstant()

		const attrs:HTML.TagElement["attributes"] = {}
		for (const k in this.el.attributes) {
			const v = this.el.attributes[k]
			if (typeof(v) === "string") {
				attrs[k] = Vars.basicTemplate.sanitize(v)
			} else {
				attrs[k] = v
			}
		}

		return {
			...this.el,
			elements: children,
			attributes: attrs,
		}
	}

	CheckPreceeds(ctx:FilterContext) {
		// Inbuilt tags cannot alter the ctx
		return Promise.resolve(ctx)
	}

	getRenderDescription(): RenderDescription[] {
		return this.children.getRenderDescription()
	}

	createChildChain(seq:number, consumes:string[]) {
		const preceedChain = this.children.createContainerChain(seq, consumes)
		const blockConsumes = consumes.concat(preceedChain.consumes)
		const parentChain = this.parent.createChildChain(this.seq, blockConsumes)

		const run = async (ctx:FilterContext): Promise<ChainResult> => {
			const parentRes = await parentChain.run(ctx)
			if (!parentRes.found) {
				return parentRes
			}

			const preceedRes = await preceedChain.collection.runPreceed(parentRes.ctx)

			return { found:true, ctx:preceedRes }
		}

		const globals = parentChain.globals.concat(preceedChain.globals)
		return { run, globals:globals }
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

}



