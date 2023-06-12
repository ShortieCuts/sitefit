import { get, writable, readable, type Readable, type Writable } from 'svelte/store';
import {
	Arc,
	Cornerstone,
	isBatch,
	isCommitTransaction,
	isJoin,
	isLeave,
	isSync,
	isWriteGlobalProperty,
	Object2D,
	ObjectType,
	Path,
	Project,
	ProjectTransaction,
	SocketMessage,
	type GlobalProjectPropertiesKey,
	type ObjectID,
	type PropertyMutation,
	Group,
	isSetAccessLevel,
	isRefresh
} from 'core';
import { getContext, setContext } from 'svelte';
import {
	createComment,
	deleteComment,
	getAuthHeader,
	getCads,
	getCommentReplies,
	getComments,
	getProjectMetadata,
	markCommentRead,
	replyToComment,
	updateComment,
	writeProjectAccess
} from '$lib/client/api';
import { dev } from '$app/environment';
import { auth, getSession } from './auth';
import { nanoid } from 'nanoid';
import type { ThreeJSOverlayView } from '@googlemaps/three';
import { translateDXF } from '$lib/util/dxf';
import { getCadsStore } from './cads';
import type { CadTreeNode } from '$lib/types/cad';
import * as THREE from 'three';
import Flatten from '@flatten-js/core';
import LZString from 'lz-string';
import type { UserAccessInfo } from '$lib/types/user';
import type { MetadataProject } from '$lib/types/project';
import { isMobile } from './responsive';
import type { ProjectComment, ProjectCommentReply } from '$lib/types/comment';
import { cookieName } from './name';

export const WEBSOCKET_URL = dev ? 'localhost:8787' : 'engine.cad-mapper.workers.dev';

export type ProjectAccessLevel = 'READ' | 'WRITE' | 'COMMENT';

export type ProjectAccessList = {
	items: UserAccessInfo[];
	blanketAccess: ProjectAccessLevel;
	blanketAccessGranted: boolean;
};

export type ProjectMetadata = {
	name: Writable<string>;
	description: Writable<string>;

	/** Readonly store */
	createdAt: Writable<Date>;

	/** Readonly store */
	updatedAt: Writable<Date>;

	/** Readonly store */
	access: Writable<ProjectAccessList>;
};

export type ProjectSession = {
	uid: string;
	userId: string;
	color: string;
};

function rotateAboutOrigin(p: [number, number], angle: number): [number, number] {
	let x = p[0];
	let y = p[1];

	let cos = Math.cos(angle);
	let sin = Math.sin(angle);

	let nx = x * cos - y * sin;
	let ny = x * sin + y * cos;

	return [nx, ny];
}

export class ProjectBroker {
	projectId: string;
	metadataDirty: boolean = false;
	metadata: ProjectMetadata;
	error: Writable<string | null> = writable(null);

	loading: Writable<boolean> = writable(true);
	pushing: Writable<boolean> = writable(false);
	connected: Writable<boolean> = writable(false);
	syncing: Writable<boolean> = writable(false);
	broken: Writable<boolean> = writable(false);
	establishingConnection: boolean = false;

	lastCommunication: number = 0;

	sessions: Writable<ProjectSession[]> = writable([]);
	mySessionUid: Writable<string> = writable('');

	sessionAccess: Writable<ProjectAccessLevel> = writable('READ');

	private realMetadata: ProjectMetadata;

	project: Project;

	accessToken?: string;

	private socket: WebSocket | null = null;

	private enqueuedMetadataPush: NodeJS.Timeout | null = null;

	globalPropertyStores: Map<string, Writable<any>> = new Map();
	objectPropertyStores: Map<string, Writable<any>> = new Map();

	objectTreeWatcher: Writable<number> = writable(0);
	transactionWatcher: Writable<number> = writable(0);

	rendererDirtyObjects = new Set<string>();
	needsRender: Writable<boolean> = writable(false);

	undo: Writable<ProjectTransaction[]> = writable([]);
	redo: Writable<ProjectTransaction[]> = writable([]);

	private queuedMessages: SocketMessage[] = [];
	private messageQueueTimeout: NodeJS.Timeout | null = null;

	synced: Writable<boolean> = writable(false);

	stagingObject: Writable<Object2D | null> = writable(null);

	reconnectAttemptsRemaining: number = 5;

	rootComments: Writable<ProjectComment[]> = writable([]);
	replyStores: Map<string, Writable<ProjectCommentReply[]>> = new Map();

	constructor(id: string, accessToken?: string) {
		this.projectId = id;
		this.accessToken = accessToken;
		this.metadata = {
			name: writable(''),
			description: writable(''),
			createdAt: writable(new Date()),
			updatedAt: writable(new Date()),

			access: writable({
				items: [],
				blanketAccess: 'READ',
				blanketAccessGranted: false
			})
		};

		this.realMetadata = {
			name: writable(''),
			description: writable(''),
			createdAt: writable(new Date()),
			updatedAt: writable(new Date()),
			access: writable({
				items: [],
				blanketAccess: 'READ',
				blanketAccessGranted: false
			})
		};

		this.project = new Project(id);

		if (typeof window !== 'undefined') {
			(async () => {
				this.loading.set(true);
				await this.pullMetadata();
				await this.refreshComments();
				this.syncing.set(true);
				this.loading.set(false);

				this.establishConnection();

				setInterval(() => {
					// Ping every 15 seconds
					if (get(this.mySessionUid)) {
						console.log('Pinging server...');
						this.socket?.send(LZString.compressToUint8Array(JSON.stringify({ type: 'ping' })));
					}
				}, 15000);
			})();
		}
	}

