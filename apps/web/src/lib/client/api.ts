import type { CadTreeNode } from '$lib/types/cad';
import type { ProjectComment, ProjectCommentReply } from '$lib/types/comment';
import type { MetadataProject, ProjectTreeNode } from '$lib/types/project';
import type { PublicUserInfo } from '$lib/types/user';
import type { User } from 'auth';
import type { EditorContext } from 'src/store/editor';
import { VertexBufferReader } from './VertexBuffer';
import { get } from 'svelte/store';

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
		anonymousName?: string;
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
		anonymousName?: string;
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

export const copyProject = createIdApiEndpointHelper<
	{
		name: string;
	},
	{
		id: string;
	}
>('POST', '/api/project/<id>/copy');

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

const USE_LOCAL_WASM_CONVERTER = true;
const USE_AUTODESK = true;

type AutodeskViewer = any;

function getAllDbIds(viewer: AutodeskViewer) {
	var instanceTree = viewer.model.getData().instanceTree;

	var allDbIdsStr = Object.keys(instanceTree.nodeAccess.dbIdToIndex);

	return allDbIdsStr.map(function (id) {
		return parseInt(id);
	});
}

async function convertAutodeskToObjects(viewer: AutodeskViewer): Promise<string> {
	let ids = getAllDbIds(viewer);
	let props = await new Promise((res) => {
		viewer.model.getBulkProperties(ids, { propFilter: null, ignoreHidden: false }, (e) => {
			res(e);
		});
	});

	let objects: any[] = [];

	const frags = viewer.model.getFragmentList();
	function listFragmentPrimitives(fragId) {
		const mesh = frags.getVizmesh(fragId);
		console.log(mesh);
		const vbr = new VertexBufferReader(mesh.geometry);
		console.log(vbr);
		let arcs: any[] = [];
		let lines: any[] = [];
		let ellipses: any[] = [];
		let tris: any[] = [];
		let quads: any[] = [];

		let lineGroups: Map<string, [number, number, number, number][]> = new Map();
		let triGroups: Map<string, [number, number, number, number, number, number][]> = new Map();
		function colorConv(n: number) {
			return (n & 0xffffff).toString(16).padStart(6, '0');
		}
		vbr.enumGeoms(null, {
			onLineSegment: function (x1, y1, x2, y2, vpId, lw, vindex) {
				var vpXform = viewer.model.getPageToModelTransform(vpId);
				var pt1 = new THREE.Vector3().set(x1, y1, 0).applyMatrix4(vpXform);
				var pt2 = new THREE.Vector3().set(x2, y2, 0).applyMatrix4(vpXform);
				let dbid = vbr.getDbIdAt(vindex);
				let color = colorConv(vbr.getColorAt(vindex));
				let key = `${dbid}|${color}`;
				let group = lineGroups.get(key);
				if (!group) {
					group = [];
					lineGroups.set(key, group);
				}

				group.push([pt1.x, pt1.y, pt2.x, pt2.y]);
			},
			onCircularArc: function (cx, cy, start, end, radius, vpId, vindex) {
				var vpXform = viewer.model.getPageToModelTransform(vpId);
				var pt1 = new THREE.Vector3().set(cx, cy, 0).applyMatrix4(vpXform);
				var pt2 = new THREE.Vector3().set(cx + radius, cy, 0).applyMatrix4(vpXform);

				let color = vbr.getColorAt(vindex).toString(16);
				let dbid = vbr.getDbIdAt(vindex);
				let realRadius = pt1.distanceTo(pt2);
				objects.push(['a', dbid, color, pt1.x, pt1.y, start, end, realRadius]);
				// arcs.push([cx, cy, start, end, radius]);
			},
			onEllipticalArc: function (cx, cy, start, end, major, minor, tilt, vpId) {
				// ellipses.push([cx, cy, start, end, major, minor, tilt]);
			},
			onOneTriangle: function (x1, y1, x2, y2, x3, y3, vpId, vindex) {
				var vpXform = viewer.model.getPageToModelTransform(vpId);
				var pt1 = new THREE.Vector3().set(x1, y1, 0).applyMatrix4(vpXform);
				var pt2 = new THREE.Vector3().set(x2, y2, 0).applyMatrix4(vpXform);
				var pt3 = new THREE.Vector3().set(x3, y3, 0).applyMatrix4(vpXform);
				let dbid = vbr.getDbIdAt(vindex);
				let color = colorConv(vbr.getColorAt(vindex));
				let key = `${dbid}|${color}`;
				let group = triGroups.get(key);
				if (!group) {
					group = [];
					triGroups.set(key, group);
				}

				group.push([pt1.x, pt1.y, pt2.x, pt2.y, pt3.x, pt3.y]);
			},
			onTexQuad: function (cx, cy, width, height, rotation, vpId) {
				// quads.push([cx, cy, width, height, rotation]);
			}
		});

		for (let [key, group] of lineGroups) {
			let split = key.split('|');
			objects.push(['l', split[0], split[1], group]);
		}

		for (let [key, group] of triGroups) {
			let split = key.split('|');
			objects.push(['t', split[0], split[1], group]);
		}

		// objects.push({
		// 	type: 'frag',
		// 	id: fragId,
		// 	arcs,
		// 	lines,
		// 	ellipses,
		// 	tris,
		// 	quads
		// });
	}
	for (let i = 0; i < frags.fragments.length; i++) {
		listFragmentPrimitives(i);
	}

	let lineSize = 1 / 1000; // 1mm
	let purgeCount = 0;

	while (purgeCount < 100 && JSON.stringify(objects).length > 1024 * 1024 * 47) {
		lineSize *= 2;
		purgeCount++;
		// Still too big, remove small lines
		console.log('removing small lines');
		for (let fragI = objects.length - 1; fragI >= 0; fragI--) {
			let frag = objects[fragI];
			let type = frag[0];
			let dbid = frag[2];
			let color = frag[2];
			if (type == 't') {
				for (let i = frag[3].length - 1; i >= 0; i--) {
					let t = frag[3][i];

					let c1 = [t[0], t[1]];
					let c2 = [t[2], t[3]];
					let c3 = [t[4], t[5]];
					let x1 = c1[0];
					let y1 = c1[1];
					let x2 = c2[0];
					let y2 = c2[1];
					let x3 = c3[0];
					let y3 = c3[1];
					let triangleArea = 0.5 * Math.abs(x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
					if (triangleArea < lineSize) {
						frag[3].splice(i, 1);
					}
				}

				if (frag[3].length == 0) {
					objects.splice(fragI, 1);
				}
			} else if (type == 'l') {
				for (let i = frag[3].length - 1; i >= 0; i--) {
					let l = frag[3][i];
					let dist = Math.sqrt((l[0] - l[2]) ** 2 + (l[1] - l[3]) ** 2);
					if (dist < lineSize) {
						frag[3].splice(i, 1);
					}
				}
				if (frag[3].length == 0) {
					objects.splice(fragI, 1);
				}
			} else if (type == 'a') {
				if (frag[7] < lineSize) {
					objects.splice(fragI, 1);
				}
			}
		}
	}

	if (JSON.stringify(props).length > 1024 * 1024 * 4) {
		props = [];
	}

	return JSON.stringify({
		type: 'autodesk-v1',
		metadata: viewer.model.getData().metadata,
		props,
		objects
	});
}

let globalViewer: any = null;

async function uploadDwgToDxf(dwg: any): Promise<any> {
	let arrBufIn = new Uint8Array(await dwg.arrayBuffer());
	let result = await fetch('https://autodesk.server-a.workers.dev', {
		method: 'POST',
		body: arrBufIn,
		headers: {
			'Content-Type': 'application/octet-stream',
			'Content-Disposition': 'attachment; filename=file.dwg'
		}
	}).then((r) => r.json());

	return result;
}

async function convertDwgToDxf(uploadedDwgData: any): Promise<any> {
	if (USE_AUTODESK) {
		return await new Promise(async (restop, reject) => {
			let result = uploadedDwgData;
			// let result = {
			// 	accessToken:
			// 		'eyJhbGciOiJSUzI1NiIsImtpZCI6IlU3c0dGRldUTzlBekNhSzBqZURRM2dQZXBURVdWN2VhIiwicGkuYXRtIjoiN3ozaCJ9',
			// 	fileUrn: 'dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6Y2FkLW1hcHBlci10ZXN0L3Rlc3Q3Njg1My5kd2c'
			// };
			if (!globalViewer) {
				globalViewer = await new Promise((resolve, reject) => {
					let script = document.createElement('script');
					let style = document.createElement('link');
					style.rel = 'stylesheet';
					style.href =
						'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css';
					style.type = 'text/css';
					script.src =
						'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js';

					document.head.appendChild(style);
					document.head.appendChild(script);

					let viewDiv = document.createElement('div');
					viewDiv.id = 'forgeViewer';
					viewDiv.style.position = 'fixed';
					viewDiv.style.zIndex = '1000';
					viewDiv.style.left = '0px';
					viewDiv.style.top = '0px';
					viewDiv.style.width = '100%';
					viewDiv.style.height = '100%';
					viewDiv.style.opacity = '0';
					viewDiv.style.pointerEvents = 'none';

					document.body.appendChild(viewDiv);

					script.onload = () => {
						var viewer;
						var options = {
							env: 'AutodeskProduction2',
							api: 'streamingV2', // for models uploaded to EMEA change this option to 'streamingV2_EU'
							getAccessToken: function (onTokenReady) {
								var token = result.accessToken;
								var timeInSeconds = 3600; // Use value provided by APS Authentication (OAuth) API
								onTokenReady(token, timeInSeconds);
							}
						};

						Autodesk.Viewing.Initializer(options, async function () {
							var htmlDiv = document.getElementById('forgeViewer');
							viewer = new Autodesk.Viewing.GuiViewer3D(htmlDiv);
							var startedCode = viewer.start();
							if (startedCode > 0) {
								console.error('Failed to create a Viewer: WebGL not supported.');
								return;
							}

							console.log('Initialization complete, loading a model next...');

							resolve(viewer);
						});
					};
				});
			}

			function loadDocument(documentId) {
				return new Promise((resolvei, reject) => {
					let viewer = globalViewer;
					Autodesk.Viewing.Document.load(documentId, onDocumentLoadSuccess, onDocumentLoadFailure);
					async function onDocumentLoadSuccess(viewerDocument) {
						var defaultModel = viewerDocument.getRoot().getDefaultGeometry();
						viewer.loadDocumentNode(viewerDocument, defaultModel);
						// viewer.console.log(viewer);
						while (
							!viewer.model ||
							!viewer.model.getData() ||
							!viewer.model.getData().instanceTree
						) {
							await new Promise((resolve) => setTimeout(resolve, 1000));
						}
						let raw = await convertAutodeskToObjects(viewer);
						// viewer.finish();

						viewer = null;
						//Autodesk.Viewing.shutdown();
						resolvei(raw);
					}
					function onDocumentLoadFailure() {
						console.error('Failed fetching Forge manifest');
					}
				});
			}

			restop(loadDocument('urn:' + result.fileUrn));
		});
		if (USE_LOCAL_WASM_CONVERTER) {
			const createMyModule = (await import('src/lib/client/dwg2dxf/dwg2dxf_module.js')).default;
			let arrBufIn = new Uint8Array(await dwg.arrayBuffer());
			return new Promise((resolve, reject) => {
				console.log('Using local WASM converter', arrBufIn);
				var ModuleInit = {
					arguments: ['/t.dwg'],
					print: function (text) {
						console.log(text);
					},
					printErr: function (text) {
						console.error(text);
					},
					preRun: function () {
						let FS = ModuleInit.FS;
						var data = arrBufIn;
						var stream = FS.open('/t.dwg', 'w+');
						FS.write(stream, data, 0, data.length, 0);
						FS.close(stream);
					},
					postRun: function () {
						let FS = ModuleInit.FS;
						let stat = FS.stat('/t.dxf');
						let stream2 = FS.open('/t.dxf', 'r');
						var buf = new Uint8Array(stat.size);
						FS.read(stream2, buf, 0, stat.size, 0);
						FS.close(stream2);

						resolve(new TextDecoder('ascii').decode(buf));
					}
				};
				createMyModule(ModuleInit);
			});
		} else {
			let endpoint = 'https://dwg2dxf.server-a.workers.dev';
			const formData = new FormData();
			formData.append('file', dwg);
			let res = fetch(endpoint, {
				method: 'POST',
				body: formData
			});

			return await res.then((res) => res.text());
		}
	}
}

export async function processCadUploads(
	editor: EditorContext,
	files: FileList,
	targetFolder: number | null = null
): Promise<string[]> {
	editor.uploadInProgress.set(true);
	let promises: Promise<string>[] = [];
	editor.uploadStatus.set('idle');

	let uploads: { name: string; data: any; id: number }[] = [];

	function updateUpload(
		id: number,
		status: 'initializing' | 'uploading' | 'converting' | 'queued' | 'done' | 'error',
		progress: number
	) {
		let u = get(editor.uploads);
		u[id].status = status;
		u[id].progress = progress;
		editor.uploads.set(u);
	}

	let counter = -1;
	editor.uploads.set(
		[...files].map((f) => ({
			name: f.name,
			status: 'initializing',
			progress: 0
		}))
	);
	for (let f of files) {
		counter++;
		let i = counter;
		if (f.name.endsWith('.dwg')) {
			promises.push(
				new Promise((resolve, reject) => {
					// let uploadToast = editor.info("Uploading '" + f.name + "'...", 50000);
					// editor.uploadStatus.set('uploading');
					let reader = new FileReader();
					reader.onload = async (e) => {
						let data = e.target?.result;
						if (data) {
							// uploadToast();
							// let convertToast = editor.info("Converting '" + f.name + "'...", 50000);
							editor.uploadStatus.set('processing');
							updateUpload(i, 'uploading', 10);
							try {
								let data = await uploadDwgToDxf(f);
								updateUpload(i, 'queued', 60);
								uploads.push({
									data,
									name: f.name,
									id: i
								});
								resolve(data);
							} catch (e) {
								updateUpload(i, 'error', 0);
								console.error(e);
								// convertToast();
								editor.alert("Failed to convert '" + f.name + "'");
								editor.uploadStatus.set('idle');
								reject();
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

	await Promise.all(promises);

	let finals = [];

	for (let upload of uploads) {
		updateUpload(upload.id, 'converting', 65);
		let dxf = await convertDwgToDxf(upload.data);

		updateUpload(upload.id, 'converting', 95);

		let cad = await createCad({
			data: dxf,
			description: '',
			filename: upload.name,
			lat: 0,
			long: 0,
			name: upload.name,
			parent: targetFolder
		});

		updateUpload(upload.id, 'done', 100);

		// createToast();

		editor.uploadStatus.set('finished');
		editor.uploadId.set(cad.data.cadId);
		editor.uploadCounter.update((x) => x + 1);
		finals.push(cad.data.cadId);
	}

	editor.uploadInProgress.set(false);
	return finals;
}
