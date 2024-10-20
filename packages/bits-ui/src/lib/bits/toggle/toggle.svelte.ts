import { useRefById } from "svelte-toolbelt";
import { getAriaPressed, getDataDisabled, getDisabled } from "$lib/internal/attrs.js";
import type { ReadableBoxedValues, WritableBoxedValues } from "$lib/internal/box.svelte.js";
import { kbd } from "$lib/internal/kbd.js";
import type { WithRefProps } from "$lib/internal/types.js";

const ROOT_ATTR = "data-toggle-root";

type ToggleRootStateProps = WithRefProps<
	ReadableBoxedValues<{
		disabled: boolean;
	}> &
		WritableBoxedValues<{
			pressed: boolean;
		}>
>;

class ToggleRootState {
	#id: ToggleRootStateProps["id"];
	#ref: ToggleRootStateProps["ref"];
	#disabled: ToggleRootStateProps["disabled"];
	pressed: ToggleRootStateProps["pressed"];

	constructor(props: ToggleRootStateProps) {
		this.#disabled = props.disabled;
		this.pressed = props.pressed;
		this.#id = props.id;
		this.#ref = props.ref;

		useRefById({
			id: this.#id,
			ref: this.#ref,
		});
	}

	#togglePressed = () => {
		if (!this.#disabled.current) {
			this.pressed.current = !this.pressed.current;
		}
	};

	#onpointerdown = (e: PointerEvent) => {
		if (this.#disabled.current) return;
		if (e.pointerType === "touch" || e.button !== 0) return e.preventDefault();
		this.#togglePressed();
	};

	#onpointerup = (e: PointerEvent) => {
		if (this.#disabled.current) return;
		if (e.pointerType === "touch") {
			e.preventDefault();
			this.#togglePressed();
		}
	};

	#onkeydown = (e: KeyboardEvent) => {
		if (this.#disabled.current) return;
		if (![kbd.ENTER, kbd.SPACE].includes(e.key)) return;
		e.preventDefault();
		this.#togglePressed();
	};

	props = $derived.by(
		() =>
			({
				[ROOT_ATTR]: "",
				"data-disabled": getDataDisabled(this.#disabled.current),
				"aria-pressed": getAriaPressed(this.pressed.current),
				"data-state": getToggleDataState(this.pressed.current),
				disabled: getDisabled(this.#disabled.current),
				onpointerdown: this.#onpointerdown,
				onpointerup: this.#onpointerup,
				onkeydown: this.#onkeydown,
			}) as const
	);
}

//
// METHODS
//

export function useToggleRoot(props: ToggleRootStateProps) {
	return new ToggleRootState(props);
}

//
// HELPERS
//

export function getToggleDataState(condition: boolean): "on" | "off" {
	return condition ? "on" : "off";
}
