<script lang="ts">
	import { faSearch } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import LocationMap from './LocationMap.svelte';
	import { createEventDispatcher, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { Loader } from '@googlemaps/js-api-loader';
	import Icon from 'src/components/icon/Icon.svelte';
	import { getSvelteContext } from 'src/store/editor';
	import { isMobile } from 'src/store/responsive';

	const dispatch = createEventDispatcher();

	export let value: [number, number, number] = [0, 0, 0];
	let search = '';

	const { editor } = getSvelteContext();

	let results: {
		place_name: string;
		center: [number, number];
	}[] = [];

	let searchLocation: () => void = () => {};

	let timer: NodeJS.Timeout | null = null;

	let searchEl: HTMLInputElement;

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
				const { Autocomplete } = (await google.maps.importLibrary(
					'places'
				)) as google.maps.PlacesLibrary;
				let autocomplete = new Autocomplete(searchEl, {
					componentRestrictions: { country: ['us', 'ca'] },
					fields: ['address_components', 'geometry'],
					types: ['address']
				});

				autocomplete.addListener('place_changed', () => {
					let place = autocomplete.getPlace();
					if (!place.geometry || !place.geometry.location) {
						return;
					}

					dispatch('placeChanged', place.geometry.location);

					// value = [place.geometry.location.lng(), place.geometry.location.lat(), 0];
					editor.longitude.set(place.geometry.location.lng());
					editor.latitude.set(place.geometry.location.lat());
				});
				// autocomplete.addListener("")
				// searchLocation = () => {
				// 	if (!search) return;

				// 	service.geocode(
				// 		{
				// 			address: search,

				// 		},
				// 		function (results, status) {
				// 			console.log(results);
				// 		}
				// 	);
				// };
			});
		}
	});
</script>

<div
	class="search-bar relative h-10 w-60 lg:w-96 shadow-style rounded-lg border-[1px] border-gray-300 flex flex-row items-center"
	class:inset-top={$isMobile}
>
	<input
		bind:this={searchEl}
		class="absolute top-0 left-0 right-0 bottom-0 pl-10 rounded-lg outline-none"
		placeholder="Search (by Address, City)"
		type="search"
		bind:value={search}
	/>
	<Icon class="pointer-events-none text-lg absolute z-10 ml-2" icon="search" />
</div>

<style lang="scss">
	:global(.pac-container) {
		@apply rounded-md shadow-lg mt-2 border border-gray-300 bg-white p-2 pt-2;
	}
	:global(.pac-item) {
		@apply rounded-md border-0 hover:bg-gray-100 my-2 first:mt-0 cursor-pointer;
	}

	@media (min-width: 768px) {
		:global(.pac-container) {
			@apply w-[400px];
		}
	}
	.inset-top {
		margin-top: calc(env(safe-area-inset-top, 0.5rem) - 0.5rem);
	}
</style>
