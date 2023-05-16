<script lang="ts">
	import type { ProjectComment } from '$lib/types/comment';
	import UserChip from 'src/components/auth/UserChip.svelte';
	import ContextMenu from './ContextMenu.svelte';
	import { faArrowRight, faEllipsis } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import { getSvelteContext } from 'src/store/editor';
	import { WrapLoader } from 'ui';
	import { fade } from 'svelte/transition';
	import ReplyComment from './ReplyComment.svelte';
	import { auth } from 'src/store/auth';

	const { broker, editor } = getSvelteContext();

	export let comment: ProjectComment;

	$: replies = broker.watchCommentReplies(comment.id);

	let commentEl: HTMLElement;
	let editing = false;
	let saving = false;
	let loadingReply = false;

	let reply = '';

	let textareaEl: HTMLTextAreaElement | null = null;

	async function handleSave() {
		if (!textareaEl) {
			editing = false;
			return;
		}
		saving = true;
		await broker.updateComment(comment.id, textareaEl.value);

		saving = false;
		editing = false;
	}

	async function handleReply() {
		if (loadingReply) {
			return;
		}
		if (reply != '') {
			loadingReply = true;

			await broker.replyToComment(comment.id, reply);
			reply = '';
			loadingReply = false;
		}
	}
</script>

<div
	role="button"
	class="rounded-md border border-gray-200 hover:shadow-lg transition-all outline outline-2 outline-transparent focus:outline-2 focus:outline focus:outline-blue-500 cursor-default"
	data-comment-id={comment.id}
	tabindex="0"
	on:click={() => {}}
	on:keydown={(e) => {}}
	on:focus={() => {
		if (!comment.read) broker.markCommentRead(comment.id);
		editor.flyTo(comment.long, comment.lat);
		editor.focusComment.set(comment.id);
	}}
	on:blur={() => {
		if (get(editor.focusComment) === comment.id) editor.focusComment.set(0);
	}}
>
	<div
		class="border-b border-gray-200 rounded-t-md {comment.read
			? 'bg-gray-50'
			: 'bg-yellow-50'} flex flex-col px-4 py-2 relative group"
		bind:this={commentEl}
	>
		<div class="flex flex-row items-center justify-between">
			<span>
				<UserChip showName small showPicture={false} userId={comment.authorId} />
			</span>
			<button class="text-gray-400 text-sm hidden group-hover:block" data-context>
				<Fa icon={faEllipsis} />
			</button>
		</div>
		{#if editing}
			<WrapLoader loading={saving} class="flex flex-col">
				<textarea bind:this={textareaEl} class="rounded-md border-2 border-gray-500 p-2"
					>{comment.text}</textarea
				>
				<div class="flex flex-row justify-end mt-2 space-x-2">
					<button
						on:click={() => {
							editing = false;
						}}
						class="btn">Cancel</button
					>
					<button on:click={handleSave} class="btn btn-primary">Save</button>
				</div>
			</WrapLoader>
		{:else}
			<p>
				{comment.text}
				<span class="hidden group-hover:inline ml-2 bottom-1 text-gray-400 text-sm"
					>{new Date(comment.createdAt).toLocaleString()}
				</span>
			</p>
		{/if}
	</div>

	<div
		class="grid justify-items-start items-center"
		style="grid-template-columns: [user] auto [content] 1fr;"
	>
		{#each $replies as reply}
			<ReplyComment parentId={comment.id} comment={reply} />
		{/each}
	</div>

	<div class="p-4">
		<div class="relative">
			<input
				class="input-text"
				style="background-color: white; padding-left: 0.5rem"
				placeholder="Reply"
				bind:value={reply}
				on:keydown={(e) => {
					if (e.key === 'Enter') {
						handleReply();
					}
				}}
			/>
			{#if reply != ''}
				<button
					on:click={handleReply}
					transition:fade={{ duration: 200 }}
					class="absolute top-1 bottom-1 right-1 w-6 text-white bg-blue-500 rounded-md flex items-center justify-center hover:bg-blue-600"
				>
					<WrapLoader loading={loadingReply}>
						<Fa icon={faArrowRight} />
					</WrapLoader>
				</button>
			{/if}
		</div>
	</div>
</div>
<ContextMenu el={commentEl}>
	{#if $auth.user && comment.authorId == $auth.user.id}
		<button
			on:click={() => {
				editing = true;
				setTimeout(() => {
					if (textareaEl) {
						textareaEl.focus();
					}
				}, 10);
			}}>Edit</button
		>
		<button
			on:click={() => {
				broker.deleteComment(comment.id);
			}}>Delete</button
		>
	{/if}
	<button
		on:click={() => {
			broker.markCommentUnread(comment.id);
		}}>Mark unread</button
	>
</ContextMenu>
