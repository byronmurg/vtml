import {InitRoot, InitDocument, RenderErrors} from "./test_lib"


test("form", async () => {
	const rootDataset = InitRoot()

	const exampleHTML = `
		<form v-name="test1" >
			<input name="name" type="text" />
			<v-action>
				<v-nodejs>console.log("Hi")</v-nodejs>
			</v-action>
		</form>
	`

	const doc = InitDocument(exampleHTML)

	const forms = doc.forms

	expect(forms.length).toBe(1)

	const form = forms[0]

	const outOk = await form.execute(rootDataset, { name:"foo" })

	expect(outOk.status).toBe(200)
})

test("forms without v-name do nothing", async () => {
	const exampleHTML = `
		<form>
			<input name="name" type="text" />
		</form>
	`

	const doc = InitDocument(exampleHTML)

	const forms = doc.forms

	expect(forms.length).toBe(0)
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
				<v-action>
					<v-nodejs>console.log("Hi")</v-nodejs>
				</v-action>
			</form>
		</v-if>

	`

	const doc = InitDocument(exampleHTML)

	const forms = doc.forms

	expect(forms.length).toBe(1)

	const form = forms[0]

	const outOk = await form.execute(rootDataset, { name:"foo" })

	expect(outOk.status).toBe(404)
})

test("duplicate form paths raise error", async () => {

	const exampleHTML = `
		<form v-name="foo" >
			<v-action>
				<v-nodejs>console.log("Hi")</v-nodejs>
			</v-action>
		</form>
		<form v-name="foo" >
			<v-action>
				<v-nodejs>console.log("Hi again")</v-nodejs>
			</v-action>
		</form>
	`

	const errors = RenderErrors(exampleHTML)

	expect(errors).toEqual([
		{
			message:"Duplicate path /foo",
			tag: "form",
			filename: "<string>",
			linenumber: 2,
		},
		{
			message:"Duplicate path /foo",
			tag: "form",
			filename: "<string>",
			linenumber: 7,
		}
	])
})


test("form sets return code successfully", async () => {
	const rootDataset = InitRoot({ action:true })

	const exampleHTML = `
		<form v-name="foo" >
			<input name="bar" />
			<v-action>
				<v-set-status code="401" />
			</v-action>
		</form>

	`

	const doc = InitDocument(exampleHTML)

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
				<v-action>
					<v-nodejs>console.log("Hi")</v-nodejs>
				</v-action>
			</form>
		</v-check-authenticated>

	`

	const doc = InitDocument(exampleHTML)

	const response = await doc.executeFormByName("foo", rootDataset, { bar:"bar" })

	expect(response.status).toBe(401)
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

	const doc = InitDocument(exampleHTML)

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

	const doc = InitDocument(exampleHTML)

	const response = await doc.executeFormByName("foo", rootDataset, { bar:"bar" })

	expect(response.redirect).toBe("")
})


test("form sets cookie correctly", async () => {
	const rootDataset = InitRoot({ action:true })
	const exampleHTML = `
		<form v-name="foo" >
			<input name="bar" />
			<v-action>
				<v-set-cookie name="foo" value="baz" />
			</v-action>
		</form>

	`

	const doc = InitDocument(exampleHTML)

	const response = await doc.executeFormByName("foo", rootDataset, { bar:"bar" })

	expect(response.cookies["foo"]).toEqual({ value:"baz", maxAge:0 })
})

test("form inputs must have names", async () => {
	const exampleHTML = `
		<form v-name="foo" >
			<input />
			<v-action>
				<v-nodejs>console.log("Hi")</v-nodejs>
			</v-action>
		</form>

	`

	const errors = RenderErrors(exampleHTML)

	expect(errors).toEqual([
		{
			message: "attribute 'name' required",
			tag: "input",
			filename: "<string>",
			linenumber: 3,
		}
	])
})

test("form selects must have names", async () => {
	const exampleHTML = `
		<form v-name="foo" >
			<select>
				<option>bar</option>
			</select>
			<v-action>
				<v-nodejs>console.log("Hi")</v-nodejs>
			</v-action>
		</form>

	`

	const errors = RenderErrors(exampleHTML)

	expect(errors).toEqual([
		{
			message: "attribute 'name' required",
			tag: "select",
			filename: "<string>",
			linenumber: 3,
		}
	])
})

test("form textareas must have names", async () => {
	const exampleHTML = `
		<form v-name="foo" >
			<textarea>Hi</textarea>
			<v-action>
				<v-nodejs>console.log("Hi")</v-nodejs>
			</v-action>
		</form>

	`

	const errors = RenderErrors(exampleHTML)

	expect(errors).toEqual([
		{
			message: "attribute 'name' required",
			tag: "textarea",
			filename: "<string>",
			linenumber: 3,
		}
	])
})

test("inputs outside a form do not need names", async () => {
	const exampleHTML = `
		<input />
	`

	const errors = RenderErrors(exampleHTML)
	expect(errors).toEqual([])
})

test("textareas outside a form do not need names", async () => {
	const exampleHTML = `
		<textarea />
	`

	const errors = RenderErrors(exampleHTML)
	expect(errors).toEqual([])
})

test("selects outside a form do not need names", async () => {
	const exampleHTML = `
		<select />
	`

	const errors = RenderErrors(exampleHTML)
	expect(errors).toEqual([])
})


test("cannot have vtml tags between form and inputs", () => {
	const exampleHTML = `
		<form v-name="foo" >
			<v-if $.path eq="/bar" >
				<input name="baz" />
			</v-if>
			<v-action>
				<v-nodejs>console.log("Hi")</v-nodejs>
			</v-action>
		</form>
	`

	const errors = RenderErrors(exampleHTML)
	expect(errors).toEqual([
		{
			message: "cannot contain inputs when inside a form",
			tag: "v-if",
			filename: "<string>",
			linenumber: 3,
		}
	])
})
