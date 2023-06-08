import { Path, type Object2D, type ObjectProperty, Material } from 'core';

type SmartObject<
	T extends {
		[key: string]: {
			default: any;
			type: ObjectProperty;
		};
	} = any
> = {
	id: string;
	properties: T;
	render: (
		path: Path,
		properties: {
			[key in keyof T]: T[key]['default'];
		}
	) => Object2D[];
};

function makeSmartObject<
	T extends {
		[key: string]: {
			default: any;
			type: ObjectProperty;
		};
	}
>(obj: SmartObject<T>): SmartObject<T> {
	return obj;
}

function walkPath(
	path: Path,
	step: number,
	fn: (position: [number, number], normal: [number, number], tangent: [number, number]) => void
) {
	let distanceCounter = 0;
	if (path.segments.length <= 1) return;

	let currentSegment = 0;
	while (true) {
		let start = path.segments[currentSegment];
		let end = path.segments[currentSegment + 1];
		let dx = end[0] - start[0];
		let dy = end[1] - start[1];
		let segmentLength = Math.sqrt(dx * dx + dy * dy);

		let t = distanceCounter / segmentLength;
		let normal: [number, number] = [dy, -dx];
		let tangent: [number, number] = [dx, dy];
		fn([start[0] + dx * t, start[1] + dy * t], normal, tangent);
		distanceCounter += step;
		if (distanceCounter > segmentLength) {
			distanceCounter -= segmentLength;
			currentSegment++;
			if (currentSegment >= path.segments.length - 1) break;
			continue;
		}
		if (currentSegment >= path.segments.length - 1) break;
	}
}

const Parking = makeSmartObject({
	id: 'parking',
	properties: {
		spacing: {
			default: 2.59, // Meters
			type: {
				name: 'spacing',
				type: 'number'
			}
		},
		angle: {
			default: 90, // Degrees
			type: {
				name: 'angle',
				type: 'number'
			}
		},
		distance: {
			default: 5, // Meters
			type: {
				name: 'distance',
				type: 'number'
			}
		},
		direction: {
			default: 1,
			type: {
				name: 'direction',
				type: 'number'
			}
		}
	},
	render(path: Path, props) {
		let objs: Path[] = [];

		let spacing = props.spacing;
		let angle = props.angle;
		let distance = props.distance;
		let direction = props.direction ?? 1;

		let x = 0;
		let y = 0;

		const DEG2RAD = Math.PI / 180;

		let i = 0;
		let matrix = path.getMatrix();
		walkPath(path, spacing, ([x, y], normal, tangent) => {
			i++;
			let obj = new Path();
			obj.id = `${path.id}-parking-${i}`;
			obj.name = `Parking Line ${i}`;
			let normalAngle = Math.atan2(tangent[1], tangent[0]);
			let dx = Math.cos(normalAngle + angle * DEG2RAD) * distance * direction;
			let dy = Math.sin(normalAngle + angle * DEG2RAD) * distance * direction;
			obj.segments = [matrix.transform([x, y]), matrix.transform([x + dx, y + dy])];

			obj.style = new Material();
			obj.style.color = [...path.style.color];

			objs.push(obj);
		});

		return objs;
	}
});

export const smartObjects: SmartObject[] = [Parking];
export function getSmartObject(id: string) {
	return smartObjects.find((x) => x.id === id);
}

export function smartObjectRender(path: Path, id: string, props: any) {
	let obj = getSmartObject(id);
	if (!obj) return [];
	props = structuredClone(props);
	for (let key in obj.properties) {
		if (typeof props[key] === 'undefined') props[key] = obj.properties[key].default;
	}
	return obj.render(path, props);
}
export function smartObjectProps(path: Path, id: string, props: any) {
	let obj = getSmartObject(id);
	if (!obj) return {};
	props = structuredClone(props);
	for (let key in obj.properties) {
		if (typeof props[key] === 'undefined') props[key] = obj.properties[key].default;
	}
	return props;
}
