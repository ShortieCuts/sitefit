<script lang="ts">
	import { browser } from '$app/environment';
	import { createProject } from '$lib/client/api';
	import { faArrowLeft, faLock } from '@fortawesome/free-solid-svg-icons';
	import SignIn from 'src/components/auth/SignIn.svelte';
	import { signInModalActive } from 'src/store/modal';
	import { onMount } from 'svelte';
	import Fa from 'svelte-fa';
	import { WrapLoader } from 'ui';

	let loading = false;

	let name = '';

	let description = '';

	let failed = false;
	let error = '';

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;

		let res = await createProject({ name, description });

		if (res.error) {
			loading = false;
			failed = true;
			error = res.message;
		} else {
			location.href = `/project/${res.data.projectId}`;
		}
	}
</script>

<div
	class="flex flex-col items-center justify-center h-full bg-gradient-to-b to-gray-300 from-white"
>
	<div class="min-w-[300px] max-w-[300px]">
		<div class="flex flex-col items-center justify-center bg-gray-200 h-40 rounded-t-lg">
			<img src="/logo.svg" alt="logo" class="max-w-[80px] mb-2" />
			<p>New project</p>
		</div>
		<div class="bg-gray-100 rounded-b-lg p-4 shadow-lg">
			<WrapLoader {loading}>
				<form class="flex flex-col space-y-2" on:submit={handleSubmit}>
					<label for="name">Name</label>
					<input
						required
						id="name"
						class="input-text"
						name="project-name"
						placeholder="Lot #42"
						type="text"
						bind:value={name}
					/>

					<label for="description">Description</label>
					<textarea
						id="description"
						maxlength="500"
						class="input-text"
						name="project-description"
						placeholder="Short description (optional)"
						bind:value={description}
					/>

					<button class="btn btn-success">Continue</button>
				</form>

				{#if failed}
					<div
						class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4"
						role="alert"
					>
						<span class="block sm:inline">{error}</span>
					</div>
				{/if}
			</WrapLoader>
		</div>

		<div class="flex items-center justify-center p-2">
			<a href="/">
				<Fa icon={faArrowLeft} class="mr-2 inline-block" /> Back to Projects
			</a>
		</div>
	</div>
</div>
