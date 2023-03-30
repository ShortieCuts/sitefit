<script>
	import SignIn from '../auth/SignIn.svelte';
</script>

<div
	class="fade-in fixed top-0 right-0 left-0 bottom-0 backdrop-blur-sm bg-black bg-opacity-40 z-50 flex items-center justify-center flex-col"
>
	<div>
		<SignIn />
	</div>
</div>

<style lang="scss">
	.fade-in {
		animation: fadeIn ease 0.5s;
	}

	@keyframes fadeIn {
		0% {
			opacity: 0;
		}
		100% {
			opacity: 1;
		}
	}
</style>
