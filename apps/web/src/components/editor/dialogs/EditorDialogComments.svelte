<script lang="ts">
	import { faEllipsis, faFilter, faListDots } from '@fortawesome/free-solid-svg-icons';
	import UserCard from 'src/components/auth/UserCard.svelte';
	import UserChip from 'src/components/auth/UserChip.svelte';
	import ComboDrop from 'src/components/common/ComboDrop.svelte';
	import Icon from 'src/components/icon/Icon.svelte';
	import { getSvelteContext } from 'src/store/editor';
	import Fa from 'svelte-fa';
	import Popover from 'svelte-smooth-popover/Popover.svelte';
	import ContextMenu from '../common/ContextMenu.svelte';
	import RootComment from '../common/RootComment.svelte';
	import DialogSlideLeft from 'src/components/common/DialogSlideLeft.svelte';

	const { editor, broker } = getSvelteContext();
	const { activeTool } = editor;
	const { rootComments } = broker;

	let sortBy = 'unread';

	$: sortedComments = [...$rootComments].sort((a, b) => {
		if (sortBy == 'unread') {
			if (a.read && !b.read) {
				return 1;
			} else if (!a.read && b.read) {
				return -1;
			} else {
				return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
			}
		} else {
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		}
	});
</script>

<DialogSlideLeft>
	<div class="flex flex-col">
		<div class="flex flex-row p-4">
			<button
				on:click={() => {
					activeTool.set('comment');
					editor.activateDialog('');
				}}
				class="btn btn-fat shadow-style"
				class:btn-primary={$activeTool === 'comment'}
			>
				<Icon icon="comment" /> Add Comment</button
			>
			<button class="ml-auto btn btn-fat shadow-style btn-icon-only">
				<Fa icon={faFilter} />
				<Popover
					showOnClick={true}
					hideOnExternalClick
					caretBg="#f3f4f6"
					offset={10}
					caretCurveAmount={1}
					caretWidth={20}
					alignAnchor="top-right"
				>
					<div
						class="shadow-xl bg-white border-gray-100 border-2 space-y-2 rounded-lg min-w-[150px] overflow-hidden p-4"
					>
						<div class="flex flex-row">
							<span class="mr-2">Sort By:</span>
							<ComboDrop
								bind:value={sortBy}
								options={[
									{
										name: 'Date',
										value: 'date'
									},
									{
										name: 'Unread',
										value: 'unread'
									}
								]}
							/>
						</div>
					</div>
				</Popover>
			</button>
		</div>
		<div class="flex flex-col p-4 space-y-4 flex-1">
			{#each sortedComments as comment}
				<RootComment {comment} />
			{/each}
		</div>
	</div>
</DialogSlideLeft>
