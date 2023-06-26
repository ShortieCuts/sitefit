<script lang="ts">
	import { page } from '$app/stores';
	import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
	import { isMobile } from 'src/store/responsive';
	import Fa from 'svelte-fa';
</script>

{#if $isMobile}
	<div class="tab-group shadow-md">
		<a
			class="tab-btn text-lg"
			class:tab-btn-active={$page.route.id == '/projects'}
			href="/projects"
		>
			Sites
		</a>
		<a class="tab-btn text-lg" class:tab-btn-active={$page.route.id == '/files'} href="/files"
			>CADs</a
		>
	</div>
{/if}
