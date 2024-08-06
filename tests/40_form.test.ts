import StarlingDocument from "../src/document"

// Just an example context
const rootDataset = {
	path: "/",
	matchedPath: "/",
	query: {},
	method: "GET",
	cookies: {},
	headers: {},
	params:{},
	pageNotFound: false,
}

test("form", async () => {

	const exampleHTML = `
		<form method="POST" x-name="test1" >
			<input name="name" type="text" />
		</form>
	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const forms = doc.forms

	expect(forms.length).toBe(1)

	const form = forms[0]

	const outOk = await form.execute(rootDataset, { name:"foo" })

	expect(outOk.found).toBe(true)
})

test("form not found", async () => {

	const exampleHTML = `
		<x-nodejs target="foo" >
			return false
		</x-nodejs>
		<x-if source="$foo" >
			<form method="POST" x-name="test1" >
				<input name="name" type="text" />
			</form>
		</x-if>

	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const forms = doc.forms

	expect(forms.length).toBe(1)

	const form = forms[0]

	const outOk = await form.execute(rootDataset, { name:"foo" })

	expect(outOk.found).toBe(false)
})
