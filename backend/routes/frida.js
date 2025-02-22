import express from 'express';
import { runNormalCommand } from '../utils/utils.js';
import { spawn } from 'child_process';

const router = express.Router();

router.get('/processes', async (req, res) => {
    try {
        const output = await runNormalCommand('frida-ps -U');

        // Process output to extract process names
        const lines = output.split('\n')
            .filter(line => line.trim() && !line.includes('PID') && !line.includes('---')); // Remove header and separator

        const processNames = lines
            .map(line => line.trim().split(/\s{2,}/).pop()) // Extract process name
            .filter(Boolean); // Remove empty entries

        res.json(processNames);
    } catch (error) {
        console.error('Error listing Frida processes:', error);
        res.status(500).json({ error: 'Failed to list Frida processes' });
    }
});

router.get('/trace', (req, res) => {
    const { process, filter } = req.query;

    if (!process) {
        return res.status(400).json({ error: 'Process name is required' });
    }

    // Set SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Build the command with the proper format: -U -n <process> and optional -j <filter>
    const args = ['-U', '-n', process];
    if (filter) {
        args.push('-j', filter);
    }

    // Spawn frida-trace process
    const traceProcess = spawn('frida-trace', args);

    traceProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output);
        const lines = output.split(/\r?\n/);
        lines.forEach((line) => {
            // Prepend "data:" before each line even if empty (you may choose to conditionally send empty lines)
            res.write(`data: ${line}\n\n`);
        });
    });

    traceProcess.stderr.on('data', (data) => {
        const output = data.toString();
        const lines = output.split(/\r?\n/);
        lines.forEach((line) => {
            res.write(`data: ERROR: ${line}\n\n`);
        });
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

export default router;