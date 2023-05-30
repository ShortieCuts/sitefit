import type { CadTreeNode } from '$lib/types/cad';
import type { ProjectComment, ProjectCommentReply } from '$lib/types/comment';
import type { MetadataProject, ProjectTreeNode } from '$lib/types/project';
import type { PublicUserInfo } from '$lib/types/user';
import type { User } from 'auth';
import type { EditorContext } from 'src/store/editor';

export async function getAuthHeader(): Promise<string> {
	let { firebaseAuth } = await import('src/store/firebase');
	let user = firebaseAuth.currentUser;
	if (firebaseAuth.currentUser) {
		return `Bearer ${await firebaseAuth.currentUser.getIdToken()}`;
	} else {
		return '';
	}
}

export function createApiEndpointHelper<T extends undefined, A>(
	method: string,
	endpoint: string
): () => Promise<{ data: A; error: boolean; message: string }>;
export function createApiEndpointHelper<T, A>(
	method: string,
	endpoint: string
): (
	payload: T & { _accessToken?: string }
) => Promise<{ data: A; error: boolean; message: string }>;
export function createApiEndpointHelper<T, A>(
	method: string,
	endpoint: string
): (
	payload: T & { _accessToken?: string }
) => Promise<{ data: A; error: boolean; message: string }> {
	return async (payload: T & { _accessToken?: string }) => {
		let res = await fetch(endpoint, {
			method,
			...(method != 'GET'
				? {
						headers: {
							'Content-Type': 'application/json',
							// Authorization: await getAuthHeader()
							...(endpoint == '/api/user/session'
								? {
										Authorization: await getAuthHeader()
								  }
								: {}),
							...(payload && typeof payload._accessToken !== 'undefined'
								? {
										'X-access-token': `${payload._accessToken}`
								  }
								: {})
						},
						body: JSON.stringify(payload)
				  }
				: {
						headers: {
							// Authorization: await getAuthHeader()
						}
				  })
		});

		let status = res.status;

		res = await res.json();
		if (status >= 400) {
			return {
				data: null as any,
				error: true,
				message: (res as any).error
			};
		} else {
			return {
				data: res as any as A,
				error: false,
				message: ''
			};
		}
	};
}

export function createIdApiEndpointHelper<T extends undefined, A>(
	method: string,
	endpoint: string
): (id: string) => Promise<{ data: A; error: boolean; message: string }>;
export function createIdApiEndpointHelper<T, A>(
	method: string,
	endpoint: string
): (
	id: string,
	payload: T & { _accessToken?: string }
) => Promise<{ data: A; error: boolean; message: string }>;
export function createIdApiEndpointHelper<T, A>(
	method: string,
	endpoint: string
): (
	id: string,
	payload: T & { _accessToken?: string }
) => Promise<{ data: A; error: boolean; message: string }> {
	return async (id: string, payload: T & { _accessToken?: string }) => {
		let realEndpoint = endpoint.replace('<id>', id);
		return createApiEndpointHelper<T, A>(method, realEndpoint)(payload);
	};
}
export function create2IdApiEndpointHelper<T, A>(
	method: string,
	endpoint: string
): (
	id1: string,
	id2: string,
	payload: T & { _accessToken?: string }
) => Promise<{ data: A; error: boolean; message: string }> {
	return async (id1: string, id2: string, payload: T & { _accessToken?: string }) => {
		let realEndpoint = endpoint.replace('<id1>', id1).replace('<id2>', id2);
		return createApiEndpointHelper<T, A>(method, realEndpoint)(payload);
	};
}

export const createProject = createApiEndpointHelper<
	{
		name: string;
		description: string;
	},
	{
		projectId: string;
	}
>('POST', '/api/project');

export const createProjectFolder = createApiEndpointHelper<
	{
		parentId: string;
	},
	{
		folderId: string;
	}
>('POST', '/api/project/folder');

export const updateProjectFolder = createIdApiEndpointHelper<
	{
		name?: string;
		parentId?: string;
	},
	{
		success: boolean;
	}
>('POST', '/api/project/folder/<id>');

export const updateProjectFile = createIdApiEndpointHelper<
	{
		name?: string;
		parentId?: string;
	},
	{
		success: boolean;
	}
>('POST', '/api/project/<id>');

export const getProjects = createApiEndpointHelper<{}, ProjectTreeNode>('POST', '/api/projects');

export const createSession = createApiEndpointHelper<
	{
		delete: boolean;
	},
	{
		success: boolean;
	}
>('POST', '/api/user/session');

export const getMe = createApiEndpointHelper<undefined, User>('POST', '/api/user/me');

export const updateMe = createApiEndpointHelper<
	{
		firstName: string;
		lastName: string;
	},
	{
		success: boolean;
	}
