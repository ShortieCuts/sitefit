<script lang="ts">
	import { isMobile } from 'src/store/responsive';

	export let groups: string[] = [];
	export let hide: `group-${0 | 1 | 2 | 3 | 4 | 5 | 6}`[] = [];

	export let activeGroup: string = groups[0];

	$: slotCount = groups.length;
</script>

{#if $isMobile}
	<div class="flex flex-row overflow-x-auto flex-nowrap no-scrollbars">
		{#each groups as group}
			<button
				class="flex flex-row items-center justify-center first:ml-auto mx-2 last:mr-auto px-4 py-1 bg-white border-gray-600 border-[1px] rounded-md cursor-pointer"
				class:bg-gray-600={activeGroup === group}
				class:text-blue-500={activeGroup === group}
				on:click={() => (activeGroup = group)}
			>
				{group}
			</button>
		{/each}
	</div>
	{#if slotCount >= 1 && activeGroup === groups[0] && !hide.includes('group-0')}
		<slot name="group-0" />
	{/if}

	{#if slotCount >= 2 && activeGroup === groups[1] && !hide.includes('group-1')}
		<slot name="group-1" />
	{/if}

	{#if slotCount >= 3 && activeGroup === groups[2] && !hide.includes('group-2')}
		<slot name="group-2" />
	{/if}

	{#if slotCount >= 4 && activeGroup === groups[3] && !hide.includes('group-3')}
		<slot name="group-3" />
	{/if}

	{#if slotCount >= 5 && activeGroup === groups[4] && !hide.includes('group-4')}
		<slot name="group-4" />
	{/if}

	{#if slotCount >= 6 && activeGroup === groups[5] && !hide.includes('group-5')}
		<slot name="group-5" />
	{/if}

	{#if slotCount >= 7 && activeGroup === groups[6] && !hide.includes('group-6')}
		<slot name="group-6" />
	{/if}
{:else}
	{#if slotCount >= 1 && !hide.includes('group-0')}
		<div class="flex flex-row items-center">
			<div class="" />
			<div class="mx-2 ml-8 font-bold">{groups[0]}</div>
			<div class="" />
		</div>
		<slot name="group-0" />
	{/if}

	{#if slotCount >= 2 && !hide.includes('group-1')}
		<div class="flex flex-row items-center">
			<div class="" />
			<div class="mx-2 ml-8 font-bold">{groups[1]}</div>
			<div class="" />
		</div>
		<slot name="group-1" />
	{/if}

	{#if slotCount >= 3 && !hide.includes('group-2')}
		<div class="flex flex-row items-center">
			<div class="" />
			<div class="mx-2 ml-8 font-bold">{groups[2]}</div>
			<div class="" />
		</div>
		<slot name="group-2" />
	{/if}

	{#if slotCount >= 4 && !hide.includes('group-3')}
		<div class="flex flex-row items-center">
			<div class="" />
			<div class="mx-2 ml-8 font-bold">{groups[3]}</div>
			<div class="" />
		</div>
		<slot name="group-3" />
	{/if}

	{#if slotCount >= 5 && !hide.includes('group-4')}
		<div class="flex flex-row items-center">
			<div class="" />
			<div class="mx-2 ml-8 font-bold">{groups[4]}</div>
			<div class="" />
		</div>
		<slot name="group-4" />
	{/if}

	{#if slotCount >= 6 && !hide.includes('group-5')}
		<div class="flex flex-row items-center">
			<div class="" />
			<div class="mx-2 ml-8 font-bold">{groups[5]}</div>
			<div class="" />
		</div>
		<slot name="group-5" />
	{/if}

	{#if slotCount >= 7 && !hide.includes('group-6')}
		<div class="flex flex-row items-center">
			<div class="" />
			<div class="mx-2 ml-8 font-bold">{groups[6]}</div>
			<div class="" />
		</div>
		<slot name="group-6" />
	{/if}
{/if}

<style lang="scss">
	.no-scrollbars {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */

		&::-webkit-scrollbar {
			display: none; /* Chrome, Safari, Opera*/
		}
	}
</style>
