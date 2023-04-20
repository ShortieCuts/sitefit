<script lang="ts">
	import { getSvelteContext } from 'src/store/editor';
	import { ObjectProperties, type ObjectProperty } from 'core';

	const { broker, editor } = getSvelteContext();

	const { effectiveSelection } = editor;

	$: firstSelected =
		$effectiveSelection.length > 0 ? broker.project.objectsMap.get($effectiveSelection[0]) : null;

	let properties: ObjectProperty[] = [];

	$: {
		let propertiesMap = new Map<string, ObjectProperty>();
		for (const id of $effectiveSelection) {
			const object = broker.project.objectsMap.get(id);
			if (object) {
				let type = object.type;
				for (let p of ObjectProperties[type]) {
					propertiesMap.set(p.name, p);
				}
			}
		}

		properties = [];
		for (let p of propertiesMap.values()) {
			properties.push(p);
		}
	}
</script>

<div class="pb-2">
	<div class="bg-gray-200 px-4 py-1 rounded-t-lg">
		{#if $effectiveSelection.length == 1}
			{firstSelected?.name ?? 'Unnamed object'}
		{:else}
			{$effectiveSelection.length} selected objects
		{/if}
	</div>
	{#each properties as prop}
		<div>
			{prop.name}
		</div>
	{/each}
	<div />
</div>

<style lang="scss">
	:global(.prop-row) {
		display: grid;
		grid-template-columns: repeat(24, 1fr);
		grid-template-rows: 32px;
		align-items: center;
	}
</style>
