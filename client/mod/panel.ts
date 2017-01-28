// Moderation panel with various post moderation and other controls

import { View } from "../base"
import { extend, postJSON, write, threads, toggleHeadStyle } from "../util"
import { Post } from "../posts"
import { getModel, page } from "../state"
import { newRequest } from "./common"

let panel: ModPanel,
	banInputs: BanInputs,
	displayCheckboxes = localStorage.getItem("hideModCheckboxes") !== "true",
	checkboxStyler: (toggle: boolean) => void

export default class ModPanel extends View<null> {
	private checkboxToggle: HTMLInputElement

	constructor() {
		if (panel) {
			panel.setVisibility(true)
			setVisibility(displayCheckboxes)
			return panel
		}
		checkboxStyler = toggleHeadStyle(
			"mod-checkboxes",
			".mod-checkbox{ display: inline; }"
		)

		super({ el: document.getElementById("moderation-panel") })
		panel = this
		banInputs = new BanInputs()

		this.el.querySelector("form").addEventListener("submit", e =>
			this.onSubmit(e))

		this.el
			.querySelector("select[name=action]")
			.addEventListener("change", () => this.onSelectChange(), {
				passive: true
			})

		this.checkboxToggle = (this.el
			.querySelector(`input[name="showCheckboxes"]`) as HTMLInputElement)
		this.checkboxToggle.addEventListener("change", e =>
			setVisibility((event.target as HTMLInputElement).checked))

		setVisibility(displayCheckboxes)
		this.setVisibility(true)
	}

	private setVisibility(show: boolean) {
		write(() => {
			this.el.style.display = show ? "inline-block" : ""
			this.checkboxToggle.checked = displayCheckboxes
			const auth = document
				.querySelector("#identity > table tr:first-child"
				) as HTMLInputElement
			auth.style.display = show ? "table-row" : ""
			auth.checked = false
		})
	}

	// Reset the state of the module and hide all revealed elements
	public reset() {
		checkboxStyler(false)
		this.setVisibility(false)
		banInputs.toggleDisplay(false)
	}

	private async onSubmit(e: Event) {
		e.preventDefault()
		e.stopImmediatePropagation()

		const checked = (threads
			.querySelectorAll(".mod-checkbox:checked") as HTMLInputElement[])
		if (!checked.length) {
			return
		}
		const models = new Array<Post>(checked.length)
		for (let i = 0; i < checked.length; i++) {
			const el = checked[i]
			models[i] = getModel(el)
			el.checked = false
		}

		switch (this.getMode()) {
			case "deletePost":
				await this.deletePost(models)
				break
			case "ban":
				await this.ban(models)
				break
		}

		for (let el of checked) {
			el.checked = false
		}
	}

	// Return current action mode
	private getMode(): string {
		return (this.el
			.querySelector(`select[name="action"]`) as HTMLInputElement)
			.value
	}

	// Deleted one or multiple selected posts
	private async deletePost(models: Post[]) {
		await this.postJSON("/admin/deletePost", {
			ids: models.map(m =>
				m.id),
			board: page.board,
		})
	}

	// Ban selected posts
	private async ban(models: Post[]) {
		const args = {
			ids: models.map(m =>
				m.id),
			board: page.board,
		}
		extend(args, banInputs.vals())

		await this.postJSON("/admin/ban", args)
	}

	// Post JSON to server and handle errors
	private async postJSON(url: string, data: {}) {
		extend(data, newRequest())
		const res = await postJSON(url, data)
		if (res.status !== 200) {
			throw await res.text()
		}
	}

	// Change additional input visibility on action change
	private onSelectChange() {
		banInputs.toggleDisplay(this.getMode() === "ban")
	}

	// Force panel to stay visible
	public setSlideOut(on: boolean) {
		write(() =>
			this.el.classList.toggle("keep-visible", on))
	}
}

function setVisibility(on: boolean) {
	localStorage.setItem("hideModCheckboxes", (!on).toString())
	panel.setSlideOut(on)
	checkboxStyler(on)
}

// Ban input fields
class BanInputs extends View<null> {
	constructor() {
		super({ el: document.getElementById("ban-form") })
	}

	public toggleDisplay(on: boolean) {
		write(() => {
			(this.el
				.querySelector("input[name=reason]") as HTMLInputElement)
				.disabled = !on
			this.el.classList.toggle("hidden", !on)
		})
	}

	// Get input field values
	public vals(): { [key: string]: any } {
		let duration = 0
		for (let el of this.el.querySelectorAll("input[type=number]")) {
			let times = 1
			switch (el.getAttribute("name")) {
				case "day":
					times *= 24
				case "hour":
					times *= 60
			}
			const val = parseInt((el as HTMLInputElement).value)
			if (val) { // Empty string parses to NaN
				duration += val * times
			}
		}

		return {
			duration,
			reason: (this.el
				.querySelector("input[name=reason]") as HTMLInputElement)
				.value
		}
	}
}
