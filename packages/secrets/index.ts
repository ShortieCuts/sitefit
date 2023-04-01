let DATABASE_URL: string = "";
let DATABASE_HOST: string = "";
let DATABASE_USER: string = "";
let DATABASE_PASSWORD: string = "";
let FIREBASE_WEB_API_KEY: string = "";
let PROJECT_ID: string = "";
let GOOGLE_CLOUD_KEY: string = "";

export function GET_DATABASE_URL() {
  return DATABASE_URL;
}

export function GET_DATABASE_HOST() {
  return DATABASE_HOST;
}

export function GET_DATABASE_USER() {
  return DATABASE_USER;
}

export function GET_DATABASE_PASSWORD() {
  return DATABASE_PASSWORD;
}

export function GET_FIREBASE_WEB_API_KEY() {
  return FIREBASE_WEB_API_KEY;
}

export function GET_PROJECT_ID() {
  return PROJECT_ID;
}

export function GET_GOOGLE_CLOUD_KEY() {
  return GOOGLE_CLOUD_KEY;
}

export function SET_DATABASE_URL(url: string) {
  DATABASE_URL = url;
}

export function SET_FIREBASE_WEB_API_KEY(key: string) {
  FIREBASE_WEB_API_KEY = key;
}

export function SET_PROJECT_ID(id: string) {
  PROJECT_ID = id;
}

export function SET_GOOGLE_CLOUD_KEY(key: string) {
  GOOGLE_CLOUD_KEY = key;
}

export function SET_DATABASE_HOST(host: string) {
  DATABASE_HOST = host;
}

export function SET_DATABASE_USER(user: string) {
  DATABASE_USER = user;
}

export function SET_DATABASE_PASSWORD(password: string) {
  DATABASE_PASSWORD = password;
}
