import bezier from 'bezier-easing';

let b = bezier(0, 0.2, 0, 0.99);
export const cubicOut = (x: number) => {
	return b(x);
};
