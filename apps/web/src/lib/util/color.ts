export function colorArrayToCss(color: number[]): string {
	return `rgba(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255}, ${color[3]})`;
}

export function hexColorToArray(color: string): [number, number, number, number] {
	if (color.startsWith('#')) color = color.substring(1);
	if (color.length === 3)
		color = color
			.split('')
			.map((x) => x + x)
			.join('');
	if (color.length !== 6) return [0, 0, 0, 1];
	return [
		parseInt(color.substring(0, 2), 16) / 255,
		parseInt(color.substring(2, 4), 16) / 255,
		parseInt(color.substring(4, 6), 16) / 255,
		1
	];
}
