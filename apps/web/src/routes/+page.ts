import { emptyDataView, fetchDataView, type APIDataView } from '$lib/types/dataView';

import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { ListViewProject } from '$lib/types/project';

export const load = (async ({ params, fetch }) => {
	return {};
}) satisfies PageLoad;
