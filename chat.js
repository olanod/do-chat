// avoid hijacking of the native method for the fun of maximizing encapsulation
Object.defineProperty(Element.prototype, 'attachShadow',
	{value: Element.prototype.attachShadow, enumerable: true, configurable: false, writable: false})
const tagFn = fn => (strings, ...parts) => fn(parts
	.reduce((tpl, value, i) => `${tpl}${strings[i]}${value}`, '')
	.concat(strings[parts.length]))
const html = tagFn(s => new DOMParser()
	.parseFromString(`<template>${s}</template>`, 'text/html')
	.querySelector('template'))
const css = tagFn(s => {
	let style = new CSSStyleSheet()
	style.replaceSync(s)
	return style
})
const attachShadowTemplate = (ele, delegatesFocus = false) => {
	let klass = ele.constructor
	let shadow = ele.attachShadow({mode: 'closed', delegatesFocus})
	shadow.append(klass.template.content.cloneNode(true))
	shadow.adoptedStyleSheets = klass.styles
	return shadow
}
const formData = o => Object.entries(o)
	.reduce((d, [k, v]) => d.append(k, v) || d, new FormData)
const raf = requestAnimationFrame

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
	static template = html`
<div id="from"></div>
<time id="time"></time>
<div id="txt"></div>`
	static styles = [css`
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
}`]

	#$from
	#$time
	#$txt

	content = '...'
	time = new Date()
	from = unknownDude

	constructor() {
		super()
		let shadow = attachShadowTemplate(this)
		this.#$from = shadow.getElementById('from')
		this.#$time = shadow.getElementById('time')
		this.#$txt = shadow.getElementById('txt')
	}

	connectedCallback() {
		let domContent = this.textContent.trim()
		this.content = domContent || this.content
		let ts = this.getAttribute('datetime')
		if (ts)	this.time = new Date(ts)
		let chat = this.closest('do-chat')
		let from = this.getAttribute('from')
		if (chat && from) {
			let dude = chat.querySelector(`${Dude.tag}[name=${from}]`)
			if (dude) this.from = dude
		}
		this.update()
	}

	update() {
		raf(() => {
			this.#$txt.innerHTML = this.content.replace(/\n/g, '<br />')
			this.#$time.textContent = fmtTime(this.time)
			this.#$time.dateTime = this.time.toISOString()
			this.#$time.title = this.time.toLocaleString()
			this.#$from.textContent = this.from.name
		})
	}
}
customElements.define(TextMessage.tag, TextMessage)

export class Chat extends HTMLElement {
	static tag = 'do-chat'
	static template = html`
<section id="ppl" hidden><slot name="people"></slot></section>
<section id="msgs"><slot></slot></section>
<section id="act">
	<slot name="actions"></slot>
</section>`
	static styles = [css`
:host {
	display: flex;
	flex-direction: column;
}
#msgs {
	display: flex;
	flex: 1;
	flex-direction: column-reverse;
}`]
	static autoInsert = new Map([
		['text-message', TextMessage],
	])

	channel = 'default'
	me = unknownDude

	#chan
  #autoInsert = ({type, ...data}) => {
		if (Chat.autoInsert.has(type)) {
			let Msg = Chat.autoInsert.get(type)
			let msg = Object.assign(new Msg, {
				time: new Date(data.ts),
				from: this.me,
				content: data[type],
			})
			this.dispatchEvent(new CustomEvent(this.channel, {detail: msg, bubbles: true}))
			raf(() => this.prepend(msg))
		}
	}
	#broadcastMessage = e => {
		e.preventDefault()
		let data = Object.fromEntries(new FormData(e.target).entries())
		this.#chan.postMessage(data)
		this.#autoInsert(data)
	}

	constructor() {
		super()
		attachShadowTemplate(this)
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

export class TextMessageField extends HTMLElement {
	static tag = 'do-msg-field'
	static template = html`
<div id="txt" contenteditable spellcheck role="textbox" tabindex="0">
</div>
<p id="plh"></p>
<slot></slot>`
	static styles = [css`
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
}`]
	static Msg = TextMessage
	static formAssociated = true

	value = ''
	placeholder = 'Message'

	#$txt
	#$plh
	#internals
	#name = 'message'
	#validate = () => {
		if (!this.value) {
			this.#internals.setValidity({customError: true}, 'Say something!')
		} else {
			this.#internals.setValidity({})
		}
	}
	#updateValue = () => {
		this.value = this.#$txt.textContent
		if (this.value) this.#$plh.textContent = ''
		else this.#$plh.textContent = this.placeholder

		this.#internals.setFormValue(formData({
			type: this.type,
			[this.type]: this.value,
			ts: new Date().toISOString()
		}), this.value)
		this.#validate()
	}
  #submit = () =>	{
		if (!this.checkValidity()) return
		this.#internals.form.dispatchEvent(
			new Event('submit', {cancelable: true, bubbles: true})
		)
		this.#internals.form.reset()
		this.#validate()
	}
	#submitOnEnter = e => {
		if (e.code === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			this.#submit(e)
		}
	}

	constructor() {
		super()
		this.#internals = this.attachInternals()
		let shadow = attachShadowTemplate(this, true)
		this.#$txt = shadow.getElementById('txt')
		this.#$plh = shadow.getElementById('plh')
	}

	connectedCallback() {
		this.#name = this.getAttribute('name') || this.#name
		this.placeholder = this.getAttribute('placeholder') || this.placeholder

		this.#$txt.addEventListener('keydown', this.#submitOnEnter)
		this.addEventListener('input', this.#updateValue)

		this.#validate()
		this.update()
	}

	formResetCallback() {
		this.#internals.setFormValue('')
		console.log([...new FormData(this.#internals.form).entries()])
		this.value = ''
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
		raf(() => {
			this.#$txt.textContent = this.value
			this.#$plh.textContent = this.placeholder
		})
	}
}
customElements.define(TextMessageField.tag, TextMessageField)
