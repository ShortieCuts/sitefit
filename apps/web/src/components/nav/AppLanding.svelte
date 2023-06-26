<script lang="ts">
	import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
	import UserDropChip from '../auth/UserDropChip.svelte';
	import ProjectCadNav from './ProjectCadNav.svelte';
	import type { AuthState } from 'src/store/auth';
	import Fa from 'svelte-fa';

	export let auth: AuthState;
	export let back = false;
	export let backHref = '/';
	export let nav = true;
</script>

{#if back}
	<a class="left-4 bg-white absolute top-0 pt-4 flex flex-row text-lg items-center" href={backHref}>
		<Fa icon={faArrowLeft} class="mr-2" /> Back
	</a>
{/if}
<div class="contained md:pt-40 pt-4">
	<div class="hidden md:block">
		<div class="header-row flex flex-col md:flex-row">
			<img src="/logo.svg" class="w-20 h-20" alt="logo" />
			{#if nav}
				<div class="ml-auto mt-auto flex flex-row">
					<ProjectCadNav />
				</div>
			{/if}
		</div>
		<div class="absolute top-4 right-2">
			<UserDropChip {auth} />
		</div>
	</div>

	<div class="block md:hidden">
		<div class="header-row flex flex-row justify-between items-center md:flex-row">
			<img src="/logo.svg" class="w-10 h-10" alt="logo" />
			{#if nav}
				<div class="mt-auto flex flex-row">
					<ProjectCadNav />
				</div>
			{/if}
			<UserDropChip {auth} />
		</div>
	</div>

	<div class="content-row mt-8"><slot /></div>
</div>
