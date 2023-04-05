<script lang="ts">
	import { browser } from '$app/environment';
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
	import { getSvelteContext } from 'src/store/editor';
	import { isMobile } from 'src/store/responsive';
	import { onMount } from 'svelte';

	import Fa from 'svelte-fa';

	const navbarItemsDesktop = [
		{
			icon: faProjectDiagram,
			key: 'projects',
			name: 'Projects'
		},
		{
			icon: faFile,
			key: 'cads',
			name: 'CAD Files'
		},
		{
			icon: faTools,
			key: 'tools',
			name: 'Tools'
		},
		{
			icon: faLayerGroup,
			key: 'layers',
			name: 'Layers'
		},
		{
			icon: faPaintBrush,
			key: 'style',
			name: 'Style'
		},
		{
			icon: faBox,
			key: 'parcels',
			name: 'Parcels'
		}
	];

	const navbarItemsMobile = [
		{
			icon: faBox,
			key: 'parcels',
			name: 'Parcels'
		},

		{
			icon: faTools,
			key: 'tools',
			name: 'Tools'
		},

		{
			icon: faPaintBrush,
			key: 'style',
			name: 'Style'
		},

		{
			icon: faComment,
			key: 'comments',
			name: 'Comments'
		},
		{
			icon: faPersonCirclePlus,
			key: 'share',
			name: 'Share'
		},
		{
			icon: faLocationArrow,
			key: 'location',
			name: 'Location'
		},
		{
			icon: faSearch,
			key: 'search',
			name: 'Search'
		}
	];

	const { editor } = getSvelteContext();

	let { activeDialog } = editor;

	$: navbarItems = $isMobile ? navbarItemsMobile : navbarItemsDesktop;
</script>

{#if $isMobile}
	<div class="editor-toolbar flex md:flex-col w-full rounded-lg justify-between md:space-y-2 px-4">
		{#each navbarItems as item}
			<button
				class="btn btn-icon-only shadow-md text-black w-10 h-10 flex items-center justify-center hover:bg-blue-400 cursor-default"
				style="border-radius: .7rem"
				class:active={$activeDialog === item.key}
				on:click={() => {
					editor.activateDialog(item.key);
				}}
			>
				<Fa icon={item.icon} />
			</button>
		{/each}
	</div>
{:else}
	<div class="editor-toolbar flex flex-col w-full rounded-lg justify-between space-y-2">
		{#each navbarItems as item}
			<button
				class="text-black w-16 min-h-[4rem] py-2 flex flex-col text-sm items-center justify-center hover:bg-gray-200 cursor-default"
				class:bg-gray-100={$activeDialog === item.key}
				on:click={() => {
					editor.activateDialog(item.key);
				}}
			>
				<span class="text-lg"><Fa icon={item.icon} /> </span>
				<span class="max-w-[60px] mt-1">{item.name}</span>
			</button>
		{/each}
	</div>
{/if}
