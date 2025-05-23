
const starterTemplate = (name:string) => `
<html lang="en" >
	<head>
		<title>${name}</title>

		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />

		<!--
			Some useful links
		-->

		<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" />
		<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />

 		<script src="https://unpkg.com/htmx.org@2.0.2"></script>
	</head>

	<body hx-boost="true" >
		<header class="container-fluid" >
			<nav>
				<ul>
					<li><strong>${name}</strong></li>
				</ul>
				<ul>
					<li><a href="/" >home</a></li>
					<li><a href="/about" >about</a></li>
				</ul>
			</nav>
		</header>

		<main class="container" >

			<v-page path="/" >

				<form v-name="print" >
					<p>Here's a form to play with</p>

					<input name="message" type="string" aria-label="message" placeholder="message" />
					<button type="submit" >GO</button>

					<v-action>
						<v-nodejs>
							console.log($.body.message)
						</v-nodejs>
					</v-action>
				</form>
			</v-page>

			<v-page path="/about" >
				<p>Made in <a href="https://vtml.org" >VTML</a></p>
			</v-page>
		</main>

	</body>
</html>

`

export default starterTemplate
