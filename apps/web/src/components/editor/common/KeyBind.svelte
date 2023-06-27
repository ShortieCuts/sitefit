<script lang="ts">
	export let to: '' | 'delete' | 'group' | 'ungroup' | 'copy' | 'paste' | 'sendfront' | 'sendback' =
		'';

	const bindNames: {
		[key in typeof to]: string;
	} = {
		'': '',
		delete: 'Delete',
		group: 'Ctrl+G',
		ungroup: 'Ctrl+Shift+G',
		copy: 'Ctrl+C',
		paste: 'Ctrl+V',
		sendfront: 'Ctrl+Shift+]',
		sendback: 'Ctrl+Shift+['
	};

	function translateToMac(key: string) {
		if (navigator.platform.indexOf('Mac') == -1) return key;
		return key.replace('Ctrl', 'Cmd');
	}
</script>

<div
	class="keybind bg-gray-100 rounded border border-gray-200 shadow-sm px-2 py-0.5 text-gray-500 font-mono text-xs ml-auto"
>
	{translateToMac(bindNames[to])}
</div>
