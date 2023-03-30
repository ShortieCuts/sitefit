/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}', '../../packages/ui/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				body: ['"Lato"', 'sans-serif'],
				title: ['"Montserrat"', 'sans-serif'],
				sans: ['"Lato"', 'sans-serif']
			}
		}
	},
	plugins: []
};
