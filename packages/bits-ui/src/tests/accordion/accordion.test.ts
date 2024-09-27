/* eslint-disable ts/no-explicit-any */
import { render, waitFor } from "@testing-library/svelte/svelte5";
import { axe } from "jest-axe";
import { describe, it } from "vitest";
import { tick } from "svelte";
import { getTestKbd, setupUserEvents } from "../utils.js";
import AccordionSingleTest from "./accordion-single-test.svelte";
import AccordionMultiTest from "./accordion-multi-test.svelte";
import AccordionTestIsolated from "./accordion-test-isolated.svelte";
import AccordionSingleTestControlledSvelte from "./accordion-single-test-controlled.svelte";
import AccordionMultiTestControlled from "./accordion-multi-test-controlled.svelte";
import AccordionSingleForceMountTest from "./accordion-single-force-mount-test.svelte";
import { sleep } from "$lib/internal/sleep.js";

export type Item = {
	value: string;
	title: string;
	disabled: boolean;
	content: string;
	level: 1 | 2 | 3 | 4 | 5 | 6;
};

const kbd = getTestKbd();

const items: Item[] = [
	{
		value: "item-1",
		title: "Item 1",
		content: "Content 1",
		disabled: false,
		level: 3,
	},
	{
		value: "item-2",
		title: "Item 2",
		content: "Content 2",
		disabled: false,
		level: 3,
	},
	{
		value: "item-3",
		title: "Item 3",
		content: "Content 3",
		disabled: false,
		level: 3,
	},
	{
		value: "item-4",
		title: "Item 4",
		content: "Content 4",
		disabled: false,
		level: 3,
	},
];

const itemsWithDisabled = items.map((item) => {
	if (item.value === "item-2") {
		return { ...item, disabled: true };
	}
	return item;
});

