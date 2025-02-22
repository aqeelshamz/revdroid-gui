import express from 'express';
import { exec, spawn } from 'child_process';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import unzipper from 'unzipper';
import mongoose from "mongoose";
import Package from './models/Package.js';
import PackageFetchingProcess from './models/PacakgeFetchingProcess.js';
import dotenv from 'dotenv';
import fridaRouter from "./routes/frida.js";
import { runAdbCommand, runNormalCommand } from './utils/utils.js';
import { promisify } from "util";

const execAsync = promisify(exec);

dotenv.config();

const app = express();
const PORT = 8080;

let isConnectedtoDB = false;

app.use(express.json());
app.use(cors());

app.use('/frida', fridaRouter);

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
                results.push({ packageName: pkg, iconBase64 });
            }
            else {
                if (isConnectedtoDB) {
                    const _package = await Package.findOne({ packageName: pkg });
                    const iconBase64 = (_package) ? _package.base64Image : "x";
                    results.push({
                        packageName: pkg, iconBase64: iconBase64
                    })
                }
                else {
                    results.push({ packageName: pkg, iconBase64: "x" });
                }
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

//start activity
app.post("/adb/start-activity", async (req, res) => {
    try {
        const { id, packageName, activityName } = req.body;

        if (!activityName) {
            const output = await runAdbCommand(`-s ${id} shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`);
            return res.status(200).json(output);
        }

        const output = await runAdbCommand(`-s ${id} shell am start -n ${packageName}/${activityName}`);
        res.status(200).json(output);
    } catch (err) {
        res.status(500).json(err);
    }
});

app.post("/adb/power", async (req, res) => {
    try {
        const { id, action } = req.body;

        const actionMap = {
            "shutdown": "shell reboot -p",
            "reboot": "reboot",
            "recovery": "reboot recovery",
            "bootloader": "reboot bootloader"
        };

        const output = await runAdbCommand(`-s ${id} ${actionMap[action]}`);
        res.status(200).json(output);
    } catch (err) {
        res.status(500).json(err);
    }
});

app.post("/adb/screenshot", async (req, res) => {
    try {
        const { id } = req.body;
        await runAdbCommand(`-s ${id} exec-out screencap -p > screenshot.png`);
        const screenshot = await fsPromises.readFile('screenshot.png');
        const screenshotBase64 = screenshot.toString('base64');
        //png image base
        const screenshotBase64ForImgTag = `data:image/png;base64,${screenshotBase64}`;
        res.status(200).json(screenshotBase64ForImgTag);
    } catch (err) {
        res.status(500).json(err);
    }
});

app.post("/device-info", async (req, res) => {
    try {
        const { id } = req.body;
        const output = await runAdbCommand(`-s ${id} shell getprop`);
        const lines = output.split('\n');
        const getInfo = {};

        // Parse all key-value pairs from getprop
        for (const line of lines) {
            const [key, value] = line.split(': ');
            if (key && value) {
                getInfo[key.trim()] = value.trim();
            }
        }

        // Create an object with essential details for reverse engineering & security testing
        const deviceInfo = {
            // Basic Device Info
            brand: getInfo['[ro.product.brand]']?.replace(/^\[|\]$/g, ''),
            model: getInfo['[ro.product.model]']?.replace(/^\[|\]$/g, ''),
            manufacturer: getInfo['[ro.product.manufacturer]']?.replace(/^\[|\]$/g, ''),
            deviceName: getInfo['[ro.product.device]']?.replace(/^\[|\]$/g, ''),
            androidVersion: getInfo['[ro.build.version.release]']?.replace(/^\[|\]$/g, ''),
            sdkVersion: getInfo['[ro.build.version.sdk]']?.replace(/^\[|\]$/g, ''),
            buildId: getInfo['[ro.build.id]']?.replace(/^\[|\]$/g, ''),
            buildFingerprint: getInfo['[ro.build.fingerprint]']?.replace(/^\[|\]$/g, ''),
            buildType: getInfo['[ro.build.type]']?.replace(/^\[|\]$/g, ''),
            buildTags: getInfo['[ro.build.tags]']?.replace(/^\[|\]$/g, ''),

            // Hardware Details
            hardware: getInfo['[ro.hardware]']?.replace(/^\[|\]$/g, ''),
            cpuArchitecture: getInfo['[ro.product.cpu.abi]']?.replace(/^\[|\]$/g, ''),
            cpuHardware: getInfo['[ro.hardware]']?.replace(/^\[|\]$/g, ''),
            ramSize: getInfo['[ro.ram.size]']?.replace(/^\[|\]$/g, ''),
            storageSize: getInfo['[ro.storage.size]']?.replace(/^\[|\]$/g, ''),
            batteryLevel: getInfo['[ro.battery.level]']?.replace(/^\[|\]$/g, ''),
            screenResolution: getInfo['[ro.screen.resolution]']?.replace(/^\[|\]$/g, ''),

            // Identifiers
            serialNumber: getInfo['[ro.serialno]']?.replace(/^\[|\]$/g, ''),
            imei: (getInfo['[ril.serialnumber]'] || getInfo['[ro.ril.oem.imei]'])?.replace(/^\[|\]$/g, ''),
            androidId: getInfo['[ro.build.android_id]']?.replace(/^\[|\]$/g, ''),
            macAddress: getInfo['[wifi.interface.mac]']?.replace(/^\[|\]$/g, ''),

            // Bootloader & Security
            bootloader: getInfo['[ro.bootloader]']?.replace(/^\[|\]$/g, ''),
            secureBoot: getInfo['[ro.boot.secureboot]']?.replace(/^\[|\]$/g, ''),
            dmVerityStatus: getInfo['[ro.boot.veritymode]']?.replace(/^\[|\]$/g, ''),
            verifiedBootState: getInfo['[ro.boot.verifiedbootstate]']?.replace(/^\[|\]$/g, ''),
            selinuxStatus: getInfo['[ro.boot.selinux]']?.replace(/^\[|\]$/g, ''),
            encryptionState: getInfo['[ro.crypto.state]']?.replace(/^\[|\]$/g, ''),
            isRooted: getInfo['[ro.debuggable]']?.replace(/^\[|\]$/g, '') === '1' ? 'Yes' : 'No',

            // Network Info
            carrier: getInfo['[gsm.operator.alpha]']?.replace(/^\[|\]$/g, ''),
            networkType: getInfo['[gsm.network.type]']?.replace(/^\[|\]$/g, ''),
            radioVersion: getInfo['[gsm.version.baseband]']?.replace(/^\[|\]$/g, ''),
            wifiSSID: getInfo['[wifi.ssid]']?.replace(/^\[|\]$/g, ''),
            ipAddress: getInfo['[dhcp.wlan0.ipaddress]']?.replace(/^\[|\]$/g, ''),

            // System Settings
            timeZone: getInfo['[persist.sys.timezone]']?.replace(/^\[|\]$/g, ''),
            language: getInfo['[persist.sys.locale]']?.replace(/^\[|\]$/g, ''),
            debugMode: getInfo['[ro.debuggable]']?.replace(/^\[|\]$/g, '') === '1' ? 'Enabled' : 'Disabled',

            // Additional Info for Security Testing
            adbEnabled: getInfo['[persist.service.adb.enable]']?.replace(/^\[|\]$/g, ''),
            usbDebugging: getInfo['[persist.sys.usb.config]']?.includes('adb') ? 'Enabled' : 'Disabled',
            kernelVersion: getInfo['[ro.kernel.version]']?.replace(/^\[|\]$/g, ''),
            patchLevel: getInfo['[ro.build.version.security_patch]']?.replace(/^\[|\]$/g, ''),
            baseOS: getInfo['[ro.build.version.base_os]']?.replace(/^\[|\]$/g, ''),
            vendorOS: getInfo['[ro.vendor.build.version.release]']?.replace(/^\[|\]$/g, '')
        };

        res.status(200).json(deviceInfo);
    } catch (err) {
        res.status(500).json(err);
    }
});

app.get('/adb/logcat', (req, res) => {
    const { id, filter, level = 'I' } = req.query; // Default log level: Info (more severe: V, D, I, W, E, F)

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Construct ADB logcat command with filters
    // Example: adb -s <device_id> logcat MyAppTag:I *:S
    const adbArgs = ['-s', id, 'logcat'];

    if (filter) {
        adbArgs.push(`${filter}:${level}`, '*:S'); // Show only filtered logs
    } else {
        adbArgs.push('*:I'); // Default to Info level
    }

    const logcatProcess = spawn('adb', adbArgs);

    // Stream stdout data to client
    logcatProcess.stdout.on('data', (data) => {
        res.write(`data: ${data.toString()}\n\n`);
    });

    // Handle stderr (errors)
    logcatProcess.stderr.on('data', (data) => {
        res.write(`data: ERROR: ${data.toString()}\n\n`);
    });

    // Close connection on process end
    logcatProcess.on('close', (code) => {
        res.write(`data: Logcat closed with code ${code}\n\n`);
        res.end();
    });

    // Kill process if client disconnects
    req.on('close', () => {
        logcatProcess.kill();
        res.end();
    });
});

app.get('/execute-in-terminal', (req, res) => {
    const { command } = req.query;
    if (!command) {
        return res.status(400).json({ error: 'Command is required' });
    }

    // Set SSE headers for continuous streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Execute the command with spawn using shell: true for shell commands
    const proc = spawn(command, { shell: true });

    // Stream stdout data
    proc.stdout.on('data', (data) => {
        const lines = data.toString().split(/\r?\n/);
        lines.forEach((line) => {
            res.write(`data: ${line}\n\n`);
        });
    });

    // Stream stderr data with an error prefix
    proc.stderr.on('data', (data) => {
        const lines = data.toString().split(/\r?\n/);
        lines.forEach((line) => {
            res.write(`data: ERROR: ${line}\n\n`);
        });
    });

    // When the process closes, notify the client and end the SSE stream
    proc.on('close', (code) => {
        res.write(`data: Process exited with code ${code}\n\n`);
        res.end();
    });

    // If the client disconnects, kill the process
    req.on('close', () => {
        proc.kill();
        res.end();
    });
});

//connect to db
mongoose.connect(process.env.DB_URL).then(() => {
    console.log('Connected to MongoDB');
    isConnectedtoDB = true;
}
).catch((err) => {
    console.log('Failed to connect to MongoDB', err);
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 ADB API Server running at http://localhost:${PORT}`);

    // Open terminal and run frida --version command.

});
