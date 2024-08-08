import fetch from "node-fetch";
import * as fs from "fs";
import { glob } from "glob";

interface UpdaterData {
	file_sha: string;
	last_fetch: number;
}

const updater_data: UpdaterData = {
	file_sha: "",
	last_fetch: 0,
};

let updater_data_saved = updater_data;

if (fs.existsSync("./scripts/classupdate/updater.json")) {
	updater_data_saved = JSON.parse(fs.readFileSync("./scripts/classupdate/updater.json", { encoding: "utf8" }));
}

for (let v in updater_data) {
	updater_data[v] = updater_data_saved[v];
}

const getTimestamp = () => new Date().setMilliseconds(0) / 1000;

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
	let file_sha = "";

	for (let v of tree) {
		if (v["path"] === "Changes.txt") {
			file_sha = v["sha"] as string;
			break;
		}
	}

	if (file_sha === "") {
		return false;
	}

	updater_data.last_fetch = getTimestamp() + 60 * 10;

	if (updater_data.file_sha === file_sha) {
		if (fs.existsSync("./scripts/classupdate/Changes-" + file_sha.substring(0, 7) + ".txt")) {
			return true;
		}
	}

	response = await fetch("https://raw.githubusercontent.com/SyndiShanX/Update-Classes/main/Changes.txt");
	if (!response.ok) {
		console.log("raw.githubusercontent.com");
		return false;
	}

	fs.writeFileSync("./scripts/classupdate/Changes-" + file_sha.substring(0, 7) + ".txt", await response.text(), {
		encoding: "utf8",
	});

	updater_data.file_sha = file_sha;

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
	let classesFilePath = "./scripts/classupdate/Changes-" + updater_data.file_sha.substring(0, 7) + ".txt";

	let updateNeeded = !fs.existsSync("./scripts/classupdate/Changes-" + updater_data.file_sha.substring(0, 7) + ".txt");
	if (updateNeeded || getTimestamp() > updater_data.last_fetch) {
		await getLastChangesFile();
	}

	classesFilePath = "./scripts/classupdate/Changes-" + updater_data.file_sha.substring(0, 7) + ".txt";

	let classes = fs.readFileSync(classesFilePath, { encoding: "utf8" }).match(/[^\r\n]+/g);
	if (classes == null) {
		return;
	}

	let paths = await glob("./src/**/*.scss");
	for (let path of paths) {
		let content = fs.readFileSync(path, { encoding: "utf-8" });
		content = replaceClasses(classes, content);
		fs.writeFileSync(path, content);
	}
};

await classUpdate();

fs.writeFileSync("./scripts/classupdate/updater.json", JSON.stringify(updater_data), { encoding: "utf8" });
