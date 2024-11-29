// loadEnv.js
import dotenv from "dotenv";
import path from "path";

export function loadCharacterEnv(characterName: string) {
    const rootDir = process.cwd();
    const characterPath = path.resolve(rootDir, `../.env.${characterName}`);
    const res = dotenv.config({ path: characterPath });
    return res;
}
