import StarlingDocument from "../src/document"
import FilterContext from "../src/filter_context"

// Just an example context
const ctx = FilterContext.Init({
	path: "/",
	query: {},
	method: "GET",
	cookies: {},
	headers: {},
	params:{},
	pageNotFound: false,
})

test("form basic", async () => {

	const exampleHTML = `
		<form method="POST" x-name="foo" >
			<input name="bar" type="text" required />
		</form>
	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const schema = doc.oapiSchema

	expect(schema.info.version).toBe(`1.0`)
})
