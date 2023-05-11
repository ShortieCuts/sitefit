import { faFont, faPen } from '@fortawesome/free-solid-svg-icons';
import type { EditorContext, ProjectBroker } from 'src/store/editor';
import { get } from 'svelte/store';
import { Material, Path, Text } from 'core';

export const TextTool = {
	icon: faFont,
	access: 'WRITE',
	key: 'text',
	shortcut: 't',
	onDown: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {
		let obj = new Text();
		obj.style = new Material();
		obj.style.color = [0, 0, 0, 1];
		obj.style.filled = false;
		obj.style.type = 'color';
		obj.name = 'Text';
		obj.text = 'Text';
		obj.size = 6;

		obj.transform.position = editor.getDesiredPosition();

		broker.stagingObject.set(obj);

		let id = broker.commitStagedObject();
		if (id) editor.select(id);
	},
	onUp: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {},
	onMove: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {}
};
