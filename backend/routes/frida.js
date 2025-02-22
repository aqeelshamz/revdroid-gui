import express from 'express';
import { runNormalCommand } from '../utils/utils.js';

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

export default router;