<script lang="ts">
	import UserDropChip from '../auth/UserDropChip.svelte';
	import ProjectCadNav from './ProjectCadNav.svelte';
	import type { AuthState } from 'src/store/auth';

	export let auth: AuthState;
</script>

<div class="contained md:pt-40 pt-4">
	<div class="hidden md:block">
		<div class="header-row flex flex-col md:flex-row">
			<img src="/logo.svg" class="w-20 h-20" alt="logo" />
			<div class="ml-auto mt-auto flex flex-row">
				<ProjectCadNav />
			</div>
		</div>
		<div class="absolute top-4 right-2">
			<UserDropChip {auth} />
		</div>
	</div>

	<div class="block md:hidden">
		<div class="header-row flex flex-row justify-between items-center md:flex-row">
			<img src="/logo.svg" class="w-10 h-10" alt="logo" />
			<div class="mt-auto flex flex-row">
				<ProjectCadNav />
			</div>
			<UserDropChip {auth} />
		</div>
	</div>

	<div class="content-row mt-8"><slot /></div>
</div>
