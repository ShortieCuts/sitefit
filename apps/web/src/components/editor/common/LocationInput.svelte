<script lang="ts">
	import { faSearch } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import LocationMap from './LocationMap.svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { Loader } from '@googlemaps/js-api-loader';

	export let value: [number, number, number] = [0, 0, 0];
	let search = '';

	let results: {
		place_name: string;
		center: [number, number];
	}[] = [];

	let searchLocation: () => void = () => {};

	let timer: NodeJS.Timeout | null = null;

	$: {
		search;
		if (timer) clearTimeout(timer);
		timer = setTimeout(searchLocation, 500);
	}

	onMount(() => {
		if (browser) {
			const loader = new Loader({
				apiKey: 'AIzaSyDhS6djMo2An6CdMlEY1zMQUkRGorXI7SU',
				version: 'weekly'
			});

			loader.load().then(async () => {
				const { Geocoder } = (await google.maps.importLibrary(
					'geocoding'
				)) as google.maps.GeocodingLibrary;
				let service = new Geocoder();
				searchLocation = () => {
					if (!search) return;

					service.geocode(
						{
							address: search
						},
						function (results, status) {
							console.log(results);
						}
					);
				};
			});
		}
	});
</script>

<div class="flex flex-col items-center">
	<div
		class="search-bar relative h-10 w-full shadow-style rounded-lg border-[1px] border-gray-300 flex flex-row items-center"
	>
		<input
			class="absolute top-0 left-0 right-0 bottom-0 pl-8 rounded-lg outline-none"
			placeholder="Search for a location"
			bind:value={search}
			type="text"
		/>
		<Fa class="pointer-events-none text-1xl absolute z-10 ml-2" icon={faSearch} />
		<div class="absolute top-full w-full" />
	</div>
	<div class="flex flex-row mt-4 mb-4">
		<div class="flex flex-col w-1/3">
			<label class="pl-2 mb-2" for="longitude">Longitude</label>
			<input
				id="longitude"
				class="px-2 rounded-lg border-[1px] border-gray-300 w-full rounded-r-none"
				placeholder="Longitude"
				bind:value={value[0]}
				type="number"
			/>
		</div>

		<div class="flex flex-col w-1/3">
			<label class="pl-2 mb-2" for="latitude">Latitude</label>
			<input
				id="latitude"
				class="px-2 rounded-none border-y-[1px] border-gray-300 w-full"
				placeholder="Latitude"
				bind:value={value[1]}
				type="number"
			/>
		</div>

		<div class="flex flex-col w-1/3">
			<label class="pl-2 mb-2" for="latlonheading">Heading</label>
			<input
				id="latlonheading"
				class="px-2 rounded-lg border-[1px] border-gray-300 w-full rounded-l-none"
				placeholder="Heading"
				bind:value={value[2]}
				type="number"
			/>
		</div>
	</div>
</div>
