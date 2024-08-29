
const starterTemplate = (name:string) => `
<html lang="en" >
	<head>
		<title>${name}</title>

		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />

		<!--
			Some useful links

			<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" />
			<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />

			<script src="https://unpkg.com/htmx.org@1.9.12"></script>
		-->
	</head>

	<body>
		<h1>${name}</h1>

		<form v-name="print" >
			<input name="message" type="string" />

			<v-nodejs-action>
				console.log($.body.message)
			</v-nodejs-action>
		</form>

	</body>
</html>
`

export default starterTemplate
