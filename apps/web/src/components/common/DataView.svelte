<script lang="ts">
	import { browser } from '$app/environment';
	import { deserializeDates, type APIDataView } from '$lib/types/dataView';
	import { WrapLoader } from 'ui';

	type T = $$Generic<any>;

	interface $$Slots {
		item: {
			item: T;
		};
		empty: {};
		loading: {};
	}

	export let view: APIDataView<T>;

	let clazz = 'flex flex-row flex-wrap justify-center';
	export { clazz as class };

	let loaderEl: WrapLoader | null = null;

	let page = view.page;
	let loading = false;

	async function loadPage(pageNum: number) {
		loading = true;

		const res = await fetch(`${view.endpoint}`, {
			method: 'POSt',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				pageSize: view.pageSize,
				...view.payload,
				page: pageNum
			})
		});
		loading = false;
		if (loaderEl?.$$.root) {
			(loaderEl?.$$.root as HTMLElement).scrollIntoView({
				block: 'start'
			});
		}

		const data = (await res.json()) as APIDataView<T>;
		if (data) {
			for (let i of data.items) {
				deserializeDates(i);
			}
		}

		view = data ?? view;
	}

	function setPage(toPage: number) {
		page = toPage;
		loadPage(toPage);
	}
</script>

<WrapLoader bind:this={loaderEl} class={clazz} {loading}>
	{#if view.items.length > 0}
		{#each view.items as item}
			<slot name="item" {item} />
		{/each}
	{:else if !view.error}
		<slot name="empty">No results found.</slot>
	{:else}
		<div class="text-center text-white text-opacity-60">
			An error occurred. Please try again later.
		</div>
	{/if}
</WrapLoader>

<div class="flex flex-row space-x-2 items-center">
	{#if view.totalPages == 1}
		<button class="btn pagination-btn active">1</button>
	{:else if view.totalPages <= 5}
		{#each Array(view.totalPages) as _, i}
			<button on:click={() => setPage(i)} class="btn pagination-btn" class:active={view.page == i}
				>{i + 1}</button
			>
		{/each}
	{:else if view.page < 2}
		<button on:click={() => setPage(0)} class="btn pagination-btn" class:active={view.page == 0}
			>1</button
		>
		<button on:click={() => setPage(1)} class="btn pagination-btn" class:active={view.page == 1}
			>2</button
		>
		<button on:click={() => setPage(2)} class="btn pagination-btn">3</button>
		<button class="btn disabled pagination-btn">...</button>
		<button on:click={() => setPage(view.totalPages - 1)} class="btn pagination-btn"
			>{view.totalPages}</button
		>
	{:else if view.page >= view.totalPages - 2}
		<button on:click={() => setPage(0)} class="btn pagination-btn">1</button>
		<button class="btn disabled pagination-btn">...</button>
		<button on:click={() => setPage(view.totalPages - 3)} class="btn pagination-btn"
			>{view.totalPages - 2}</button
		>
		<button
			on:click={() => setPage(view.totalPages - 2)}
			class="btn pagination-btn"
			class:active={view.page == view.totalPages - 2}>{view.totalPages - 1}</button
		>
		<button
			on:click={() => setPage(view.totalPages - 1)}
			class="btn pagination-btn"
			class:active={view.page == view.totalPages - 1}>{view.totalPages}</button
		>
	{:else}
		<button on:click={() => setPage(0)} class="btn pagination-btn">1</button>
		<button class="btn disabled pagination-btn">...</button>
		<button on:click={() => setPage(view.page - 1)} class="btn pagination-btn">{view.page}</button>
		<button on:click={() => setPage(view.page)} class="btn pagination-btn active"
			>{view.page + 1}</button
		>
		<button on:click={() => setPage(view.page + 1)} class="btn pagination-btn"
			>{view.page + 2}</button
		>
		<button class="btn disabled pagination-btn">...</button>
		<button on:click={() => setPage(view.totalPages - 1)} class="btn pagination-btn"
			>{view.totalPages}</button
		>
	{/if}
</div>

<style lang="scss">
	.pagination-btn {
		@apply w-8 h-8 p-0;

		&.active {
			@apply bg-gray-200 shadow-md;
		}
	}
</style>
