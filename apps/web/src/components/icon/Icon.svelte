<script lang="ts">
	import iconWorld from './assets/world.png?url';
	import iconArrow from './assets/arrow.png?url';
	import iconCheckmark from './assets/checkmark.png?url';
	import iconCog from './assets/cog.png?url';
	import iconCog2 from './assets/cog2.png?url';
	import iconComment from './assets/comment.png?url';
	import iconDelete from './assets/delete.png?url';
	import iconDocument from './assets/document.png?url';
	import iconDownload from './assets/download.png?url';
	import iconFlip_hori from './assets/flip_hori.png?url';
	import iconFlip_vert from './assets/flip_vert.png?url';
	import iconHome from './assets/home.png?url';
	import iconInvite from './assets/invite.png?url';
	import iconLayers from './assets/layers.png?url';
	import iconMap from './assets/map.png?url';
	import iconParcels from './assets/parcels.png?url';
	import iconPlus from './assets/plus.png?url';
	import iconPlus_circle from './assets/plus_circle.png?url';
	import iconSearch from './assets/search.png?url';
	import iconShare from './assets/share.png?url';
	import iconTap_edit from './assets/tap_edit.png?url';
	import iconTools from './assets/tools.png?url';
	import iconPalette from './assets/palette.png?url';
	import iconInsert from './assets/insert.png?url';
	import type { IconName } from './icon';

	let icons: {
		[K in IconName]: any;
	} = {
		world: iconWorld,
		arrow: iconArrow,
		checkmark: iconCheckmark,
		cog: iconCog,
		cog2: iconCog2,
		comment: iconComment,
		delete: iconDelete,
		document: iconDocument,
		download: iconDownload,
		flip_hori: iconFlip_hori,
		flip_vert: iconFlip_vert,
		home: iconHome,
		invite: iconInvite,
		layers: iconLayers,
		map: iconMap,
		parcels: iconParcels,
		plus: iconPlus,
		plus_circle: iconPlus_circle,
		search: iconSearch,
		share: iconShare,
		tap_edit: iconTap_edit,
		tools: iconTools,
		palette: iconPalette,
		insert: iconInsert
	};

	export let icon: IconName = 'world';
</script>

<img src={icons[icon]} alt={icon} class={'icon ' + $$props.class ?? ''} />

<style lang="scss">
	:global(.icon) {
		max-width: 1em;
	}

	:global(.icon.text-lg) {
		max-width: 1.25em;
	}

	:global(.icon.text-xl) {
		max-width: 1.5em;
	}

	:global(.icon.text-2xl) {
		max-width: 2em;
	}

	:global(.icon.text-3xl) {
		max-width: 2.5em;
	}

	:global(.icon.text-4xl) {
		max-width: 3em;
	}
</style>