	async retry() {
		this.error.set(null);
		this.loading.set(true);
		await this.pullMetadata();
		this.loading.set(false);

		this.establishConnection();
	}

	async setBlanketAccess(access: ProjectAccessLevel) {
		let res = await writeProjectAccess(this.projectId, {
			mode: 'blanketSet',
			access
		});

		if (res.data) {
			this.updateMetadataFromServer(res.data);
			this.dispatchAccessRefreshMesssage();
		}
	}

	async setBlanketAccessMode(isPublic: boolean) {
		let res = await writeProjectAccess(this.projectId, {
			mode: 'blanketMode',
			blanketMode: isPublic
		});

		if (res.data) {
			this.updateMetadataFromServer(res.data);
			this.dispatchAccessRefreshMesssage();
		}
	}

	async grantAccess(email: string, access: ProjectAccessLevel) {
		let res = await writeProjectAccess(this.projectId, {
			mode: 'grant',
			email,
			access
		});

		if (res.data) {
			this.updateMetadataFromServer(res.data);
			this.dispatchAccessRefreshMesssage();
		}
	}

	async revokeAccess(email: string) {
		let res = await writeProjectAccess(this.projectId, {
			mode: 'revoke',
			email
		});

		if (res.data) {
			this.updateMetadataFromServer(res.data);
			this.dispatchAccessRefreshMesssage();
		}
	}

	async mutatedComment() {
		await this.refreshComments();
		this.sendMessage(SocketMessage.refresh('comments'));
	}

	async mutatedReply(parentId: number) {
		await this.refreshCommentReplies(parentId);
		this.sendMessage(SocketMessage.refresh('replies', parentId));
	}

	async createComment(longitude: number, latitude: number, text: string) {
		if (!get(auth).user) {
			let newId = await createComment(this.projectId, {
				longitude,
				latitude,
				text,
				anonymousName: get(cookieName) || 'Anonymous'
			});

			if (newId.data) {
				await this.mutatedComment();
			}
		} else {
			let newId = await createComment(this.projectId, {
				longitude,
				latitude,
				text
			});

			if (newId.data) {
				await this.mutatedComment();
			}
		}
	}

	async deleteComment(id: number) {
		let res = await deleteComment(this.projectId, id.toString(), {});
		if (!res.error) {
			await this.mutatedComment();
		}
	}

	async updateComment(id: number, text: string) {
		let res = await updateComment(this.projectId, id.toString(), {
			text
		});
		if (!res.error) {
			await this.mutatedComment();
		}
	}

	async replyToComment(id: number, text: string) {
		await replyToComment(this.projectId, id.toString(), {
			text,
			anonymousName: get(cookieName) || 'Anonymous'
		});

		await this.mutatedReply(id);
	}

	async markCommentRead(id: number) {
		await markCommentRead(this.projectId, id.toString(), {
			markUnread: false
		});

		this.rootComments.update((comments) => {
			let newComments = [...comments];
			let index = newComments.findIndex((c) => c.id == id);
			if (index !== -1) {
				newComments[index].read = true;
			}

			return newComments;
		});
	}

	async markCommentUnread(id: number) {
		await markCommentRead(this.projectId, id.toString(), {
			markUnread: true
		});

		this.rootComments.update((comments) => {
			let newComments = [...comments];
			let index = newComments.findIndex((c) => c.id == id);
			if (index !== -1) {
				newComments[index].read = false;
			}

			return newComments;
		});
	}

	async refreshComments() {
		let res = await getComments(this.projectId, {
			sortBy: 'unread'
		});

		if (res.data) {
			this.rootComments.set(res.data.comments);
		}
	}

	dispatchAccessRefreshMesssage() {
		this.enqueueMessage(SocketMessage.refresh('access'));
	}

	dispose() {
		console.log('Disposing project broker');
		this.socket?.close();
	}

	commitStagedObject() {
		let staging = get(this.stagingObject);
		if (staging) {
			let id = this.createObject(staging);
			this.stagingObject.set(null);

			return id;
		} else {
			return null;
		}
	}

	allocateId(existing?: string[]) {
		existing = existing ?? [];
		let id = '';
		while (!id || existing.includes(id) || this.project.objectsMap.has(id)) {
			id = `${get(this.mySessionUid)}${nanoid(6)}`;
		}

		return id;
	}

	async placeCad(id: string, position: [number, number], rotation: number = 0) {
		if (!this.canWrite()) return;

		let cads = await getCads({});

		function findCad(id: string, children: CadTreeNode[]): CadTreeNode | null {
			for (const child of children) {
				if (child.id == id) {
					return child;
				}

				if (child.children) {
					let found = findCad(id, child.children);
					if (found) {
						return found;
					}
				}
			}

			return null;
		}

		let cadInfo = findCad(id, cads.data.children);
		if (!cadInfo) {
			return;
		}
		let rawDXF = await fetch('/api/cad/' + id).then((res) => res.text());

		let objects = translateDXF(rawDXF);
		if (!objects) {
			return;
		}

		let prefixId = this.allocateId();
		let transaction = this.project.createTransaction();
		let rootId = '';
		for (const obj of objects) {
			if (obj.id == 'root') {
				obj.name = cadInfo.name;
				obj.originalCad = id;
				rootId = prefixId + obj.id;
			}
			obj.id = prefixId + obj.id;
			if (obj.parent) {
				obj.parent = prefixId + obj.parent;
			}
			transaction.create(obj);
		}

		this.commitTransaction(transaction);

		// Center the cad to the position

		let bounds = this.project.computeBounds(rootId);
		let center = [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2] as [
			number,
			number
		];

		let trans = this.project.translateObject(
			rootId,
			position[0] - center[0],
			position[1] - center[1]
		);
		this.commitTransaction(trans, true);
	}

