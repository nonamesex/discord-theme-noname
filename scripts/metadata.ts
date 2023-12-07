import fs from "fs";

export type MetaDataContent = Object[] & {
	generic: {
		name: string;
		version: string;
		description: string;
		author: string;
		license: string;
		discordAuthorId: string;
		repo: string;
	};
	usercss: {
		name: string;
		version: string;
		namespace: string;
		description: string;
		author: string;
		homepageURL: string;
		supportURL: string;
		updateURL: string;
		license: string;
	};
	betterdiscord: {
		name: string;
		author: string;
		description: string;
		version: string;
		invite: string;
		authorId: string;
		authorLink: string;
		donate: string;
		patreon: string;
		website: string;
		source: string;
		discordId: string;
	};
	replugged: {
		id: string;
		name: string;
		description: string;
		author: {
			name: string;
			discordID: string;
			github: string;
		};
		version: string;
		updater: {
			type: string;
			id: string;
		};
		license: string;
		type: string;
		main: string;
		source: string;
		image: string[];
	};
};

export const getMetaData = () => {
	const meta = JSON.parse(
		fs.readFileSync("scripts/metadata.json", { encoding: "utf-8" })
	) as MetaDataContent;

	const result = {
		usercss: "",
		betterdiscord: "",
		replugged: "",
	};

	{
		meta.usercss.name = meta.generic.name;
		meta.usercss.version = meta.generic.version;
		meta.usercss.description = meta.generic.description;
		meta.usercss.author = meta.generic.author;
		meta.usercss.namespace = `dev.${meta.generic.author}`;
		meta.usercss.homepageURL = meta.generic.repo;
		if (meta.usercss.updateURL.length !== 0) {
			if (!meta.usercss.updateURL.startsWith("http")) {
				meta.usercss.updateURL = `${meta.generic.repo}/${meta.usercss.updateURL}`;
			}
		}
		meta.usercss.license = meta.generic.license;

		result.usercss += "/* ==UserStyle==\n";
		for (let [key, value] of Object.entries(meta.usercss)) {
			if (value && value.length !== 0) {
				result.usercss += `@${key} ${value}\n`;
			}
		}
		result.usercss += "==/UserStyle== */\n";
	}

	{
		meta.betterdiscord.name = meta.generic.name;
		meta.betterdiscord.version = meta.generic.version;
		meta.betterdiscord.description = meta.generic.description;
		meta.betterdiscord.author = meta.generic.author;
		meta.betterdiscord.authorId = meta.generic.discordAuthorId;
		meta.betterdiscord.website = meta.generic.repo;
		meta.betterdiscord.source = meta.generic.repo;

		result.betterdiscord += "/**\n";
		for (let [key, value] of Object.entries(meta.betterdiscord)) {
			if (value && value.length !== 0) {
				result.betterdiscord += ` * @${key} ${value}\n`;
			}
		}
		result.betterdiscord += " */\n";
	}

	{
		const [git_platform, git_user, git_repo] = meta.generic.repo
			.split("//")[1]
			.split("/");

		meta.replugged.name = meta.generic.name;
		meta.replugged.version = meta.generic.version;
		meta.replugged.description = meta.generic.description;
		meta.replugged.id = `dev.${meta.generic.author}.${meta.generic.name}`;
		meta.replugged.updater.type = git_platform.split(".")[0];
		meta.replugged.updater.id = `${git_user}/${git_repo}`;
		meta.replugged.author.name = meta.generic.author;
		meta.replugged.author.discordID = meta.generic.discordAuthorId;
		meta.replugged.author.github = git_user;
		meta.replugged.license = meta.generic.license;
		meta.replugged.source = meta.generic.repo;

		result.replugged = JSON.stringify(meta.replugged, undefined, 2);
	}

	return result;
};
