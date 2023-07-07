<script lang="ts">
	import type { PageData } from './$types';

	import { Project } from 'core';
	import { page } from '$app/stores';
	import ProjectCadNav from 'src/components/nav/ProjectCadNav.svelte';
	import AppLanding from 'src/components/nav/AppLanding.svelte';
	import DataView from 'src/components/common/DataView.svelte';
	import type { ListViewProject } from '$lib/types/project';
	import type { APIDataView } from '$lib/types/dataView';
	import { faFolderOpen, faPlus } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import ProjectListItem from 'src/components/project/ProjectListItem.svelte';
	import MobileBar from 'src/components/nav/MobileBar.svelte';
	import ProjectsView from 'src/components/common/ProjectsView.svelte';
	import { browser } from '$app/environment';
	import ProjectsViewAdmin from 'src/components/common/ProjectsViewAdmin.svelte';
	import { onMount } from 'svelte';
	import { checkLoginAndRedirect } from '$lib/client/login';
	export let data: PageData;

	onMount(() => {
		checkLoginAndRedirect();
	});
</script>

<AppLanding auth={data.user}>
	<h1 class="text-2xl mb-2">Admin view</h1>
	<div class="flex flex-col pb-20 alternate min-h-[100vh] relative">
		{#if browser}
			<ProjectsViewAdmin />
		{/if}
	</div>
	<MobileBar />
</AppLanding>

<style lang="scss">
	:global(.alternate > * > *:nth-child(odd)) {
		@apply bg-gray-50;
	}
	:global(.alternate > *) {
		@apply min-h-[100vh];
	}
</style>
