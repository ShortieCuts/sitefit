<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		faAdd,
		faCog,
		faEarth,
		faFileImport,
		faFileUpload,
		faFolderPlus,
		faHome,
		faUpload
	} from '@fortawesome/free-solid-svg-icons';
	import { isMobile } from 'src/store/responsive';

	import Fa from 'svelte-fa';
	import MobileDrawer from './MobileDrawer.svelte';
	import { fade } from 'svelte/transition';
	import { getSvelteContext } from 'src/store/editor';
	import { get, writable } from 'svelte/store';
	import ModelViewer from '../common/ModelViewer.svelte';

	let mode: '' | 'insert' | 'insertUpload' = '';

	const { broker, editor } = getSvelteContext();

	const { mobileToolMode } = editor ?? { mobileToolMode: writable('') };

	const activeDialog = editor?.activeDialog ?? writable('');

	if (editor) {
		editor.uploadStatus.subscribe((status) => {
			if (status == 'uploading') {
				mode = '';
			} else if (status == 'finished') {
				mode = 'insertUpload';
			}
		});
	}

	$: isHome = !editor;

	function handleBack(e: PopStateEvent) {
		if ($activeDialog !== '') {
			editor.activateDialog('');
		} else if (mode == 'insert') {
			mode = '';
		} else if (mode == 'insertUpload') {
			mode = '';
		} else {
			return;
		}
		e.preventDefault();
		e.stopPropagation();
	}
</script>

<svelte:window on:popstate={handleBack} />

{#if $isMobile && $mobileToolMode == ''}
	<div
		class="editor-mobile-bottom-bar-container fixed bottom-4 left-0 right-0 landscape:right-4 landscape:top-0 landscape:bottom-0 landscape:left-auto landscape:h-auto pointer-events-none h-14 flex flex-row items-center justify-center z-40"
	>
		<div
			class="editor-mobile-bottom-bar bg-white rounded-lg flex flex-row h-12 pointer-events-auto shadow-lg landscape:flex-col landscape:h-auto"
		>
			<button
				class="flex flex-1 justify-center items-center w-16 text-xl landscape:min-h-[64px]"
				on:click={() => {
					window.location.href = '/projects';
				}}
				class:text-blue-500={isHome}
			>
				<Fa icon={faHome} />
			</button>
			{#if !isHome}
				<button
					class:text-blue-500={$activeDialog == ''}
					class="flex flex-1 justify-center items-center w-16 text-xl landscape:min-h-[64px]"
					on:click={() => {
						if (get(editor.activeDialog) == '') {
							editor.flyHome();
						} else {
							editor.activateDialog('');
						}
					}}
				>
					<Fa icon={faEarth} />
				</button>
				<button
					class="flex flex-1 justify-center items-center w-16 text-xl landscape:min-h-[64px]"
					on:click={() => {}}
				>
					<Fa icon={faCog} />
				</button>
			{/if}
			<button
				class="flex flex-1 justify-center items-center w-16 text-xl landscape:min-h-[64px]"
				class:text-blue-500={$activeDialog == 'cads'}
				on:click={() => {
					if ($activeDialog == 'cads') {
						editor.activateDialog('');
					} else {
						mode = 'insert';
					}
				}}
			>
				<Fa icon={faAdd} />
			</button>
		</div>
	</div>

	{#if mode != ''}
		<div
			transition:fade={{ duration: 200 }}
			class="z-30 bg-black bg-opacity-60 fixed top-0 left-0 right-0 bottom-0"
			on:click={() => {
				mode = '';
			}}
			on:keydown={() => {}}
		/>
	{/if}

	{#if editor}
		{#if mode == 'insert'}
			<MobileDrawer>
				<div>
					<button
						on:click={() => {
							mode = '';
							editor.activateDialog('cads');
						}}><Fa icon={faFileImport} /> Place a CAD on map</button
					>
					<button
						on:click={() => {
							editor.openImportDialog();
						}}><Fa icon={faFileUpload} /> Import New CAD to App</button
					>
				</div>
				<div>
					<button
						on:click={() => {
							mode = '';
						}}
						class="text-blue-600"
						style="justify-content: center;">Cancel</button
					>
				</div>
			</MobileDrawer>
		{:else if mode == 'insertUpload'}
			<MobileDrawer>
				<div>
					<ModelViewer fileId={get(editor.uploadId)} />
				</div>
				<div>
					<button
						on:click={() => {
							mode = '';
							let position = editor.lonLatToPosition(get(editor.longitude), get(editor.latitude));
							broker.placeCad(get(editor.uploadId), position);
						}}><Fa icon={faFileImport} /> Place imported CAD</button
					>
				</div>
				<div>
					<button
						on:click={() => {
							mode = '';
						}}
						class="text-red-600"
						style="justify-content: center;">Skip</button
					>
				</div>
			</MobileDrawer>
		{/if}
	{:else if mode == 'insert'}
		<MobileDrawer>
			<div>
				<button on:click={() => {}}><Fa icon={faFileUpload} /> Import New CAD to App</button>
				<button on:click={() => {}}><Fa icon={faFolderPlus} /> New Folder</button>
			</div>
			<div>
				<button
					on:click={() => {
						mode = '';
					}}
					class="text-blue-600"
					style="justify-content: center;">Cancel</button
				>
			</div>
		</MobileDrawer>
	{/if}
{/if}
