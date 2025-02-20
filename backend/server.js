import express, { raw } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import unzipper from 'unzipper';
import mongoose from "mongoose";
import Package from './models/Package.js';
import PackageFetchingProcess from './models/PacakgeFetchingProcess.js';
import dotenv from 'dotenv';
dotenv.config();

const execAsync = promisify(exec);
const app = express();
const PORT = 8080;

app.use(express.json());
app.use(cors());

/**
 * Function to run ADB command on system shell
 * @param {string} command - The ADB command to execute
 * @returns {Promise<string>} - Command output
 */
const runAdbCommand = async (command) => {
    try {
        const { stdout, stderr } = await execAsync(`adb ${command}`);
        if (stderr) throw new Error(stderr);
        return stdout.trim();
    } catch (error) {
        if (error.message.includes("Command failed:")) {
            throw error;
        }
    }
};

const runNormalCommand = async (command) => {
    try {
        const { stdout, stderr } = await execAsync(command);
        if (stderr) throw new Error(stderr);
        return stdout.trim();
    } catch (error) {
        console.log(error)
    }
};

app.get('/', (req, res) => {
    res.send('ADB API Server is Running');
});

//connect device
app.post('/adb/connect', async (req, res) => {
    try {
        //get ip and port from request
        const { ip, port } = req.body;
        //connect device
        const output = await runAdbCommand(`connect ${ip}:${port}`);
        res.status(200).json(output);
    } catch (err) {
        res.status(500).json(err);
    }
});

