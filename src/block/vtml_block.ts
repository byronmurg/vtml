import TagBlockBase from "./tag_block_base"
import {Branch, Block, TagBlock, VtmlTag, ChainResult, BlockReport, IsolateReponse} from "../types"
import * as HTML from "../html"
import {uniq, pullAll} from "lodash"
import * as Vars from "../variables"
import FilterContext from "../filter_context"
import * as utils from "../utils"

export default
class VtmlBlock extends TagBlockBase implements TagBlock {

	_prepared: ReturnType<VtmlTag["prepare"]>

	constructor(private readonly tag:VtmlTag, el:HTML.TagElement, seq:number, parent:Block) {
		super(el, seq, parent)
		this.checkAttributes()
		this._prepared = tag.prepare(this)
	}

	isDynamic() {
		// Always assume dynamic.
		return true
	}

	defaultBehaviour = async (ctx:FilterContext): Promise<Branch> => {
		const {elements} = await this.renderChildren(ctx)
		const attributes = this.templateAttributes(ctx)

		const resp = {
			...this.el,
			attributes,
			elements,
		}

		return { ctx, elements:[resp] }
	}

	checkConsumers(inputs:string[]) {
		const localReport = this.getLocalReport()
		for (const consume of localReport.consumes) {
			if (!inputs.includes(consume)) {
				this.error(`${consume} not defined`)
			}
		}

		const childInputs = inputs.concat(localReport.injects)
		this.children.checkAllConsumer(childInputs)
	}

	report(): BlockReport {
		const localReport = this.getLocalReport()
		const childReport = this.children.aggReport()

		const consumes = localReport.consumes.concat(
			pullAll(childReport.consumes, localReport.injects)
		)

		const doesConsumeError = childReport.doesConsumeError || localReport.doesConsumeError

		return {
			id: `${this.el.name}(${this.seq})`,
			provides: localReport.provides,
			consumes: uniq(consumes),
			injects: localReport.injects,
			doesConsumeError,
		}
	}

	getLocalReport(): BlockReport {
		const attrConsumes: string[] = []
		const attrProvides: string[] = []
		const attrInjects: string[] = []

		for (const k in this.el.attributes) {
			const value = this.el.attributes[k]

			if (!value) continue

			const vars = Vars.getVarsInString(value.toString())

			if (!vars.length) continue

			const type = this.tag.attributes[k] || {}
			if (type.special) continue

			if (type.target) {
				attrProvides.push(...vars)
			} else if (type.inject) {
				attrInjects.push(...vars)
			} else {
				attrConsumes.push(...vars)
			}
		}

		return {
			id: `${this.el.name}(${this.seq})`,
			provides: uniq(attrProvides),
			consumes: uniq(attrConsumes),
			injects: uniq(attrInjects),
			doesConsumeError: this.tag.consumesError || false,
		}

	}

	checkAttributes() {
		this.debug("check attributes")

		for (const k in this.tag.attributes) {
			const type = this.tag.attributes[k]
			const value = this.el.attributes[k]

			if (!value) {
				if (type.required) {
					this.error(`Missing required attribute '${k}'`)
				}
			} else {
				const vars = Vars.getTemplatesInString(value.toString())

				if (type.source && vars.length !== 1) {
					this.error(`Source attributes must select just one variable`)
				}

				if (type.special && vars.length > 0) {
					this.error(`Attribute ${k} cannot be templated`)
				}

				if (type.target) {
					const [v] = vars
					if (!v) {
						this.error(`Target attribute must set one variable`)
					}

					// If extra characters were found
					if (v !== value) {
						this.error(`Malformed target attribute`)
					}
				}

				if (type.inject) {
					const [v] = vars
					if (!v) {
						this.error(`As attribute must set one variable`)
					}

					// If extra characters were found
					if (v !== value) {
						this.error(`Malformed as attribute`)
					}
				}
			}
		}

		// If extra attributes are not allowed (most cases) run through the attributes
		// and check that there is a definition for them.
		if (!this.tag.allowExtraAttributes) {
			for (const k in this.el.attributes) {
				const type = this.tag.attributes[k]

				if (! type) {
					this.error(`Unknown attribute ${k}`)
				}
			}
		}
	}


	templateAttributes(ctx:FilterContext) {
		return this.templateAttributesSpec(
			ctx,
			this.el.attributes,
			this.tag.attributes,
		)
	}

	targetAttr() {
		return this.attr("target")
	}

	sourceAttr() {
		return this.attr("source")
	}

	bodyOrSrc() {
		const srcPath = this.attr("src")
		if (srcPath) {
			return utils.readFile(srcPath)
		} else {
			return this.requireOneTextChild()
		}
	}

	async Render(ctx:FilterContext): Promise<Branch> {
		this.debug("render")
		return this._prepared.render(ctx)
	}

	CheckContains(ctx:FilterContext): Promise<ChainResult> {
		return this._prepared.contains(ctx)
	}

	CheckPreceeds(ctx:FilterContext): Promise<FilterContext> {
		return this._prepared.preceeds(ctx)
	}

	getAllConsumes() {
		const report = this.report()
		return uniq(this.parent.resolveChildConsumes(this.seq, report.consumes))
	}

	resolveChildConsumes(seq:number, consumes:string[]) {
		const preceedingConsumes = this.children.getAllConsumesForChild(seq, consumes)
		const localReport = this.getLocalReport()

		const allConsumes = localReport.consumes.concat(preceedingConsumes)
		return this.parent.resolveChildConsumes(this.seq, allConsumes)
	}


	Isolate() {
		this.debug("isolate")
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

	createChildChain(seq:number, consumes:string[]) {
		const localReport = this.getLocalReport()

		const preceedChain = this.children.createContainerChain(seq, consumes)

		const blockConsumes = consumes.concat(localReport.consumes).concat(preceedChain.consumes)
		const parentChain = this.parent.createChildChain(this.seq, blockConsumes)

		return async (ctx:FilterContext): Promise<ChainResult> => {
			const parentRes = await parentChain(ctx)
			if (!parentRes.found) {
				return parentRes
			}

			const preceedRes = await preceedChain.collection.runPreceed(parentRes.ctx)

			return await this.CheckContains(preceedRes)
		}
	}
}



