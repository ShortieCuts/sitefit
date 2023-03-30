<script lang="ts">
	import {
		faArrowRight,
		faChevronDown,
		faCircle,
		faCog,
		faEnvelope,
		faGrip,
		faMessage,
		faPerson,
		faSignOut,
		faTag,
		faUser
	} from '@fortawesome/free-solid-svg-icons';
	import { signOut, type AuthState } from 'src/store/auth';
	export let auth: AuthState;
	import Fa from 'svelte-fa';
	import { Popover } from 'svelte-smooth-popover';

	$: photoURL = auth.user?.photoURL || '/user-photo-placeholder.svg';
</script>

<button class="flex flex-row items-center justify-center space-x-2">
	<img
		referrerpolicy="no-referrer"
		class="w-6 h-6 rounded-full border-[2px] shadow-md"
		src={photoURL}
		alt="User profile"
	/>
	<Fa icon={faChevronDown} />

	<Popover
		showOnClick={true}
		hideOnExternalClick
		caretBg="#27272a"
		offset={10}
		caretCurveAmount={1}
		caretWidth={20}
		alignAnchor="top-right"
	>
		<div class="shadow-xl bg-gray-800 space-y-2 py-2 rounded-lg min-w-[150px]">
			<div class="flex flex-row items-center px-4 pt-2 font-bold">
				{auth.user?.username ?? 'No username'}
			</div>
			<div class="flex flex-row items-center px-4 pb-2 text-sm">
				{auth.user?.email ?? 'No email'}
			</div>
			<div class="border-b-[1px] border-gray-700" />
			<div>
				<a
					href="/{auth.user?.username ?? ''}/browse"
					class="flex flex-row items-center px-4 py-2 hover:bg-gray-700"
				>
					<Fa class="mr-2" icon={faGrip} /> My Projects
				</a>
				<a href="/user/settings" class="flex flex-row items-center px-4 py-2 hover:bg-gray-700">
					<Fa class="mr-2" icon={faCog} /> Settings
				</a>
			</div>
			<div class="border-b-[1px] border-gray-700" />
			<div>
				<button
					class="flex flex-row items-center w-full text-left px-4 py-2 hover:bg-gray-700"
					on:click={() => signOut()}
				>
					<Fa class="mr-2" icon={faSignOut} /> Sign Out
				</button>
			</div>
		</div>
	</Popover>
</button>