	createObject(obj: Object2D) {
		let uid = this.allocateId();
		obj.id = uid;

		let transaction = this.project.createTransaction();
		transaction.create(obj);
		this.commitTransaction(transaction);

		return uid;
	}

	canWrite() {
		return get(this.sessionAccess) == 'WRITE';
	}

	commitUndo() {
		if (!this.canWrite()) return;
		let undo = get(this.undo);
		if (undo.length === 0) {
			return;
		}

		let transaction = undo[undo.length - 1];
		this.undo.update((u) => u.slice(0, u.length - 1));
		let redoTransaction = this.project.computeInverseTransaction(transaction);
		this.redo.update((r) => [...r, redoTransaction]);

		this.commitTransaction(transaction, true);
	}

	commitRedo() {
		if (!this.canWrite()) return;
		let redo = get(this.redo);
		if (redo.length === 0) {
			return;
		}

		let transaction = redo[redo.length - 1];
		this.redo.update((r) => r.slice(0, r.length - 1));
		let undoTransaction = this.project.computeInverseTransaction(transaction);
		this.undo.update((u) => [...u, undoTransaction]);
		this.commitTransaction(transaction, true);
	}

	commitTransaction(transaction: ProjectTransaction, skipUndo: boolean = false) {
		if (!this.canWrite()) return;
		if (!skipUndo) {
			let undoTransaction = this.project.computeInverseTransaction(transaction);
			this.undo.update((u) => [...u, undoTransaction]);
			this.redo.set([]);
		}
		let applied = this.project.applyTransaction(transaction);

		let didChangeTree = false;
		let changedObjects = new Set<string>();

		for (const mutation of applied) {
			if (mutation.type === 'create') {
				didChangeTree = true;
				changedObjects.add(mutation.subject);
			} else if (mutation.type === 'delete') {
				didChangeTree = true;
				changedObjects.add(mutation.subject);
			} else if (mutation.type === 'update') {
				if (mutation.data && (mutation.data as PropertyMutation)?.key === 'parent') {
					didChangeTree = true;
				}
				changedObjects.add(mutation.subject);
			}
		}

		if (didChangeTree) {
			this.objectTreeWatcher.update((n) => n + 1);
		}

		for (const obj of changedObjects) {
			this.objectPropertyStores.get(obj)?.update((n) => n + 1);
			this.rendererDirtyObjects.add(obj);
		}

		this.needsRender.set(true);

		this.transactionWatcher.update((n) => n + 1);

		this.enqueueMessage(SocketMessage.commitTransaction(transaction));
	}

	writableGlobalProperty<T>(key: GlobalProjectPropertiesKey, defaultValue: T): Writable<T> {
		let internalWritable = this.globalPropertyStores.get(key) as Writable<T>;
		if (!internalWritable) {
			internalWritable = writable(defaultValue);
			this.globalPropertyStores.set(key, internalWritable);
		}

		return {
			subscribe: internalWritable.subscribe,
			set: (value) => {
				this.enqueueMessage(SocketMessage.writeGlobalProperty(key, value));
				internalWritable.set(value);
			},
			update: (fn) => {
				internalWritable.update((value) => {
					let newValue = fn(value);
					this.enqueueMessage(SocketMessage.writeGlobalProperty(key, newValue));

					return newValue;
				});
			}
		};
	}

	watchCornerstone(): {
		geo: Readable<[number, number]>;
		heading: Readable<number>;
	} {
		return {
			geo: this.writableObjectProperty('_cornerstone', 'geo', [0, 0]),
			heading: this.writableObjectProperty('_cornerstone', 'heading', 0)
		};
	}

	getOrCreateCornerstoneBlock: null | Promise<void> = null;

	async getOrCreateCornerstone(): Promise<void> {
		if (this.getOrCreateCornerstoneBlock) {
			await this.getOrCreateCornerstoneBlock;
			return;
		}

		this.getOrCreateCornerstoneBlock = (async () => {
			let cornerstone = this.project.objectsMap.get('_cornerstone');
			if (!cornerstone) {
				let transaction = this.project.createTransaction();
				let obj = new Cornerstone();
				obj.id = '_cornerstone';
				obj.name = 'Cornerstone';
				obj.geo = [0, 0];
				obj.heading = 0;
				transaction.create(obj);
				this.commitTransaction(transaction);
			}
		})();

		await this.getOrCreateCornerstoneBlock;
		this.getOrCreateCornerstoneBlock = null;
	}

	async refreshCommentReplies(commentId: number) {
		if (this.replyStores.has(commentId.toString())) {
			let replies = await getCommentReplies(this.projectId, commentId.toString(), {});

			if (replies.data) {
				this.replyStores.get(commentId.toString())?.set(replies.data.replies);
			}
		}
	}

	watchCommentReplies(commentId: number) {
		let store = this.replyStores.get(commentId.toString());
		if (!store) {
			store = writable([]);
			this.replyStores.set(commentId.toString(), store);

			this.refreshCommentReplies(commentId);
		}

		return store;
	}

