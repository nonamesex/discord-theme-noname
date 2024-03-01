import path from "path";

const getUserConfig = () => {
	switch (process.platform) {
		case "win32":
			return process.env.APPDATA || "";
		case "darwin":
			return path.join(process.env.HOME || "", "Library", "Application Support");
		default:
			if (process.env.XDG_CONFIG_HOME) {
				return process.env.XDG_CONFIG_HOME;
			}
			return process.env.HOME || "";
	}
}

export const REPLUGGED_CONFIG_PATH = path.join(getUserConfig(), "replugged")
export const VENCORD_CONFIG_PATH = (() => {
	// https://github.com/ProtonMail/go-appdir
	// https://github.com/Vencord/Installer/blob/main/patcher.go#L24
	if (process.env.VENCORD_USER_DATA_DIR) {
		return process.env.VENCORD_USER_DATA_DIR;
	} else if (process.env.DISCORD_USER_DATA_DIR) {
		return path.join(process.env.DISCORD_USER_DATA_DIR, "..", "VencordData");
	} else {
		return path.join(getUserConfig(), "Vencord")
	}
})()
