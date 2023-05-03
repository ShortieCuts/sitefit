<script lang="ts">
	import {
		faAdd,
		faArrowLeft,
		faArrowPointer,
		faArrowsLeftRight,
		faArrowsUpDown,
		faBackward,
		faCog,
		faComment,
		faCopy,
		faDirections,
		faEarth,
		faExclamationCircle,
		faExclamationTriangle,
		faFileImport,
		faHome,
		faInfoCircle,
		faLayerGroup,
		faLocationArrow,
		faPaste,
		faPlus,
		faRotateLeft,
		faRotateRight,
		faSearch,
		faShare,
		faTrash
	} from '@fortawesome/free-solid-svg-icons';
	import { fade, slide, fly } from 'svelte/transition';
	import type { AuthState } from 'auth';
	import { createEditorContext, createProjectBroker, setSvelteContext } from 'src/store/editor';

	import Fa from 'svelte-fa';

	import Popover from 'svelte-smooth-popover/Popover.svelte';
	import UserDropChip from '../auth/UserDropChip.svelte';
	import EditorToolbar from './EditorToolbar.svelte';
	import { isMobile } from 'src/store/responsive';
	import EditorNavbar from './EditorNavbar.svelte';
	import { dialogs } from './dialogs';
	import EditorSessions from './EditorSessions.svelte';
	import EditorMap from './EditorMap.svelte';
	import { onDestroy, onMount } from 'svelte';
	import { processCadUploads } from '$lib/client/api';
	import { refreshData } from 'src/store/cads';
	import LocationInput from './common/LocationInput.svelte';
	import LocationMap from './common/LocationMap.svelte';
	import { Cornerstone, makeObject } from 'core';
	import { get } from 'svelte/store';
	import EditorProperties from './EditorProperties.svelte';
	import { browser } from '$app/environment';
	import MobileBar from '../nav/MobileBar.svelte';
	import EditorMobileControls from './EditorMobileControls.svelte';
	import { flip } from 'svelte/animate';
	import ContextMenu from './common/ContextMenu.svelte';

	export let auth: AuthState;
	export let projectId: string;

	let midEl: HTMLElement;

	let broker = createProjectBroker(projectId);
	let editorContext = createEditorContext(broker);

	setSvelteContext(broker, editorContext);

	const { name } = broker.metadata;
	const { loading, error, connected } = broker;

	const { geo, heading } = broker.watchCornerstone();

	const { activeDialog, effectiveSelection, toasts } = editorContext;

	let needsCornerstone = false;

	function checkCornerstone() {
		if (!broker.connected || !get(broker.synced)) {
			needsCornerstone = false;
			return;
		}
		needsCornerstone = !broker.project.objectsMap.has('_cornerstone');
	}

	checkCornerstone();

	broker.objectTreeWatcher.subscribe(() => {
		checkCornerstone();
	});

	broker.connected.subscribe((connected) => {
		checkCornerstone();
	});

	let fileDragging = false;
	let fileEl: HTMLInputElement | null = null;

	let location: [number, number, number] = [0, 0, 0];

	function handleKeyboardShortcut(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
			return;
		}

		if (e.code == 'KeyZ' && e.ctrlKey) {
			if (e.shiftKey) {
				broker.commitRedo();
			} else {
				broker.commitUndo();
			}
		}

		if (e.code == 'Delete') {
			editorContext.deleteSelection(broker);
		}

		if (e.code == 'KeyS' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			e.stopPropagation();
			editorContext.info('Changes are saved automatically.');
		}

		console.log(e.code, e.ctrlKey, e.metaKey);

		if (e.code == 'KeyG' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			e.stopPropagation();
			editorContext.groupSelection();
		}
	}

	function createCornerstone() {
		let transaction = broker.project.createTransaction();
		let obj = new Cornerstone();
		obj.id = '_cornerstone';
		obj.name = 'Cornerstone';
		obj.geo = [location[0], location[1]];
		obj.heading = location[2];
		transaction.create(obj);
		broker.commitTransaction(transaction);
	}

	function doCopy() {
		document.execCommand('copy'); // Async clipboard API doesn't allow us to use a custom mime type
	}

	async function doPaste() {
		try {
			let items = await navigator.clipboard.read();
			for (let item of items) {
				console.log(item);
				for (let type of item.types) {
					if (type == 'cad-mapper/objects') {
						item.getType(type).then((blob) => {
							blob.text().then((text) => {
								pasteRawData(text);
							});
						});
					}
				}
			}
		} catch (e) {
			editorContext.alert('Paste failed, please use Ctrl/Cmd+V instead.');
		}
	}

	function onCopy(e: ClipboardEvent) {
		if (e.clipboardData) {
			let data: { objects: any[] } = { objects: [] };
			for (let key of $effectiveSelection) {
				let obj = broker.project.objectsMap.get(key);
				if (!obj) continue;

				data.objects.push(obj.serialize());
			}
			e.clipboardData.setData('cad-mapper/objects', JSON.stringify(data));

			e.preventDefault();
		}
	}

	function onCut(e: ClipboardEvent) {
		if (e.clipboardData) {
			let data: { objects: any[] } = { objects: [] };
			for (let key of $effectiveSelection) {
				let obj = broker.project.objectsMap.get(key);
				if (!obj) continue;

				data.objects.push(obj.serialize());
			}
			e.clipboardData.setData('cad-mapper/objects', JSON.stringify(data));

			editorContext.deleteSelection(broker);

			e.preventDefault();
		}
	}

	function pasteRawData(data: string) {
		let idMap = new Map<string, string>();
		let objects = JSON.parse(data).objects;
		let transaction = broker.project.createTransaction();
		let newSelection = [];
		for (let obj of objects) {
			let id = broker.allocateId(newSelection);
			newSelection.push(id);
			idMap.set(obj.id, id);
		}

		for (let obj of objects) {
			let inst = makeObject(obj);
			if (inst) {
				inst.deserialize(obj);

				inst.id = idMap.get(inst.id) as string;
				if (inst.parent) {
					if (idMap.has(inst.parent)) {
						inst.parent = idMap.get(inst.parent);
					} else {
						inst.parent = undefined;
					}
				}

				transaction.create(inst);
			}
		}
		broker.commitTransaction(transaction);

		editorContext.selection.set(newSelection);
		editorContext.computeEffectiveSelection(broker);
		editorContext.rootGroup.set(null);
	}

	function onPaste(e: ClipboardEvent) {
		if (e.clipboardData) {
			let data = e.clipboardData.getData('cad-mapper/objects');
			if (data) {
				pasteRawData(data);
			}
		}
	}

	onMount(() => {
		if (browser) {
			document.addEventListener('copy', onCopy);
			document.addEventListener('paste', onPaste);
			document.addEventListener('cut', onCut);
		}
	});

	onDestroy(() => {
		console.log('disposing editor scaffold');
		if (browser) {
			document.removeEventListener('copy', onCopy);
			document.removeEventListener('paste', onPaste);
			document.removeEventListener('cut', onCut);
		}
		broker.dispose();
	});
