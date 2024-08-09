import fetch from "node-fetch";
import * as fs from "fs";
import { glob } from "glob";

interface UpdaterData {
	fileSha: string;
	lastFetch: number;
}

const updaterData: UpdaterData = {
	fileSha: "",
	lastFetch: 0,
};

const scriptRoot = "./scripts/classupdate/";
const fileReadUtf8 = (path: fs.PathOrFileDescriptor) => fs.readFileSync(path, { encoding: "utf8" });
const fileWriteUtf8 = (path: fs.PathOrFileDescriptor, data: string | NodeJS.ArrayBufferView) =>
	fs.writeFileSync(path, data, { encoding: "utf8" });
const getChangesPath = (sha?: string) =>
	scriptRoot + "Changes-" + (sha ? sha : updaterData.fileSha).substring(0, 7) + ".txt";
const getTimestamp = () => new Date().setMilliseconds(0) / 1000;

let updaterDataSaved = updaterData;

if (fs.existsSync(scriptRoot + "updater.json")) {
	updaterDataSaved = JSON.parse(fileReadUtf8(scriptRoot + "updater.json"));
}

for (let v in updaterData) {
	updaterData[v] = updaterDataSaved[v];
}

const getLastChangesFile = async () => {
	let response = await fetch("https://api.github.com/repos/SyndiShanX/Update-Classes/commits");
	if (!response.ok) {
		console.log("api.github.com/commits");
		return false;
	}

	response = await fetch(JSON.parse(await response.text())[0]["commit"]["tree"]["url"]);
	if (!response.ok) {
		console.log("api.github.com/git/trees");
		return false;
	}

	let tree = JSON.parse(await response.text())["tree"];
	let fileSha = "";

	for (let v of tree) {
		if (v["path"] === "Changes.txt") {
			fileSha = v["sha"] as string;
			break;
		}
	}

	if (fileSha === "") {
		console.log("Changes.txt not found");
		return false;
	}

	updaterData.lastFetch = getTimestamp() + 60 * 10;

	if (updaterData.fileSha === fileSha) {
		if (fs.existsSync(getChangesPath(fileSha))) {
			return true;
		}
	}

	response = await fetch("https://raw.githubusercontent.com/SyndiShanX/Update-Classes/main/Changes.txt");
	if (!response.ok) {
		console.log("raw.githubusercontent.com");
		return false;
	}

	fileWriteUtf8(getChangesPath(fileSha), await response.text());

	updaterData.fileSha = fileSha;

	return true;
};

const replaceClasses = (classes: RegExpMatchArray, content: string) => {
	for (let i = 0; classes.length > i; i += 2) {
		let replace_from = classes[i];
		let replace_to = classes[i + 1];
		content = content.replaceAll(replace_from, replace_to);
	}
	return content;
};

const classUpdate = async () => {
	let updateNeeded = !fs.existsSync(getChangesPath());
	if (updateNeeded || getTimestamp() > updaterData.lastFetch) {
		await getLastChangesFile();
	}

	let classes = fileReadUtf8(getChangesPath()).match(/[^\r\n]+/g);
	if (classes == null) {
		return;
	}

	let paths = await glob("./src/**/*.scss");
	for (let path of paths) {
		let content = fileReadUtf8(path);
		content = replaceClasses(classes, content);
		fileWriteUtf8(path, content);
	}

	fileWriteUtf8(scriptRoot + "updater.json", JSON.stringify(updaterData));
};

classUpdate();
