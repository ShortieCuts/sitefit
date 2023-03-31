import { emptyDataView, fetchDataView, type APIDataView } from '$lib/types/dataView';

import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { ListViewProject } from '$lib/types/project';

export const load = (async ({ params, fetch }) => {
	let projects: APIDataView<ListViewProject> = emptyDataView();

	projects = await fetchDataView(
		`/api/projects`,
		{
			pageSize: 9
		},
		fetch
	);

	return {
		projects
	};
}) satisfies PageLoad;
