import express from 'express';
import { runAdbCommand, runNormalCommand } from '../utils/utils.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.get('/processes', async (req, res) => {
    try {
        const output = await runNormalCommand('frida-ps -Uai -j');

        const processes = JSON.parse(output);
        res.json(processes);
    } catch (error) {
        console.error('Error listing Frida processes:', error);
        res.status(500).json({ error: 'Failed to list Frida processes' });
    }
});

// Helper function to run a command and collect its stdout
function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args);
        let output = '';
        child.stdout.on('data', (data) => {
            output += data.toString();
        });
        child.stderr.on('data', (data) => {
            console.error(`${command} stderr:`, data.toString());
        });
        child.on('error', (err) => reject(err));
        child.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`${command} exited with code ${code}`));
            }
            resolve(output);
        });
    });
}

router.get('/trace', async (req, res) => {
    const { id, process, filter } = req.query;
    if (!process) {
        return res.status(400).json({ error: 'Process name is required' });
    }

    // Set SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Build the frida-trace arguments
    const args = ['-U', '-n', process];
    if (filter) {
        args.push('-j', filter);
    }

    try {
        // 1. Check if the process is running using frida-ps -Ua -j
        const runningOutput = await runCommand('frida-ps', ['-Ua', '-j']);
        const runningProcesses = JSON.parse(runningOutput);
        const isRunning = runningProcesses.some(p => p.name === process);

        if (!isRunning) {
            // 2. Process is not running:
            //    Get the installed applications list (includes package identifiers)
            const installedOutput = await runCommand('frida-ps', ['-Uai', '-j']);
            const installedApps = JSON.parse(installedOutput);
            const appData = installedApps.find(p => p.name === process);

            if (!appData || !appData.identifier) {
                return res.status(404).json({ error: 'Application not found on device' });
            }

            // Launch the application using adb monkey command
            // (Assuming runAdbCommand is defined elsewhere and returns a promise)
            await runAdbCommand(`-s ${id} shell monkey -p ${appData.identifier} -c android.intent.category.LAUNCHER 1`);
        }
    } catch (err) {
        console.error('Error while checking/launching process:', err);
        return res.status(500).json({ error: 'Internal error while checking/launching process' });
    }

    // 3. Spawn the frida-trace process
    const traceProcess = spawn('frida-trace', args);

    traceProcess.stdout.on('data', (data) => {
        const lines = data.toString().split(/\r?\n/);
        lines.forEach(line => res.write(`data: ${line}\n\n`));
    });

    traceProcess.stderr.on('data', (data) => {
        const lines = data.toString().split(/\r?\n/);
        lines.forEach(line => res.write(`data: ERROR: ${line}\n\n`));
    });

    traceProcess.on('close', (code) => {
        res.write(`data: Frida-trace closed with code ${code}\n\n`);
        res.end();
    });

    req.on('close', () => {
        traceProcess.kill();
        res.end();
    });
});


router.get('/methods', (req, res) => {
    const { process } = req.query;
    if (!process) {
        return res.status(400).json({ error: 'Process name is required' });
    }

    // Path to the Frida script that enumerates classes.
    const scriptPath = path.join(__dirname, '../utils/frida/enum-classes.js');

    // Build the command: -U (USB), -n <process> (attach by process name), -l <script> (load script)
    const args = ['-U', '-n', process, '-l', scriptPath, '--runtime=v8'];

    const fridaProcess = spawn('frida', args);
    let output = '';

    fridaProcess.stdout.on('data', (data) => {
        output += data.toString();
    });

    fridaProcess.stderr.on('data', (data) => {
        console.error('Frida stderr:', data.toString());
    });

    // Force kill the process after 3 seconds if it hasn't already exited
    const timeout = setTimeout(() => {
        fridaProcess.kill();
    }, 3000);

    fridaProcess.on('close', (code) => {
        clearTimeout(timeout);
        try {
            const markerStart = '###JSON_START###';
            const markerEnd = '###JSON_END###';
            const startIndex = output.indexOf(markerStart);
            const endIndex = output.lastIndexOf(markerEnd);
            if (startIndex === -1 || endIndex === -1) {
                throw new Error("JSON markers not found in output");
            }
            const jsonStr = output.substring(startIndex + markerStart.length, endIndex);
            const list = JSON.parse(jsonStr);
            res.json(list);
        } catch (err) {
            console.error('Error parsing output:', err);
            res.status(500).json({ error: 'Failed to parse output', details: err.toString() });
        }
    });

    req.on('close', () => {
        clearTimeout(timeout);
        fridaProcess.kill();
        res.end();
    });
});

export default router;