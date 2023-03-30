/* SPDX-FileCopyrightText: 2022-present Kriasoft */
/* SPDX-License-Identifier: MIT */
import { decode as decodeCore, verify as verifyCore, } from "../core/jwt.js";
export { decode, verify };
const decode = decodeCore;
const verify = verifyCore;