	normalizeVector(vector: THREE.Vector3): THREE.Vector3;
	normalizeVector(vector: [number, number]): [number, number];
	normalizeVector(vector: [number, number] | THREE.Vector3): [number, number] | THREE.Vector3 {
		let heading = 0;
		if (this.project.objectsMap.has('_cornerstone')) {
			let cornerstone = this.project.objectsMap.get('_cornerstone');
			if (cornerstone instanceof Cornerstone) {
				heading = cornerstone.heading;
			}
		}
		let rad = -(heading * Math.PI) / 180;

		if (vector instanceof THREE.Vector3) {
			let x = vector.x * Math.cos(rad) - vector.z * Math.sin(rad);
			let y = vector.x * Math.sin(rad) + vector.z * Math.cos(rad);
			return new THREE.Vector3(x, vector.y, y);
		} else {
			let x = vector[0] * Math.cos(rad) - vector[1] * Math.sin(rad);
			let y = vector[0] * Math.sin(rad) + vector[1] * Math.cos(rad);
			return [x, y];
		}
	}

	writableObjectProperty<T>(id: ObjectID, key: string, defaultValue: T): Writable<T> {
		let writableKey = `${id}.${key}`;

		let internalWritable = this.objectPropertyStores.get(writableKey) as Writable<T>;
		if (!internalWritable) {
			internalWritable = writable(defaultValue);
			this.objectPropertyStores.set(writableKey, internalWritable);
		}

		if (this.project.objectsMap.has(id)) {
			let obj = this.project.objectsMap.get(id);
			if (obj) {
				internalWritable.set((obj as any)[key] as T);
			}
		}

		const doTransaction = (value: T) => {
			let transaction = this.project.createTransaction();
			transaction.update(id, key, value);
			this.commitTransaction(transaction);
		};

		return {
			subscribe: internalWritable.subscribe,
			set: (value) => {
				doTransaction(value);
				internalWritable.set(value);
			},
			update: (fn) => {
				internalWritable.update((value) => {
					let newValue = fn(value);
					doTransaction(newValue);

					return newValue;
				});
			}
		};
	}

	enqueueMessage(message: SocketMessage) {
		this.queuedMessages.push(message);

		if (this.messageQueueTimeout) {
			clearTimeout(this.messageQueueTimeout);
		}

		this.messageQueueTimeout = setTimeout(() => {
			if (this.queuedMessages.length == 1) {
				this.sendMessage(this.queuedMessages[0]);
				this.queuedMessages = [];
			} else if (this.queuedMessages.length > 1) {
				this.sendMessage(SocketMessage.batch(this.queuedMessages));
				this.queuedMessages = [];
			}
		}, 1);
	}

	sendMessage(message: SocketMessage) {
		if (this.socket && this.socket.readyState === WebSocket.OPEN) {
			this.socket.send(LZString.compressToUint8Array(JSON.stringify(message)));
		}
	}

	establishConnection() {
		if (this.establishingConnection || get(this.connected)) {
			return;
		}

		this.establishingConnection = true;

		if (this.socket) {
			this.socket.close();
		}

		const wss = document.location.protocol === 'http:' ? 'ws://' : 'wss://';
		let ws = new WebSocket(wss + WEBSOCKET_URL + '/' + this.projectId + '/websocket');
		ws.binaryType = 'arraybuffer';
		this.socket = ws;

		ws.addEventListener('open', (event) => {
			this.syncing.set(true); // We expect to receive a Sync message soon
			this.connected.set(true);
			this.establishingConnection = false;
			(async () => {
				if (this.accessToken) {
					this.sendMessage(SocketMessage.login('!' + this.accessToken));
				} else {
					this.sendMessage(SocketMessage.login(await getSession()));
				}
			})();
		});

		ws.addEventListener('message', (event) => {
			let raw = LZString.decompressFromUint8Array(new Uint8Array(event.data as ArrayBuffer));

			let data = JSON.parse(raw);
			if (data) this.handleMessage(data);
		});

		ws.addEventListener('close', (event) => {
			this.establishingConnection = false;
			this.connected.set(false);
			this.sessions.set([]);
			this.reconnectAttemptsRemaining--;
			if (this.reconnectAttemptsRemaining > 0) {
				console.log('Reconnecting in 4 seconds...');
				setTimeout(() => {
					this.establishConnection();
				}, 4000);
			}
			console.log('WebSocket closed', event.code, event.reason);
		});

		ws.addEventListener('error', (event) => {
			this.establishingConnection = false;
			console.log('WebSocket error', event);
		});
	}

	handleJoin(session: ProjectSession) {
		let sessions = get(this.sessions);
		if (sessions.find((s) => s.uid === session.uid)) {
			return;
		}
		sessions.push(session);
		this.sessions.set(sessions);
	}

	handleLeave(uid: string) {
		let sessions = get(this.sessions);
		let index = sessions.findIndex((s) => s.uid === uid);
		if (index === -1) {
			return;
		}
		sessions.splice(index, 1);
		this.sessions.set(sessions);
	}

	handleSync(message: SocketMessage.SyncType) {
		this.mySessionUid.set(message.selfUid);

		for (let s of message.sessions) {
			this.handleJoin(s);
		}

		this.project.deserialize(message.project);
		this.markAllDirty();
		this.synced.set(true);
		this.broken.set(message.broken);
		this.objectTreeWatcher.update((n) => n + 1);
		this.syncing.set(false);
	}

	markAllDirty() {
		this.rendererDirtyObjects.clear();
		for (let obj of this.project.objects) {
			this.rendererDirtyObjects.add(obj.id);
		}

		for (let [key, store] of this.objectPropertyStores) {
			let [id, prop] = key.split('.');
			let obj = this.project.objectsMap.get(id);
			if (obj) {
				store.set((obj as any)[prop]);
			}
		}

		this.needsRender.set(true);

		for (let [key, store] of this.globalPropertyStores) {
			store.set(this.project.globalProperties[key] as any);
		}
	}