describe("accordion - single", () => {
	it("should have no accessibility violations", async () => {
		const { container } = render(AccordionSingleTest as any, { items });
		expect(await axe(container)).toHaveNoViolations();
	});

	it("should have bits data attrs", async () => {
		const { getByTestId } = render(AccordionTestIsolated);
		const root = getByTestId("root");
		const trigger = getByTestId("trigger");
		const item = getByTestId("item");
		const header = getByTestId("header");
		const content = getByTestId("content");
		expect(root).toHaveAttribute("data-accordion-root");
		expect(item).toHaveAttribute("data-accordion-item");
		expect(header).toHaveAttribute("data-accordion-header");
		expect(content).toHaveAttribute("data-accordion-content");
		expect(trigger).toHaveAttribute("data-accordion-trigger");
	});

	it("should have expected data attributes", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionSingleTest as any, { items: itemsWithDisabled });
		const itemEls = items.map((item) => getByTestId(`${item.value}-item`));
		const triggerEls = items.map((item) => getByTestId(`${item.value}-trigger`));

		expect(itemEls[0]).toHaveAttribute("data-state", "closed");
		expect(itemEls[0]).not.toHaveAttribute("data-disabled");
		expect(triggerEls[0]).toHaveAttribute("data-state", "closed");
		expect(triggerEls[0]).not.toHaveAttribute("data-disabled");

		await user.click(triggerEls[0] as HTMLElement);
		await tick();
		expect(itemEls[0]).toHaveAttribute("data-state", "open");
		expect(triggerEls[0]).toHaveAttribute("data-state", "open");

		expect(itemEls[1]).toHaveAttribute("data-disabled");
		expect(triggerEls[1]).toHaveAttribute("data-disabled");
	});

	it("should forceMount the content when `forceMount` is true", async () => {
		const { getByTestId } = render(AccordionSingleForceMountTest as any, {
			items: itemsWithDisabled,
		});
		const contentEls = items.map((item) => getByTestId(`${item.value}-content`));

		for (const content of contentEls) {
			expect(content).toBeVisible();
		}
	});

	it("work properly when `forceMount` is true and the `open` snippet prop is used to conditionally render the content", async () => {
		const user = setupUserEvents();
		const { getByTestId, queryByTestId } = render(AccordionSingleForceMountTest as any, {
			items: itemsWithDisabled,
			withOpenCheck: true,
		});
		const initContentEls = items.map((item) => queryByTestId(`${item.value}-content`));

		for (const content of initContentEls) {
			expect(content).toBeNull();
		}

		const triggerEls = items.map((item) => getByTestId(`${item.value}-trigger`));

		// open the first item
		await user.click(triggerEls[0] as HTMLElement);

		const firstContentEl = getByTestId(`${items[0]!.value}-content`);
		expect(firstContentEl).toBeVisible();

		const secondContentEl = queryByTestId(`${items[1]!.value}-content`);
		expect(secondContentEl).toBeNull();
	});

	it("should disable everything when the `disabled` prop is true", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionSingleTest as any, {
			items,
			disabled: true,
		});

		const triggerEls = items.map((item) => getByTestId(`${item.value}-trigger`));
		await user.click(triggerEls[0] as HTMLElement);
		expect(triggerEls[0]).not.toHaveAttribute("data-state", "open");
		expect(triggerEls[0]).toHaveAttribute("data-disabled");

		await user.click(triggerEls[1] as HTMLElement);
		expect(triggerEls[1]).not.toHaveAttribute("data-state", "open");
		expect(triggerEls[1]).toHaveAttribute("data-disabled");

		await user.click(triggerEls[2] as HTMLElement);
		expect(triggerEls[2]).not.toHaveAttribute("data-state", "open");
		expect(triggerEls[2]).toHaveAttribute("data-disabled");
	});

	it("should display content when an item is expanded", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionSingleTest as any, { items });

		for (const item of items) {
			const trigger = getByTestId(`${item.value}-trigger`);
			const content = getByTestId(`${item.value}-content`);
			const itemEl = getByTestId(`${item.value}-item`);
			expect(itemEl).toHaveAttribute("data-state", "closed");
			expect(itemEl).toHaveAttribute("data-state", "closed");
			expect(content).not.toBeVisible();
			await user.click(trigger);
			const contentAfter = getByTestId(`${item.value}-content`);
			expect(contentAfter).toHaveTextContent(item.content);
			expect(itemEl).toHaveAttribute("data-state", "open");
		}
	});

	it("should expand only one item at a time when type is `'single'`", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionSingleTest as any, { items });

		for (const item of items) {
			const trigger = getByTestId(`${item.value}-trigger`);
			const content = getByTestId(`${item.value}-content`);
			const itemEl = getByTestId(`${item.value}-item`);
			expect(itemEl).toHaveAttribute("data-state", "closed");
			expect(itemEl).toHaveAttribute("data-state", "closed");
			expect(content).not.toBeVisible();
			await user.click(trigger);
			const contentAfter = getByTestId(`${item.value}-content`);
			expect(contentAfter).toHaveTextContent(item.content);
			expect(itemEl).toHaveAttribute("data-state", "open");
		}
		const openItems = Array.from(
			document.querySelectorAll("[data-state='open'][data-accordion-item]")
		);
		expect(openItems.length).toBe(1);
	});

	it("should expand when the trigger is focused and `Enter` key is pressed", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionSingleTest as any, {
			items,
		});

		for (const item of items) {
			const trigger = getByTestId(`${item.value}-trigger`);
			const content = getByTestId(`${item.value}-content`);
			const itemEl = getByTestId(`${item.value}-item`);
			expect(itemEl).toHaveAttribute("data-state", "closed");
			expect(itemEl).toHaveAttribute("data-state", "closed");
			expect(content).not.toBeVisible();
			trigger.focus();
			await user.keyboard(kbd.ENTER);
			const contentAfter = getByTestId(`${item.value}-content`);
			expect(contentAfter).toHaveTextContent(item.content);
			expect(itemEl).toHaveAttribute("data-state", "open");
		}
	});

	it("should expand when the trigger is focused and `Space` key is pressed", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionSingleTest as any, {
			items,
		});

		for (const item of items) {
			const trigger = getByTestId(`${item.value}-trigger`);
			const content = getByTestId(`${item.value}-content`);
			const itemEl = getByTestId(`${item.value}-item`);
			expect(itemEl).toHaveAttribute("data-state", "closed");
			expect(itemEl).toHaveAttribute("data-state", "closed");
			expect(content).not.toBeVisible();
			trigger.focus();
			await user.keyboard(kbd.SPACE);
			const contentAfter = getByTestId(`${item.value}-content`);
			expect(contentAfter).toHaveTextContent(item.content);
			expect(itemEl).toHaveAttribute("data-state", "open");
		}
	});

	it("should focus the next item when `ArrowDown` key is pressed", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionSingleTest as any, { items });

		const triggers = items.map((item) => getByTestId(`${item.value}-trigger`));
		triggers[0]?.focus();
		await user.keyboard(kbd.ARROW_DOWN);
		expect(triggers[1]).toHaveFocus();
		await user.keyboard(kbd.ARROW_DOWN);
		expect(triggers[2]).toHaveFocus();
		await user.keyboard(kbd.ARROW_DOWN);
		expect(triggers[3]).toHaveFocus();
		await user.keyboard(kbd.ARROW_DOWN);
		expect(triggers[0]).toHaveFocus();
	});

	it("should focus the previous item when the `ArrowUp` key is pressed", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionSingleTest as any, { items });

		const triggers = items.map((item) => getByTestId(`${item.value}-trigger`));
		triggers[0]?.focus();
		await user.keyboard(kbd.ARROW_UP);
		expect(triggers[3]).toHaveFocus();
		await user.keyboard(kbd.ARROW_UP);
		expect(triggers[2]).toHaveFocus();
		await user.keyboard(kbd.ARROW_UP);
		expect(triggers[1]).toHaveFocus();
		await user.keyboard(kbd.ARROW_UP);
		expect(triggers[0]).toHaveFocus();
	});

	it("should focus the first item when the `Home` key is pressed", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionSingleTest as any, { items });

		const triggers = items.map((item) => getByTestId(`${item.value}-trigger`));

		for (const trigger of triggers) {
			trigger.focus();
			await user.keyboard(kbd.HOME);
			expect(triggers[0]).toHaveFocus();
		}
	});

	it("should focus the last item when the `End` key is pressed", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionSingleTest as any, { items });

		const triggers = items.map((item) => getByTestId(`${item.value}-trigger`));

		for (const trigger of triggers) {
			trigger.focus();
			await user.keyboard(kbd.END);
			expect(triggers[3]).toHaveFocus();
		}
	});

	it("should respect the `disabled` prop for items", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionSingleTest as any, { items: itemsWithDisabled });

		const triggers = items.map((item) => getByTestId(`${item.value}-trigger`));
		await user.click(triggers[0] as HTMLElement);

		await user.keyboard(kbd.ARROW_DOWN);
		expect(triggers[1]).not.toHaveFocus();
		expect(triggers[2]).toHaveFocus();
	});

	it("should respect the `level` prop for headers", async () => {
		const itemsWithLevel = items.map((item, i) => {
			if (i === 0) {
				return { ...item, level: 1 } as const;
			}
			return item;
		});
		const { getByTestId } = render(AccordionSingleTest as any, { items: itemsWithLevel });

		const headers = items.map((item) => getByTestId(`${item.value}-header`));
		expect(headers[0]).toHaveAttribute("data-heading-level", "1");
		expect(headers[0]).toHaveAttribute("aria-level", "1");
		expect(headers[1]).toHaveAttribute("data-heading-level", "3");
		expect(headers[1]).toHaveAttribute("aria-level", "3");
	});

	it("should update the `bind:value` prop when the value changes", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionSingleTestControlledSvelte as any, { items });
		const trigger = getByTestId("item-1-trigger");

		const value = getByTestId("value");

		expect(value).toHaveTextContent("");

		await user.click(trigger);
		expect(value).toHaveTextContent("item-1");
	});

	it('should handle programatic changes to the "value" prop', async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionSingleTestControlledSvelte as any, { items });
		const updateButton = getByTestId("update-value");
		const value = getByTestId("value");

		expect(value).toHaveTextContent("");

		const itemTwoItem = getByTestId("item-2-item");
		expect(itemTwoItem).toHaveAttribute("data-state", "closed");

		await user.click(updateButton);
		expect(value).toHaveTextContent("item-2");
		expect(itemTwoItem).toHaveAttribute("data-state", "open");
	});
});

