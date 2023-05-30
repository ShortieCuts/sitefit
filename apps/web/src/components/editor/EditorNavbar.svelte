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
		faSearch,
		faTools
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
			name: 'Projects',
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
			icon: 'tools',
			key: 'tools',
			name: 'Tools',
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
			key: 'tools',
			name: 'Tools',
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
			icon: 'arrow',
			key: 'location',
			name: 'Location',
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

	$: navbarItems = $isMobile ? navbarItemsMobile : navbarItemsDesktop;
</script>

{#if $isMobile}
	<div
		class="editor-toolbar flex md:flex-col w-full rounded-lg justify-center space-x-1 md:space-y-2 md:space-x-4 px-4"
	>
		{#each navbarItems as item}
			{#if compareAccess(item.access, $sessionAccess) && ((item.user && $auth.user) || !item.user)}
				<button
					class="btn btn-icon-only shadow-md text-black w-10 h-10 flex items-center justify-center hover:bg-blue-400 cursor-default"
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
