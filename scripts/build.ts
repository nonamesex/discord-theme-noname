import * as sass from "sass-embedded";
import * as fs from "fs";
import { VENCORD_CONFIG_PATH } from "./build_utils";
import * as path from "path";
import { getMetaData } from "./metadata.ts";
import mime from "mime";
import chokidar from "chokidar";
import CleanCSS from "clean-css";

const cwd = process.cwd();
const distPath = path.join(cwd, "dist");
const srcPath = path.join(cwd, "src");

const flagProd: boolean = process.argv.includes("--prod");
const flagWatch: boolean = process.argv.includes("--watch");
const flagVencord: boolean = process.argv.includes("--mod-vc");
const flagReplugged: boolean = process.argv.includes("--mod-rp");
const flagBetterDiscord: boolean = process.argv.includes("--mod-bd");

let buildTimeout: NodeJS.Timeout;
let buildInProcess: boolean = false;
let buildStart: number = 0;

const compileScss = async (scssPath) => {
	const result = await sass.compileAsync(scssPath, {
		sourceMap: !flagProd,
		sourceMapIncludeSources: true,
		verbose: true,
		charset: false,
		// style: flagProd ? "compressed" : "expanded",
		functions: {
			"encodeBase64($string)": (args) => new sass.SassString(
				Buffer.from(args[0].assertString("string").text).toString('base64')
			),
			"insertFile($path)": (args) => {
				const relPath = args[0].assertString("string").text;
				const data = fs.readFileSync(path.join(cwd, relPath), { encoding: "base64" });
				return new sass.SassString(`url("data:${mime.getType(relPath)};base64,${data}")`, { quotes: false });
			}
		}
	});

	console.log(`[${Date.now() - buildStart}ms] ${scssPath} compiled`);

	var cleancss = new CleanCSS({
		level: {
			2: {
				// uh
				mergeSemantically: true,
				restructureRules: true
			}
		},
		sourceMap: result.sourceMap !== undefined,
		sourceMapInlineSources: true,
		format: flagProd ? {} : {
			breaks: {
				afterAtRule: true,
				afterBlockBegins: true,
				afterBlockEnds: true,
				afterComment: true,
				afterProperty: true,
				afterRuleBegins: true,
				afterRuleEnds: true,
				beforeBlockEnds: true,
				betweenSelectors: true
			},
			breakWith: '\n',
			indentBy: 1,
			indentWith: 'tab',
			spaces: {
				aroundSelectorRelation: true,
				beforeBlockBegins: true,
				beforeValue: true
			},
			semicolonAfterLastProperty: true
		}
	}).minify(result.css, result.sourceMap);

	result.css = cleancss.styles;
	result.sourceMap = cleancss.sourceMap;

	console.log(`[${Date.now() - buildStart}ms] CleanCSS Level 2 optimizations`);

	return result;
}

const saveSassCompileResult = (result: sass.CompileResult, filePath: string, fileName: string, metaType?: "usercss" | "betterdiscord" | "replugged") => {
	const metaData = getMetaData();
	const resultFilePath = path.join(filePath, fileName);

	if (!fs.existsSync(filePath)) {
		fs.mkdirSync(filePath);
	}

	const fileDescriptor = fs.openSync(resultFilePath, "w");

	if (metaType) {
		if (metaType == "replugged") {
			fs.writeFileSync(path.join(filePath, "manifest.json"), `${metaData[metaType]}\n`);
		} else {
			fs.writeFileSync(fileDescriptor, `${metaData[metaType]}\n`);
		}
	}

	if (metaType == "usercss") {
		fs.writeFileSync(fileDescriptor, '@-moz-document domain("discord.com") {\n')
	}

	fs.writeFileSync(fileDescriptor, `${result.css}\n`);

	if (metaType == "usercss") {
		fs.writeFileSync(fileDescriptor, "}\n")
	}

	if (result.sourceMap) {
		fs.writeFileSync(fileDescriptor, `/*# sourceMappingURL=file:///${resultFilePath.replace("\\", "/")}.map */\n`);
		fs.writeFileSync(resultFilePath + ".map", JSON.stringify(result.sourceMap));
	}

	fs.closeSync(fileDescriptor);

	console.log(`[${Date.now() - buildStart}ms] ${fileName} saved to ${filePath}`);
}

const buildScss = async () => {
	if (buildInProcess) return;
	buildInProcess = true;

	console.log(`Build started`);
	buildStart = Date.now();

	try {
		if (fs.existsSync(distPath)) fs.rmSync(distPath, { recursive: true });
		if (!fs.existsSync(distPath)) fs.mkdirSync(distPath, { recursive: true });

		const result = await compileScss(path.join(srcPath, "index.scss"));

		const metaData = getMetaData();

		if (flagProd) {
			let fileName = metaData.generic.name + ".theme.css";
			saveSassCompileResult(result, distPath, fileName, "betterdiscord");

			fileName = metaData.generic.name + ".user.css";
			saveSassCompileResult(result, distPath, fileName, "usercss");

			let filePath = path.join(distPath, `dev.${metaData.generic.author}.${metaData.generic.name}/`);
			saveSassCompileResult(result, filePath, "main.css", "replugged");
		} else {
			saveSassCompileResult(result, distPath, "main.css");

			if (flagVencord) {
				let fileName = metaData.generic.name + ".theme.css";
				fs.copyFileSync(
					path.join(distPath, "main.css"),
					path.join(VENCORD_CONFIG_PATH, "themes", fileName)
				);
			}
		}
	} catch(e) {
		console.log(`[${Date.now() - buildStart}ms] Build failed: ${e.message}`);
	} finally {
		console.log(`[${Date.now() - buildStart}ms] Build complete`);
	}

	buildInProcess = false;
};

await buildScss();

if (flagWatch) {
	console.log("Now watching for changes");
	chokidar.watch("src/**/*.scss").on("change", (filename) => {
		if (!filename?.replace("\\", "/").startsWith("src/")) return;
		if (!filename?.endsWith(".scss")) return;
		if (buildTimeout) clearTimeout(buildTimeout);
		buildTimeout = setTimeout(buildScss, 500);
	})
}
