<script lang="ts">
	import { getSvelteContext } from 'src/store/editor';
	import {
		Material,
		ObjectProperties,
		ProjectTransaction,
		type ObjectProperty,
		Object2D,
		ObjectType,
		Path,
		getSmartObject,
		smartObjectProps
	} from 'core';
	import Fa from 'svelte-fa';
	import { faAngleDown, faCompassDrafting } from '@fortawesome/free-solid-svg-icons';

	import ColorInput from './common/ColorInput.svelte';

	import { feetToMeters, metersToFeet } from '$lib/util/distance';

	export let showTransform = true;

	const { broker, editor } = getSvelteContext();

	const { effectiveSelection } = editor;
	const { transactionWatcher, sessionAccess } = broker;

	$: firstSelected =
		$effectiveSelection.length > 0 ? broker.project.objectsMap.get($effectiveSelection[0]) : null;

	let properties: ObjectProperty[] = [];

	let propertiesDisplay: {
		x: number | string;
		y: number | string;
		width: number | string;
		height: number | string;
		angle: number | string;
		style: Material;
		props: { [key: string]: any };
	} = {
		x: 0,
		y: 0,
		width: 0,
		height: 0,
		angle: 0,
		style: {
			type: 'color',
			color: [0, 0, 0, 1],
			filled: false,
			strokeWidth: 1
		},
		props: {}
	};

	let propertyMixedMap = new Map<string, boolean>();
	let propertyValueMap = new Map<string, any>();
	let showStyle = false;

	const LIKENESS_MARGIN = 0.01;
	function trackProperty(key: string, value: any) {
		if (typeof value === 'number') {
			if (propertyValueMap.has(key)) {
				if (Math.abs(propertyValueMap.get(key) - value) > LIKENESS_MARGIN) {
					propertyMixedMap.set(key, true);
				}
			} else {
				propertyValueMap.set(key, value);
			}
		} else {
			if (propertyValueMap.has(key)) {
				if (propertyValueMap.get(key) !== value) {
					propertyMixedMap.set(key, true);
				}
			} else {
				propertyValueMap.set(key, value);
			}
		}
	}

	function rad2deg(rad: number) {
		return (rad * 180) / Math.PI;
	}

	function deg2rad(deg: number) {
		return (deg * Math.PI) / 180;
	}

	function recalculateProperties() {
		propertyMixedMap = new Map<string, boolean>();
		propertyValueMap = new Map<string, any>();
		showStyle = true;

		let propertiesMap = new Map<string, ObjectProperty>();
		let propertiesMapCounter = new Map<string, number>();
		let hasSetInitialProperties = false;

		for (const id of $effectiveSelection) {
			const object = broker.project.objectsMap.get(id);
			if (object) {
				let type = object.type;
				for (let p of ObjectProperties[type]) {
					if (p.condition && !p.condition(object)) continue;
					propertiesMap.set(p.name, p);

					propertiesMapCounter.set(p.name, (propertiesMapCounter.get(p.name) || 0) + 1);
					trackProperty(p.name, (object as any)[p.name]);
				}

				if (object.type == ObjectType.Path) {
					let pathObject = object as Path;
					if (pathObject.smartObject) {
						if ($effectiveSelection.length == 1) {
							if (pathObject.smartObject == 'path') showStyle = false;
						}
						let smartObject = getSmartObject(pathObject.smartObject);
						if (smartObject) {
							let props = smartObjectProps(
								pathObject,
								pathObject.smartObject,
								pathObject.smartProperties ?? {}
							);
							for (let prop of Object.keys(smartObject.properties)) {
								let rprop = smartObject.properties[prop];
								let rval = props[prop];
								propertiesMap.set(`smartProperties.${prop}`, {
									...rprop.type,
									name: `smartProperties.${prop}`
								});
								propertiesMapCounter.set(
									`smartProperties.${prop}`,
									(propertiesMapCounter.get(`smartProperties.${prop}`) || 0) + 1
								);
								trackProperty(`smartProperties.${prop}`, rval);
							}
						}
					}
				}

				let bounds = object.getBounds();

				trackProperty('x', bounds.minX);
				trackProperty('y', bounds.minY);
				trackProperty('width', bounds.maxX - bounds.minX);
				trackProperty('height', bounds.maxY - bounds.minY);
				trackProperty('angle', object.transform.rotation);
				if (object.style) {
					trackProperty('style.type', object.style.type);
					trackProperty('style.color', object.style.color);
					trackProperty('style.pattern', object.style.pattern);
					trackProperty('style.accent', object.style.accent);
					trackProperty('style.filled', object.style.filled);
					trackProperty('style.strokeWidth', object.style.strokeWidth);
				}
			}
		}
		propertiesDisplay.props = {};

		properties = [];
		for (let p of propertiesMap.values()) {
			if (propertiesMapCounter.get(p.name) === $effectiveSelection.length) {
				properties.push(p);

				propertiesDisplay.props[p.name] = propertyMixedMap.get(p.name)
					? 'Mixed'
					: propertyValueMap.get(p.name);
			}
		}

		(propertiesDisplay.x = propertyMixedMap.get('x')
			? 'Mixed'
			: propertyValueMap.get('x')?.toFixed(2)),
			(propertiesDisplay.y = propertyMixedMap.get('y')
				? 'Mixed'
				: propertyValueMap.get('y')?.toFixed(2)),
			(propertiesDisplay.width = propertyMixedMap.get('width')
				? 'Mixed'
				: propertyValueMap.get('width')?.toFixed(2)),
			(propertiesDisplay.height = propertyMixedMap.get('height')
				? 'Mixed'
				: propertyValueMap.get('height')?.toFixed(2)),
			(propertiesDisplay.angle = propertyMixedMap.get('angle')
				? 'Mixed'
				: rad2deg(propertyValueMap.get('angle')).toFixed(2));

		propertiesDisplay.style = {
			type: propertyValueMap.get('style.type'),
			color: propertyValueMap.get('style.color'),
			pattern: propertyValueMap.get('style.pattern'),
			accent: propertyValueMap.get('style.accent'),
			filled: propertyValueMap.get('style.filled'),
			strokeWidth: propertyValueMap.get('style.strokeWidth')
		};
	}

	$: {
		$effectiveSelection;
		$transactionWatcher;
		recalculateProperties();
	}

	function doPropChange(prop: ObjectProperty): any {
		return (e: InputEvent) => {
			let existingVal = propertyValueMap.get(prop.name);

			let setTo: any = null;
			if (prop.type == 'number') {
				let num = parseFloat((e.target as HTMLInputElement).value);
				if (isNaN(num)) {
					recalculateProperties();
					return;
				}

				setTo = num;
			} else if (prop.type == 'angle') {
				let num = parseFloat((e.target as HTMLInputElement).value);
				if (isNaN(num)) {
					recalculateProperties();
					return;
				}

				setTo = deg2rad(num);
			} else if (prop.type == 'meters') {
				let num = parseFloat((e.target as HTMLInputElement).value);
				if (isNaN(num)) {
					recalculateProperties();
					return;
				}

				setTo = feetToMeters(num);
			} else if (prop.type == 'boolean') {
				setTo = (e.target as HTMLInputElement).checked;
			} else if (prop.type == 'string') {
				setTo = (e.target as HTMLInputElement).value;
			} else if ((prop.type = 'color-toggle')) {
				if (e.target && e.target instanceof HTMLInputElement) {
					setTo = {
						active: e.target.checked,
						value: existingVal.value
					};
				} else {
					setTo = {
						active: existingVal.active,
						value: e.detail
					};
				}
			}

			if (setTo !== null) {
				let transaction = broker.project.createTransaction();
				for (const id of $effectiveSelection) {
					const object = broker.project.objectsMap.get(id);
					if (object) {
						if (prop.name.includes('.')) {
							let parts = prop.name.split('.');
							let newVals: any = {
								...(object as any)[parts[0]]
							};
							newVals[parts[1]] = setTo;

							transaction.update(object.id, parts[0], newVals);
						} else {
							transaction.update(object.id, prop.name, setTo);
						}
					}
				}

				broker.commitTransaction(transaction);
			}
		};
	}

	function doTransformChange(prop: 'x' | 'y' | 'width' | 'height' | 'angle'): any {
		return (e: InputEvent) => {
			let value = parseFloat((e.target as HTMLInputElement).value);

			let oldValue = propertyValueMap.get(prop);
			if (isNaN(value)) {
				recalculateProperties();
				return;
			}

			let transaction = broker.project.createTransaction();
			for (const id of $effectiveSelection) {
				const object = broker.project.objectsMap.get(id);
				if (object) {
					let bounds = object.getBounds();
					let transform = object.transform;

					switch (prop) {
						case 'x':
							transaction.update(object.id, 'transform', {
								...transform,
								position: [transform.position[0] - (bounds.minX - value), transform.position[1]]
							});
							break;
						case 'y':
							transaction.update(object.id, 'transform', {
								...transform,
								position: [transform.position[0], transform.position[1] - (bounds.minY - value)]
							});
							break;
						case 'width':
							recalculateProperties();
							break;
						case 'height':
							recalculateProperties();
							break;
						case 'angle':
							transaction.update(object.id, 'transform', {
								...transform,
								rotation: deg2rad(value)
							});
							break;
					}
				}
			}

			broker.commitTransaction(transaction);
		};
	}

	let transactionDebounce: any;
	let lastStyleTransaction: ProjectTransaction | null = null;

	function doStyleChange(prop: keyof Material) {
		return (e: CustomEvent | InputEvent) => {
			let value: any;
			console.log(e);
			if (e.target) {
				value = (e.target as HTMLInputElement).value;
			} else {
				value = (e as CustomEvent).detail;
			}

			let oldValue = propertyValueMap.get('style.' + prop);
			if (value === oldValue) {
				return;
			}

			let transaction = broker.project.createTransaction();
			for (const id of $effectiveSelection) {
				const object = broker.project.objectsMap.get(id);
				if (object) {
					let style = object.style;

					switch (prop) {
						case 'type':
							transaction.update(object.id, 'style', {
								...style,
								type: value
							});
							break;
						case 'color':
							transaction.update(object.id, 'style', {
								...style,
								color: value
							});
							break;
						case 'pattern':
							transaction.update(object.id, 'style', {
								...style,
								pattern: value
							});
							break;
						case 'accent':
							transaction.update(object.id, 'style', {
								...style,
								accent: value
							});
							break;
						case 'filled':
							transaction.update(object.id, 'style', {
								...style,
								filled: value || value === 'true'
							});
							break;
						case 'strokeWidth':
							transaction.update(object.id, 'style', {
								...style,
								strokeWidth: parseFloat(value)
							});
							break;
					}
				}
			}

			lastStyleTransaction = transaction;
			clearTimeout(transactionDebounce);
			transactionDebounce = setTimeout(() => {
				if (lastStyleTransaction) broker.commitTransaction(lastStyleTransaction);
				lastStyleTransaction = null;
			}, 109);
		};
	}