	markObjectDirty(id: ObjectID) {
		this.rendererDirtyObjects.add(id);

		for (let [key, store] of this.objectPropertyStores) {
			let [objId, prop] = key.split('.');
			if (objId === id) {
				let obj = this.project.objectsMap.get(id);
				if (obj) {
					store.set((obj as any)[prop]);
				}
			}
		}
	}

	handleMessage(message: SocketMessage) {
		if (isJoin(message)) {
			this.handleJoin(message);
		} else if (isLeave(message)) {
			this.handleLeave(message.uid);
		} else if (isSync(message)) {
			this.handleSync(message);
		} else if (isWriteGlobalProperty(message)) {
			this.project.globalProperties[message.key] = message.value;
			let store = this.globalPropertyStores.get(message.key);
			if (store) {
				store.set(message.value);
			}
		} else if (isCommitTransaction(message)) {
			let mutations = this.project.applyTransaction(message.transaction, false);
			for (let m of mutations) {
				this.rendererDirtyObjects.add(m.subject);
				if (m.type == 'update') {
					let store = this.objectPropertyStores.get(
						`${m.subject}.${(m.data as PropertyMutation).key}`
					);

					if (store) {
						store.set(
							(this.project.objectsMap.get(m.subject) as any)[(m.data as PropertyMutation).key]
						);
					}
				} else if (m.type == 'create') {
					this.objectTreeWatcher.update((n) => n + 1);
					this.markObjectDirty(m.subject);
				} else if (m.type == 'delete') {
					this.objectTreeWatcher.update((n) => n + 1);
					this.markObjectDirty(m.subject);
				}
			}

			this.needsRender.set(true);
			this.transactionWatcher.update((n) => n + 1);
		} else if (isBatch(message)) {
			for (let m of message.messages) {
				this.handleMessage(m);
			}
		} else if (isSetAccessLevel(message)) {
			this.sessionAccess.set(message.accessLevel);
		} else if (isRefresh(message)) {
			if (message.subject == 'access') {
				this.pullMetadata();
			} else if (message.subject == 'replies') {
				if (typeof message.payload == 'number')
					this.refreshCommentReplies(message.payload as number);
			} else if (message.subject == 'comments') {
				this.refreshComments();
			}
		}
	}

	addToMetadataWatcher(store: Readable<any>) {
		store.subscribe((value) => {
			this.metadataDirty = true;
			this.enqueueMetadataPush();
		});
	}

	enqueueMetadataPush() {
		if (this.metadataDirty) {
			if (this.enqueuedMetadataPush) {
				clearTimeout(this.enqueuedMetadataPush);
			}

			this.enqueuedMetadataPush = setTimeout(() => {
				this.pushMetadata();
			}, 1000);
		}
	}

	async pullMetadata() {
		// Fetch and fill metadata and realMetadata
		let response = await getProjectMetadata(this.project.id, {
			_accessToken: this.accessToken
		});

		if (response.error) {
			this.error.set(response.message);
			return;
		} else {
			let data = response.data;
			this.updateMetadataFromServer(data);
		}
	}

	updateMetadataFromServer(data: MetadataProject) {
		this.realMetadata.name.set(data.name);
		this.metadata.name.set(data.name);

		this.realMetadata.description.set(data.description);
		this.metadata.description.set(data.description);

		this.realMetadata.access.set(data.access);
		this.metadata.access.set(data.access);
	}

	pushMetadata() {
		// Diff and push updates
	}
}
function mirrorArc(startAngle: number, endAngle: number, mirrorX: boolean, mirrorY: boolean) {
	let start = [Math.cos(startAngle), Math.sin(startAngle)];
	let end = [Math.cos(endAngle), Math.sin(endAngle)];

	if (mirrorX) {
		start[0] *= -1;
		end[0] *= -1;
	}

	if (mirrorY) {
		start[1] *= -1;
		end[1] *= -1;
	}

	let a = {
		startAngle: Math.atan2(start[1], start[0]),
		endAngle: Math.atan2(end[1], end[0])
	};

	if (a.startAngle > a.endAngle) {
		a.endAngle += Math.PI * 2;
	}

	return a;
}

type Upload = {
	name: string;
	status: 'initializing' | 'uploading' | 'converting' | 'queued' | 'done' | 'error';
	progress: number;
};

export class EditorContext {
	activeTool: Writable<string> = writable('pan');
	measureToolCount: Writable<number> = writable(0);
	activeToolSmartObject: Writable<string> = writable('');
	activeToolSmartObjectProperties: Writable<any> = writable({});

	activeSVG: Writable<string> = writable('');

	activeDialog: Writable<string> = writable('');

	longitude: Writable<number> = writable(0);
	latitude: Writable<number> = writable(0);
	zoom: Writable<number> = writable(0);

	previewObjects: Writable<Object2D[]> = writable([]);
	needsPreviewRender: Writable<boolean> = writable(false);

	viewBounds: Writable<{
		minX: number;
		minY: number;
		maxX: number;
		maxY: number;
	}> = writable({
		minX: 0,
		minY: 0,
		maxX: 0,
		maxY: 0
	});

	stagingComment: Writable<{
		text: string;
		longitude: number;
		latitude: number;
	} | null> = writable(null);

	selectionDown: Writable<boolean> = writable(false);
	selectionStart: Writable<[number, number]> = writable([0, 0]);
	hoveringObject: Writable<ObjectID> = writable('');

	// This is written to by the renderer when using google
	warnFarObject: Writable<boolean> = writable(false);
	farObjects: Writable<ObjectID[]> = writable([]);

