<script lang="ts">
	import DialogSlideUp from 'src/components/common/DialogSlideUp.svelte';
	import ResponsiveGroup from 'src/components/common/ResponsiveGroup.svelte';

	import { getSvelteContext } from 'src/store/editor';

	const { editor } = getSvelteContext();
</script>

<DialogSlideUp>
	<ResponsiveGroup groups={['Measure']}>
		<div slot="group-0" class="flex flex-col p-4 space-y-4">
			<button
				class="flex flex-row items-center rounded-md border border-gray-200 p-2 hover:bg-gray-50"
				on:click={() => {
					editor.activeTool.set('measurement');
					editor.activateDialog('');
				}}
			>
				<img src="/img/distance.png" class="max-w-[32px]" alt="Distance ft" />
				<div class="ml-4">Distance/Perimeter</div>
			</button>
			<button
				class="flex flex-row items-center rounded-md border border-gray-200 p-2 hover:bg-gray-50"
				on:click={() => {
					editor.activeTool.set('area');
					editor.activateDialog('');
				}}
			>
				<img src="/img/area.png" class="max-w-[32px]" alt="Distance ft" />
				<div class="ml-4">Area</div>
			</button>
		</div>
	</ResponsiveGroup>
</DialogSlideUp>

<style lang="scss">
	:global(.max-svg > svg) {
		width: 100%;
		height: 100%;
	}
</style>
