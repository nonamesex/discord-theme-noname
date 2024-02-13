const stateInstallingUpdates = (current, total, progress) => {
	return {
		status: "installing-updates",
		current: current,
		total: total,
		progress: progress ? (current / total * 100) : undefined
	}
};

const stateDownloadingUpdates = (current, total, progress) => {
	return {
		status: "downloading-updates",
		current: current,
		total: total,
		progress: progress ? (current / total * 100) : undefined
	}
};

const stateUpdateFailure = (seconds) => {
	return {
		status: "update-failure",
		seconds: seconds
	}
};

const stateLaunching = () => {
	return {
		status: "launching"
	}
};

const stateUpdateManually = () => {
	return {
		status: "update-manually",
		selectedDownload: "nope",
		newVersion: "with shit"
	}
};

const stateCheckingForUpdates = () => {
	return {
		status: "checking-for-updates"
	}
};

let onStateUpdateShit = undefined;

DiscordSplash = {
	getReleaseChannel: () => "stable",
	onQuoteUpdate: (callback) => null,
	onStateUpdate: (callback) => {
		onStateUpdateShit = callback;
		callback(
			stateInstallingUpdates(3, 15, true)
		);
	},
	openUrl: (url, data) => null,
	quitDiscord: () => null,
	signalReady: () => null,
}
