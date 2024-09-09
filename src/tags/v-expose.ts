import CreatePassthroughTag from "./passthrough"

export
const VExpose = CreatePassthroughTag({
	name: "v-expose",
	attributes: {
		src: { required:true, relative:true },
		path: { required:true, special:true },
	},
})
