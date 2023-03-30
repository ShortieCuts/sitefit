export const parseCookie = (str: string) =>
	str
		.split(';')
		.map((v) => v.split('='))
		.reduce((acc, v) => {
			if (v.length === 2) {
				acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
			}
			return acc;
		}, {} as { [key: string]: string });