//
// MULTIPLE ACCORDION
//

describe("accordion - multiple", () => {
	it("should have no accessibility violations", async () => {
		const { container } = render(AccordionMultiTest as any, { items });
		expect(await axe(container)).toHaveNoViolations();
	});

	it("should have expected data attributes", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionMultiTest as any, { items: itemsWithDisabled });
		const itemEls = items.map((item) => getByTestId(`${item.value}-item`));
		const triggerEls = items.map((item) => getByTestId(`${item.value}-trigger`));

		expect(itemEls[0]).toHaveAttribute("data-state", "closed");
		expect(itemEls[0]).not.toHaveAttribute("data-disabled");
		expect(triggerEls[0]).toHaveAttribute("data-state", "closed");
		expect(triggerEls[0]).not.toHaveAttribute("data-disabled");

		await user.click(triggerEls[0] as HTMLElement);
		await waitFor(() => expect(triggerEls[0]).toHaveAttribute("data-state", "open"));
		expect(itemEls[0]).toHaveAttribute("data-state", "open");

		expect(itemEls[1]).toHaveAttribute("data-disabled");
		expect(triggerEls[1]).toHaveAttribute("data-disabled");
	});

	it("should disable everything when the `disabled` prop is true", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionMultiTest as any, {
			items,
			disabled: true,
		});

		const triggerEls = items.map((item) => getByTestId(`${item.value}-trigger`));
		await user.click(triggerEls[0] as HTMLElement);
		expect(triggerEls[0]).not.toHaveAttribute("data-state", "open");
		expect(triggerEls[0]).toHaveAttribute("data-disabled");

		await user.click(triggerEls[1] as HTMLElement);
		expect(triggerEls[1]).not.toHaveAttribute("data-state", "open");
		expect(triggerEls[1]).toHaveAttribute("data-disabled");

		await user.click(triggerEls[2] as HTMLElement);
		expect(triggerEls[2]).not.toHaveAttribute("data-state", "open");
		expect(triggerEls[2]).toHaveAttribute("data-disabled");
	});

	it("should display content when an item is expanded", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionMultiTest as any, { items });

		for (const item of items) {
			const trigger = getByTestId(`${item.value}-trigger`);
			const content = getByTestId(`${item.value}-content`);
			const itemEl = getByTestId(`${item.value}-item`);
			expect(itemEl).toHaveAttribute("data-state", "closed");
			expect(itemEl).toHaveAttribute("data-state", "closed");
			expect(content).not.toBeVisible();
			await user.click(trigger);
			const contentAfter = getByTestId(`${item.value}-content`);
			expect(contentAfter).toHaveTextContent(item.content);

			await waitFor(() => expect(itemEl).toHaveAttribute("data-state", "open"));
		}
	});

	it("should allow expanding multiple items", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionMultiTest as any, {
			items,
		});

		for (const item of items) {
			const trigger = getByTestId(`${item.value}-trigger`);
			const content = getByTestId(`${item.value}-content`);
			const itemEl = getByTestId(`${item.value}-item`);
			expect(itemEl).toHaveAttribute("data-state", "closed");
			expect(content).not.toBeVisible();
			await user.click(trigger);
			const contentAfter = getByTestId(`${item.value}-content`);
			expect(contentAfter).toHaveTextContent(item.content);
			expect(itemEl).toHaveAttribute("data-state", "open");
		}
		const openItems = Array.from(
			document.querySelectorAll("[data-state='open'][data-accordion-item]")
		);
		expect(openItems.length).toBe(4);
	});

	it("should expand when the trigger is focused and `Enter` key is pressed", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionMultiTest as any, {
			items,
		});

		for (const item of items) {
			const trigger = getByTestId(`${item.value}-trigger`);
			const content = getByTestId(`${item.value}-content`);
			const itemEl = getByTestId(`${item.value}-item`);
			expect(itemEl).toHaveAttribute("data-state", "closed");
			expect(itemEl).toHaveAttribute("data-state", "closed");
			expect(content).not.toBeVisible();
			trigger.focus();
			await user.keyboard(kbd.ENTER);
			const contentAfter = getByTestId(`${item.value}-content`);
			expect(contentAfter).toHaveTextContent(item.content);
			expect(itemEl).toHaveAttribute("data-state", "open");
		}
	});

	it("should expand when the trigger is focused and `Space` key is pressed", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionMultiTest as any, {
			items,
		});

		for (const item of items) {
			const trigger = getByTestId(`${item.value}-trigger`);
			const content = getByTestId(`${item.value}-content`);
			const itemEl = getByTestId(`${item.value}-item`);
			expect(itemEl).toHaveAttribute("data-state", "closed");
			expect(itemEl).toHaveAttribute("data-state", "closed");
			expect(content).not.toBeVisible();
			trigger.focus();
			await user.keyboard(kbd.SPACE);
			await sleep(19);
			const contentAfter = getByTestId(`${item.value}-content`);
			expect(contentAfter).toHaveTextContent(item.content);
			expect(itemEl).toHaveAttribute("data-state", "open");
		}
	});

	it("should focus the next item when `ArrowDown` key is pressed", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionMultiTest as any, { items });

		const triggers = items.map((item) => getByTestId(`${item.value}-trigger`));
		triggers[0]?.focus();
		await user.keyboard(kbd.ARROW_DOWN);
		expect(triggers[1]).toHaveFocus();
		await user.keyboard(kbd.ARROW_DOWN);
		expect(triggers[2]).toHaveFocus();
		await user.keyboard(kbd.ARROW_DOWN);
		expect(triggers[3]).toHaveFocus();
		await user.keyboard(kbd.ARROW_DOWN);
		expect(triggers[0]).toHaveFocus();
	});

	it("should focus the previous item when the `ArrowUp` key is pressed", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionMultiTest as any, { items });

		const triggers = items.map((item) => getByTestId(`${item.value}-trigger`));
		triggers[0]?.focus();
		await user.keyboard(kbd.ARROW_UP);
		expect(triggers[3]).toHaveFocus();
		await user.keyboard(kbd.ARROW_UP);
		expect(triggers[2]).toHaveFocus();
		await user.keyboard(kbd.ARROW_UP);
		expect(triggers[1]).toHaveFocus();
		await user.keyboard(kbd.ARROW_UP);
		expect(triggers[0]).toHaveFocus();
	});

	it("should focus the first item when the `Home` key is pressed", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionMultiTest as any, { items });

		const triggers = items.map((item) => getByTestId(`${item.value}-trigger`));

		for (const trigger of triggers) {
			trigger.focus();
			await user.keyboard(kbd.HOME);
			expect(triggers[0]).toHaveFocus();
		}
	});

	it("should focus the last item when the `End` key is pressed", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionMultiTest as any, { items });

		const triggers = items.map((item) => getByTestId(`${item.value}-trigger`));

		for (const trigger of triggers) {
			trigger.focus();
			await user.keyboard(kbd.END);
			expect(triggers[3]).toHaveFocus();
		}
	});

	it("should respect the `disabled` prop for items", async () => {
		const user = setupUserEvents();
		const { getByTestId } = render(AccordionMultiTest as any, { items: itemsWithDisabled });

		const triggers = items.map((item) => getByTestId(`${item.value}-trigger`));
		await user.click(triggers[0] as HTMLElement);

		await user.keyboard(kbd.ARROW_DOWN);
		expect(triggers[1]).not.toHaveFocus();
		expect(triggers[2]).toHaveFocus();
	});

	it("should respect the `level` prop for headers", async () => {
		const itemsWithLevel = items.map((item, i) => {
			if (i === 0) {
				return { ...item, level: 1 } as const;
			}
			return item;
		});
		const { getByTestId } = render(AccordionMultiTest as any, { items: itemsWithLevel });

		const headers = items.map((item) => getByTestId(`${item.value}-header`));
		expect(headers[0]).toHaveAttribute("data-heading-level", "1");
		expect(headers[0]).toHaveAttribute("aria-level", "1");
		expect(headers[1]).toHaveAttribute("data-heading-level", "3");
		expect(headers[1]).toHaveAttribute("aria-level", "3");
	});

	it("should update the `bind:value` prop when the value changes", async () => {
		const user = setupUserEvents();
		const { getByTestId, queryByTestId } = render(AccordionMultiTestControlled as any, {
			items,
		});
		const trigger = getByTestId("item-1-trigger");

		const value = getByTestId("value");

		expect(value).toHaveTextContent("");

		await user.click(trigger);
		expect(queryByTestId("value")).toHaveTextContent("item-1");
	});

	it('should handle programatic changes to the "value" prop', async () => {
		const user = setupUserEvents();
		const { getByTestId, queryByTestId } = render(AccordionMultiTestControlled as any, {
			items,
		});
		const updateButton = getByTestId("update-value");
		const value = getByTestId("value");

		expect(value).toHaveTextContent("");

		const itemTwoItem = getByTestId("item-2-item");
		expect(itemTwoItem).toHaveAttribute("data-state", "closed");
		await user.click(updateButton);
		expect(itemTwoItem).toHaveAttribute("data-state", "open");
	});
});
