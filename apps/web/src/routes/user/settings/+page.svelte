<script lang="ts">
	import {
		faAngleRight,
		faCaretRight,
		faEnvelope,
		faExternalLink,
		faPerson,
		faQuestionCircle,
		faSignOut,
		faUser,
		faUserCircle
	} from '@fortawesome/free-solid-svg-icons';
	import type { PageData } from './$types';

	import AppLanding from 'src/components/nav/AppLanding.svelte';
	import MobileBar from 'src/components/nav/MobileBar.svelte';
	import Fa from 'svelte-fa';
	import { signOut } from 'src/store/auth';
	export let data: PageData;
</script>

<AppLanding auth={data.user}>
	<div class="flex flex-col pb-20 relative space-y-2">
		<a href="/user/account" class="flex flex-row text-lg items-center hover:bg-gray-50 py-2 px-2">
			<Fa class="text-2xl" icon={faUserCircle} />
			<span class="ml-4">Account / Subscription</span>
			<Fa class="text-xl opacity-30 ml-auto" icon={faAngleRight} />
		</a>
		<a
			href="https://sitefit.io/feedback"
			class="flex flex-row text-lg items-center hover:bg-gray-50 py-2 px-2"
		>
			<Fa class="text-2xl" icon={faEnvelope} />
			<span class="ml-4">Feedback / Support</span>
			<Fa class="text-xl opacity-30 ml-auto" icon={faExternalLink} />
		</a>
		<a
			href="https://sitefit.io/faq"
			class="flex flex-row text-lg items-center hover:bg-gray-50 py-2 px-2"
		>
			<Fa class="text-2xl" icon={faQuestionCircle} />
			<span class="ml-4">FAQ</span>
			<Fa class="text-xl opacity-30 ml-auto" icon={faExternalLink} />
		</a>
		<button
			class="flex flex-row text-lg items-center hover:bg-gray-50 py-2 px-2"
			on:click={async () => {
				await signOut();
				location.href = '/';
			}}
		>
			<Fa class="text-2xl" icon={faSignOut} />
			<span class="ml-4">Log Out</span>
		</button>
		<div class="flex flex-col bottom-0 fixed pb-6 px-2">
			<a target="_blank" href="https://sitefit.io/privacy" class="underline text-black"
				>Privacy Policy</a
			>
			<a target="_blank" href="https://sitefit.io/terms" class="underline text-black"
				>Terms & Conditions</a
			>
		</div>
	</div>
</AppLanding>
