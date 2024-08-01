import type {Element} from "./html"
import type {TagAction, Action} from "./types"
import * as utils from "./utils"
import FilterContext from "./filter_context"
import {findTagIfX} from "./filter"
import NodeFunction from "./node"

const defaultAction:Action = async (ctx:FilterContext) => ctx

function prepareAction(formElement:Element): Action {
	const name = formElement.name || ""
	const tag = findTagIfX(formElement)

	if (tag && tag.action) {
		return tag.action(formElement)
	} else {
		return defaultAction
	}
}


export default
function createFormActions(postForm:Element): Action[] {
	return postForm.elements?.map(prepareAction) || []
}
