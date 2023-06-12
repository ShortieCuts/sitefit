export function metersToFeetPrettyPrint(meters: number, includeInches: boolean = true) {
	let feet = meters * 3.28084;
	let inchesPerFoot = 12;
	let feetInt = Math.floor(feet);
	let inches = (feet - feetInt) * inchesPerFoot;
	let inchesInt = Math.floor(inches);
	let inchesFrac = inches - inchesInt;
	let inchesFracStr = inchesFrac.toFixed(2).substring(1);
	if (inchesFracStr == '00') {
		inchesFracStr = '';
	}
	if (includeInches) {
		return `${feetInt}' ${inchesInt}${inchesFracStr}"`;
	} else {
		return `${feetInt}'`;
	}
}

export function metersAreaToFootArea(meters: number) {
	let feet = meters * 10.764;
	return feet.toFixed(1).replace(/\.0$/, '') + "' ft²";
}

export function feetToMeters(feet: number) {
	return feet / 3.28084;
}

export function metersToFeet(meters: number) {
	return meters * 3.28084;
}
