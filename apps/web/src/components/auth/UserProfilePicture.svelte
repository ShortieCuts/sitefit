<script lang="ts">
	import type { User } from 'auth';

	export let user: User;
	$: photoURL = user?.photoURL || null;

	function hashOfString(str: string) {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}
		return hash;
	}

	function randomNiceColorFromString(str: string) {
		const colors = [
			'#e6194b',
			'#3cb44b',
			'#ffe119',
			'#4363d8',
			'#f58231',
			'#911eb4',
			'#46f0f0',
			'#f032e6',
			'#bcf60c',
			'#fabebe',
			'#008080',
			'#9a6324',
			'#fffac8',
			'#800000',
			'#aaffc3',
			'#000075'
		];
		const hash = hashOfString(str);
		const index = Math.abs(hash % colors.length);
		return colors[index];
	}

	$: bgColor = randomNiceColorFromString(user.firstName + user.lastName);
</script>

{#if photoURL}
	<img
		referrerpolicy="no-referrer"
		class="w-10 h-10 rounded-full border-[2px] shadow-md"
		src={photoURL}
		alt="User profile"
	/>
{:else}
	<div
		class="w-10 h-10 rounded-full border-[2px] shadow-md uppercase flex items-center flex-row justify-center"
		style="background: {bgColor};"
	>
		{user.firstName?.[0] ?? ''}
		{user.lastName?.[0] ?? ''}
	</div>
{/if}
