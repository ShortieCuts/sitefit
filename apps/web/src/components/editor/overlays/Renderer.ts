import * as THREE from 'three';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ThreeJSOverlayView } from '@googlemaps/three';
import { Vector2 } from 'three';

export function initMap(map: google.maps.Map): void {
	const overlay = new ThreeJSOverlayView({
		map,
		upAxis: 'Y',
		anchor: map.getCenter()
	});

	// create a box mesh
	const box = new THREE.Mesh(new THREE.BoxGeometry(10, 50, 10), new THREE.MeshMatcapMaterial());
	// move the box up so the origin of the box is at the bottom
	box.geometry.translate(0, 25, 0);

	const line = new THREE.Mesh(
		new THREE.TubeGeometry(
			new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 100)),
			100,
			1,
			2,
			false
		),
		new THREE.LineBasicMaterial({ color: 0xff0000 })
	);

	/// line.rotateZ(THREE.MathUtils.degToRad(90));

	line.position.copy(
		overlay.latLngAltitudeToVector3({
			lng: map.getCenter()?.lng() ?? 0,
			lat: map.getCenter()?.lat() ?? 0
		})
	);

	// set position at center of map
	box.position.copy(
		overlay.latLngAltitudeToVector3({
			lng: map.getCenter()?.lng() ?? 0,
			lat: map.getCenter()?.lat() ?? 0
		})
	);
	console.log({
		lng: map.getCenter()?.lng() ?? 0,
		lat: map.getCenter()?.lat() ?? 0
	});

	// add box mesh to the scene
	overlay.scene.add(box);
	overlay.scene.add(line);

	// rotate the box using requestAnimationFrame
	const animate = () => {
		box.rotateY(THREE.MathUtils.degToRad(0.1));
		overlay.requestRedraw();

		requestAnimationFrame(animate);
	};

	// start animation loop
	requestAnimationFrame(animate);

	const mapDiv = map.getDiv();
	const mousePosition = new Vector2();

	map.addListener('mousemove', (ev: google.maps.MapMouseEvent) => {
		const domEvent = ev.domEvent as MouseEvent;
		const { left, top, width, height } = mapDiv.getBoundingClientRect();

		const x = domEvent.clientX - left;
		const y = domEvent.clientY - top;

		mousePosition.x = 2 * (x / width) - 1;
		mousePosition.y = 1 - 2 * (y / height);

		// since the actual raycasting is performed when the next frame is
		// rendered, we have to make sure that it will be called for the next frame.
		overlay.requestRedraw();
	});

	overlay.onBeforeDraw = () => {
		const intersections = overlay.raycast(mousePosition, [box, line]);
		box.material.color.setHex(0x000000);
		line.material.color.setHex(0x000000);

		if (intersections.length > 0) {
			intersections[0].object.material.color.setHex(0xff0000);
		}
	};
}
