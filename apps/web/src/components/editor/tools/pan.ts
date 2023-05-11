import { faHand } from '@fortawesome/free-solid-svg-icons';

export const PanTool = {
	icon: faHand,
	access: 'READ',
	key: 'pan',
	shortcut: 'p',
	onDown: (ev: MouseEvent) => {},
	onUp: (ev: MouseEvent) => {},
	onMove: (ev: MouseEvent) => {}
};
