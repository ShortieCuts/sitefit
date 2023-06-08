<script lang="ts">
	import { isMobile } from 'src/store/responsive';

	export let groups: string[] = [];

	export let activeGroup: string = groups[0];

	$: slotCount = groups.length;
</script>

{#if $isMobile}
	<div class="flex flex-row overflow-x-auto flex-nowrap justify-center space-x-4 no-scrollbars">
		{#each groups as group}
			<button
				class="flex flex-row items-center justify-center px-4 py-1 bg-white border-gray-600 border-[1px] rounded-md cursor-pointer"
				class:bg-gray-600={activeGroup === group}
				class:text-blue-500={activeGroup === group}
				on:click={() => (activeGroup = group)}
			>
				{group}
			</button>
		{/each}
	</div>
	{#if slotCount >= 1 && activeGroup === groups[0]}
		<slot name="group-0" />
	{/if}

	{#if slotCount >= 2 && activeGroup === groups[1]}
		<slot name="group-1" />
	{/if}

	{#if slotCount >= 3 && activeGroup === groups[2]}
		<slot name="group-2" />
	{/if}

	{#if slotCount >= 4 && activeGroup === groups[3]}
		<slot name="group-3" />
	{/if}

	{#if slotCount >= 5 && activeGroup === groups[4]}
		<slot name="group-4" />
	{/if}

	{#if slotCount >= 6 && activeGroup === groups[5]}
		<slot name="group-5" />
	{/if}

	{#if slotCount >= 7 && activeGroup === groups[6]}
		<slot name="group-6" />
	{/if}
{:else}
	{#if slotCount >= 1}
		<div class="flex flex-row items-center">
			<div class="bg-gray-200 h-[2px] flex-1" />
			<div class="mx-2 font-bold">{groups[0]}</div>
			<div class="bg-gray-200 h-[2px] flex-1" />
		</div>
		<slot name="group-0" />
	{/if}

	{#if slotCount >= 2}
		<div class="flex flex-row items-center">
			<div class="bg-gray-200 h-[2px] flex-1" />
			<div class="mx-2 font-bold">{groups[1]}</div>
			<div class="bg-gray-200 h-[2px] flex-1" />
		</div>
		<slot name="group-1" />
	{/if}

	{#if slotCount >= 3}
		<div class="flex flex-row items-center">
			<div class="bg-gray-200 h-[2px] flex-1" />
			<div class="mx-2 font-bold">{groups[2]}</div>
			<div class="bg-gray-200 h-[2px] flex-1" />
		</div>
		<slot name="group-2" />
	{/if}

	{#if slotCount >= 4}
		<div class="flex flex-row items-center">
			<div class="bg-gray-200 h-[2px] flex-1" />
			<div class="mx-2 font-bold">{groups[3]}</div>
			<div class="bg-gray-200 h-[2px] flex-1" />
		</div>
		<slot name="group-3" />
	{/if}

	{#if slotCount >= 5}
		<div class="flex flex-row items-center">
			<div class="bg-gray-200 h-[2px] flex-1" />
			<div class="mx-2 font-bold">{groups[4]}</div>
			<div class="bg-gray-200 h-[2px] flex-1" />
		</div>
		<slot name="group-4" />
	{/if}

	{#if slotCount >= 6}
		<div class="flex flex-row items-center">
			<div class="bg-gray-200 h-[2px] flex-1" />
			<div class="mx-2 font-bold">{groups[5]}</div>
			<div class="bg-gray-200 h-[2px] flex-1" />
		</div>
		<slot name="group-5" />
	{/if}

	{#if slotCount >= 7}
		<div class="flex flex-row items-center">
			<div class="bg-gray-200 h-[2px] flex-1" />
			<div class="mx-2 font-bold">{groups[6]}</div>
			<div class="bg-gray-200 h-[2px] flex-1" />
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
