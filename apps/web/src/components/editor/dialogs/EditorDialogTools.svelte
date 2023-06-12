<script lang="ts">
	import DialogSlideUp from 'src/components/common/DialogSlideUp.svelte';
	import ResponsiveGroup from 'src/components/common/ResponsiveGroup.svelte';

	import ShapeRightTurn from 'src/components/shapes/right_turn.svg?raw';
	import ShapeLeftTurn from 'src/components/shapes/left_turn.svg?raw';
	import ShapeArrow from 'src/components/shapes/arrow.svg?raw';
	import ShapeRoundabout from 'src/components/shapes/roundabout.svg?raw';

	import Stamp90Parking from 'src/components/stamps/90deg_parking.svg?raw';
	import Stamp45Parking from 'src/components/stamps/45deg_parking.svg?raw';

	import { getSvelteContext } from 'src/store/editor';
	import { Group, Material, Object2D, Path, SVG } from 'core';
	import createDOMPurify from 'dompurify';
	import { get } from 'svelte/store';
	import { onMount } from 'svelte';

	import { hexColorToArray } from '$lib/util/color';
	import { faArrowLeft, faArrowRight, faRulerHorizontal } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import { feetToMeters } from '$lib/util/distance';

	const { broker, editor } = getSvelteContext();

	type Shape = {
		name: string;
		svg: string;
	};
	type Stamp = {
		name: string;
		svg: string;
	};
	let stamps: Stamp[] = [
		{
			name: '90° Parking',
			svg: Stamp90Parking
		},
		{
			name: '45° Parking',
			svg: Stamp45Parking
		}
	];

	let shapes: Shape[] = [
		{
			name: 'Right Turn',
			svg: ShapeRightTurn
		},
		{
			name: 'Left Turn',
			svg: ShapeLeftTurn
		},
		{
			name: 'Arrow',
			svg: ShapeArrow
		},
		{
			name: 'Roundabout',
			svg: ShapeRoundabout
		}
	];

	function activateShape(shape: Shape) {
		editor.activeTool.set('shape');
		editor.activateDialog('');
		editor.activeSVG.set(shape.svg);
	}

	function insertShape(shape: Shape) {
		let transaction = broker.project.createTransaction();

		let id = broker.allocateId();
		let svg = new SVG();
		svg.id = id;
		svg.name = shape.name;

		svg.svg = shape.svg;
		svg.style = new Material();
		svg.style.color = [0, 0, 0, 1];
		const DOMPurify = createDOMPurify(window);

		let clean = DOMPurify.sanitize(svg.svg) as string;
		let wrapper = document.createElement('div');
		wrapper.innerHTML = clean;
		let svgElement = wrapper.querySelector('svg') as SVGElement;
		let width = svgElement.getAttribute('width');
		let height = svgElement.getAttribute('height');
		svg.sourceWidth = parseInt(width || '0');
		svg.sourceHeight = parseInt(height || '0');

		let viewBounds = get(editor.viewBounds);
		let location = [
			(viewBounds.minX + viewBounds.maxX) / 2,
			(viewBounds.minY + viewBounds.maxY) / 2
		];
		let viewWidth = viewBounds.maxX - viewBounds.minX;
		let viewHeight = viewBounds.maxY - viewBounds.minY;
		let scaleFactor = Math.min(viewWidth / svg.sourceWidth, viewHeight / svg.sourceHeight) / 64;
		svg.transform.size[0] = scaleFactor;
		svg.transform.size[1] = scaleFactor;
		svg.transform.position[0] = location[0] - (svg.sourceWidth / 2) * scaleFactor;
		svg.transform.position[1] = location[1] - (svg.sourceHeight / 2) * scaleFactor;
		transaction.create(svg);

		broker.commitTransaction(transaction);
	}

	function insertStamp(stamp: Stamp) {
		let transaction = broker.project.createTransaction();
		let id = broker.allocateId();
		let wrapper = document.createElement('div');
		wrapper.innerHTML = stamp.svg;
		let svgElement = wrapper.querySelector('svg') as SVGElement;
		let paths = svgElement.querySelectorAll('path');
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		function markPoint(loc: [number, number]) {
			if (loc[0] < minX) {
				minX = loc[0];
			}
			if (loc[0] > maxX) {
				maxX = loc[0];
			}
			if (loc[1] < minY) {
				minY = loc[1];
			}
			if (loc[1] > maxY) {
				maxY = loc[1];
			}
		}

		let objects: Object2D[] = [];
		let root = new Group();
		root.id = broker.allocateId(objects.map((o) => o.id));
		root.name = stamp.name;

		objects.push(root);

		for (let path of paths) {
			let data = (path as any).getPathData() as (
				| {
						type: 'M';
						values: [number, number];
				  }
				| {
						type: 'L';
						values: [number, number];
				  }
				| {
						type: 'C';
						values: [number, number, number, number, number, number];
				  }
				| {
						type: 'Z';
						values: [];
				  }
				| {
						type: 'V';
						values: [number];
				  }
				| {
						type: 'H';
						values: [number];
				  }
			)[];

			let pathColorStr = hexColorToArray(path.getAttribute('stroke') || '#000000');

			let root2 = new Group();
			root2.id = broker.allocateId(objects.map((o) => o.id));
			root2.name = 'Path';
			root2.parent = root.id;
			objects.push(root2);

			let workingPath: Path | null = null;

			for (let seg of data) {
				seg.values = seg.values.map((v) => (v = v / 100)) as any;
				if (seg.type == 'M') {
					if (workingPath) {
						objects.push(workingPath);
					}

					workingPath = new Path();
					workingPath.name = 'Segment';
					workingPath.style = new Material();
					workingPath.style.color = pathColorStr;
					workingPath.id = broker.allocateId(objects.map((o) => o.id));
					workingPath.segments.push(seg.values);
					workingPath.parent = root2.id;
					markPoint(seg.values);
				} else if (seg.type == 'L') {
					workingPath?.segments.push(seg.values);
					markPoint(seg.values);
				} else if (seg.type == 'V') {
					let prevPoint = workingPath?.segments[workingPath?.segments.length - 1];
					if (!prevPoint) {
						continue;
					}
					let vals = [prevPoint[0], seg.values[0]];
					workingPath?.segments.push(vals as any);
					markPoint(vals as any);
				} else if (seg.type == 'H') {
					let prevPoint = workingPath?.segments[workingPath?.segments.length - 1];
					if (!prevPoint) {
						continue;
					}
					let vals = [seg.values[0], prevPoint[1]];
					workingPath?.segments.push(vals as any);
					markPoint(vals as any);
				}
			}

			if (workingPath) {
				objects.push(workingPath);
				workingPath = null;
			}
		}

		let width = maxX - minX;
		let height = maxY - minY;
		let viewBounds = get(editor.viewBounds);
		let centerX = (viewBounds.minX + viewBounds.maxX) / 2;
		let centerY = (viewBounds.minY + viewBounds.maxY) / 2;
		for (let object of objects) {
			object.transform.position[0] = centerX - width / 2 + (object.transform.position[0] - minX);
			object.transform.position[1] = centerY - height / 2 + (object.transform.position[1] - minY);
			transaction.create(object);
		}

		broker.commitTransaction(transaction);

		editor.select(root.id);
	}

	onMount(() => {
		import('src/lib/client/path-data-polyfill.js');
	});

	function smartParking(degrees: 90 | 60 | 45 | 30, double: boolean = false) {
		editor.activeTool.set('smart');
		editor.activateDialog('');
		editor.activeToolSmartObject.set('parking');

		let lineLengthGivenAngleAndBase = (a: number, b: number) => b / Math.sin(a);
		let measures: any = {
			'90': {
				distance: feetToMeters(18),
				spacing: feetToMeters(9),
				rowSpacing: feetToMeters(60),
				double,
				angle: 90
			},
			'60': {
				distance: feetToMeters(23.209480821422957), // lineLengthGivenAngleAndBase(degreesToRadians(60), 20.1),
				spacing: feetToMeters(10.4),
				rowSpacing: feetToMeters(54.7),
				double,
				angle: 60
			},
			'45': {
				distance: feetToMeters(26.87005768508881), // lineLengthGivenAngleAndBase(degreesToRadians(45), 19),
				spacing: feetToMeters(12.7),
				rowSpacing: feetToMeters(50),
				double,
				angle: 45
			},
			'30': {
				distance: feetToMeters(33.60000000000001), // lineLengthGivenAngleAndBase(degreesToRadians(30), 16.8),
				spacing: feetToMeters(18),
				rowSpacing: feetToMeters(45.8),
				double,
				angle: 30
			}
		};

		editor.activeToolSmartObjectProperties.set(measures[degrees.toString()]);
	}
