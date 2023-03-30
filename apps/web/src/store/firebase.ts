// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
	apiKey: 'AIzaSyBg0tTgVKWYZRHRRL53Y2u4wbqh9pebBzs',
	authDomain: 'cad-fitter.firebaseapp.com',
	projectId: 'cad-fitter',
	storageBucket: 'cad-fitter.appspot.com',
	messagingSenderId: '469062219546',
	appId: '1:469062219546:web:16394d2bf4e7e8c96cdea3',
	measurementId: 'G-KHES64WM2T'
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
export const analytics = getAnalytics(app);
