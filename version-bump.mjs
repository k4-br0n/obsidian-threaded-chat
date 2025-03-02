import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.argv[2];
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const manifestJson = JSON.parse(readFileSync("manifest.json", "utf8"));
const versionsJson = JSON.parse(readFileSync("versions.json", "utf8"));

const currentVersion = packageJson.version;

if (!targetVersion) {
    console.error("Missing target version!");
    process.exit(1);
}

packageJson.version = targetVersion;
manifestJson.version = targetVersion;
versionsJson[targetVersion] = manifestJson.minAppVersion;

writeFileSync("package.json", JSON.stringify(packageJson, null, 2));
writeFileSync("manifest.json", JSON.stringify(manifestJson, null, 2));
writeFileSync("versions.json", JSON.stringify(versionsJson, null, 2));

console.log(`Bumped from ${currentVersion} to ${targetVersion}`); 