	translating: Writable<boolean> = writable(false);
	rotating: Writable<boolean> = writable(false);
	scaling: Writable<boolean> = writable(false);

	canScale: Writable<boolean> = writable(false);
	scaleDirection: Writable<[number, number]> = writable([0, 0]);
	canRotate: Writable<boolean> = writable(false);
	canTranslate: Writable<boolean> = writable(false);

	guides: Writable<{
		lines: [[number, number], [number, number]][];
		points: [number, number][];
	}> = writable({
		lines: [],
		points: []
	});

	transformOrigin: Writable<[number, number]> = writable([0, 0]);

	selectToolCursor: Writable<string> = writable('default');

	screenScale: Writable<number> = writable(1);

	focusComment: Writable<number> = writable(0);

	rootGroup: Writable<ObjectID | null> = writable(null);
	editingObject: Writable<ObjectID | null> = writable(null);

	selection: Writable<ObjectID[]> = writable([]);
	/** Includes the children of selected groups */
	effectiveSelection: Writable<ObjectID[]> = writable([]);
	overlay: Writable<ThreeJSOverlayView | null> = writable(null);
	map: Writable<google.maps.Map | null> = writable(null);

	broker: ProjectBroker;

	fileInput: Writable<HTMLInputElement | null> = writable(null);
	uploadStatus: Writable<'idle' | 'uploading' | 'processing' | 'finished'> = writable('idle');
	uploadCounter: Writable<number> = writable(0);
	uploadId: Writable<string> = writable('');

	uploadInProgress: Writable<boolean> = writable(false);
	uploads: Writable<Upload[]> = writable([]);

	toasts: Writable<
		{
			id: string;
			message: string;
			type: 'info' | 'error' | 'warn';
		}[]
	> = writable([]);

	desiredPosition: [number, number] = [0, 0];
	mobileToolMode: Writable<'transform' | ''> = writable('');

	currentToolHandlers: {
		onDown: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => void;
		onUp: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => void;
		onMove: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => void;
		commit: (editor: EditorContext, broker: ProjectBroker) => void;
		cancel: (editor: EditorContext, broker: ProjectBroker) => void;
	} | null = null;

	currentMousePosition: Writable<[number, number]> = writable([0, 0]);
	currentMousePositionRelative: Writable<[number, number]> = writable([0, 0]);
	currentMousePositionScreen: Writable<[number, number]> = writable([0, 0]);

	constructor(broker: ProjectBroker) {
		this.broker = broker;
	}

	openImportDialog() {
		let el = get(this.fileInput);
		if (el) {
			el.click();
		}
	}

	guard(p: Promise<any>) {
		return p.catch((e) => {
			console.error(e);
			this.alert(e.message);
		});
	}
	toast(message: string, type: 'info' | 'error' | 'warn', timeout = 5000) {
		let id = nanoid();
		this.toasts.update((t) => {
			t.push({
				id,
				message,
				type
			});

			return t;
		});

		setTimeout(() => {
			this.toasts.update((t) => {
				return t.filter((t) => t.id !== id) as any;
			});
		}, timeout);

		return () => {
			this.toasts.update((t) => {
				return t.filter((t) => t.id !== id) as any;
			});
		};
	}

	async submitComment() {
		let comment = get(this.stagingComment);
		if (!comment) {
			return;
		}

		if (comment.text.trim() === '') {
			this.stagingComment.set(null);
			return;
		}

		await this.broker.createComment(comment.longitude, comment.latitude, comment.text);
		this.stagingComment.set(null);
	}

	alert(message: string, timeout = 5000) {
		return this.toast(message, 'error', timeout);
	}
	info(message: string, timeout = 5000) {
		return this.toast(message, 'info', timeout);
	}
	warn(message: string, timeout = 5000) {
		return this.toast(message, 'warn', timeout);
	}

	activateDialog(key: string) {
		if (get(isMobile)) {
			history.pushState('popover', '', location.pathname);
		}
		this.stagingComment.set(null);
		if (get(isMobile) && key != '') {
			this.deselectAll();
		}
		if (get(this.activeDialog) === key) {
			this.activeDialog.set('');
		} else {
			this.activeDialog.set(key);
		}
	}

	clickDownTool() {
		if (get(this.activeTool)) {
			this.currentToolHandlers?.onDown(new MouseEvent('click'), this, this.broker);
			this.currentToolHandlers?.onUp(new MouseEvent('click'), this, this.broker);
		}
	}

	cancelTool() {
		if (get(this.activeTool)) {
			this.currentToolHandlers?.cancel(this, this.broker);
		}
	}

	commitTool() {
		if (get(this.activeTool)) {
			this.currentToolHandlers?.commit(this, this.broker);
		}
	}

	lonLatToPosition(lon: number, lat: number): [number, number] {
		if (!get(this.overlay)) {
			return [0, 0];
		}

		let overlay = get(this.overlay);
		let vec3 = overlay?.latLngAltitudeToVector3({ lat: lat, lng: lon, altitude: 0 });
		if (!vec3) {
			return [0, 0];
		}
		return [vec3.x, vec3.z];
	}

