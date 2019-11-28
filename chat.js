const html = (strings, ...parts) =>
	new DOMParser().parseFromString(parts
		.reduce((tpl, value, i) => `${tpl}${strings[i]}${value}`, '')
		.concat(strings[parts.length]),
	'text/html').querySelector('template')
const defineIds = ele => ele.shadowRoot.querySelectorAll('[id]')
		.forEach(e => Object.defineProperty(ele, `$${e.id}`, { value: e }))
const withTemplate = (ele, tpl, delegatesFocus = false) => {
	ele.attachShadow({mode: 'open', delegatesFocus})
		.append(tpl.content.cloneNode(true))
	defineIds(ele)
}

export class Dude extends HTMLElement {
	static tag = 'do-dude'

	name = 'unknown'

	connectedCallback() {
		this.name = this.getAttribute('name') || this.name
	}

	get displayName() {
		return this.textContent.trim() || 'John Doe'
	}
}
customElements.define(Dude.tag, Dude)

const unknownDude = Object.freeze(Object.assign(new Dude, {}))

const chat = html`<template>
<style>
:host {
	display: flex;
	flex-direction: column;
}
#msgs {
	display: flex;
	flex: 1;
	flex-direction: column-reverse;
}
</style>

<section id="ppl" hidden><slot name="people"></slot></section>
<section id="msgs"><slot></slot></section>
<section id="act">
	<slot name="actions"></slot>
</section>
</template>`

export class Chat extends HTMLElement {
	static tag = 'do-chat'

	channel = 'default'
	me = unknownDude

	#chan
	#broadcastMessage = e => {
		e.preventDefault()
		let data = Object.fromEntries(new FormData(e.target).entries())
		this.#chan.postMessage(data)
	}

	constructor() {
		super()
		withTemplate(this, chat)
	}

	connectedCallback() {
		this.channel = this.getAttribute('channel') || this.channel
		this.#chan = new BroadcastChannel(this.channel)

		let me = this.getAttribute('me')
		if (me) me = this.querySelector(`${Dude.tag}[name=${me}]`)
		if (me) this.me = me

		this.addEventListener('formdata', ({formData}) => {
			formData.append('from', this.me.name)
		})
		this.addEventListener('submit', this.#broadcastMessage)
	}
}
customElements.define(Chat.tag, Chat)

const msg = html`<template>
<style>
:host {
	display: grid;
	grid-template-rows: 1rem 1fr;
	grid-template-columns: fit-content(0%) 1fr fit-content(0%);
	margin: 0.5rem 0;
}
#from, time {
	font-size: 0.8em;
	grid-row: 1 / 2;
}
#from { font-weight: bold; }
#time { grid-column: 3 / 4; }
#txt {
	grid-area: 2 / 1 / 3 / 4;
}
</style>
<div id="from"></div>
<time id="time"></time>
<div id="txt"></div>
</template>`

const relFmt = new Intl.RelativeTimeFormat()
const timeFmt = new Intl.DateTimeFormat()
const fmtTime = date => {
	const now = new Date()
	let diffMin = ((date - now) / 1000 / 60).toFixed()
	let diffHour = (diffMin / 60).toFixed()
	let diffDay = (diffHour / 24).toFixed()
	return Math.abs(diffMin) < 60
		? relFmt.format(diffMin, 'minute') : Math.abs(diffHour) < 24
		? relFmt.format(diffHour, 'hour') : Math.abs(diffDay) < 7
		? relFmt.format(diffDay, 'day')
		: timeFmt.format(date)
}

export class TextMessage extends HTMLElement {
	static tag = 'do-msg'

	text = '...'
	time = new Date()
	from = unknownDude

	constructor() {
		super()
		withTemplate(this, msg)
	}

	connectedCallback() {
		this.text = this.textContent.trim()
		let ts = this.getAttribute('datetime')
		if (ts)	this.time = new Date(ts)
		this.update()
	}

	update() {
		this.$txt.innerHTML = this.text.replace(/\n/g, '<br />')
		this.$time.textContent = fmtTime(this.time)
		this.$time.dateTime = this.time.toISOString()
		this.$time.title = this.time.toLocaleString()
		this.$from.textContent = this.from.name
	}
}
customElements.define(TextMessage.tag, TextMessage)

const msgField = html`<template>
<style>
:host {
	display: flex;
	position: relative;
	--padding: 1rem;
}
#txt {
	flex: 1;
	min-height: 100%;
	padding: var(--padding);
}
#plh {
	pointer-events: none;
	color: rgba(0,0,0,0.2);
	position: absolute;
	top: 0;
	left: 0;
	margin: 0;
	padding: var(--padding);
	font-style: italic;
}
</style>
<div id="txt" contenteditable spellcheck role="textbox" tabindex="0">
</div>
<p id="plh"></p>
<slot></slot>
</template>`
export class TextMessageField extends HTMLElement {
	static tag = 'do-msg-field'
	static Msg = TextMessage
	static formAssociated = true

	value = ''
	placeholder = 'Message'

	#internals
	#name = 'message'
	#submit = () =>	{
		if (!this.checkValidity()) return
		this.#internals.form.dispatchEvent(
			new Event('submit', {cancelable: true, bubbles: true})
		)
	}
	#validate = () => {
		if (!this.value) {
			this.#internals.setValidity({customError: true}, 'Say something!')
		} else {
			this.#internals.setValidity({})
		}
	}
	#updateValue = () => {
		this.value = this.$txt.textContent
		if (this.value) this.$plh.textContent = ''
		else this.$plh.textContent = this.placeholder
		let val = new FormData()
		val.append(this.name, this.value)
		val.append('type', this.type)
		this.#internals.setFormValue(val, this.value)
		this.#validate()
	}
	#submitOnEnter = e => {
		if (e.code === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			this.#submit()
		}
	}

	constructor() {
		super()
		withTemplate(this, msgField, true)
		this.#internals = this.attachInternals()
	}

	connectedCallback() {
		this.#name = this.getAttribute('name') || this.#name
		this.placeholder = this.getAttribute('placeholder') || this.placeholder

		this.$txt.addEventListener('keydown', this.#submitOnEnter)
		this.addEventListener('input', this.#updateValue)

		this.#validate()
		this.update()
	}

	get form() { return this.#internals.form }
	get name() { return this.#name }
	get type() { return 'text-message' }
	get validity() { return this.#internals.validity }
	get validationMessage() { return this.#internals.validationMessage }
	get willValidate() {return this.#internals.willValidate }

	checkValidity() { return this.#internals.checkValidity() }
	reportValidity() {return this.#internals.reportValidity() }

	update() {
		this.$txt.textContent = this.value
		this.$plh.textContent = this.placeholder
	}
}
customElements.define(TextMessageField.tag, TextMessageField)
