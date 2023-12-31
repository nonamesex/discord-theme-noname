import * as sass from "sass-embedded";
import * as fs from "fs";
import { VENCORD_CONFIG_PATH } from "./build_utils";
import * as path from "path";
import { getMetaData } from "./metadata.ts";

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

const saveSassCompileResult = (result: sass.CompileResult, filePath: string, fileName: string) => {
	if (result.css) {
		let meta = getMetaData().betterdiscord;
		if (result.sourceMap) {
			fs.writeFileSync(path.join(filePath, fileName), `${meta}\n${result.css}\n/*# sourceMappingURL=${fileName}.map */\n`);
			fs.writeFileSync(path.join(filePath, `${fileName}.map`), JSON.stringify(result.sourceMap))
		} else {
			fs.writeFileSync(path.join(filePath, fileName), `${meta}\n${result.css}`);
		}
		console.log(`[${Date.now() - buildStart}ms] ${fileName} saved to ${filePath}`);
	}
}

const buildScss = async () => {
	if (buildInProcess) return;
	buildInProcess = true;

	console.log(`Build started`);
	buildStart = Date.now();

	try {
		const result = await sass.compileAsync(path.join(srcPath, "index.scss"), {
			sourceMap: !flagProd,
			sourceMapIncludeSources: false,
			verbose: true,
			charset: true,
			style: flagProd ? "compressed" : "expanded",
			functions: {
				"encodeBase64($string)": (args) => new sass.SassString(
					Buffer.from(args[0].assertString("string").text).toString('base64')
				)
			}
		})
		console.log(`[${Date.now() - buildStart}ms] CSS compiled`);

		if (fs.existsSync(distPath)) fs.rmSync(distPath, { recursive: true });
		if (!fs.existsSync(distPath)) fs.mkdirSync(distPath, { recursive: true });
		console.log(`[${Date.now() - buildStart}ms] dist dir cleanup`);

		saveSassCompileResult(result, distPath, "main.css")
	
		if (flagVencord) {
			saveSassCompileResult(result, path.join(VENCORD_CONFIG_PATH, "themes"), "noname.theme.css")
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
	fs.watch(srcPath, { recursive: true }, (eventType, filename) => {
		if (!filename?.endsWith(".scss")) return;
		if (buildTimeout) clearTimeout(buildTimeout);
		buildTimeout = setTimeout(buildScss, 250);
	});
}
