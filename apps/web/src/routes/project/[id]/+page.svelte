<script lang="ts">
	import { page } from '$app/stores';
	import EditorScaffold from 'src/components/editor/EditorScaffold.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	$: projectId = $page.params.id;
</script>

{#key projectId}
	<EditorScaffold auth={data.user} {projectId} />
{/key}
