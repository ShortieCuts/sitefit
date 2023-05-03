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
	import { writable } from 'svelte/store';

	let mode: '' | 'insert' = '';

	const { broker, editor } = getSvelteContext();

	const { mobileToolMode } = editor ?? { mobileToolMode: writable('') };

	const activeDialog = editor?.activeDialog ?? writable('');
</script>

{#if $isMobile && $mobileToolMode == ''}
	<div
		class="editor-mobile-bottom-bar-container fixed bottom-4 left-0 right-0 pointer-events-none h-14 flex flex-row items-center justify-center z-40"
	>
		<div
			class="editor-mobile-bottom-bar bg-white rounded-lg flex flex-row h-12 pointer-events-auto shadow-lg"
		>
			<button
				class="flex flex-1 justify-center items-center w-16 text-xl"
				on:click={() => {
					window.location.href = '/';
				}}
			>
				<Fa icon={faHome} />
			</button>
			<button
				class:text-blue-500={$activeDialog == ''}
				class="flex flex-1 justify-center items-center w-16 text-xl"
				on:click={() => {
					editor.activateDialog('');
				}}
			>
				<Fa icon={faEarth} />
			</button>
			<button class="flex flex-1 justify-center items-center w-16 text-xl" on:click={() => {}}>
				<Fa icon={faCog} />
			</button>
			<button
				class="flex flex-1 justify-center items-center w-16 text-xl"
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
					<button on:click={() => {}}><Fa icon={faFileUpload} /> Import New CAD to App</button>
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
