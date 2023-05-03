import { faFont, faPen } from '@fortawesome/free-solid-svg-icons';
import type { EditorContext, ProjectBroker } from 'src/store/editor';
import { get } from 'svelte/store';
import { Material, Path, Text } from 'core';

export const TextTool = {
	icon: faFont,
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

		broker.stagingObject.set(obj);

		broker.commitStagedObject();
	},
	onUp: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {},
	onMove: (ev: MouseEvent, editor: EditorContext, broker: ProjectBroker) => {}
};
