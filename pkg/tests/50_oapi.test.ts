import { InitDocument } from "./test_lib"

test("form basic", async () => {

	const exampleHTML = `
		<form method="POST" v-name="foo" >
			<input name="bar" type="text" required />
			<v-action>
				<v-nodejs>console.log("Hi")</v-nodejs>
			</v-action>
		</form>
	`

	const doc = InitDocument(exampleHTML)

	const schema = doc.oapiSchema

	expect(schema.info.version).toBe(`1.0`)
})

test("form advanced", async () => {

	const exampleHTML = `
		<form method="POST" v-name="foo" >
			<input name="text" type="text" required />
			<input name="bool" type="checkbox" required />
			<input name="date" type="date" required />
			<input name="time" type="time" />

			<select name="enum" >
				<option>one</option>
				<option value="2" >two</option>
			</select>

			<input name="radio-enum" type="radio" value="foo" />
			<input name="radio-enum" type="radio" value="bar" />
			<v-action>
				<v-nodejs>console.log("Hi")</v-nodejs>
			</v-action>
		</form>
	`

	const doc = InitDocument(exampleHTML)

	const schema = doc.oapiSchema

	expect(schema.info.version).toBe(`1.0`)

	const paths = schema.paths
	if (! paths) {
		throw Error(`No paths were defined`)
	}

	const fooPath = paths["/_api/foo"]
	if (! fooPath) {
		throw Error("No foo path was defined")
	}

	const fooPost = fooPath["post"]

	if (! fooPost) {
		throw Error(`No POST in foo path defined`)
	}

	const requestBody = fooPost.requestBody


	expect(requestBody).toEqual({
		content: {
			"application/json": {
				schema: {
					type: "object",
					properties: {
						text: { type:"string", minLength:1 },
						date: { type:"string", format:"date" },
						time: { type:"string", format:"time" },
						bool: { type:"boolean" },
						enum: { type:"string", enum:["one", "2"] },
						"radio-enum": { type:"string", enum:["foo", "bar"] },
					},
					required: ["text", "bool", "date", "enum"],
					additionalProperties: false,
				},
			}
		},
		required: true,
	})
})

test("selects", async () => {

	const exampleHTML = `
		<form method="POST" v-name="foo" >
			<select name="enum" >
				<option>one</option>
				<option value="2" >two</option>
			</select>

			<v-json target=$v >22</v-json>

			<select name="dynamic" maxlength=32 >
				<option>one</option>
				<option value=$v >two</option>
			</select>

			<v-action>
				<v-nodejs>console.log("Hi")</v-nodejs>
			</v-action>
		</form>
	`

	const doc = InitDocument(exampleHTML)

	const form = doc.forms.find((form) => form.name === "foo")

	if (! form) {
		throw Error(`Form not found`)
	}

	const inputSchema = form.inputSchema

	const enumProp = inputSchema.properties?.['enum']

	if (! enumProp) {
		throw Error(`Enum prop not found`)
	}

	expect(enumProp).toMatchObject({ type:"string", enum:["one", "2"] })

	const dynamicProp = inputSchema.properties?.['dynamic']

	if (! dynamicProp) {
		throw Error(`Dynamic prop not found`)
	}

	expect(dynamicProp).toMatchObject({ type:"string", maxLength:32 })
})
