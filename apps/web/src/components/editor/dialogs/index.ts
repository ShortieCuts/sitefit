import EditorDialogComments from './EditorDialogComments.svelte';
import EditorDialogFiles from './EditorDialogFiles.svelte';
import EditorDialogLayers from './EditorDialogLayers.svelte';
import EditorDialogParcels from './EditorDialogParcels.svelte';
import EditorDialogProjects from './EditorDialogProjects.svelte';
import EditorDialogShare from './EditorDialogShare.svelte';
import EditorDialogStyle from './EditorDialogStyle.svelte';
import EditorDialogTools from './EditorDialogTools.svelte';
import EditorDialogSearch from './EditorDialogSearch.svelte';
import EditorDialogMeasure from './EditorDialogMeasure.svelte';
import EditorDialogFeedback from './EditorDialogFeedback.svelte';

export const dialogs: {
	[key: string]: {
		dock?: 'left' | 'right' | 'center';
		component: any;
	};
} = {
	projects: {
		component: EditorDialogProjects
	},
	comments: {
		dock: 'right',
		component: EditorDialogComments
	},
	share: {
		dock: 'center',
		component: EditorDialogShare
	},
	tools: {
		dock: 'left',
		component: EditorDialogTools
	},
	cads: {
		dock: 'left',
		component: EditorDialogFiles
	},
	layers: {
		dock: 'left',
		component: EditorDialogLayers
	},
	parcels: {
		dock: 'left',
		component: EditorDialogParcels
	},
	// style: {
	// 	dock: 'left',
	// 	component: EditorDialogStyle
	// },
	search: {
		dock: 'left',
		component: EditorDialogSearch
	},
	measure: {
		dock: 'left',
		component: EditorDialogMeasure
	},
	feedback: {
		dock: 'center',
		component: EditorDialogFeedback
	}
};
