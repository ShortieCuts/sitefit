<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="tab-group shadow-md">
	<a class="tab-btn text-lg" class:tab-btn-active={$page.route.id == '/'} href="/">Projects</a>
	<a class="tab-btn text-lg" class:tab-btn-active={$page.route.id == '/files'} href="/files">CADs</a
	>
</div>
