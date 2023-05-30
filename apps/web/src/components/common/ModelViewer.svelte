<script lang="ts">
	import { browser } from '$app/environment';
	import ModelViewerInternal from './ModelViewerInternal.svelte';

	export let fileId: string;
</script>

{#if browser}
	<ModelViewerInternal {fileId} />
{/if}
