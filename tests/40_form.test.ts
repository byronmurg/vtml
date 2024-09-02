import VtmlDocument from "../src/document"

// Just an example context
const rootDataset = {
	path: "/",
	matchedPath: "/",
	query: {},
	method: "GET",
	cookies: {},
	headers: {},
	params:{},
}

test("form", async () => {

	const exampleHTML = `
		<form v-name="test1" >
			<input name="name" type="text" />
		</form>
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const forms = doc.forms

	expect(forms.length).toBe(1)

	const form = forms[0]

	const outOk = await form.execute(rootDataset, { name:"foo" })

	expect(outOk.status).toBe(200)
})

test("form not found", async () => {

	const exampleHTML = `
		<v-nodejs target="foo" >
			return false
		</v-nodejs>
		<v-if source="$foo" >
			<form v-name="test1" >
				<input name="name" type="text" />
			</form>
		</v-if>

	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const forms = doc.forms

	expect(forms.length).toBe(1)

	const form = forms[0]

	const outOk = await form.execute(rootDataset, { name:"foo" })

	expect(outOk.status).toBe(404)
})

test("duplicate forms throw errors", async () => {

	const exampleHTML = `
		<form v-name="foo" ></form>
		<form v-name="foo" ></form>
	`

	function innerTest() {
		return VtmlDocument.LoadFromString(exampleHTML)
	}

	expect(innerTest).toThrow("Duplicate v-name in form (<string>:33)")
})


test("form sets return code successfully", async () => {
	const exampleHTML = `
		<form v-name="foo" >
			<v-return-code-action code="401" />
			<input name="bar" />
		</form>

	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const response = await doc.executeFormByName("foo", rootDataset, { bar:"bar" })

	expect(response.status).toBe(401)
})

test("form not executed on non-success chain", async () => {
	const exampleHTML = `
		<v-return-code code="400" />
		<form v-name="foo" >
			<input name="bar" />
		</form>

	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const response = await doc.executeFormByName("foo", rootDataset, { bar:"bar" })

	expect(response.status).toBe(400)
})

test("form redirects correctly", async () => {
	const exampleHTML = `
		<form v-name="foo" >
			<input name="bar" />
			<v-redirect-action path="/foo" />
		</form>

	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const response = await doc.executeFormByName("foo", rootDataset, { bar:"bar" })

	expect(response.redirect).toBe("/foo")
})

test("form sets cookie correctly", async () => {
	const exampleHTML = `
		<form v-name="foo" >
			<input name="bar" />
			<v-setcookie-action name="foo" value="baz" />
		</form>

	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const response = await doc.executeFormByName("foo", rootDataset, { bar:"bar" })

	expect(response.cookies["foo"]).toEqual({ value:"baz", maxAge:0 })
})
