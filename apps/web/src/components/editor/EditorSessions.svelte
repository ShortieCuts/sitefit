<script lang="ts">
	import { getSvelteContext } from 'src/store/editor';
	import { slide } from 'svelte/transition';
	import { InfoPopover } from 'ui';
	import UserChip from '../auth/UserChip.svelte';

	let { broker } = getSvelteContext();

	const { sessions, mySessionUid } = broker;
</script>

<div
	class="flex flex-row transition-all"
	class:mr-8={$sessions.length > 1 && !$sessions[0].ghost && !$sessions[1].ghost}
>
	{#each $sessions as session}
		{#if session.uid !== $mySessionUid && !session.ghost}
			<div
				transition:slide={{ duration: 200, axis: 'x' }}
				class="session -mr-6 hover:-mr-2 last:hover:-mr-6 last:hover:ml-0 hover:ml-4 transition-all hover:z-10 hover:shadow-xl rounded-full relative"
			>
				<UserChip userId={session.userId} ringColor={session.color} />
			</div>
		{/if}
	{/each}
</div>