</script>

{#if $sessionAccess == 'WRITE'}
	<div class="pb-2 select-none">
		<div class="bg-gray-200 px-4 py-1 rounded-t-lg">
			{#if $effectiveSelection.length == 1}
				{firstSelected?.name ?? 'Unnamed object'}
			{:else}
				{$effectiveSelection.length} selected objects
			{/if}
		</div>
		{#if showTransform}
			<div class="properties-transform flex flex-col space-y-2 p-2">
				<div class="flex flex-row space-x-2">
					<div class="flex-1 flex flex-row border border-gray-200 rounded-md hover:shadow-sm">
						<label for="props-x" class="mr-2 ml-1 w-4 flex items-center justify-center">X</label>
						<input
							id="props-x"
							class="w-full h-6 cursor-default"
							bind:value={propertiesDisplay.x}
							on:change={doTransformChange('x')}
						/>
					</div>
					<div class="flex-1 flex flex-row border border-gray-200 rounded-md hover:shadow-sm">
						<label for="props-w" class="mr-2 ml-1 w-4 flex items-center justify-center">W</label>
						<input
							id="props-w"
							class="w-full h-6 cursor-default"
							bind:value={propertiesDisplay.width}
							on:change={doTransformChange('width')}
						/>
					</div>
				</div>
				<div class="flex flex-row space-x-2">
					<div class="flex-1 flex flex-row border border-gray-200 rounded-md hover:shadow-sm">
						<label for="props-y" class="mr-2 ml-1 w-4 flex items-center justify-center">Y</label>
						<input
							id="props-y"
							class="w-full h-6 cursor-default"
							bind:value={propertiesDisplay.y}
							on:change={doTransformChange('y')}
						/>
					</div>
					<div class="flex-1 flex flex-row border border-gray-200 rounded-md hover:shadow-sm">
						<label for="props-h" class="mr-2 ml-1 w-4 flex items-center justify-center">H</label>
						<input
							id="props-h"
							class="w-full h-6 cursor-default"
							bind:value={propertiesDisplay.height}
							on:change={doTransformChange('height')}
						/>
					</div>
				</div>
				<div class="flex flex-row space-x-2">
					<div class="flex-1 flex flex-row border border-gray-200 rounded-md hover:shadow-sm">
						<label for="props-a" class="mr-2 ml-1 w-4 flex items-center justify-center"
							><Fa icon={faCompassDrafting} /></label
						>
						<input
							id="props-a"
							class="w-full cursor-default"
							bind:value={propertiesDisplay.angle}
							on:change={doTransformChange('angle')}
						/>
					</div>
					<div class="flex-1 flex flex-row" />
				</div>
			</div>
		{/if}
		{#if showStyle}
			<div class="border-b border-gray-200" />
			<div class="properties-style flex flex-col space-y-2 p-2">
				<div class="flex flex-row space-x-2 border-gray-200 rounded-md border p-1">
					<div>
						<ColorInput
							noVerticalBorder
							bind:value={propertiesDisplay.style.color}
							on:change={doStyleChange('color')}
						/>
					</div>
					<div class="flex-1 w-auto">
						<select
							class="border-gray-200 rounded-md border w-full"
							value={propertiesDisplay.style.filled?.toString() ?? 'false'}
							on:change={(e) => {
								doStyleChange('filled')(
									new CustomEvent('change', { detail: e.target.value == 'true' })
								);
							}}
						>
							<option value="false"> Line </option>
							<option value="true"> Filled </option>
						</select>
					</div>
					{#if !propertiesDisplay.style.filled}
						<input
							class="w-10 px-1 border border-gray-200 rounded-md h-6"
							type="text"
							bind:value={propertiesDisplay.style.strokeWidth}
							on:change={(e) => {
								doStyleChange('strokeWidth')(new CustomEvent('change', { detail: e.target.value }));
							}}
						/>
					{/if}
				</div>
			</div>
		{/if}
		{#if properties.length > 0}
			<div class="border-b border-gray-200" />
			<div class="space-y-2 mt-2">
				{#each properties as prop}
					<div class="border-gray-200 border rounded-md mx-2 flex flex-row h-6 flex-shrink-0">
						<span
							class="flex-shrink-0 h-full w-28 min-w-20 overflow-hidden overflow-ellipsis bg-gray-200 capitalize text-sm flex items-center justify-end pr-2"
						>
							{prop.name.startsWith('smartProperties') ? prop.name.slice(16) : prop.name}
						</span>
						{#if prop.type == 'string'}
							<input
								class="w-full px-1"
								type="text"
								bind:value={propertiesDisplay.props[prop.name]}
								on:change={doPropChange(prop)}
							/>
						{:else if prop.type == 'number'}
							<input
								class="w-full px-1"
								type="number"
								bind:value={propertiesDisplay.props[prop.name]}
								on:change={doPropChange(prop)}
							/>
						{:else if prop.type == 'meters'}
							<input
								class="w-full px-1"
								type="number"
								step={1 / 12}
								value={metersToFeet(propertiesDisplay.props[prop.name])}
								on:change={doPropChange(prop)}
							/>
						{:else if prop.type == 'angle'}
							<input
								class="w-full px-1"
								step="1"
								type="number"
								value={rad2deg(propertiesDisplay.props[prop.name])}
								on:change={doPropChange(prop)}
							/>
						{:else if prop.type == 'boolean'}
							<input
								class="ml-2 px-1"
								type="checkbox"
								checked={propertiesDisplay.props[prop.name]}
								on:change={doPropChange(prop)}
							/>
						{:else if prop.type == 'geo'}
							<input
								class="w-1/2 px-1"
								type="number"
								value={propertiesDisplay.props[prop.name][0]}
							/>
							<input
								class="w-1/2 px-1"
								type="number"
								value={propertiesDisplay.props[prop.name][1]}
							/>
						{:else if prop.type == 'color-toggle'}
							<div class="flex flex-row">
								<input
									class="ml-2 px-1 mr-2"
									type="checkbox"
									checked={propertiesDisplay.props[prop.name]?.active ?? false}
									on:change={doPropChange(prop)}
								/>
								<div
									class={propertiesDisplay.props[prop.name]?.active ?? false
										? ''
										: 'opacity-50 pointer-events-none line-through'}
								>
									<ColorInput
										noVerticalBorder
										value={propertiesDisplay.props[prop.name]?.value ?? [0, 0, 0, 1]}
										on:change={doPropChange(prop)}
									/>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
		<div />
	</div>
{:else}
	<div class="select-none">
		<div class="bg-gray-200 px-4 py-1 rounded-lg">
			{#if $effectiveSelection.length == 1}
				{firstSelected?.name ?? 'Unnamed object'}
			{:else}
				{$effectiveSelection.length} selected objects
			{/if}
		</div>
	</div>
{/if}

<style lang="scss">
	:global(.prop-row) {
		display: grid;
		grid-template-columns: repeat(24, 1fr);
		grid-template-rows: 32px;
		align-items: center;
	}

	:global(.color-picker .wrapper) {
		border: none !important;
	}
	:global(.color-picker input:focus-visible) {
		outline: none !important;
	}
</style>
