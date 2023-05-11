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

	const toolbarItems: {
		icon: any;
		key: string;
		shortcut: string;
		access: ProjectAccessLevel;
		onDown: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => void;
		onUp: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => void;
		onMove: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => void;
	}[] = [SelectTool, PanTool, CommentTool, PenTool, TextTool];

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
			}

			editor.currentToolHandlers = {
				onDown: tool.onDown,
				onUp: tool.onUp,
				onMove: tool.onMove
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
			</button>
		{/if}
	{/each}
</div>
