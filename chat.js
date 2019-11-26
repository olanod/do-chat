
const html = (strings, ...parts) =>
	new DOMParser().parseFromString(parts
		.reduce((tpl, value, i) => `${tpl}${strings[i]}${value}`, '')
		.concat(strings[parts.length]),
	'text/html').querySelector('template')
const defineIds = ele => ele.shadowRoot.querySelectorAll('[id]')
	  .forEach(e => Object.defineProperty(ele, `$${e.id}`, { value: e }))

const chat = html`<template>
<style>
:host {
  display: flex;
  flex-direction: column;
}
header { display: none; }
#messages {
  display: flex;
  flex: 1;
  flex-direction: column-reverse;
}
</style>
<header><slot name="people"></slot></header>
<section id="messages"><slot></slot></section>
<section><slot name="action"></slot></section>
</template>`

export class Chat extends HTMLElement {
	channel = 'default'
	_ch = null
	
	constructor() {
		super()
		this.attachShadow({mode: 'open'})
			.append(chat.content.cloneNode(true))
	}

	connectedCallback() {
		const chan = this.getAttribute('channel')
		if (chan) this.channel = chan
		this._ch = new BroadcastChannel(this.channel)
		this.addEventListener('submit', e => {
			e.preventDefault()
			this._ch.postMessage(new FormData(e.target))
		})
	}
}
customElements.define('do-chat', Chat)

export class Dude extends HTMLElement {
	name = 'Unknown'
}
customElements.define('do-dude', Dude)

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

const unknownDude = Object.assign(new Dude, {})
const relFmt = new Intl.RelativeTimeFormat()
const timeFmt = new Intl.DateTimeFormat()
const fmtTime = date => {
	const now = new Date()
	const diffMin = ((date - now) / 1000 / 60).toFixed()
	const diffHour = (diffMin / 60).toFixed()
	const diffDay = (diffHour / 24).toFixed()
	return Math.abs(diffMin) < 60
		? relFmt.format(diffMin, 'minute') : Math.abs(diffHour) < 24
		? relFmt.format(diffHour, 'hour') : Math.abs(diffDay) < 7
		? relFmt.format(diffDay, 'day')
		: timeFmt.format(date)
}

export class Msg extends HTMLElement {
	text = '...'
	time = new Date()
	from = unknownDude

	constructor() {
		super()
		this.attachShadow({mode: 'open'})
			.append(msg.content.cloneNode(true))
		defineIds(this)
	}

	connectedCallback() {
		this.text = this.textContent.trim()
		const ts = this.getAttribute('datetime')
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
customElements.define('do-msg', Msg)
