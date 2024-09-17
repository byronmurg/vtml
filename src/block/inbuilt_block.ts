import TagBlockBase from "./tag_block_base"
import type {Branch, TagBlock, ChainResult, BlockReport, IsolateReponse, AttributeSpec, RenderDescription, Block} from "../types"
import uniq from "lodash/uniq"
import * as Vars from "../variables"
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

	constructor(el:HTML.TagElement, seq:number, parent:Block) {
		super(el, seq, parent)

		const myVars = this.getTemplatesInAttributes()
		this.dynamic = (myVars.length > 0) || this.children.anyDynamic()
	}
	

	isDynamic(): boolean {
		return this.dynamic
	}

	checkConsumers(inputs:string[]) {
		const consumes = this.getVarsInAttributes()

		for (const consume of consumes) {
			if (!inputs.includes(consume)) {
				this.error(`${consume} not defined`)
			}
		}

		this.children.checkAllConsumer(inputs)
	}

	report(): BlockReport {
		const childReport = this.children.aggReport()
		const consumeVars = this.getVarsInAttributes()
		const id = `${this.el.name}(${this.seq})`

		return {
			...childReport,
			id,
			consumes: uniq(childReport.consumes.concat(consumeVars))
		}
	}

	getVarsInAttributes() {
		return uniq(Vars.getVarsInMap(this.el.attributes))
	}

	getTemplatesInAttributes() {
		return uniq(Vars.getTemplatesInMap(this.el.attributes))
	}

	async Render(ctx:FilterContext): Promise<Branch> {
		// If this is not a dynamic element then we can
		// just return it as-is.
		if (!this.dynamic) {
			return { ctx, elements:[this.el] }
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

		return async (ctx:FilterContext): Promise<ChainResult> => {
			const parentRes = await parentChain(ctx)
			if (!parentRes.found) {
				return parentRes
			}

			const preceedRes = await preceedChain.collection.runPreceed(parentRes.ctx)

			return { found:true, ctx:preceedRes }
		}
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

}



