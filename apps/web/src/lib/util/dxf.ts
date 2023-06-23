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
	type RelativeCoordinate,
	ObjectType
} from 'core';
import colorsMapperReal from 'autocad-colors-index';
import { hexColorToArray } from './color';
import type { TypeOf } from 'zod';
let colorsMapper = {
	getByACI(aci: number) {
		let out = colorsMapperReal.getByACI(aci);
		if (out) return out;
		return {
			hex: '#000000'
		};
	}
};

function parseHexColor(hex: string): [number, number, number, number] {
	let r = parseInt(hex.slice(1, 3), 16);
	let g = parseInt(hex.slice(3, 5), 16);
	let b = parseInt(hex.slice(5, 7), 16);
	return [r / 255, g / 255, b / 255, 255 / 255];
}

type CadPropertyAttribute = {
	attributeName?: string;
	displayCategory?: string;
	displayValue?: string;
	displayName?: string;
	hidden?: number;
	type?: number;
	precision?: number;
	unit?: string;
};
type CadProperty = {
	dbId: number;
	externalId?: string;
	name?: string;
	properties: CadPropertyAttribute[];
};

function translateJSON(json: any): Object2D[] {
	let objects: Object2D[] = [];

	let propMap = new Map<number, CadProperty>();

	for (let prop of json.props) {
		propMap.set(prop.dbId, prop);
	}

	function getProp(dbId: number | string, name: string): CadPropertyAttribute | undefined {
		let prop = propMap.get(parseInt(dbId.toString()));
		if (!prop) return;
		return prop.properties.find((p) => p.attributeName == name);
	}

	let unitMap = {
		unitless: 0,
		inches: 1,
		feet: 2,
		miles: 3,
		millimeters: 4,
		centimeters: 5,
		meters: 6,
		kilometers: 7,
		microinches: 8,
		mils: 9,
		yards: 1,
		angstroms: 1,
		nanometers: 1,
		microns: 1,
		decimeters: 1,
		decameters: 1,
		hectometers: 1,
		gigameters: 1,
		'astronomical units': 1,
		'light years': 1,
		parsecs: 2
	};
	let unitMapShort = {
		unitless: 0,
		in: 1,
		ft: 2,
		miles: 3,
		mm: 4,
		cm: 5,
		m: 6,
		km: 7,
		mi: 8,
		mils: 9,
		yards: 1,
		angstroms: 1,
		nanometers: 1,
		microns: 1,
		decimeters: 1,
		decameters: 1,
		hectometers: 1,
		gigameters: 1,
		'astronomical units': 1,
		'light years': 1,
		parsecs: 2
	};
	let units: keyof typeof unitMap = json.metadata?.page_dimensions?.model_units ?? 'feet';

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

	let unitScaleMeters = unitScale[unitMap[units]];
	function roundToMillimeters(n: number) {
		return Math.round(n * 1000) / 1000;
	}
	function transformCoord(coord: number[]): RelativeCoordinate {
		return [
			roundToMillimeters(coord[0] * unitScaleMeters),
			roundToMillimeters(coord[1] * unitScaleMeters * -1)
		];
	}

	let rootObj = new Group();
	rootObj.iconKind = 'cad';
	rootObj.id = 'root';

	objects.push(rootObj);
	let i = 0;
	let groups: Map<number | string, Group> = new Map();
	function getdbidGroup(dbid: number | string): Group {
		let parentId = getProp(dbid, 'Layer');
		if (parentId) {
			dbid = parentId.displayValue ?? dbid;
		}
		if (groups.has(dbid)) return groups.get(dbid)!;

		let group = new Group();
		let groupInfo = json.props.find((p) => p.dbId == dbid);
		if (!groupInfo) {
			groupInfo = {
				name: dbid
			};
		}

		group.id = 'group' + dbid;
		group.name = groupInfo?.name || 'Group';
		group.parent = rootObj.id;
		groups.set(dbid, group);
		objects.push(group);
		return group;
	}

	if (JSON.stringify(json.objects).length > 1024 * 1024 * 1.3) {
		console.log('merging', json.objects.length, 'objects');
		// Merge like objects
		let mergedObjects: Map<string, any> = new Map();
		let i = 0;
		for (let frag of json.objects) {
			let type = frag[0];
			let dbid = frag[2];
			let color = frag[2];
			if (type == 'l') {
				let key = `${type}-${color}`;
				if (mergedObjects.has(key)) {
					let merged = mergedObjects.get(key);
					merged[3].push(...frag[3]);
				} else {
					mergedObjects.set(key, frag);
				}
			} else {
				mergedObjects.set(`${type}-${dbid}-${color}-${i}`, frag);
			}
			i++;
		}
		json.objects = [];
		for (let frag of mergedObjects.values()) {
			json.objects.push(frag);
		}

		console.log('merged', json.objects.length, 'objects');
	}

	let textLocations: Map<string, RelativeCoordinate> = new Map();

	// Remove text paths
	for (let i = json.objects.length - 1; i >= 0; i--) {
		let frag = json.objects[i];
		let type = frag[0];
		let dbid = frag[1];
		let color = frag[2];
		if (type == 't' || type == 'l') {
			let prop = propMap.get(parseInt(dbid.toString()));

			if (prop && (prop.name?.startsWith('MText') || prop.name?.startsWith('Text'))) {
				let positions: [number, number][] = [];
				if (type == 'l') {
					for (let i = frag[3].length - 1; i >= 0; i--) {
						let l = frag[3][i];
						let c1 = transformCoord([l[0], l[1]]);
						let c2 = transformCoord([l[2], l[3]]);
						positions.push(c1, c2);
					}
				} else {
					for (let i = frag[3].length - 1; i >= 0; i--) {
						let t = frag[3][i];

						let c1 = transformCoord([t[0], t[1]]);
						let c2 = transformCoord([t[2], t[3]]);
						let c3 = transformCoord([t[4], t[5]]);

						positions.push(c1, c2, c3);
					}
				}

				let minx = Math.min(...positions.map((p) => p[0]));
				let maxx = Math.max(...positions.map((p) => p[0]));
				let miny = Math.min(...positions.map((p) => p[1]));
				let maxy = Math.max(...positions.map((p) => p[1]));

				if (textLocations.has(dbid.toString())) {
					let location = textLocations.get(dbid.toString())!;
					if (minx < location[0]) location[0] = minx;
					if (miny < location[1]) location[1] = miny;
				} else {
					textLocations.set(dbid.toString(), [minx, miny]);
				}

				json.objects.splice(i, 1);
			}
		}
	}

	let lineSize = 1 / 1000; // 1mm
	let purgeCount = 0;

	while (purgeCount < 100 && JSON.stringify(json.objects).length > 1024 * 1024 * 1.3) {
		lineSize *= 2;
		purgeCount++;
		// Still too big, remove small lines
		console.log('removing small lines');
		for (let fragI = json.objects.length - 1; fragI >= 0; fragI--) {
			let frag = json.objects[fragI];
			let type = frag[0];
			let dbid = frag[1];
			let color = frag[2];
			if (type == 't') {
				for (let i = frag[3].length - 1; i >= 0; i--) {
					let t = frag[3][i];

					let c1 = transformCoord([t[0], t[1]]);
					let c2 = transformCoord([t[2], t[3]]);
					let c3 = transformCoord([t[4], t[5]]);
					let x1 = c1[0];
					let y1 = c1[1];
					let x2 = c2[0];
					let y2 = c2[1];
					let x3 = c3[0];
					let y3 = c3[1];
					let triangleArea = 0.5 * Math.abs(x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
					if (triangleArea < lineSize) {
						frag[3].splice(i, 1);
					}
				}

				if (frag[3].length == 0) {
					json.objects.splice(fragI, 1);
				}
			} else if (type == 'l') {
				for (let i = frag[3].length - 1; i >= 0; i--) {
					let l = frag[3][i];
					let dist = Math.sqrt((l[0] - l[2]) ** 2 + (l[1] - l[3]) ** 2);
					if (dist < lineSize) {
						frag[3].splice(i, 1);
					}
				}
				if (frag[3].length == 0) {
					json.objects.splice(fragI, 1);
				}
			} else if (type == 'a') {
				if (frag[7] < lineSize) {
					json.objects.splice(fragI, 1);
				}
			}
		}
	}

	console.log('final size', JSON.stringify(json.objects).length / 1024 / 1024, 'MB');

	let childCounts = new Map<number, Object2D[]>();
	for (let frag of json.objects) {
		let type = frag[0];
		let dbid = frag[1];
		let color = frag[2];
		if (type == 'a') {
			let arcObj = new Arc();
			arcObj.transform.position = transformCoord([frag[3], frag[4]]);
			let startAngle = frag[5];
			let endAngle = frag[6];
			let clockwise = true;

			const twoPi = Math.PI * 2;
			let deltaAngle = endAngle - startAngle;
			const samePoints = Math.abs(deltaAngle) < Number.EPSILON;

			while (deltaAngle < 0) deltaAngle += twoPi;
			while (deltaAngle > twoPi) deltaAngle -= twoPi;

			if (deltaAngle < Number.EPSILON) {
				if (samePoints) {
					deltaAngle = 0;
				} else {
					deltaAngle = twoPi;
				}
			}

			if (clockwise === true && !samePoints) {
				if (deltaAngle === twoPi) {
					deltaAngle = -twoPi;
				} else {
					deltaAngle = deltaAngle - twoPi;
				}
			}
			if (startAngle != 0 || endAngle != twoPi) {
				console.log('Insert angle', startAngle, endAngle, deltaAngle);
			}
			function wrapAngle(a: number) {
				return Math.atan2(Math.sin(a), Math.cos(a));
			}
			arcObj.startAngle = startAngle + Math.PI / 2;
			arcObj.endAngle = endAngle + Math.PI / 2;

			// This is no longer needed, but I'm keeping the code here in case I need it again
			// Act like we're swapping the x/y coordinates (i.e. y = x, x = y)
			// But do it with angles

			// arcObj.startAngle = wrapAngle(Math.PI / 2 - startAngle);
			// arcObj.endAngle = wrapAngle(Math.PI / 2 - endAngle);
			// let sa = arcObj.startAngle;
			// let ea = arcObj.endAngle;
			// arcObj.startAngle = ea;
			// arcObj.endAngle = sa;

			arcObj.radius = frag[7] * unitScaleMeters;
			if (arcObj.radius < 0.001) {
				continue;
			}
			arcObj.style = new Material();
			arcObj.style.color = hexColorToArray(`#${color}`);
			arcObj.id = 'arc' + i;

			arcObj.name = 'A';

			arcObj.parent = getdbidGroup(dbid).id;
			let arr = childCounts.get(dbid);
			if (!arr) {
				arr = [];
			}
			arr.push(arcObj);

			childCounts.set(dbid, arr);
			objects.push(arcObj);
		} else if (type == 'l') {
			let path = new Path();
			path.segments = [];
			for (let l of frag[3]) {
				let dx = l[2] - l[0];
				let dy = l[3] - l[1];
				let dist = Math.sqrt(dx * dx + dy * dy);
				if (dist < 0.1) {
					// Probably hatch texture

					if (Math.random() < 0.4) {
						let angle = Math.random() * Math.PI * 2;
						dx = Math.cos(angle) * dist;
						dy = Math.sin(angle) * dist;
						path.segments.push(transformCoord([l[0], l[1]] as RelativeCoordinate));
						path.segments.push(
							transformCoord([l[0] + dx * 140, l[1] + dy * 140] as RelativeCoordinate)
						);
					}
				} else {
					path.segments.push(transformCoord([l[0], l[1]] as RelativeCoordinate));
					path.segments.push(transformCoord([l[2], l[3]] as RelativeCoordinate));
				}
			}
			path.style = new Material();
			path.style.color = hexColorToArray(`#${color.replace('-', '')}`);
			path.id = 'path' + i;
			path.disconnected = true;

			path.parent = getdbidGroup(dbid).id;
			let arr = childCounts.get(dbid);
			if (!arr) {
				arr = [];
			}
			arr.push(path);

			childCounts.set(dbid, arr);
			path.name = 'P';
			objects.push(path);
		} else if (type == 't') {
			let path = new Path();
			path.segments = [];
			for (let l of frag[3]) {
				path.segments.push(transformCoord([l[0], l[1]] as RelativeCoordinate));
				path.segments.push(transformCoord([l[2], l[3]] as RelativeCoordinate));
				path.segments.push(transformCoord([l[4], l[5]] as RelativeCoordinate));
			}
			path.style = new Material();
			path.style.color = hexColorToArray(`#${color.replace('-', '')}`);
			path.id = 'tri' + i;
			path.disconnected = true;
			path.style.filled = true;

			path.parent = getdbidGroup(dbid).id;
			let arr = childCounts.get(dbid);
			if (!arr) {
				arr = [];
			}
			arr.push(path);

			childCounts.set(dbid, arr);
			path.name = 'T';
			objects.push(path);
		}

		// for (let [dbid, count] of childCounts.entries()) {
		// 	if (count == 1) {
		// 		// Remove group and keep child
		// 		let group = getdbidGroup(dbid);
		// 		let child = objects.find((o) => o.parent == group.id);
		// 		if (child) {
		// 			child.parent = group.parent;
		// 		}
		// 		objects = objects.filter((o) => o.id != group.id);
		// 	}
		// }

		// for (let i = objects.length - 1; i >= 0; i--) {
		// 	let obj = objects[i];
		// 	if (obj.type == ObjectType.Group) {
		// 		if (obj.id.startsWith('group')) {
		// 			let dbid = parseInt(obj.id.substr(5));
		// 			if (childCounts.has(dbid) && childCounts.get(dbid)!.length <= 1) {
		// 				objects.splice(i, 1);

		// 				let children = childCounts.get(dbid)!;
		// 				for (let child of children) {
		// 					child.parent = obj.parent;
		// 					child.name = obj.name;
		// 				}
		// 			}
		// 		}
		// 	}
		// }

		i++;
		// let path = new Path();
		// path.segments = [];
		// for (let l of frag.lines) {
		// 	path.segments.push([l[0], l[1]] as RelativeCoordinate);
		// 	path.segments.push([l[2], l[3]] as RelativeCoordinate);
		// }
		// path.style = new Material();
		// path.style.color = [1, 1, 1, 1];
		// path.id = 'path' + i;
		// path.disconnected = true;
		// i++;
		// path.parent = rootObj.id;
		// objects.push(path);

		// for (let arc of frag.arcs) {
		// 	let arcObj = new Arc();
		// 	arcObj.transform.position = [arc[0], arc[1]];
		// 	arcObj.startAngle = arc[2];
		// 	arcObj.endAngle = arc[3];
		// 	arcObj.radius = arc[4];
		// 	arcObj.style = new Material();
		// 	arcObj.style.color = [1, 1, 1, 1];
		// 	arcObj.id = 'arc' + i;

		// 	i++;
		// 	arcObj.parent = rootObj.id;
		// 	objects.push(arcObj);
	}

	for (let [dbid, loc] of textLocations.entries()) {
		let text = new Text();
		text.transform.position = loc;
		text.text = cleanCadText(getProp(dbid, 'Contents')?.displayValue ?? '');
		text.style = new Material();
		let textHeight = getProp(dbid, 'Text height');
		if (textHeight) {
			let val = parseInt(textHeight.displayValue?.toString() ?? '0');
			let unit = (textHeight as any).units;

			if (unit) {
				let mapping = unitMapShort[unit];
				if (mapping) {
					val *= unitScale[mapping];
				}
			}

			text.size = val;
		}
		text.style.color = [1, 1, 1, 1];
		text.id = 'text' + i;
		text.parent = rootObj.id;
		text.name = 'T';
		objects.push(text);
		i++;
	}

	return objects;
}

function cleanCadText(text: string) {
	text = text.replaceAll('\\P', '\n');

	if (text.startsWith('{\\')) {
		let style = text.match(/{\\([^;]+);/);
		if (style) {
			let styleName = style[1];
			let styleDef = text.match(/{\\[^;]+;(.*)}/);
			if (styleDef) {
				let styleDefStr = styleDef[1];
				let styleDefParts = styleDefStr.split(';');
				let styleDefObj: any = {};
				for (let part of styleDefParts) {
					let [key, val] = part.split('=');
					styleDefObj[key] = val;
				}
				let styleObj: any = {};
			}
		}

		text = text.replace(/{\\[^;]+;/, '');
		text = text.replace(/}/, '');
	}

	return text;
}

export function translateDXF(rawDXF: string): Object2D[] | null {
	if (rawDXF.startsWith('{')) {
		try {
			let json = JSON.parse(rawDXF);
			return translateJSON(json);
		} catch (e) {
			console.error(e);
			return null;
		}
	}
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

		console.log('DXF', dxf);

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
				x = x2;
				y = 0;
				z = y2;
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

		function translateEntity(ent: IEntity, willBeId: string): Object2D {
			if (!dxf) throw new Error('DXF not loaded');
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

				text.text = cleanCadText(textEnt.text);

				let dirVec = textEnt.directionVector;

				let angle = Math.atan2(dirVec.x, dirVec.y); // We swap x and y because the viewDirection is strange

				text.transform.rotation = angle;

				obj = text;
			} else if (ent.type == 'INSERT') {
				let insertEnt = ent as IInsertEntity;
				let block = dxf.blocks[insertEnt.name];
				if (!block) {
					console.log('No block found for insert', insertEnt);
				} else {
					let childEntities = block.entities;
					console.log('Insert', insertEnt, childEntities);
					let trans = transformCoords(ent, insertEnt.position);
					let group = new Group();
					group.transform = new Transform();
					group.transform.position = [trans.x, trans.z];
					group.name = insertEnt.name;
					group.transform.rotation = insertEnt.rotation ?? 0;
					group.transform.size = [insertEnt.xScale ?? 1, insertEnt.yScale ?? 1];

					if (childEntities) {
						let childObjects = childEntities.map((ent, i) => {
							let childId = `${willBeId}-child${i}`;
							let childObj = translateEntity(ent, childId);
							childObj.id = childId;
							childObj.order = i;
							return childObj;
						});
						for (let obj of childObjects) {
							obj.parent = willBeId;
							obj.transform.rotation = obj.transform.rotation + group.transform.rotation;
							let deg2rad = Math.PI / 180;
							let rotationMatrix = [
								[
									Math.cos(obj.transform.rotation * deg2rad),
									-Math.sin(obj.transform.rotation * deg2rad)
								],
								[
									Math.sin(obj.transform.rotation * deg2rad),
									Math.cos(obj.transform.rotation * deg2rad)
								]
							];
							function applyRotation(p: [number, number]) {
								return [
									p[0] * rotationMatrix[0][0] + p[1] * rotationMatrix[0][1],
									p[0] * rotationMatrix[1][0] + p[1] * rotationMatrix[1][1]
								];
							}
							let applied = applyRotation(obj.transform.position);
							obj.transform.position = [
								group.transform.position[0] + applied[0],
								group.transform.position[1] + applied[1]
							];
							objects.push(obj);
						}
					}
					obj = group;
				}
			} else {
				console.log('Unhandled entity', ent);
			}

			if (!obj) obj = new Group();

			obj.style = mat;
			obj.visible = ent.visible;
			if (!obj.name) {
				obj.name = ent.handle.toString() ?? '';
			}
			obj.parent = ent.layer;

			return obj;
		}

		for (let [i, ent] of dxf.entities.entries()) {
			let obj = translateEntity(ent, 'ent' + i.toString());
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
