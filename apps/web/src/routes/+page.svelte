<script lang="ts">
	import type { PageData } from './$types';

	import { Project } from 'core';
	import { page } from '$app/stores';
	import ProjectCadNav from 'src/components/nav/ProjectCadNav.svelte';
	import AppLanding from 'src/components/nav/AppLanding.svelte';
	import DataView from 'src/components/common/DataView.svelte';
	import type { ListViewProject } from '$lib/types/project';
	import type { APIDataView } from '$lib/types/dataView';
	import { faFolderOpen, faPlus } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import ProjectListItem from 'src/components/project/ProjectListItem.svelte';
	export let data: PageData;
</script>

<AppLanding auth={data.user}>
	<div class="flex flex-col items-center pb-4">
		<DataView view={data.projects} class="flex-wrap flex justify-center">
			<div class="inline-flex m-2" slot="item" let:item>
				<ProjectListItem project={item} />
			</div>
			<div
				slot="empty"
				class="bg-gray-100 h-80 w-full rounded-lg flex flex-col items-center justify-center"
			>
				<div class="opacity-10">
					<Fa class="text-8xl" icon={faFolderOpen} />
				</div>
				<h2 class="text-lg my-2 opacity-50">No projects yet</h2>

				<a href="/new" class="btn"><Fa icon={faPlus} />New Project</a>
			</div>
		</DataView>
	</div>
</AppLanding>