</script>

<DialogSlideUp>
	<div class="px-4 py-2">
		<button
			class="flex flex-row items-center rounded-md border border-gray-200 p-2 hover:bg-gray-50"
			on:click={() => {
				editor.activeTool.set('text');
				editor.activateDialog('');
			}}
		>
			<img src="/img/text.png" class="max-w-[32px]" alt="Distance ft" />
			<div class="ml-4">Insert text box</div>
		</button>
	</div>
	<ResponsiveGroup groups={['Shapes', 'Pre-Made Objects', 'Smart Objects']}>
		<div
			slot="group-0"
			class="flex flex-row items-center justify-center select-none flex-wrap py-4"
		>
			{#each shapes as shape}
				<button
					class="flex flex-col items-center justify-center p-2 hover:bg-gray-100 rounded-md cursor-pointer"
					on:click={() => activateShape(shape)}
				>
					<div class="w-12 h-12 max-svg">
						{@html shape.svg}
					</div>
				</button>
			{/each}
		</div>
		<div slot="group-1" class="flex items-center flex-col space-y-2 p-4">
			<!-- {#each stamps as stamp}
				<button
					class="flex flex-col items-center justify-center p-2 hover:bg-gray-100 rounded-md cursor-pointer"
					on:click={() => insertStamp(stamp)}
				>
					<div class="max-svg">
						{@html stamp.svg}
					</div>
					<div class="text-xs text-center mt-2">
						{stamp.name}
					</div>
				</button>
			{/each} -->
		</div>

		<div slot="group-2" class="flex items-center flex-col space-y-2 p-4">
			<div class="text-lg">Parking</div>
			<div class="flex flex-row flex-wrap justify-center">
				<button
					class="flex m-2 flex-col items-center rounded-md border border-gray-200 p-2 hover:bg-gray-50"
					on:click={() => {
						smartParking(90);
					}}
				>
					<div class="mb-2 flex flex-row items-center">90°</div>
					<img class="rounded -scale-100" src="/img/smart-parking-90.svg" alt="90deg" />
				</button>
				<button
					class="flex m-2 flex-col items-center rounded-md border border-gray-200 p-2 hover:bg-gray-50"
					on:click={() => {
						smartParking(90, true);
					}}
				>
					<div class="mb-2 flex flex-row items-center">90°</div>
					<img class="rounded" src="/img/smart-parking-90-double.svg" alt="90deg" />
				</button>
				<button
					class="flex m-2 flex-col items-center rounded-md border border-gray-200 p-2 hover:bg-gray-50"
					on:click={() => {
						smartParking(60);
					}}
				>
					<div class="mb-2 flex flex-row items-center">60°</div>
					<img class="rounded -scale-x-100" src="/img/smart-parking-60.svg" alt="60deg" />
				</button>
				<button
					class="flex m-2 flex-col items-center rounded-md border border-gray-200 p-2 hover:bg-gray-50"
					on:click={() => {
						smartParking(60, true);
					}}
				>
					<div class="mb-2 flex flex-row items-center">60°</div>
					<img class="rounded" src="/img/smart-parking-60-double.svg" alt="60deg" />
				</button>

				<button
					class="flex m-2 flex-col items-center rounded-md border border-gray-200 p-2 hover:bg-gray-50"
					on:click={() => {
						smartParking(45);
					}}
				>
					<div class="mb-2 flex flex-row items-center">45°</div>
					<img class="rounded -scale-x-100" src="/img/smart-parking-45.svg" alt="45deg" />
				</button>
				<button
					class="flex m-2 flex-col items-center rounded-md border border-gray-200 p-2 hover:bg-gray-50"
					on:click={() => {
						smartParking(45, true);
					}}
				>
					<div class="mb-2 flex flex-row items-center">45°</div>
					<img class="rounded" src="/img/smart-parking-45-double.svg" alt="45deg" />
				</button>

				<button
					class="flex m-2 flex-col items-center rounded-md border border-gray-200 p-2 hover:bg-gray-50"
					on:click={() => {
						smartParking(30);
					}}
				>
					<div class="mb-2 flex flex-row items-center">30°</div>
					<img class="rounded -scale-x-100" src="/img/smart-parking-30.svg" alt="30deg" />
				</button>
				<button
					class="flex m-2 flex-col items-center rounded-md border border-gray-200 p-2 hover:bg-gray-50"
					on:click={() => {
						smartParking(30, true);
					}}
				>
					<div class="mb-2 flex flex-row items-center">30°</div>
					<img class="rounded" src="/img/smart-parking-30-double.svg" alt="30deg" />
				</button>
			</div>
		</div>
	</ResponsiveGroup>
</DialogSlideUp>

<style lang="scss">
	:global(.max-svg > svg) {
		width: 100%;
		height: 100%;
	}
</style>
