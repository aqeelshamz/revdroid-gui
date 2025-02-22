import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
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
        console.log(error);
        if (error.message.includes("Command failed:") || error.message.includes("does not exist.")) {
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

/**
 * Function to run Frida command using spawn for continuous interaction
 * @param {Array<string>} args - Arguments for Frida command
 * @param {function} onData - Callback for stdout data
 * @param {function} onError - Callback for stderr data
 * @param {function} onClose - Callback when process closes
 */
const runFridaCommand = (args, onData, onError, onClose) => {
    const fridaProcess = spawn("frida", args);

    fridaProcess.stdout.on("data", (data) => {
        if (onData) onData(data.toString());
    });

    fridaProcess.stderr.on("data", (data) => {
        if (onError) onError(data.toString());
    });

    fridaProcess.on("close", (code) => {
        if (onClose) onClose(code);
    });

    return fridaProcess;
};

export { runAdbCommand, runNormalCommand, runFridaCommand };