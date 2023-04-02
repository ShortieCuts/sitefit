import { get, writable, readable, type Readable, type Writable } from 'svelte/store';
import { isJoin, isLeave, isSync, Project, SocketMessage } from 'core';
import { getContext, setContext } from 'svelte';
import { getProjectMetadata } from '$lib/client/api';
import { dev } from '$app/environment';
import { getSession } from './auth';

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
	}

	handleMessage(message: SocketMessage) {
		if (isJoin(message)) {
			this.handleJoin(message);
		} else if (isLeave(message)) {
			this.handleLeave(message.uid);
		} else if (isSync(message)) {
			this.handleSync(message);
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

	activateDialog(key: string) {
		if (get(this.activeDialog) === key) {
			this.activeDialog.set('');
		} else {
			this.activeDialog.set(key);
		}
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
