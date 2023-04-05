<script lang="ts">
	import DialogSlideUp from 'src/components/common/DialogSlideUp.svelte';
	import ResponsiveGroup from 'src/components/common/ResponsiveGroup.svelte';
	import { getSvelteContext } from 'src/store/editor';
	import type { ProjectMapStyle } from 'core';

	const { broker } = getSvelteContext();
	const mapStyle = broker.writableGlobalProperty<ProjectMapStyle>('mapStyle', 'google-satellite');
</script>

<DialogSlideUp>
	<ResponsiveGroup groups={['Map', 'Transparency', 'Colors', 'Thickness']}>
		<div
			slot="group-0"
			class="flex flex-row items-center justify-center space-x-16 py-8 select-none"
		>
			<button
				class="flex flex-col items-center"
				on:click={() => {
					$mapStyle = 'google-satellite';
				}}
			>
				<img
					src="/img/google-sat.png"
					alt="sat"
					class="rounded-xl hover:shadow-md hover:brightness-105 border-4 border-white [&.active]:border-blue-500"
					class:active={$mapStyle == 'google-satellite'}
				/>
				<b class="mt-2">Satellite</b>
			</button>
			<button
				class="flex flex-col items-center"
				on:click={() => {
					$mapStyle = 'google-simple';
				}}
			>
				<img
					src="/img/google-street.png"
					alt="street"
					class="rounded-xl hover:shadow-md hover:brightness-105 border-4 border-white [&.active]:border-blue-500"
					class:active={$mapStyle == 'google-simple'}
				/>
				<b class="mt-2">Simple</b>
			</button>
		</div>
		<div slot="group-1">Trans</div>
		<div slot="group-2" />
		<div slot="group-3" />
	</ResponsiveGroup>
</DialogSlideUp>
