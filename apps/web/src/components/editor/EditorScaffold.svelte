<script lang="ts">
	import {
		faArrowLeft,
		faArrowPointer,
		faBackward,
		faCog,
		faComment,
		faDirections,
		faFileImport,
		faLocationArrow,
		faPlus,
		faSearch,
		faShare
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
	import { onDestroy } from 'svelte';
	import { processCadUploads } from '$lib/client/api';
	import { refreshData } from 'src/store/cads';

	export let auth: AuthState;
	export let projectId: string;

	let broker = createProjectBroker(projectId);
	let editorContext = createEditorContext();

	setSvelteContext(broker, editorContext);

	const { name } = broker.metadata;
	const { loading, error, connected } = broker;

	const { activeDialog } = editorContext;

	let fileDragging = false;
	let fileEl: HTMLInputElement | null = null;

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
	}

	onDestroy(() => {
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
				<div class="editor-mobile-sidebar absolute top-4 left-0 right-0 h-8 z-10">
					<EditorNavbar />
				</div>
			{/if}

			<div
				class="h-full"
				on:dragenter={(e) => {
					e.preventDefault();
					e.stopPropagation();
					fileDragging = true;
					console.log('Enter');
				}}
				on:dragover={(e) => {
					e.preventDefault();
					e.stopPropagation();
					fileDragging = true;
					console.log('over');
				}}
				on:drop={async (e) => {
					e.preventDefault();
					e.stopPropagation();
					fileDragging = false;

					if (e.dataTransfer && fileEl) {
						const files = e.dataTransfer.files;

						fileEl.files = files;

						await processCadUploads(fileEl.files);

						await refreshData();
					}
					console.log('drop');
				}}
				on:dragleave={(e) => {
					e.preventDefault();
					e.stopPropagation();
					fileDragging = false;
					console.log('leave');
				}}
			>
				<EditorMap />
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
