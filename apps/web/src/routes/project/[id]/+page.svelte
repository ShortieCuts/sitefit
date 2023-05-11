<script lang="ts">
	import { page } from '$app/stores';
	import EditorScaffold from 'src/components/editor/EditorScaffold.svelte';
	import type { PageData } from './$types';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	export let data: PageData;

	$: projectId = $page.params.id;

	$: accessToken = $page.url.searchParams.get('token') ?? undefined;

	onMount(() => {
		if (accessToken) {
			if (browser) {
				history.replaceState({}, '', location.pathname);
			}
		}
	});
</script>

{#if browser}
	{#key projectId}
		<EditorScaffold {projectId} {accessToken} />
	{/key}
{/if}
