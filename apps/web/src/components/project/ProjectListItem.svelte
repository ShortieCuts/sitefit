<script lang="ts">
	import type { ListViewProject } from '$lib/types/project';

	export let project: ListViewProject;
</script>

<a
	href="/project/{project.publicId}"
	class="border-gray-200 border-2 bg-gray-100 shadow-md rounded-lg flex flex-col w-80 hover:shadow-lg hover:-translate-y-1 transition-all"
>
	<div class="min-h-40 h-40 bg-blue-400 rounded-t-lg" />
	<div class="px-4 py-2">
		<h2>{project.name}</h2>
		<p>{project.description}</p>
	</div>
</a>