	positionToLonLat(x: number, y: number): [number, number] {
		let overlay = get(this.overlay);
		if (!overlay) {
			return [0, 0];
		}

		let { geo, heading } = this.broker.watchCornerstone();
		let anchor = get(geo);
		let angle = get(heading);
		let mat = Flatten.matrix(1, 0, 0, 1, 0, 0);
		mat = mat.rotate(-angle * (Math.PI / 180));
		let v2 = Flatten.point(0, 0);
		try {
			v2 = Flatten.point(x, -y).transform(mat);
		} catch (e) {}
		x = v2.x;
		y = v2.y;
		let radius = 6371010.0;
		let newLatitude = anchor[1] + (y / radius) * (180 / Math.PI);
		let newLongitude =
			anchor[0] + ((x / radius) * (180 / Math.PI)) / Math.cos((anchor[1] * Math.PI) / 180);

		let lonLat: [number, number] = [newLongitude, newLatitude];

		let v3New = overlay.latLngAltitudeToVector3({ lat: lonLat[1], lng: lonLat[0], altitude: 0 });

		return lonLat;
	}

	getBoundsCenter(bounds: { minX: number; minY: number; maxX: number; maxY: number }) {
		return [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2];
	}

	flyToSelection(zoom = false) {
		let bounds = this.broker.project.computeBoundsMulti(get(this.effectiveSelection));
		let center = this.getBoundsCenter(bounds);

		let [lon, lat] = this.positionToLonLat(center[0], center[1]);
		let map = get(this.map);
		if (!map) {
			return;
		}

		if (zoom) {
			map.setZoom(20);
			map.panTo({ lat: lat, lng: lon });
		} else {
			map.setCenter({ lat: lat, lng: lon });
		}
	}

	flyHome() {
		let obj = this.broker.project.objects.find((c) => {
			if (!c.parent && c.type != ObjectType.Cornerstone) {
				return true;
			}
		});

		if (obj) {
			this.flyToObject(obj.id);
		}
	}

	flyToObject(id: ObjectID, zoom = true) {
		let bounds = this.broker.project.computeBoundsMulti([id]);
		let center = this.getBoundsCenter(bounds);

		let [lon, lat] = this.positionToLonLat(center[0], center[1]);
		let map = get(this.map);
		if (!map) {
			return;
		}

		if (zoom) {
			map.setZoom(20);
			map.panTo({ lat: lat, lng: lon });
		} else {
			map.setCenter({ lat: lat, lng: lon });
		}
	}

	flyTo(lon: number, lat: number, zoom = false) {
		let map = get(this.map);
		if (!map) {
			return;
		}

		if (zoom) {
			map.setZoom(20);
			map.panTo({ lat: lat, lng: lon });
		} else {
			map.setCenter({ lat: lat, lng: lon });
		}
	}

	/**
	 * Rotates the entire selection around its origin and commits the changes
	 * @param angle Angle in radians
	 */
	rotateSelection(angle: number) {
		let selection = get(this.effectiveSelection);
		let bounds = this.broker.project.computeBoundsMulti(selection);
		let center = this.getBoundsCenter(bounds);

		let transaction = this.broker.project.createTransaction();

		for (let id of selection) {
			let obj = this.broker.project.objectsMap.get(id);
			if (obj) {
				// Rotate about center point
				let objectAnchorPoint = Flatten.point(obj.transform.position[0], obj.transform.position[1]);
				let objPoint = Flatten.point(
					objectAnchorPoint.x - center[0],
					objectAnchorPoint.y - center[1]
				);
				let rotationMatrix = Flatten.matrix(1, 0, 0, 1, 0, 0).rotate(angle);
				let transform = structuredClone(obj.transform);
				transform.rotation = obj.transform.rotation + angle;

				let rotatedPoint = objPoint.transform(rotationMatrix);
				transform.position[0] = rotatedPoint.x + center[0];
				transform.position[1] = rotatedPoint.y + center[1];
				transaction.update(id, 'transform', transform);
			}
		}
		this.broker.commitTransaction(transaction);
	}

	flipSelection(x: boolean, y: boolean) {
		let selection = get(this.effectiveSelection);
		let bounds = this.broker.project.computeBoundsMulti(selection);
		let center = this.getBoundsCenter(bounds);

		let transaction = this.broker.project.createTransaction();

		for (let id of selection) {
			let obj = this.broker.project.objectsMap.get(id);
			if (obj) {
				let transform = structuredClone(obj.transform);

				if (transform.rotation != 0) {
					// Apply transform
					let rotation = transform.rotation;
					let translation = Flatten.point(transform.position[0], transform.position[1]);

					let mat = Flatten.matrix(1, 0, 0, 1, 0, 0)
						.translate(translation.x, translation.y)
						.rotate(rotation);
					if (obj.type == ObjectType.Path) {
						let path = obj as Path;
						for (let seg of path.segments) {
							let p = Flatten.point(seg[0], seg[1]);
							p = p.transform(mat);
							seg[0] = p.x;
							seg[1] = p.y;
						}
						transform.position[0] = 0;
						transform.position[1] = 0;
					} else if (obj.type == ObjectType.Arc) {
						let arc = obj as Arc;

						// Apply start/end angles
						let startAngle = arc.startAngle;
						let endAngle = arc.endAngle;

						arc.startAngle = startAngle - rotation;
						arc.endAngle = endAngle - rotation;
					}

					transform.rotation = 0;
				}

				// Flip about center point
				if (obj.type == ObjectType.Path) {
					let path = obj as Path;
					let newSegments = [];
					let minX = Infinity;
					let minY = Infinity;
					for (let segment of path.segments) {
						let segmentRealX = segment[0] + transform.position[0];
						let segmentRealY = segment[1] + transform.position[1];
						newSegments.push([
							x ? center[0] - (segmentRealX - center[0]) : segmentRealX,
							y ? center[1] - (segmentRealY - center[1]) : segmentRealY
						]);
						minX = Math.min(minX, newSegments[newSegments.length - 1][0]);
						minY = Math.min(minY, newSegments[newSegments.length - 1][1]);
					}
					transform.position[0] = minX;
					transform.position[1] = minY;
					for (let segment of newSegments) {
						segment[0] -= minX;
						segment[1] -= minY;
					}
					transaction.update(id, 'segments', newSegments);
					transaction.update(id, 'transform', transform);
				} else {
					if (x) {
						transform.position[0] = center[0] - (transform.position[0] - center[0]);
						transform.size[0] = transform.size[0] * -1;
					}
					if (y) {
						transform.position[1] = center[1] - (transform.position[1] - center[1]);
						transform.size[1] = transform.size[1] * -1;
					}

					transaction.update(id, 'transform', transform);
				}
			}
		}
		this.broker.commitTransaction(transaction);
	}

