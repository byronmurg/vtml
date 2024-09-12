import {MakeBlock} from "./index"
import uniq from "lodash/uniq"
import pullAll from "lodash/pullAll"
import intersection from "lodash/intersection"
import type {RenderDescription, Branch, Block, TagBlock, BlockReport} from "../types"
import * as HTML from "../html"
import type FilterContext from "../filter_context"

type ChainReport = {
	collection: BlockCollection
	consumes: string[]
}

type OrderSet = {
	seq: number
	block: Block
}

type MakeRenderOrderOutput = {
	orderSets: OrderSet[][]
	description: RenderDescription[]
}

export default
class BlockCollection {

	private childRenderOrder: OrderSet[][]
	private description: RenderDescription[]

	private constructor(
		private children: Block[],
		private parent: Block
	) {
		const {description, orderSets} = this.makeRenderOrder()
		this.childRenderOrder = orderSets
		this.description = description
	}

	static Create(children:HTML.Element[], parent:Block) {
		const blocks = children.map((child, i) => MakeBlock(child, i, parent))
		return new BlockCollection(
			blocks,
			parent
		)
	}

	async renderInOrder(ctx:FilterContext): Promise<Branch> {
		// Render all children in natural order

		let subCtx = ctx
		let elements: HTML.Element[] = []
		for (const child of this.children) {
			const response = await child.Render(subCtx)
			subCtx = response.ctx
			elements.push(...response.elements)
			
		}
		return { ctx, elements }
	}

	makeRenderOrder(): MakeRenderOrderOutput {
		// This method groups the children into sets based
		// on which other elements they depend upon.
		//
		// This method does not check if variables are defined
		// which must be handled by checkAllConsumer.

		// Start by storing all children along with their *real* order.
		const init = this.children.map((block, seq) => ({ seq, block }))

		const order: OrderSet[][] = [init]
		const realOrder: OrderSet[][] = []
		const description: RenderDescription[] = []

		for (let i = 0; i < order.length; i++) {
			const set = order[i]

			// Create another empty frame in the current order.
			realOrder.push([])

			// We need to keep track of the variables provided in
			// this set.
			const provides:string[] = []

			// This will be the next set that we can push into when
			// a variable has requirements in the current set.
			const nextSet:OrderSet[] = []

			for (const child of set) {
				// Create a variable report for the child.
				const report = child.block.report()

				// Checking the ontersection between the provides and the
				// child consumes tells us how many variables as referenced
				// in the current set. This does assume that the variables
				// were defined in the correct order.
				const int = intersection(provides, report.consumes)

				if (int.length) {
					// If there is an intersection then this child
					// references something in this set.
					nextSet.push(child)
				} else {
					// Otherwise the child is in the correct place
					// and can be added to the real order
					const childName = child.block.getName()
					realOrder[i].push(child)

					// Add to the description
					description[child.seq] = {
						seq: i,
						name: childName,
						report,
						order: child.block.getRenderDescription()
					}
				}

				// Add the provides of this child to the
				// check list
				provides.push(...report.provides)

			}

			// If any blocks are in the next set push
			// it into the order so that it will be processed
			// next loop.
			if (nextSet.length) {
				order.push(nextSet)
			}
		}

		return { orderSets:realOrder, description }
	}

	createContainerChain(seq:number, consumes:string[]): ChainReport {
		// We need to build a precedence chain for an element *inside*
		// one of the elements in our chain. The element's containers
		// already have some consumes so we need to take those into account
		//
		// We don't need to worry about the consumes of the element itself
		// as those have been passed to us (or it's an inbuilt).
		
		const next = seq-1
		const chain:Block[] = []

		// Loop backwards through the chain
	 	for (let i = next; i >= 0; i--) {
			const child = this.children[i]
			const report = child.report()

			// Does this child provide anything
			// that we need?
			const int = intersection(consumes, report.provides)
			if (int.length) {
				// Then add to the chain
				chain.push(child)
				// And add it's requirements to
				// our own
				consumes = uniq(consumes.concat(report.consumes))
			}
		}

		const newCollection = new BlockCollection(chain.reverse(), this.parent)
		return { consumes, collection:newCollection }
	}



	aggReport(): BlockReport {
		// Create an aggregated report for all blocks
		// in this collection.

		const childrenProvide: string[] = []
		const consumes: string[] = []
		let doesConsumeError = false

		for (const child of this.children) {
			const report = child.report()

			// The whole block is considered to consumeError
			// if any one does.
			if (report.doesConsumeError) {
				doesConsumeError = true
			}

			// Add the consumes to the output minus
			// those that are provided by previous elements.
			consumes.push(
				...pullAll(report.consumes, childrenProvide)
			)


			// Add the provides for this element for the
			// next cycle.
			childrenProvide.push(...report.provides)
		}

		return {
			id: "<block>",
			doesConsumeError,
			consumes,
			provides: [],
			injects: [],
		}

	}

	checkAllConsumer(inputs:string[]) {
		for (const child of this.children) {
			child.checkConsumers(inputs)
			const report = child.report()
			inputs = inputs.concat(report.provides)
		}
	}

	async renderAll(ctx:FilterContext) {
		const branchSets: Branch[] = []
		let subCtx = ctx

		// Iterate through the rendering order sets
		for (const set of this.childRenderOrder) {
			// Asynchronously render each set
			const outputs = await Promise.all(
				set.map(async (child) => ({
					branch: await child.block.Render(subCtx),
					seq: child.seq,
				}))
			)

			// Collect all the branches in original order
			// and merge the variable outputs
			for (const output of outputs) {
				branchSets[output.seq] = output.branch
				subCtx = subCtx.Merge(output.branch.ctx)
			}
		}

		// Collect the output elements (in original order).
		const elements:HTML.Element[] = []
		for (const branch of branchSets) {
			elements.push(...branch.elements)
		}

		return { ctx, elements }
	}

	async runPreceed(ctx:FilterContext): Promise<FilterContext> {
		// This works in largely the same way as renderAll
		// but only calls the preceeds

		// Iterate through the calling order sets
		for (const set of this.childRenderOrder) {
			// Asynchronously render each set
			const outputs = await Promise.all(
				set.map((child) => child.block.CheckPreceeds(ctx))
			)

			// Collect the output elements (in original order)
			// and merge the variables together.
			for (const output of outputs) {
				ctx = ctx.Merge(output)
			}
		}

		return ctx
	}

	findInChildren(check:(el:TagBlock) => boolean): TagBlock|undefined {
		for (const child of this.children) {
			const found = child.Find(check)
			if (found) {
				return found
			}
		}
	}

	findAllInChildren(check:(el:TagBlock) => boolean): TagBlock[] {
		return this.children.flatMap((child) => child.FindAll(check))
	}

	getRenderDescription() {
		return this.description
	}

	anyDynamic(): boolean {
		return this.children.some((child) => child.isDynamic())
	}
}

