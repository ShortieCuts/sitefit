<script lang="ts">
	import { browser } from '$app/environment';
	import {
		faArrowPointer,
		faBox,
		faComment,
		faFile,
		faHand,
		faLocationArrow,
		faPersonCirclePlus,
		faProjectDiagram,
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
			icon: faBox,
			key: 'parcels',
			name: 'Parcels'
		}
	];

	const navbarItemsMobile = [
		{
			icon: faComment,
			key: 'comments',
			name: 'Comments'
		},
		{
			icon: faLocationArrow,
			key: 'location',
			name: 'Location'
		},
		{
			icon: faPersonCirclePlus,
			key: 'share',
			name: 'Share'
		}
	];

	const { editor } = getSvelteContext();

	let { activeDialog } = editor;

	$: navbarItems = $isMobile ? [...navbarItemsDesktop, ...navbarItemsMobile] : navbarItemsDesktop;
</script>

<div
	class="editor-toolbar flex flex-row md:flex-col justify-center w-full rounded-lg space-x-2 md:space-y-2"
>
	{#each navbarItems as item}
		<button
			class="btn btn-icon-only shadow-md text-black w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-400 cursor-default"
			class:bg-blue-500={$activeDialog === item.key}
			on:click={() => {
				editor.activateDialog(item.key);
			}}
		>
			<Fa icon={item.icon} />
		</button>
	{/each}
</div>