>('POST', '/api/user/update');

export const createComment = createIdApiEndpointHelper<
	{
		longitude: number;
		latitude: number;
		text: string;
	},
	{
		id: bigint;
	}
>('POST', '/api/project/<id>/comment');

export const deleteComment = create2IdApiEndpointHelper<{}, {}>(
	'DELETE',
	'/api/project/<id1>/comment/<id2>'
);

export const updateComment = create2IdApiEndpointHelper<
	{
		text: string;
	},
	{}
>('POST', '/api/project/<id1>/comment/<id2>');

export const replyToComment = create2IdApiEndpointHelper<
	{
		text: string;
	},
	{}
>('POST', '/api/project/<id1>/comment/<id2>/reply');

export const getCommentReplies = create2IdApiEndpointHelper<
	{},
	{
		replies: ProjectCommentReply[];
	}
>('POST', '/api/project/<id1>/comment/<id2>/replies');

export const markCommentRead = create2IdApiEndpointHelper<
	{
		markUnread: boolean;
	},
	{}
>('POST', '/api/project/<id1>/comment/<id2>/read');

export const getComments = createIdApiEndpointHelper<
	{
		sortBy: 'unread' | 'date';
	},
	{
		comments: ProjectComment[];
	}
>('POST', '/api/project/<id>/comments');

export const getProjectMetadata = createIdApiEndpointHelper<{}, MetadataProject>(
	'POST',
	'/api/project/<id>/metadata'
);

export const writeProjectAccess = createIdApiEndpointHelper<
	{
		mode: 'grant' | 'revoke' | 'blanketMode' | 'blanketSet';
		email?: string;
		access?: 'READ' | 'WRITE' | 'COMMENT';
		blanketMode?: boolean;
	},
	MetadataProject
>('POST', '/api/project/<id>/access');

export const getUserInfo = createIdApiEndpointHelper<{}, PublicUserInfo>('POST', '/api/user/<id>');

export const createCad = createApiEndpointHelper<
	{
		name: string;
		description: string;
		filename: string;
		long: number;
		lat: number;
		data: string;
		parent?: number | null;
	},
	{
		cadId: string;
	}
>('POST', '/api/cad');

export const getCads = createApiEndpointHelper<{}, CadTreeNode>('POST', '/api/cads');

export const createCadFolder = createApiEndpointHelper<
	{
		parentId: string;
	},
	{
		folderId: string;
	}
>('POST', '/api/cad/folder');

export const updateCadFolder = createIdApiEndpointHelper<
	{
		name?: string;
		parentId?: string;
	},
	{
		success: boolean;
	}
>('POST', '/api/cad/folder/<id>');

export const updateCadFile = createIdApiEndpointHelper<
	{
		name?: string;
		parentId?: string;
	},
	{
		success: boolean;
	}
>('POST', '/api/cad/<id>');

async function convertDwgToDxf(dwg: any): Promise<any> {
	let endpoint = 'https://dwg2dxf.server-a.workers.dev';
	const formData = new FormData();
	formData.append('file', dwg);
	let res = fetch(endpoint, {
		method: 'POST',
		body: formData
	});

	return await res.then((res) => res.text());
}

export async function processCadUploads(
	editor: EditorContext,
	files: FileList,
	targetFolder: number | null = null
): Promise<string[]> {
	let promises: Promise<string>[] = [];
	editor.uploadStatus.set('idle');

	for (let f of files) {
		if (f.name.endsWith('.dwg')) {
			promises.push(
				new Promise((resolve, reject) => {
					let uploadToast = editor.info("Uploading '" + f.name + "'...", 50000);
					editor.uploadStatus.set('uploading');
					let reader = new FileReader();
					reader.onload = async (e) => {
						let data = e.target?.result;
						if (data) {
							uploadToast();
							let convertToast = editor.info("Converting '" + f.name + "'...", 50000);
							editor.uploadStatus.set('processing');
							try {
								let dxf = await convertDwgToDxf(f);
								convertToast();
								let createToast = editor.info("Finalizing '" + f.name + "'...", 50000);

								let cad = await createCad({
									data: dxf,
									description: '',
									filename: f.name,
									lat: 0,
									long: 0,
									name: f.name,
									parent: targetFolder
								});

								createToast();
								editor.info("Finished '" + f.name + "'");
								editor.uploadStatus.set('finished');
								editor.uploadId.set(cad.data.cadId);
								editor.uploadCounter.update((x) => x + 1);
								resolve(cad.data.cadId);
							} catch (e) {
								convertToast();
								editor.alert("Failed to convert '" + f.name + "'");
								editor.uploadStatus.set('idle');
							}
						} else {
							reject();
						}
					};
					reader.readAsText(f);
				})
			);
		}
	}

	return Promise.all(promises);
}
