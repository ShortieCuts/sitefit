import { get, writable, readable, type Readable, type Writable } from 'svelte/store';
import {
	isBatch,
	isCommitTransaction,
	isJoin,
	isLeave,
	isSync,
	isWriteGlobalProperty,
	Object2D,
	Project,
	ProjectTransaction,
	SocketMessage,
	type GlobalProjectPropertiesKey,
	type ObjectID,
	type PropertyMutation
} from 'core';
import { getContext, setContext } from 'svelte';
import { getProjectMetadata } from '$lib/client/api';
import { dev } from '$app/environment';
import { getSession } from './auth';
import { nanoid } from 'nanoid';
import type { ThreeJSOverlayView } from '@googlemaps/three';

const WEBSOCKET_URL = dev ? 'localhost:8787' : 'engine.cad-mapper.xyz';

export type ProjectAccessLevel = 'READ' | 'WRITE' | 'COMMENt';

export type ProjectAccess = {
	userId: string;
	level: ProjectAccessLevel;
	grantedAt: Date;
};

export type ProjectAccessList = {
	items: ProjectAccess[];
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

export class ProjectBroker {
	projectId: string;
	metadataDirty: boolean = false;
	metadata: ProjectMetadata;
	error: Writable<string | null> = writable(null);

	loading: Writable<boolean> = writable(true);
	pushing: Writable<boolean> = writable(false);
	connected: Writable<boolean> = writable(false);

	sessions: Writable<ProjectSession[]> = writable([]);
	mySessionUid: Writable<string> = writable('');

	private realMetadata: ProjectMetadata;

	project: Project;

	private socket: WebSocket | null = null;

	private enqueuedMetadataPush: NodeJS.Timeout | null = null;

	globalPropertyStores: Map<string, Writable<any>> = new Map();
	objectPropertyStores: Map<string, Writable<any>> = new Map();

	objectTreeWatcher: Writable<number> = writable(0);

	rendererDirtyObjects = new Set<string>();
	needsRender: Writable<boolean> = writable(false);

	private queuedMessages: SocketMessage[] = [];
	private messageQueueTimeout: NodeJS.Timeout | null = null;

	stagingObject: Writable<Object2D | null> = writable(null);

	constructor(id: string) {
		this.projectId = id;
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
				this.loading.set(false);

				this.establishConnection();
			})();
		}
	}

	dispose() {
		this.socket?.close();
	}

	commitStagedObject() {
		let staging = get(this.stagingObject);
		if (staging) {
			this.createObject(staging);
			this.stagingObject.set(null);
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

	createObject(obj: Object2D) {
		let uid = this.allocateId();
		obj.id = uid;

		let transaction = this.project.createTransaction();
		transaction.create(obj);
		this.commitTransaction(transaction);
	}

	commitTransaction(transaction: ProjectTransaction) {
		// Todo add an inverse transaction to the undo stack
		let applied = this.project.applyTransaction(transaction);
		console.log('chages', applied);

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
				console.log('Change going to server', value);
				this.enqueueMessage(SocketMessage.writeGlobalProperty(key, value));
				internalWritable.set(value);
			},
			update: (fn) => {
				internalWritable.update((value) => {
					let newValue = fn(value);
					console.log('Change going to server', newValue);
					this.enqueueMessage(SocketMessage.writeGlobalProperty(key, newValue));

					return newValue;
				});
			}
		};
	}

	writableObjectProperty<T>(obj: Object2D, key: string, defaultValue: T): Writable<T> {
		let writableKey = `${obj.id}.${key}`;

		let internalWritable = this.objectPropertyStores.get(writableKey) as Writable<T>;
		if (!internalWritable) {
			internalWritable = writable(defaultValue);
			this.objectPropertyStores.set(writableKey, internalWritable);
		}

		const doTransaction = (value: T) => {
			let transaction = this.project.createTransaction();
			transaction.update(obj.id, key, value);
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
			this.socket.send(JSON.stringify(message));
		}
	}

	establishConnection() {
		const wss = document.location.protocol === 'http:' ? 'ws://' : 'wss://';
		let ws = new WebSocket(wss + WEBSOCKET_URL + '/' + this.projectId + '/websocket');
		this.socket = ws;

		ws.addEventListener('open', (event) => {
			this.connected.set(true);
			(async () => {
				this.sendMessage(SocketMessage.login(await getSession()));
			})();
		});

		ws.addEventListener('message', (event) => {
			let data = JSON.parse(event.data);
			console.log(data);
			this.handleMessage(data);
		});

		ws.addEventListener('close', (event) => {
			this.connected.set(false);
			this.sessions.set([]);
			setTimeout(() => {
				this.establishConnection();
			}, 4000);
			console.log('WebSocket closed', event.code, event.reason);
		});

		ws.addEventListener('error', (event) => {
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
	}

	markAllDirty() {
		this.rendererDirtyObjects.clear();
		for (let obj of this.project.objects) {
			this.rendererDirtyObjects.add(obj.id);
		}

		this.needsRender.set(true);
	}

	markObjectDirty(id: ObjectID) {
		this.rendererDirtyObjects.add(id);
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
			}

			this.needsRender.set(true);
		} else if (isBatch(message)) {
			for (let m of message.messages) {
				this.handleMessage(m);
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
		let response = await getProjectMetadata(this.project.id, {});

		if (response.error) {
			this.error.set(response.message);
			return;
		} else {
			let data = response.data;
			this.realMetadata.name.set(data.name);
			this.metadata.name.set(data.name);

			this.realMetadata.description.set(data.description);
			this.metadata.description.set(data.description);
		}
	}

	pushMetadata() {
		// Diff and push updates
	}

	destroy() {
		// Close connection
	}
}

export class EditorContext {
	activeTool: Writable<string> = writable('select');
	activeDialog: Writable<string> = writable('');

	longitude: Writable<number> = writable(0);
	latitude: Writable<number> = writable(0);
	zoom: Writable<number> = writable(0);

	selectionDown: Writable<boolean> = writable(false);
	selectionStart: Writable<[number, number]> = writable([0, 0]);
	hoveringObject: Writable<ObjectID> = writable('');

	translating: Writable<boolean> = writable(false);
	rotating: Writable<boolean> = writable(false);
	scaling: Writable<boolean> = writable(false);

	canScale: Writable<boolean> = writable(false);
	scaleDirection: Writable<[number, number]> = writable([0, 0]);
	canRotate: Writable<boolean> = writable(false);

	transformOrigin: Writable<[number, number]> = writable([0, 0]);

	selectToolCursor: Writable<string> = writable('default');

	screenScale: Writable<number> = writable(1);

	selection: Writable<ObjectID[]> = writable([]);
	overlay: Writable<ThreeJSOverlayView | null> = writable(null);

	desiredPosition: [number, number] = [0, 0];

	currentToolHandlers: {
		onDown: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => void;
		onUp: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => void;
		onMove: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => void;
	} | null = null;

	currentMousePosition: Writable<[number, number]> = writable([0, 0]);
	currentMousePositionRelative: Writable<[number, number]> = writable([0, 0]);

	activateDialog(key: string) {
		if (get(this.activeDialog) === key) {
			this.activeDialog.set('');
		} else {
			this.activeDialog.set(key);
		}
	}

	getDesiredPosition(): [number, number] {
		return this.desiredPosition;
	}
}

export function createProjectBroker(id: string) {
	return new ProjectBroker(id);
}

export function createEditorContext() {
	return new EditorContext();
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
