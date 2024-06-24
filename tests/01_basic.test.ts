import StarlingDocument from "../src/document"
import FilterContext from "../src/filter_context"

const exampleHTML = `
<x-json target="vars" >
[
	"foo", "bar"
]
</x-json>

<x-for-each source="$vars">
	<p>$</p>
</x-for-each>
`

// Just an example context
const ctx = FilterContext.Init({
	path: "/",
	query: {},
	method: "GET",
	headers: {},
	params:{},
	pageNotFound: false,
})

test("Basic check", async () => {
	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const output = await doc.renderLoader(ctx)

	expect(output).toBe(`<!DOCTYPE html><p>foo</p><p>bar</p>`)
})