	select(id: ObjectID) {
		this.selection.set([id]);
		this.computeEffectiveSelection(this.broker);
		let obj = this.broker.project.objectsMap.get(id);
		console.log(obj);
		if (obj) {
			console.log(obj.parent);
			this.rootGroup.set(obj.parent ?? null);
		}
	}

	addSelection(id: ObjectID) {
		let selection = get(this.selection);
		selection.push(id);
		this.selection.set(selection);
		this.computeEffectiveSelection(this.broker);

		this.rootGroup.set(null);
	}

	deselectAll() {
		this.selection.set([]);
		this.effectiveSelection.set([]);
		this.rootGroup.set(null);
	}

	getDesiredPosition(): [number, number] {
		return this.desiredPosition;
	}

	computeEffectiveSelection(broker: ProjectBroker) {
		let selection = get(this.selection);
		let effectiveSelection = new Set(selection);

		function addGroup(id: ObjectID) {
			let obj = broker.project.objectsMap.get(id);
			if (obj && obj.type === 'group') {
				let children = broker.project.objectsMapChildren.get(id);
				if (children) {
					for (let child of children) {
						effectiveSelection.add(child.id);
						addGroup(child.id);
					}
				}
			}
		}

		for (let id of selection) {
			addGroup(id);
		}

		this.effectiveSelection.set(Array.from(effectiveSelection));
	}

	canDeleteObject(id: ObjectID) {
		let obj = this.broker.project.objectsMap.get(id);

		if (!obj) {
			return false;
		}

		if (obj.type === ObjectType.Cornerstone) {
			return false;
		}

		return true;
	}

	deleteSelection(broker: ProjectBroker) {
		let selection = get(this.effectiveSelection);

		let transaction = broker.project.createTransaction();
		for (let id of selection) {
			if (this.canDeleteObject(id)) {
				transaction.delete(id);
			} else {
				if (selection.length == 1) {
					this.warn('You cannot delete this object');
				}
			}
		}

		this.selection.set([]);
		this.computeEffectiveSelection(broker);

		broker.commitTransaction(transaction);
	}

	groupSelection() {
		let selection = get(this.selection);
		if (selection.length <= 1) {
			return;
		}

		let obj1 = this.broker.project.objectsMap.get(selection[0]);
		if (!obj1) {
			return;
		}

		let commonParent: string | undefined | null = obj1.parent;
		let hasCommonParent = true;

		for (let id of selection) {
			let obj = this.broker.project.objectsMap.get(id);
			if (obj) {
				if (obj.parent !== commonParent) {
					hasCommonParent = false;
				}
			}
		}
		let transaction = this.broker.project.createTransaction();
		let group = new Group();
		group.id = this.broker.allocateId();
		group.name = 'Group';

		if (hasCommonParent) {
			group.parent = commonParent;
		} else {
			group.parent = undefined;
		}
		transaction.create(group);
		for (let id of selection) {
			transaction.update(id, 'parent', group.id);
		}

		this.broker.commitTransaction(transaction);

		this.select(group.id);
	}

	ungroupSelection() {
		let selection = get(this.selection);

		if (selection.length == 0) {
			return;
		}

		let obj1 = this.broker.project.objectsMap.get(selection[0]);
		if (!obj1) {
			return;
		}

		let commonParent: string | undefined | null = obj1.parent;
		let hasCommonParent = true;

		for (let id of selection) {
			let obj = this.broker.project.objectsMap.get(id);
			if (obj) {
				if (obj.parent !== commonParent) {
					hasCommonParent = false;
				}
			}
		}
		let transaction = this.broker.project.createTransaction();

		let newSelection = [];

		for (let id of selection) {
			let obj = this.broker.project.objectsMap.get(id);
			if (obj && obj.type == ObjectType.Group) {
				let children = this.broker.project.objectsMapChildren.get(id);
				if (children) {
					for (let child of children) {
						if (hasCommonParent) {
							transaction.update(child.id, 'parent', commonParent);
							newSelection.push(child.id);
						} else {
							transaction.update(child.id, 'parent', null);
							newSelection.push(child.id);
						}
					}
				}
				transaction.delete(id);
			}
		}

		console.log(transaction);

		this.broker.commitTransaction(transaction);

		this.selection.set(newSelection);
	}
}

export function createProjectBroker(id: string, accessToken?: string) {
	return new ProjectBroker(id, accessToken);
}

export function createEditorContext(broker: ProjectBroker) {
	return new EditorContext(broker);
}

export function setSvelteContext(broker: ProjectBroker, editor: EditorContext) {
	setContext('broker', broker);
	setContext('editor', editor);
}

export function getSvelteContext(): {
	broker: ProjectBroker;
	editor: EditorContext;
} {
	return {
		broker: getContext('broker'),
		editor: getContext('editor')
	};
}
