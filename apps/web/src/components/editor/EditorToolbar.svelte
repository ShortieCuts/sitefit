<script lang="ts">
	import { browser } from '$app/environment';
	import { faArrowPointer, faComment, faHand } from '@fortawesome/free-solid-svg-icons';
	import {
		EditorContext,
		getSvelteContext,
		ProjectBroker,
		type ProjectAccessLevel
	} from 'src/store/editor';
	import { onMount } from 'svelte';

	import Fa from 'svelte-fa';
	import { dialogs } from './dialogs';
	import { CommentTool } from './tools/comment';
	import { PanTool } from './tools/pan';
	import { PenTool } from './tools/pen';
	import { SelectTool } from './tools/select';
	import { TextTool } from './tools/text';
	import { compareAccess } from '$lib/util/access';
	import { MeasurementTool } from './tools/measure';
	import { AreaTool } from './tools/area';
	import { SmartTool } from './tools/smart';
	import { ShapeTool } from './tools/shape';
	import { InfoPopover } from 'ui';
	import { get } from 'svelte/store';

	const toolbarItems: {
		icon: any;
		key: string;
		shortcut: string;
		access: ProjectAccessLevel;
		hidden?: boolean;
		commit?: (editor: EditorContext, broker: ProjectBroker) => void;
		cancel?: (editor: EditorContext, broker: ProjectBroker) => void;
		onDown: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => void;
		onUp: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => void;
		onMove: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => void;
	}[] = [
		PanTool,
		SelectTool,
		CommentTool,
		PenTool,
		TextTool,
		MeasurementTool,
		AreaTool,
		SmartTool,
		ShapeTool
	];

	const { editor, broker } = getSvelteContext();

	let { activeTool, activeDialog } = editor;
	let { sessionAccess } = broker;

	$: shiftRight = $activeDialog && (dialogs[$activeDialog]?.dock ?? 'left') === 'left';

	$: {
		activeTool;

		let tool = toolbarItems.find((item) => item.key === $activeTool);

		if (tool) {
			if (editor.currentToolHandlers) {
				editor.currentToolHandlers.onUp(new MouseEvent('mouseup'), editor, broker);
				editor.currentToolHandlers.commit(editor, broker);
			}

			editor.currentToolHandlers = {
				onDown: tool.onDown,
				onUp: tool.onUp,
				onMove: tool.onMove,
				commit: tool.commit ?? ((editor, broker) => {}),
				cancel: tool.cancel ?? ((editor, broker) => {})
			};
		} else {
			editor.currentToolHandlers = null;
		}
	}

	let lastPanKey = 'select';

	function handleKeyDown(event: KeyboardEvent) {
		let currentEl = event.target as HTMLElement;

		if (event.ctrlKey || event.altKey || event.metaKey) {
			return;
		}

		if (currentEl.tagName === 'INPUT' || currentEl.tagName === 'TEXTAREA') {
			return;
		}

		const item = toolbarItems.find((item) => item.shortcut === event.key);

		if (item) {
			editor.activeTool.set(item.key);
			editor.stagingComment.set(null);
		}

		if (event.key === ' ') {
			event.preventDefault();
			if ($activeTool != 'pan') {
				lastPanKey = $activeTool;
				editor.activeTool.set('pan');
			}
		}

		if (event.key === 'Enter' || event.key === ' ') {
			if (editor.currentToolHandlers) {
				editor.currentToolHandlers.commit(editor, broker);
			}
			editor.activeTool.set('select');
		} else if (event.key === 'Escape') {
			if (editor.currentToolHandlers) {
				editor.currentToolHandlers.cancel(editor, broker);
			}
			let activeToolNow = get(editor.activeTool);
			if (activeToolNow == 'select') {
				if (get(editor.selection).length > 0) {
					editor.deselectAll();
				} else {
					editor.activeTool.set('pan');
				}
			} else if (activeToolNow == 'pan') {
				if (get(editor.selection).length > 0) {
					editor.deselectAll();
				}
			}
		}
	}

	$: {
		$activeTool;
		editor.guides.set({
			lines: [],
			points: []
		});
	}

	function handleKeyUp(event: KeyboardEvent) {
		let currentEl = event.target as HTMLElement;

		if (event.ctrlKey || event.altKey || event.metaKey) {
			return;
		}
		if (currentEl.tagName === 'INPUT' || currentEl.tagName === 'TEXTAREA') {
			return;
		}

		if (event.key === ' ') {
			event.preventDefault();
			editor.activeTool.set(lastPanKey);
		}
	}
</script>

<svelte:window on:keydown={handleKeyDown} on:keyup={handleKeyUp} />

<div
	class="editor-toolbar flex flex-col rounded-lg absolute top-4 left-4 space-y-2 transition-all z-10"
	style={shiftRight ? `left: calc(400px + 1rem);` : ``}
>
	{#each toolbarItems as item}
		{#if !item.hidden}
			{#if compareAccess(item.access, $sessionAccess)}
				<button
					class="text-white w-10 h-10 flex items-center justify-center rounded-lg hover:bg-blue-400 cursor-default bg-black bg-opacity-30"
					class:bg-blue-500={$activeTool === item.key}
					style={$activeTool === item.key ? '--tw-bg-opacity: 1' : ''}
					on:click={() => {
						editor.activeTool.set(item.key);
						editor.stagingComment.set(null);
					}}
				>
					<Fa icon={item.icon} />
					<InfoPopover>
						{item.key == 'select' ? 'Edit Mode' : 'Navigate Mode'}
					</InfoPopover>
				</button>
			{/if}
		{/if}
	{/each}
</div>
