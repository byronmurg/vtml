import type {Element} from "./html"
import * as utils from "./utils"
import FilterContext from "./filter_context"
import NodeFunction from "./node"

type FormAction = (ctx:FilterContext) => Promise<FilterContext>
type FormActionConstructor = (el:Element) => FormAction

const formActionTypes: Record<string, FormActionConstructor> = {

	"x-sql-body": (formAction) => {
		const query = utils.requireOneTextChild(formAction)
		const target = utils.getAttribute(formAction, "target")
		return async (ctx:FilterContext) => {
			const output = await ctx.RunSQL(query)
			return target ? ctx.SetVar(target, output) : ctx
		}
	},

	"x-nodejs-body": (formAction) => {
		const query = utils.requireOneTextChild(formAction)
		const target = utils.getAttribute(formAction, "target")
		const idAttr = utils.getAttribute(formAction, "id")
		const nodeFunc = NodeFunction(query, idAttr)
		return async (ctx:FilterContext) => {
			const output = await nodeFunc(ctx)
			return target ? ctx.SetVar(target, output) : ctx
		}
	}
}

function prepareAction(formElement:Element): FormAction {
	const name = formElement.name || ""
	const actionConstructor = formActionTypes[name]

	if (actionConstructor) {
		return actionConstructor(formElement)
	} else {
		// Should never hit this
		throw Error(`Something went very wrong`)
	}
}

const formActionTags = Object.keys(formActionTypes)

export
const isFormAction = (el:Element) => formActionTags.includes(el.name||"")


export default
function createFormActions(postForm:Element): FormAction[] {
	const formActions = utils.findElement(postForm.elements||[], isFormAction)
	return formActions.map(prepareAction)

}
