export function metersToFeetPrettyPrint(meters: number) {
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
	return `${feetInt}' ${inchesInt}${inchesFracStr}"`;
}
