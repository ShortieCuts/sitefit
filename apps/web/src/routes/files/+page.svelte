<script lang="ts">
	import type { LayoutData } from '../$types';

	import { Project } from 'core';
	import { page } from '$app/stores';
	import ProjectCadNav from 'src/components/nav/ProjectCadNav.svelte';
	import AppLanding from 'src/components/nav/AppLanding.svelte';

	export let data: LayoutData;
</script>

<AppLanding auth={data.user}>Test</AppLanding>
