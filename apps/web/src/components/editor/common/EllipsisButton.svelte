<script lang="ts">
	import { faEllipsisH } from '@fortawesome/free-solid-svg-icons';
	import { isMobile } from 'src/store/responsive';
	import Fa from 'svelte-fa';
</script>

{#if !$isMobile}
	<button class="ellipsis-btn text-xl text-gray-400" data-context>
		<Fa icon={faEllipsisH} />
	</button>
{/if}

<style lang="scss">
	:global(.ellipsis-wrapper) {
		position: relative;
	}
	:global(.ellipsis-wrapper:hover .ellipsis-btn) {
		pointer-events: auto;
		opacity: 1;
	}

	.ellipsis-btn {
		position: absolute;
		right: 1rem;
		top: 50%;
		transform: translateY(-50%);
		opacity: 0;
		pointer-events: none;
	}
</style>
