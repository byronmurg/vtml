import CreateOverrideTag from "./override"

export const TextareaTag = CreateOverrideTag({
	name: "textarea",
	attributes: {
		name: { special:true },

		maxlength: { special:true },
		minlength: { special:true },
		pattern: { special:true },
		required: { special:true },
	},
	prepareRender: (block) => block.defaultBehaviour,
})