</script>

<svelte:head>
	<title>{$name}</title>
</svelte:head>

<div class="editor-scaffold h-full flex flex-col select-none">
	{#if !$isMobile}
		<div class="editor-bar h-16 min-h-[4rem] bg-white flex flex-row border-b-[1px] border-gray-200">
			<div class="editor-bar-left flex-1 justify-start flex flex-row items-center pl-2">
				<div class="flex flex-row">
					<div class="flex flex-row items-center cursor-pointer">
						<img src="/logo.svg" class=" h-10" alt="logo" />
						<Popover
							showOnClick={true}
							hideOnExternalClick
							caretBg="#f3f4f6"
							offset={10}
							caretCurveAmount={1}
							caretWidth={20}
							alignAnchor="top-right"
						>
							<div
								class="shadow-xl bg-white border-gray-100 border-2 space-y-2 rounded-lg min-w-[150px] overflow-hidden"
							>
								<a
									href="/"
									data-sveltekit-reload
									class="flex flex-row items-center px-4 py-1 hover:bg-gray-100 text-sm"
								>
									<div class="icon-sm mr-2"><Fa icon={faArrowLeft} /></div>
									Back to projects
								</a>
								<a
									href="/new"
									class="flex flex-row items-center px-4 py-1 hover:bg-gray-100 text-sm"
								>
									<div class="icon-sm mr-2"><Fa icon={faPlus} /></div>
									New Project
								</a>
							</div>
						</Popover>
					</div>
				</div>
			</div>
			<div
				class="editor-bar-center flex-1 justify-center flex-row items-center px-2 hidden md:flex"
			>
				<div
					class="search-bar relative h-10 w-60 lg:w-96 shadow-style rounded-lg border-[1px] border-gray-300 flex flex-row items-center"
				>
					<input
						class="absolute top-0 left-0 right-0 bottom-0 pl-8 rounded-lg outline-none"
						placeholder="Search (by Address, CAD name, Project name)"
					/>
					<Fa class="pointer-events-none text-1xl absolute z-10 ml-2" icon={faSearch} />
				</div>
				<button class="btn btn-icon-only w-10 h-10 flex items-center pr-0 text-xl ml-3 shadow-style"
					><Fa icon={faLocationArrow} /></button
				>
			</div>
			<div
				class="editor-bar-center flex-1 justify-end flex flex-row items-center my-auto space-x-4 h-8 pr-4"
			>
				<button
					class="btn shadow-style"
					on:click={() => editorContext.activateDialog('comments')}
					class:active={$activeDialog == 'comments'}
				>
					<Fa icon={faComment} /> Comments</button
				>
				<button
					class="btn shadow-style"
					on:click={() => editorContext.activateDialog('share')}
					class:active={$activeDialog == 'share'}><Fa icon={faShare} /> Share</button
				>
				<div class="flex flex-row">
					<EditorSessions />
					<UserDropChip {auth} />
				</div>
			</div>
		</div>
	{/if}
	<div class="editor-main bg-black h-full flex flex-row">
		{#if !$isMobile}
			<div class="editor-sidebar bg-white w-16 border-r-[1px] border-gray-200 z-20">
				<EditorNavbar />
			</div>
			{#if !$isMobile && $activeDialog && (dialogs[$activeDialog]?.dock ?? 'left') === 'left'}
				<div
					transition:fly={{ duration: 200, x: -400, opacity: 0 }}
					class="dialog-slide bg-white w-[400px] fixed left-16 top-16 bottom-0 z-10 border-gray-200 border-t-[1px]"
				>
					<svelte:component this={dialogs[$activeDialog].component} />
				</div>
			{/if}
		{/if}
		<div class="editor-viewport h-full w-full relative">
			{#if !$isMobile}
				<EditorToolbar />
			{:else}
				<div class="hidden">
					<EditorToolbar />
				</div>
				<div class="editor-mobile-sidebar absolute top-4 left-0 right-0 h-8 z-10">
					<EditorNavbar />
				</div>
				<MobileBar />
				<EditorMobileControls />
			{/if}

			<div
				class="h-full"
				bind:this={midEl}
				on:dragenter={(e) => {
					e.preventDefault();
					e.stopPropagation();
					fileDragging = true;
				}}
				on:dragover={(e) => {
					e.preventDefault();
					e.stopPropagation();
					fileDragging = true;
				}}
				on:drop={async (e) => {
					e.preventDefault();
					e.stopPropagation();
					fileDragging = false;

					if (e.dataTransfer && fileEl) {
						const files = e.dataTransfer.files;

						fileEl.files = files;

						await processCadUploads(editorContext, fileEl.files);

						await refreshData();
					}
				}}
				on:dragleave={(e) => {
					e.preventDefault();
					e.stopPropagation();
					fileDragging = false;
				}}
			>
				{#key `${$geo[0]},${$geo[1]},${$heading}`}
					<EditorMap />
				{/key}

				<ContextMenu el={midEl}>
					{#if $effectiveSelection.length > 0}
						<button on:click={doCopy}><Fa icon={faCopy} /> Copy </button>
						<button on:click={doPaste}><Fa icon={faPaste} /> Paste </button>
						<div class="my-2 w-full border-b border-gray-200" />
						<button
							on:click={() => {
								editorContext.flipSelection(true, false);
							}}
							><Fa icon={faArrowsLeftRight} /> Flip Left/Right
						</button>
						<button
							on:click={() => {
								editorContext.flipSelection(false, true);
							}}
							><Fa icon={faArrowsUpDown} /> Flip Up/Down
						</button>

						<button
							on:click={() => {
								editorContext.rotateSelection(Math.PI / 4);
							}}
							><Fa icon={faRotateRight} /> Spin +45°
						</button>
						<button
							on:click={() => {
								editorContext.rotateSelection(-Math.PI / 4);
							}}
							><Fa icon={faRotateLeft} /> Spin -45°
						</button>
						<div class="my-2 w-full border-b border-gray-200" />

						<button
							on:click={() => {
								editorContext.groupSelection();
							}}><Fa icon={faLayerGroup} /> Group Selection</button
						>
						<button
							on:click={() => {
								editorContext.deleteSelection(broker);
							}}><Fa icon={faTrash} /> Delete</button
						>
					{:else}
						<button on:click={doPaste}><Fa icon={faPaste} /> Paste </button>
					{/if}
				</ContextMenu>
			</div>
		</div>
		{#if !$isMobile && $activeDialog && (dialogs[$activeDialog]?.dock ?? 'left') === 'right'}
			<div
				transition:fly={{ duration: 200, x: 40, opacity: 0 }}
				class="dialog-slide bg-white w-[400px] fixed right-0 top-16 bottom-0 z-20 border-gray-200 border-t-[1px]"
			>
				<svelte:component this={dialogs[$activeDialog].component} />
			</div>
		{/if}
	</div>
</div>

{#if !$isMobile && $effectiveSelection.length > 0}
	<div
		transition:fly={{ duration: 200, y: 40, opacity: 0 }}
		class="dialog-slide bg-white w-[300px] fixed right-10 bottom-10 z-20 h-auto border-gray-200 border shadow-lg rounded-lg"
	>
		<EditorProperties />
	</div>
{/if}

<div
	class="toasts w-[300px] fixed bottom-10 z-20 h-auto rounded-lg space-y-2 px-2 transition-all"
	style="right: {!$isMobile && $effectiveSelection.length > 0 ? '340px' : '2.5rem'}"
>
	{#each $toasts as toast (toast.id)}
		<div
			animate:flip={{ duration: 200 }}
			in:fly={{
				y: 100
			}}
			out:fly={{
				y: -100
			}}
			class="rounded-md bg-white border border-gray-200 flex flex-row shadow-md cursor-pointer"
			on:click={() => ($toasts = $toasts.filter((t) => t.id !== toast.id))}
			on:keydown={(e) => {
				if (e.key === 'Enter') {
					$toasts = $toasts.filter((t) => t.id !== toast.id);
				}
			}}
		>
			<div
				class="flex-shrink-0 w-14 bg-gray-200 flex items-center justify-center text-lg opacity-50"
				class:text-black={toast.type === 'info'}
				class:text-yellow-500={toast.type === 'warn'}
				class:text-red-500={toast.type === 'error'}
			>
				<Fa
					icon={toast.type === 'error'
						? faExclamationTriangle
						: toast.type === 'info'
						? faInfoCircle
						: toast.type === 'warn'
						? faExclamationCircle
						: faInfoCircle}
				/>
			</div>
			<div class="p-2" style="line-height: 1em">
				{toast.message}
			</div>
		</div>
	{/each}
</div>

{#if !$isMobile && $activeDialog && (dialogs[$activeDialog]?.dock ?? 'left') === 'center'}
	<div
		transition:fade={{ duration: 100 }}
		class="fixed top-0 left-0 right-0 bottom-0 z-20 bg-black bg-opacity-75 flex justify-center items-center"
		on:click={() => editorContext.activateDialog('')}
		on:keydown={(e) => {
			if (e.key === 'Escape') {
				editorContext.activateDialog('');
			}
		}}
	>
		<div
			on:click|stopPropagation={() => {}}
			on:keydown={() => {}}
			transition:fly={{
				y: 20
			}}
			class="dialog-slide bg-white w-[450px] h-80 fixed z-30 rounded-lg border-gray-200 border-t-[1px]"
		>
			<svelte:component this={dialogs[$activeDialog].component} />
		</div>
	</div>
{/if}

{#if $isMobile && $activeDialog}
	<div class="dialog-slide fixed top-0 bottom-0 left-0 right-0 z-30 pointer-events-none">
		<svelte:component this={dialogs[$activeDialog].component} />
	</div>
{/if}

<svelte:window
	on:keydown={(e) => {
		if ((e.code == 'KeyS' || e.code == 'KeyG') && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
		}
	}}
	on:keyup={(e) => {
		if (e.key === 'Escape') {
			if ($activeDialog && (dialogs[$activeDialog]?.dock ?? 'left') === 'center') {
				editorContext.activateDialog('');
			}
		} else {
			handleKeyboardShortcut(e);
		}
	}}
/>

{#if !$connected}
	<div
		transition:fade={{ duration: 200 }}
		class="fixed top-0 left-0 right-0 bottom-0 bg-gray-100 bg-opacity-25 flex items-center justify-center flex-col z-50 backdrop-blur-md"
	>
		<img src="/logo.svg" alt="logo" class="opacity-20" style="filter: grayscale(1)" />
		<div class="text-2xl text-gray-400 mt-4">Connecting</div>
	</div>
{/if}

{#if $loading}
	<div
		transition:fade={{ duration: 200 }}
		class="fixed top-0 left-0 right-0 bottom-0 bg-gray-100 flex items-center justify-center flex-col z-50"
	>
		<img src="/logo.svg" alt="logo" class="opacity-20" style="filter: grayscale(1)" />
		<div class="text-2xl text-gray-400 mt-4">Loading</div>
	</div>
{/if}

{#if $error !== null}
	<div
		transition:fade={{ duration: 200 }}
		class="fixed top-0 left-0 right-0 bottom-0 bg-gray-100 flex items-center justify-center flex-col z-50"
	>
		<img src="/logo.svg" alt="logo" class="opacity-20" style="filter: grayscale(1)" />
		<div class="text-2xl text-red-400 mt-4">Error</div>
		<div class="text-xl text-gray-400 mt-4">{$error}</div>
		<div class="absolute top-4 right-4">
			<UserDropChip {auth} />
		</div>
	</div>
{/if}

<input type="file" accept=".dwg" bind:this={fileEl} style="display: none" on:change={() => {}} />

{#if fileDragging}
	<div
		transition:fade={{ duration: 200 }}
		class="fixed top-0 left-0 right-0 bottom-0 bg-gray-100 bg-opacity-20 flex items-center justify-center flex-col z-50 pointer-events-none"
	>
		<Fa class="text-black text-opacity-50 text-4xl" icon={faFileImport} />
		<div class="text-2xl text-black text-opacity-50 mt-4">Drop file to import</div>
	</div>
{/if}

{#if needsCornerstone}
	<div
		transition:fade={{ duration: 100 }}
		class="fixed top-0 left-0 right-0 bottom-0 z-20 bg-black bg-opacity-75 flex justify-center items-center
		"
	>
		<div
			on:click|stopPropagation={() => {}}
			on:keydown={() => {}}
			transition:fly={{
				y: 20
			}}
			class="dialog-slide bg-white fixed z-30 rounded-lg flex flex-col lg:flex-row min-h-[400px] w-full h-full sm:w-auto sm:h-auto"
		>
			<div class="flex-1 flex flex-col px-4">
				<h2 class="flex mx-auto p-6 text-lg">Let's choose a site location.</h2>
				<LocationInput bind:value={location} />
				<button class="btn btn-primary mt-auto mb-4" on:click={createCornerstone}>
					Continue
				</button>
			</div>
			<div class="flex-1 h-[400px] overflow-hidden rounded-r-lg aspect-square relative">
				<div
					class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-20 origin-center"
				>
					<div class="w-[1000px] border-b-black border-b absolute" />
					<div class="h-[1000px] border-r-black border-r absolute" />
				</div>
				<LocationMap bind:location />
			</div>
		</div>
	</div>
{/if}
