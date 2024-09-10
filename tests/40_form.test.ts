import VtmlDocument from "../src/document"
import {InitRoot} from "./test_lib"


test("form", async () => {
	const rootDataset = InitRoot()

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
	const rootDataset = InitRoot()

	const exampleHTML = `
		<v-nodejs target="$foo" >
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

	expect(innerTest).toThrow("Duplicate path in form /foo")
})


test("form sets return code successfully", async () => {
	const rootDataset = InitRoot()

	const exampleHTML = `
		<form v-name="foo" >
			<v-set-status code="401" />
			<input name="bar" />
		</form>

	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const response = await doc.executeFormByName("foo", rootDataset, { bar:"bar" })

	expect(response.status).toBe(401)
})

test("form not executed on non-success chain", async () => {
	const rootDataset = InitRoot()
	const exampleHTML = `
		<v-json target="$foo" >"foo"</v-json>
		<v-check-authenticated source="$foo" eq="bar" >
			<form v-name="foo" >
				<input name="bar" />
			</form>
		</v-check-authenticated>

	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const response = await doc.executeFormByName("foo", rootDataset, { bar:"bar" })

	expect(response.status).toBe(400)
})

test("form redirects correctly", async () => {
	const rootDataset = InitRoot()
	const exampleHTML = `
		<form v-name="foo" >
			<input name="bar" />
			<v-redirect path="/foo" />
		</form>

	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const response = await doc.executeFormByName("foo", rootDataset, { bar:"bar" })

	expect(response.redirect).toBe("/foo")
})

test("form redirects correctly in action", async () => {
	const rootDataset = InitRoot({ action:true })
	const exampleHTML = `
		<form v-name="foo" >
			<input name="bar" />
			<v-action>
				<v-redirect path="/foo" />
			</v-action>
		</form>

	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const response = await doc.executeFormByName("foo", rootDataset, { bar:"bar" })

	expect(response.redirect).toBe("/foo")
})

test("form does not redirect outside action", async () => {
	const rootDataset = InitRoot({ action:false })
	const exampleHTML = `
		<form v-name="foo" >
			<input name="bar" />
			<v-action>
				<v-redirect path="/foo" />
			</v-action>
		</form>

	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const response = await doc.executeFormByName("foo", rootDataset, { bar:"bar" })

	expect(response.redirect).toBe("")
})




test("form sets cookie correctly", async () => {
	const rootDataset = InitRoot()
	const exampleHTML = `
		<form v-name="foo" >
			<input name="bar" />
			<v-set-cookie name="foo" value="baz" />
		</form>

	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const response = await doc.executeFormByName("foo", rootDataset, { bar:"bar" })

	expect(response.cookies["foo"]).toEqual({ value:"baz", maxAge:0 })
})
