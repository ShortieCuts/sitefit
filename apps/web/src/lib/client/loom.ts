import { auth } from 'src/store/auth';
import { get } from 'svelte/store';

const PUBLIC_APP_ID = 'a8ae1c4b-ac62-4e70-a9aa-a10e8acafe0a';

let configureButton: any = null;
export async function setupRecordButton(el: HTMLElement) {
	const { setup, RecordingType } = await import('@loomhq/record-sdk');
	if (!configureButton) {
		const res = await setup({
			config: {
				insertButtonText: 'Submit feedback',
				defaultRecordingType: RecordingType.ScreenOnly
			},

			publicAppId: PUBLIC_APP_ID
		});
		configureButton = res.configureButton;
	}

	let authData = get(auth);
	let email = 'unknown@example.com';
	if (authData.user) {
		email = authData.user.email;
	}

	const sdkButton = configureButton({
		element: el,
		hooks: {
			onRecordingComplete(video) {
				console.log('onRecordingComplete', video);
			},
			onUploadComplete(video) {
				console.log('onUploadComplete', video);
			},
			async onInsertClicked(a) {
				console.log('onInsertClicked', a);

				await fetch(
					'https://docs.google.com/forms/u/0/d/e/1FAIpQLSc94d0YYv4Xf6TnkeNyaOVlFDfLYWC4GQgkWbtAcgaocfgnxQ/formResponse',
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
						},
						body: new URLSearchParams({
							'entry.2005620554': 'Loom submission',
							'entry.2093053442': email,
							'entry.1474479481': 'Loom submission',
							'entry.835702085': 'Loom video link: ' + a.sharedUrl
						}).toString()
					}
				).then((res) => {
					return res.text();
				});
			}
		}
	});
}
