<script>
	import DialogSlideUp from 'src/components/common/DialogSlideUp.svelte';
	import ResponsiveGroup from 'src/components/common/ResponsiveGroup.svelte';
</script>

<DialogSlideUp>
	<ResponsiveGroup groups={['Map', 'Transparency', 'Colors', 'Thickness']}>
		<div slot="group-0" class="flex flex-row items-center justify-center space-x-16 py-8">
			<div class="flex flex-col items-center">
				<img src="/img/google-sat.png" alt="sat" />
				<b class="mt-2">Satellite</b>
			</div>
			<div class="flex flex-col items-center">
				<img src="/img/google-street.png" alt="street" />
				<b class="mt-2">Simple</b>
			</div>
		</div>
		<div slot="group-1">Trans</div>
		<div slot="group-2" />
		<div slot="group-3" />
	</ResponsiveGroup>
</DialogSlideUp>
