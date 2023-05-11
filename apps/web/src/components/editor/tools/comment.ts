import { faComment } from '@fortawesome/free-solid-svg-icons';

export const CommentTool = {
	icon: faComment,
	key: 'comment',
	shortcut: 'c',
	access: 'COMMENT',
	onDown: (ev: MouseEvent) => {},
	onUp: (ev: MouseEvent) => {},
	onMove: (ev: MouseEvent) => {}
};
