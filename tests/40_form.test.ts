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
		<form x-name="test1" >
			<input name="name" type="text" />
		</form>
	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const forms = doc.forms

	expect(forms.length).toBe(1)

	const form = forms[0]

	const outOk = await form.execute(rootDataset, { name:"foo" })

	expect(outOk.status).toBe(200)
})

test("form not found", async () => {

	const exampleHTML = `
		<x-nodejs target="foo" >
			return false
		</x-nodejs>
		<x-if source="$foo" >
			<form x-name="test1" >
				<input name="name" type="text" />
			</form>
		</x-if>

	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const forms = doc.forms

	expect(forms.length).toBe(1)

	const form = forms[0]

	const outOk = await form.execute(rootDataset, { name:"foo" })

	expect(outOk.status).toBe(404)
})

test("duplicate forms throw errors", async () => {

	const exampleHTML = `
		<form x-name="foo" ></form>
		<form x-name="foo" ></form>
	`

	function innerTest() {
		return StarlingDocument.LoadFromString(exampleHTML)
	}

	expect(innerTest).toThrow("Duplicate x-name in form (<string>:33)")
})


test("form sets return code successfully", async () => {
	const exampleHTML = `
		<form x-name="foo" >
			<x-return-code-action code="401" />
			<input name="bar" />
		</form>

	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const response = await doc.executeFormByName("foo", rootDataset, { bar:"bar" })

	expect(response.status).toBe(401)
})

test("form not executed on non-success chain", async () => {
	const exampleHTML = `
		<x-return-code code="400" />
		<form x-name="foo" >
			<input name="bar" />
		</form>

	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const response = await doc.executeFormByName("foo", rootDataset, { bar:"bar" })

	expect(response.status).toBe(400)
})

test("form redirects correctly", async () => {
	const exampleHTML = `
		<form x-name="foo" >
			<input name="bar" />
			<x-redirect-action path="/foo" />
		</form>

	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const response = await doc.executeFormByName("foo", rootDataset, { bar:"bar" })

	expect(response.redirect).toBe("/foo")
})

test("form sets cookie correctly", async () => {
	const exampleHTML = `
		<form x-name="foo" >
			<input name="bar" />
			<x-setcookie-action name="foo" value="baz" />
		</form>

	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const response = await doc.executeFormByName("foo", rootDataset, { bar:"bar" })

	expect(response.cookies["foo"]).toEqual({ value:"baz", maxAge:0 })
})
