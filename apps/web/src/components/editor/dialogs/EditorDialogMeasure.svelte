<script lang="ts">
	import DialogSlideUp from 'src/components/common/DialogSlideUp.svelte';
	import ResponsiveGroup from 'src/components/common/ResponsiveGroup.svelte';

	import { getSvelteContext } from 'src/store/editor';

	const { editor, broker } = getSvelteContext();

	const measurementFontSize = broker.writableGlobalProperty<number>('measurementFontSize', 1);
</script>

<DialogSlideUp>
	<!-- <ResponsiveGroup groups={['Measure']}> -->
	<div class="flex flex-col p-4 space-y-4">
		<button
			class="flex flex-row items-center rounded-md border border-gray-200 p-2 hover:bg-gray-50"
			on:click={() => {
				editor.activeTool.set('measurement');
				editor.activeToolFlags.set({
					measureSegment: true
				});
				editor.activateDialog('');
			}}
		>
			<img src="/img/distance-segment.png" class="max-w-[32px]" alt="Distance ft" />
			<div class="ml-4">Measure Distance</div>
		</button>
		<button
			class="flex flex-row items-center rounded-md border border-gray-200 p-2 hover:bg-gray-50"
			on:click={() => {
				editor.activeTool.set('measurement');
				editor.activeToolFlags.set({
					measureSegment: false
				});
				editor.activateDialog('');
			}}
		>
			<img src="/img/distance.png" class="max-w-[32px]" alt="Distance ft" />
			<div class="ml-4">Measure Perimeter</div>
		</button>
		<button
			class="flex flex-row items-center rounded-md border border-gray-200 p-2 hover:bg-gray-50"
			on:click={() => {
				editor.activeTool.set('area');
				editor.activateDialog('');
			}}
		>
			<img src="/img/area.png" class="max-w-[32px]" alt="Distance ft" />
			<div class="ml-4">Measure Area</div>
		</button>
	</div>

	<div class="border-gray-200 border rounded-md mx-4 flex flex-row h-6 flex-shrink-0">
		<span
			class="flex-shrink-0 h-full min-w-20 overflow-hidden overflow-ellipsis bg-gray-200 capitalize text-sm flex items-center justify-start rounded-l pl-1 pr-2"
		>
			Default Measurement Font Size
		</span>
		<input
			class="w-full px-1"
			type="number"
			value={$measurementFontSize * 10}
			on:change={(e) => {
				$measurementFontSize = e.target.value / 10;
			}}
			min="0"
			max="1000"
		/>
	</div>
	<!-- </ResponsiveGroup> -->
</DialogSlideUp>

<style lang="scss">
	:global(.max-svg > svg) {
		width: 100%;
		height: 100%;
	}
</style>
