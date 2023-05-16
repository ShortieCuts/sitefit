import DxfParser, {
	type IEntity,
	type I3DfaceEntity,
	type IArcEntity,
	type IAttdefEntity,
	type ICircleEntity,
	type IDimensionEntity,
	type IEllipseEntity,
	type IInsertEntity,
	type ILineEntity,
	type ILwpolylineEntity,
	type IMtextEntity,
	type IPointEntity,
	type IPolylineEntity,
	type ISolidEntity,
	type ISplineEntity,
	type ITextEntity,
	type IVertexEntity
} from 'dxf-parser';
import {
	Arc,
	Circle,
	Group,
	Material,
	Path,
	Text,
	Transform,
	type Object2D,
	type RelativeCoordinate
} from 'core';
import colorsMapper from 'autocad-colors-index';
function parseHexColor(hex: string): [number, number, number, number] {
	let r = parseInt(hex.slice(1, 3), 16);
	let g = parseInt(hex.slice(3, 5), 16);
	let b = parseInt(hex.slice(5, 7), 16);
	return [r / 255, g / 255, b / 255, 255 / 255];
}

export function translateDXF(rawDXF: string): Object2D[] | null {
	const parser = new DxfParser();

	try {
		let dxf = parser.parseSync(rawDXF);

		if (!dxf) return null;

		if (!dxf.header) {
			dxf.header = {};
		}
		if (!dxf.header.$EXTMIN) {
			let min = { x: Infinity, y: Infinity, z: Infinity };
			let max = { x: -Infinity, y: -Infinity, z: -Infinity };

			dxf.entities.forEach((entity: any) => {
				if (entity.vertices) {
					entity.vertices.forEach((vertex: any) => {
						if (vertex.x < min.x) min.x = vertex.x;
						if (vertex.y < min.y) min.y = vertex.y;
						if (vertex.z < min.z) min.z = vertex.z;
						if (vertex.x > max.x) max.x = vertex.x;
						if (vertex.y > max.y) max.y = vertex.y;
						if (vertex.z > max.z) max.z = vertex.z;
					});
				}
			});

			dxf.header.$EXTMIN = min;
			dxf.header.$EXTMAX = max;
		}

		if (!dxf.tables) {
			dxf.tables = {} as any;
		}

		if (!dxf.tables.viewPort) {
			(dxf.tables.viewPort as any) = {
				viewPorts: [
					{
						viewDirectionFromTarget: { x: 0, y: 0, z: 1 },
						viewTarget: { x: 0, y: 0, z: 0 }
					} as any
				]
			};
		}

		if (!dxf.blocks) {
			dxf.blocks = {};
		}

		let objects: Object2D[] = [];

		let rootObj = new Group();
		rootObj.iconKind = 'cad';
		rootObj.id = 'root';

		objects.push(rootObj);

		for (let layer of Object.keys(dxf.tables.layer.layers)) {
			let obj = new Group();
			obj.iconKind = 'layer';
			obj.style = new Material();
			let color = colorsMapper.getByACI(dxf.tables.layer.layers[layer].colorIndex);

			if (color) {
				obj.style.color = parseHexColor(color.hex);
			} else {
				obj.style.color = [0, 0, 0, 1];
			}

			obj.name = layer;
			obj.id = layer;
			obj.visible = dxf.tables.layer.layers[layer].visible;

			obj.parent = 'root';

			objects.push(obj);
		}

		let units = dxf.header.$INSUNITS ?? 1;
		let unitMap = {
			0: 'unitless',
			1: 'inches',
			2: 'feet',
			3: 'miles',
			4: 'millimeters',
			5: 'centimeters',
			6: 'meters',
			7: 'kilometers',
			8: 'microinches',
			9: 'mils',
			10: 'yards',
			11: 'angstroms',
			12: 'nanometers',
			13: 'microns',
			14: 'decimeters',
			15: 'decameters',
			16: 'hectometers',
			17: 'gigameters',
			18: 'astronomical units',
			19: 'light years',
			20: 'parsecs'
		};

		let unitScale: {
			[key: number]: number;
		} = {
			0: 1,
			1: 0.0254,
			2: 0.3048,
			3: 1609.344,
			4: 0.001,
			5: 0.01,
			6: 1,
			7: 1000,
			8: 2.54e-8,
			9: 2.54e-5,
			10: 0.9144,
			11: 1e-10,
			12: 1e-9,
			13: 1e-6,
			14: 0.1,
			15: 10,
			16: 100,
			17: 1e9,
			18: 149597870700,
			19: 9460730472580800,
			20: 30856775814671900
		};

		let unitScaleMeters = unitScale[units as number];

		function transformDirectionVector(
			ent: IEntity,
			vertex: {
				x: number;
				y: number;
			}
		): {
			x: number;
			y: number;
		} {
			if (!dxf) return { x: 0, y: 0 };

			let x = vertex.x;
			let y = vertex.y;
			if (ent.inPaperSpace) {
				x -= dxf.header.$PLIMMIN.y;
				y -= dxf.header.$PLIMMIN.x;

				x = x / (dxf.header.$PLIMMAX.y - dxf.header.$PLIMMIN.y);
				y = y / (dxf.header.$PLIMMAX.x - dxf.header.$PLIMMIN.x);
			} else {
				x -= dxf.header.$EXTMIN.x;
				y -= dxf.header.$EXTMIN.y;

				x = x / (dxf.header.$EXTMAX.x - dxf.header.$EXTMIN.x);
				y = y / (dxf.header.$EXTMAX.y - dxf.header.$EXTMIN.y);
			}
			// Normalize using the viewport direction
			let viewDirection = dxf.tables.viewPort.viewPorts[0].viewDirectionFromTarget;
			let viewTarget = dxf.tables.viewPort.viewPorts[0].viewTarget;

			let x2 = x;
			let y2 = y;

			// if (viewDirection.x === 0 && viewDirection.y === 0 && viewDirection.z === 1) {
			// 	x = y2;
			// 	y = x2;
			// } else if (viewDirection.x === 0 && viewDirection.y === 0 && viewDirection.z === -1) {
			// 	x = x2;
			// 	y = -y2;
			// } else if (viewDirection.x === 0 && viewDirection.y === 1 && viewDirection.z === 0) {
			// 	x = x2;
			// 	y = y2;
			// } else if (viewDirection.x === 0 && viewDirection.y === -1 && viewDirection.z === 0) {
			// 	x = x2;
			// 	y = y2;
			// } else if (viewDirection.x === 1 && viewDirection.y === 0 && viewDirection.z === 0) {
			// 	x = y2;
			// 	y = x2;
			// } else if (viewDirection.x === -1 && viewDirection.y === 0 && viewDirection.z === 0) {
			// 	x = -y2;
			// 	y = x2;
			// }

			return {
				x: x,
				y: y
			};
		}

		function transformCoords(
			ent: IEntity,
			vertex: {
				x: number;
				y: number;
				z: number;
			}
		): {
			x: number;
			y: number;
			z: number;
		} {
			if (!dxf) return { x: 0, y: 0, z: 0 };

			let x = vertex.x;
			let y = vertex.y;
			let z = vertex.z;
			if (ent.inPaperSpace) {
				x -= dxf.header.$PLIMMIN.y;
				z -= dxf.header.$PLIMMIN.x;

				x = x / (dxf.header.$PLIMMAX.y - dxf.header.$PLIMMIN.y);
				z = z / (dxf.header.$PLIMMAX.x - dxf.header.$PLIMMIN.x);
			} else {
				x -= dxf.header.$EXTMIN.x;
				y -= dxf.header.$EXTMIN.y;
				z -= dxf.header.$EXTMIN.z;

				x = x / (dxf.header.$EXTMAX.x - dxf.header.$EXTMIN.x);
				y = y / (dxf.header.$EXTMAX.y - dxf.header.$EXTMIN.y);
				z = z / (dxf.header.$EXTMAX.z - dxf.header.$EXTMIN.z);
			}
			// Normalize using the viewport direction
			let viewDirection = dxf.tables.viewPort.viewPorts[0].viewDirectionFromTarget;
			let viewTarget = dxf.tables.viewPort.viewPorts[0].viewTarget;

			// Denormalize
			x *= dxf.header.$EXTMAX.x - dxf.header.$EXTMIN.x;
			y *= dxf.header.$EXTMAX.y - dxf.header.$EXTMIN.y;
			z *= dxf.header.$EXTMAX.z - dxf.header.$EXTMIN.z;

			let x2 = x;
			let y2 = y;
			let z2 = z;

			if (viewDirection.x === 0 && viewDirection.y === 0 && viewDirection.z === 1) {
				x = y2;
				y = 0;
				z = x2;
			} else if (viewDirection.x === 0 && viewDirection.y === 0 && viewDirection.z === -1) {
				x = x2;
				y = y2;
				z = -z2;
			} else if (viewDirection.x === 0 && viewDirection.y === 1 && viewDirection.z === 0) {
				x = x2;
				y = z2;
				z = y2;
			} else if (viewDirection.x === 0 && viewDirection.y === -1 && viewDirection.z === 0) {
				x = x2;
				y = -z2;
				z = y2;
			} else if (viewDirection.x === 1 && viewDirection.y === 0 && viewDirection.z === 0) {
				x = z2;
				y = y2;
				z = x2;
			} else if (viewDirection.x === -1 && viewDirection.y === 0 && viewDirection.z === 0) {
				x = -z2;
				y = y2;
				z = x2;
			}

			return {
				x: x * unitScaleMeters,
				y: y * unitScaleMeters,
				z: z * unitScaleMeters
			};
		}

		function makeMaterialFromEntity(ent: IEntity): Material {
			let mat = new Material();

			if (typeof ent.colorIndex !== 'undefined') {
				let color = colorsMapper.getByACI(ent.colorIndex);
				mat.color = parseHexColor(color.hex);
			} else {
				// Inherit from layer
				if (dxf) {
					let layer = dxf.tables.layer.layers[ent.layer];
					if (layer) {
						let color = colorsMapper.getByACI(layer.colorIndex);
						mat.color = parseHexColor(color.hex);
					}
				}
			}

			return mat;
		}

		function translateEntity(ent: IEntity): Object2D {
			let mat = makeMaterialFromEntity(ent);
			let obj: Object2D | null = null;

			function rebasePath(path: Path) {
				// Find the min x and y
				let minX = Math.min(...path.segments.map((s) => s[0]));
				let minY = Math.min(...path.segments.map((s) => s[1]));

				// Translate the path so that the min x and y are at 0,0
				path.segments = path.segments.map((s) => [s[0] - minX, s[1] - minY] as RelativeCoordinate);

				path.transform = new Transform();
				path.transform.position = [minX, minY];
				path.transform.size = [1, 1];
				path.transform.rotation = 0;
			}

			if (ent.type === 'LWPOLYLINE' || ent.type === 'LINE' || ent.type === 'POLYLINE') {
				let polyEnt = ent as ILineEntity | IPolylineEntity | ILwpolylineEntity;
				let path = new Path();

				path.segments = polyEnt.vertices
					.map((v) => transformCoords(ent, v))
					.map((v) => [v.x, v.z] as RelativeCoordinate);

				if (ent.type == 'POLYLINE' || ent.type == 'LWPOLYLINE') {
					let polyEnt2 = ent as IPolylineEntity | ILwpolylineEntity;
					if (polyEnt2.shape) path.closed = true;
				}

				obj = path;
				rebasePath(path);
			} else if (ent.type === 'SOLID') {
				let solidEnt = ent as ISolidEntity;
				let path = new Path();

				path.segments = solidEnt.points
					.map((v) => transformCoords(ent, v))
					.map((v) => [v.x, v.z] as RelativeCoordinate);

				path.segments = [
					[path.segments[2][0], path.segments[2][1]],
					[path.segments[0][0], path.segments[0][1]],
					[path.segments[1][0], path.segments[1][1]],
					[path.segments[3][0], path.segments[3][1]]
				];

				mat.filled = true;
				path.closed = true;
				obj = path;
				rebasePath(path);
			} else if (ent.type == 'ARC') {
				let arcEnt = ent as IArcEntity;
				let arc = new Arc();

				arc.transform = new Transform();
				let trans = transformCoords(ent, arcEnt.center);

				arc.transform.position = [trans.x, trans.z];
				arc.transform.size = [1, 1];
				arc.transform.rotation = 0;

				arc.radius = arcEnt.radius * unitScaleMeters;
				arc.startAngle = arcEnt.startAngle;
				arc.endAngle = arcEnt.endAngle;

				obj = arc;
			} else if (ent.type == 'CIRCLE') {
				let circleEnt = ent as ICircleEntity;
				let circle = new Circle();

				circle.transform = new Transform();
				let trans = transformCoords(ent, circleEnt.center);

				circle.transform.position = [trans.x, trans.z];
				circle.transform.size = [1, 1];
				circle.transform.rotation = 0;

				circle.radius = circleEnt.radius * unitScaleMeters;

				obj = circle;
			} else if (ent.type == 'TEXT') {
				console.log('TEXT', ent);
				let textEnt = ent as ITextEntity;
				let text = new Text();

				text.transform = new Transform();
				let trans = transformCoords(ent, textEnt.startPoint);
				text.transform.position = [trans.x, trans.z];
				text.transform.size = [1, 1];
				text.transform.rotation = 0;

				text.text = textEnt.text;

				obj = text;
			} else if (ent.type == 'MTEXT') {
				console.log('MTEXT', ent);
				let textEnt = ent as IMtextEntity;
				let text = new Text();

				let trans = transformCoords(ent, textEnt.position);
				text.transform = new Transform();
				text.transform.position = [trans.x, trans.z];
				text.transform.size = [1, 1];
				text.transform.rotation = 0;
				text.size = textEnt.height * unitScaleMeters;
				text.maxWidth = textEnt.width * unitScaleMeters;

				text.text = textEnt.text.replaceAll('\\P', '\n');

				let dirVec = textEnt.directionVector;

				let angle = Math.atan2(dirVec.x, dirVec.y); // We swap x and y because the viewDirection is strange

				text.transform.rotation = angle;

				obj = text;
			} else {
				console.log('Unhandled entity', ent);
			}

			if (!obj) obj = new Group();

			obj.style = mat;
			obj.visible = ent.visible;
			obj.name = ent.handle.toString() ?? '';
			obj.parent = ent.layer;

			return obj;
		}

		for (let [i, ent] of dxf.entities.entries()) {
			let obj = translateEntity(ent);
			obj.id = 'ent' + i.toString();
			obj.order = i;
			if (obj) {
				if (!obj.parent) {
					console.log('No parent for entity', ent);
				}
				objects.push(obj);
			}
		}

		return objects;
	} catch (err) {
		console.log(err);
		return null;
	}
}