//disconnect device
app.post('/adb/disconnect', async (req, res) => {
    try {
        //get ip and port from request
        const { id } = req.body;
        //disconnect device
        const output = await runAdbCommand(`disconnect ${id}`);
        res.status(200).json(output);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET: List connected devices
app.get('/adb/devices', async (req, res) => {
    try {
        const output = await runAdbCommand('devices');

        // Parse ADB output into structured JSON
        const devices = output
            .split('\n')                      // Split by new lines
            .slice(1)                         // Skip "List of devices attached"
            .filter(line => line.trim() !== '') // Remove empty lines
            .map(line => {
                const [id, status] = line.split('\t');
                return { id, status };
            });

        res.status(200).json(devices);
    } catch (err) {
        res.status(500).json(err);
    }
});

// POST: Run any custom ADB command
app.post('/adb/execute', async (req, res) => {
    const { command } = req.body;

    if (!command) {
        return res.status(400).json({ success: false, error: 'ADB command is required' });
    }

    try {
        const output = await runAdbCommand(command);
        res.status(200).json({ success: true, data: output });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

//scrcpy
app.post('/adb/scrcpy', async (req, res) => {
    try {
        const { id } = req.body;
        //run scrcpy -s <device_id>

        runNormalCommand(`scrcpy -s ${id}`);
        res.status(200).send("scrcpy started");
    } catch (err) {
        res.status(500).send("failed to start scrcpy");
    }
});

export async function getLauncherIconBase64WithoutParser(deviceId, packageName) {
    try {
        // 1. Run "pm path <packageName>" to get one or more APK paths (split APK).
        const { stdout: pmPathStdout } = await execAsync(`adb -s ${deviceId} shell pm path ${packageName}`);

        // Example lines might be:
        // package:/data/app/~~abc==/com.myapp-xxxx==/base.apk
        // package:/data/app/~~abc==/com.myapp-xxxx==/split_config.arm64_v8a.apk
        // ...
        const lines = pmPathStdout
            .split('\n')
            .map(line => line.replace('package:', '').trim())
            .filter(Boolean);

        // 2. Pick the line containing "base.apk" (skip splits).
        const baseApkPath = lines.find(line => line.includes('base.apk'));
        if (!baseApkPath) {
            console.warn(`[WARN] No base.apk found for package: ${packageName}`);
            return null;
        }

        // 3. Pull the base.apk to a local temp folder
        const tempDir = path.join(process.cwd(), 'temp', packageName);
        await fsPromises.mkdir(tempDir, { recursive: true });

        console.log("PACKAGE NAME: ", packageName);

        const localApkPath = path.join(tempDir, 'base.apk');

        //if file base.apk already exists, skip

        if (!fs.existsSync
            (localApkPath)) {
            console.log("PULLING APK...");
            await execAsync(`adb -s ${deviceId} pull "${baseApkPath}" "${localApkPath}"`);
        }

        console.log("LOCAL APK PATH: ", localApkPath);

        // 4. Unzip base.apk into an "extracted" subfolder
        const extractedDir = path.join(tempDir, 'extracted');
        await fsPromises.mkdir(extractedDir, { recursive: true });

        console.log("EXTRACT DIR: ", extractedDir);

        if (await (await fs.promises.opendir(extractedDir)).read() === null) {
            console.log("UNZIPPING...");
            const directory = await unzipper.Open.file(localApkPath);
            console.log("DIRECTORY: ", directory);
            await directory.extract({ path: extractedDir })
        }
        else {
            console.log("DIRECTORY ALREADY EXISTS");
        }
        // 5. Recursively scan for likely icon files in /res/mipmap-*/ or /res/drawable-*/
        const allFiles = await listAllFilesRecursively(extractedDir);
        let defaultIconCandidates = allFiles.filter(filePath => {
            const lower = filePath.toLowerCase();
            const isInResFolder = /\/res\/(mipmap|drawable)(-\w+)?\//.test(lower);
            const isImageFile = /\.(png|webp|jpg|jpeg|svg)$/.test(lower);

            // Strict naming for default icons (customize these if needed)
            const matchesDefaultNames = /(ic_launcher|launcher|app_icon|appicon)/.test(lower);

            return isInResFolder && isImageFile && matchesDefaultNames;
        });

        // 2) If no strictly-named default icons found, look for any icon-like files
        let iconCandidates = defaultIconCandidates;
        if (!iconCandidates.length) {
            iconCandidates = allFiles.filter(filePath => {
                const lower = filePath.toLowerCase();
                const isInResFolder = /\/res\/(mipmap|drawable)(-\w+)?\//.test(lower);
                const isImageFile = /\.(png|webp|jpg|jpeg|svg)$/.test(lower);

                // Broader naming patterns (like "icon", "logo")
                const matchesIconNaming = /(launcher|icon|ic_launcher|ic_app|app_icon|logo|app_logo|appicon)/.test(lower);

                return isInResFolder && isImageFile && matchesIconNaming;
            });
        }

        // 3) Finally, if still none found, fallback to any image file
        if (!iconCandidates.length) {
            iconCandidates = allFiles.filter(filePath => {
                const lower = filePath.toLowerCase();
                return /\.(png|webp|jpg|jpeg|svg)$/.test(lower);
            });
        }

        iconCandidates.sort((a, b) => densityRank(b) - densityRank(a));
        const bestIcon = iconCandidates[0];

        // 6. Read & Base64-encode the PNG
        const iconBuffer = await fsPromises.readFile(bestIcon);
        const iconBase64 = iconBuffer.toString('base64');

        //delete temp folder and files for this package
        await fsPromises.rm(tempDir, { recursive: true, force: true });
        await PackageFetchingProcess.deleteOne({ packageName: packageName });

        //base64 icon for img tag
        const iconBase64ForImgTag = `data:image/png;base64,${iconBase64}`;

        //save data to db
        const newPackage = new Package({
            packageName: packageName,
            appName: packageName, //TODO: get app name
            base64Image: iconBase64ForImgTag
        });

        await newPackage.save();

        return iconBase64ForImgTag;
    } catch (error) {
        console.error('Error extracting launcher icon:', error);
        return null;
    }
}

/**
 * Recursively lists all files in a directory and subdirectories
 * @param {string} dirPath
 * @returns {Promise<string[]>}
 */
async function listAllFilesRecursively(dirPath) {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    const files = await Promise.all(
        entries.map(async entry => {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                return listAllFilesRecursively(fullPath);
            } else {
                return [fullPath];
            }
        })
    );
    return files.flat();
}

/**
 * A naive way to rank densities: "xxxhdpi" > "xxhdpi" > "xhdpi" > "hdpi" > "mdpi" > "ldpi"
 */
function densityRank(filePath) {
    const order = ['xxxhdpi', 'xxhdpi', 'xhdpi', 'hdpi', 'mdpi', 'ldpi'];
    for (let i = 0; i < order.length; i++) {
        if (filePath.includes(order[i])) {
            // The earlier in the array, the higher rank. So invert by subtracting from length.
            return order.length - i;
        }
    }
    return 0; // No recognized density
}

//list packages
app.post('/adb/packages', async (req, res) => {
    try {
        const { id, systemApps } = req.body; // device ID
        // 1) List 3rd-party packages
        const rawOutput = await execAsync(`adb -s ${id} shell pm list packages ${systemApps ? "" : "-3"}`);
        const packages = rawOutput.stdout
            .split('\n')
            .filter(line => line.includes('package:'))
            .map(line => line.replace('package:', '').trim());

        console.log(packages);
        // 2) For each package, get the icon
        const results = [];
        for (const pkg of packages) {
            if (process.env.EXTRAS === "true") {
                const _package = await Package.findOne({ packageName: pkg });
                const iconBase64 = (_package) ? _package.base64Image : "x";
                if (!_package) {
                    try {
                        const existingProcess = await PackageFetchingProcess.findOne({ packageName: pkg });
                        if (existingProcess) {
                            console.log(`Package: ${pkg} is already being processed...`);
                        }
                        else {
                            const newProcess = new PackageFetchingProcess({
                                packageName: pkg
                            });
                            await newProcess.save();
                            getLauncherIconBase64WithoutParser(id, pkg);
                        }
                    }
                    catch (err) {
                        console.log(err);
                    }
                }
                console.log(`Package: ${pkg}, Icon: ${iconBase64 ? '✅' : '❌'}`);
                results.push({ packageName: pkg, iconBase64 });
            }
            else {
                const _package = await Package.findOne({ packageName: pkg });
                const iconBase64 = (_package) ? _package.base64Image : "x";
                results.push({
                    packageName: pkg, iconBase64: iconBase64
                })
            }
        }

        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/adb/launch-app', async (req, res) => {
    try {
        const { id, packageName } = req.body;
        const output = await runAdbCommand(`-s ${id} shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`);
        res.status(200).json(output);
    } catch (err) {
        res.status(500).json(err);
    }
});

app.post('/get-apk-paths', async (req, res) => {
    try {
        const { id, packageName } = req.body;

        //fetch all paths of the package
        const { stdout: pmPathStdout } = await execAsync(`adb -s ${id} shell pm path ${packageName}`);
        // parse into array of paths
        const paths = pmPathStdout
            .split('\n')
            .map(line => line.replace('package:', '').trim())
            .filter(Boolean);

        console.log(paths);

        return res.status(200).json(paths);
    } catch (err) {
        console.log(err)
        res.status(500).json(err);
    }
});

app.post('/export-apk', async (req, res) => {
    try {
        const { id, path } = req.body;

        //pull apk from device to local and send response as the file
        await execAsync(`adb -s ${id} pull ${path}`);

        const fileName = path.split('/').pop();
        console.log(fileName);

        res.download(fileName);
        await fsPromises.rm(fileName, { force: true });
    } catch (err) {
        console.log(err)
        res.status(500).json(err);
    }
});

//connect to db
mongoose.connect(process.env.DB_URL).then(() => {
    console.log('Connected to MongoDB');
}
).catch((err) => {
    console.log('Failed to connect to MongoDB', err);
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 ADB API Server running at http://localhost:${PORT}`);
});
