import CreatePassthroughTag from "./passthrough"

export
const VSubscribe = CreatePassthroughTag({
	name: "v-subscribe",
	attributes: {
		path: { required:true, special:true }
	},
	bodyPolicy: "deny",
})
