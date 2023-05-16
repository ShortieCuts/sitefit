<script lang="ts">
	import type { LayoutData } from '../$types';

	import { Project } from 'core';
	import { page } from '$app/stores';
	import ProjectCadNav from 'src/components/nav/ProjectCadNav.svelte';
	import AppLanding from 'src/components/nav/AppLanding.svelte';
	import FilesView from 'src/components/common/FilesView.svelte';
	import { browser } from '$app/environment';
	import MobileBar from 'src/components/nav/MobileBar.svelte';

	export let data: LayoutData;
</script>

<AppLanding auth={data.user}>
	<div class="flex flex-col pb-20 alternate min-h-[100vh]">
		{#if browser}
			<FilesView />
		{/if}
	</div>
	<MobileBar />
</AppLanding>
