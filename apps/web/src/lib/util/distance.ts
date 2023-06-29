export function metersToFeetPrettyPrint(meters: number, includeInches: boolean = true) {
	let feet = meters * 3.28084;
	// Round to nearest inch

	feet = Math.round(feet * 12) / 12;

	let inchesPerFoot = 12;
	let feetInt = Math.floor(feet);
	let inches = (feet - feetInt) * inchesPerFoot;
	let inchesInt = Math.floor(inches);
	let inchesFrac = inches - inchesInt;
	let inchesFracStr = inchesFrac.toFixed(2).substring(1);
	if (inchesFracStr == '.00') {
		inchesFracStr = '';
	}
	if (includeInches) {
		if (inchesInt == 0) {
			return `${feetInt}'`;
		} else {
			return `${feetInt}' ${inchesInt}${inchesFracStr}"`;
		}
	} else {
		return `${feetInt}'`;
	}
}
export function metersToFeetDecimalPrettyPrint(meters: number) {
	let feet = meters * 3.28084;
	let inchesPerFoot = 12;
	let feetInt = Math.floor(feet);
	let inches = (feet - feetInt) * inchesPerFoot;
	if (inches == 0) {
		return `${feetInt}ft`;
	} else {
		return `${feetInt}.${(inches / 12).toFixed(1).substring(2)}ft`;
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
