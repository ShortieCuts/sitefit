<script lang="ts">
	import { browser } from '$app/environment';
	import { compareAccess } from '$lib/util/access';
	import {
		faArrowPointer,
		faBox,
		faComment,
		faFile,
		faHand,
		faLayerGroup,
		faLocationArrow,
		faPaintBrush,
		faPallet,
		faPersonCirclePlus,
		faProjectDiagram,
		faRedo,
		faSearch,
		faTools,
		faUndo
	} from '@fortawesome/free-solid-svg-icons';
	import { auth } from 'src/store/auth';
	import { getSvelteContext, type ProjectAccessLevel } from 'src/store/editor';
	import { isMobile } from 'src/store/responsive';
	import { onMount } from 'svelte';

	import Fa from 'svelte-fa';
	import type { IconName } from '../icon/icon';
	import Icon from '../icon/Icon.svelte';

	type NavItem = {
		icon: IconName;
		key: string;
		name: string;
		access: ProjectAccessLevel;
		user: boolean;
	};

	const navbarItemsDesktop: NavItem[] = [
		{
			icon: 'map',
			key: 'projects',
			name: 'Sites',
			access: 'READ',
			user: true
		},
		{
			icon: 'document',
			key: 'cads',
			name: 'CAD Files',
			access: 'READ',
			user: true
		},
		{
			icon: 'insert',
			key: 'tools',
			name: 'Insert',
			access: 'WRITE',
			user: false
		},
		{
			icon: 'tools',
			key: 'measure',
			name: 'Measure',
			access: 'WRITE',
			user: false
		},
		{
			icon: 'layers',
			key: 'layers',
			name: 'Layers',
			access: 'READ',
			user: false
		},
		{
			icon: 'palette',
			key: 'style',
			name: 'Style',
			access: 'WRITE',
			user: false
		},
		{
			icon: 'parcels',
			key: 'parcels',
			name: 'Parcels',
			access: 'WRITE',
			user: false
		}
	];

	const navbarItemsMobile: NavItem[] = [
		{
			icon: 'parcels',
			key: 'parcels',
			name: 'Parcels',
			access: 'WRITE',
			user: false
		},

		{
			icon: 'tools',
			key: 'measure',
			name: 'Measure',
			access: 'WRITE',
			user: false
		},

		{
			icon: 'palette',
			key: 'style',
			name: 'Style',
			access: 'WRITE',
			user: false
		},

		{
			icon: 'comment',
			key: 'comments',
			name: 'Comments',
			access: 'READ',
			user: false
		},
		{
			icon: 'invite',
			key: 'share',
			name: 'Share',
			access: 'READ',
			user: false
		},
		{
			icon: 'search',
			key: 'search',
			name: 'Search',
			access: 'READ',
			user: false
		}
	];

	const { editor, broker } = getSvelteContext();

	let { activeDialog } = editor;
	let { sessionAccess } = broker;
	const { undo, redo } = broker;

	$: navbarItems = $isMobile ? navbarItemsMobile : navbarItemsDesktop;
</script>

{#if $isMobile}
	<div
		class="editor-toolbar inset-top flex md:flex-col w-full rounded-lg justify-center space-x-1 md:space-y-2 md:space-x-0 px-4 md:w-16"
	>
		<button
			class="btn btn-icon-only shadow-md text-black w-10 h-10 flex items-center justify-center active:bg-blue-400 cursor-default"
			style="border-radius: .7rem"
			class:disabled={$undo.length === 0}
			on:click={() => {
				broker.commitUndo();
			}}
		>
			<svg
				style="transform:scale(3)"
				xmlns="http://www.w3.org/2000/svg"
				height="24px"
				viewBox="0 0 24 24"
				width="24px"
				fill="#000000"
				><path d="M0 0h24v24H0V0z" fill="none" /><path
					d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"
				/></svg
			>
		</button>

		<button
			class="btn btn-icon-only shadow-md text-black w-10 h-10 flex items-center justify-center active:bg-blue-400 cursor-default"
			style="border-radius: .7rem"
			class:disabled={$redo.length === 0}
			on:click={() => {
				broker.commitRedo();
			}}
		>
			<svg
				style="transform:scale(3)"
				xmlns="http://www.w3.org/2000/svg"
				height="24px"
				viewBox="0 0 24 24"
				width="24px"
				fill="#000000"
				><path d="M0 0h24v24H0V0z" fill="none" /><path
					d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"
				/></svg
			>
		</button>
		{#each navbarItems as item}
			{#if compareAccess(item.access, $sessionAccess) && ((item.user && $auth.user) || !item.user)}
				<button
					class="btn btn-icon-only shadow-md text-black w-10 h-10 flex items-center justify-center active:bg-blue-400 cursor-default"
					style="border-radius: .7rem"
					class:active={$activeDialog === item.key}
					on:click={() => {
						editor.activateDialog(item.key);
					}}
				>
					<Icon icon={item.icon} />
				</button>
			{/if}
		{/each}
	</div>
{:else}
	<div class="editor-toolbar flex flex-col w-full rounded-lg justify-between space-y-2">
		{#each navbarItems as item}
			{#if compareAccess(item.access, $sessionAccess) && ((item.user && $auth.user) || !item.user)}
				<button
					class="text-black w-16 min-h-[4rem] py-2 flex flex-col text-sm items-center justify-center hover:bg-gray-200 cursor-default"
					class:bg-gray-100={$activeDialog === item.key}
					on:click={() => {
						editor.activateDialog(item.key);
					}}
				>
					<span class="text-2xl"><Icon icon={item.icon} /> </span>
					<span class="max-w-[60px] mt-1">{item.name}</span>
				</button>
			{/if}
		{/each}
	</div>
{/if}

<style lang="scss">
	.inset-top {
		margin-top: calc(env(safe-area-inset-top, 0.5rem) - 0.5rem);
	}
</style>
