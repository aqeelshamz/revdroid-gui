"use client";
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { FiPlay, FiTrash2, FiSearch } from "react-icons/fi";

const serverURL = "http://localhost:8080";

export default function InstallFreda() {
    const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
    const [eventSource, setEventSource] = useState<EventSource | null>(null);
    const [reSearch, setReSearch] = useState<string>("");
    const [reShowSearchBox, setReShowSearchBox] = useState<boolean>(false);

    const terminalRef = useRef<HTMLDivElement>(null);

    // Function to run the command via SSE
    const runInTerminal = (command: string) => {
        // Close any existing SSE connection
        if (eventSource) {
            eventSource.close();
            setEventSource(null);
        }
        // Clear previous output
        setTerminalOutput([]);
        // Construct URL for the execute-live endpoint
        const url = `${serverURL}/execute-in-terminal?command=${encodeURIComponent(command)}`;
        const es = new EventSource(url);
        es.onopen = () => {
            console.log("SSE connection opened.");
        };
        es.onmessage = (event) => {
            // Append the entire block (which may include newlines) to the terminal output state.
            setTerminalOutput((prev) => [...prev, event.data]);
        };
        es.onerror = (err) => {
            es.close();
            setEventSource(null);
        };
        setEventSource(es);
    };

    // Auto-scroll terminal when new output arrives
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTo({
                top: terminalRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [terminalOutput]);

    // Optionally implement a manual stop function
    const stopTerminal = () => {
        if (eventSource) {
            eventSource.close();
            setEventSource(null);
        }
    };

    // Optional: filter terminal output based on search term
    const filteredOutput = reSearch.trim()
        ? terminalOutput.filter((line) =>
            line.toLowerCase().includes(reSearch.toLowerCase())
        )
        : terminalOutput;

    return (
        <div className="flex w-full h-full">
            <div className="flex flex-col">
                <p className="my-2">To install frida, run:</p>
                <div className="mockup-code w-fit pr-4">
                    <pre data-prefix="$">
                        <code>pip3 install frida-tools</code>{" "}
                        <button
                            className="btn btn-sm btn-primary"
                            onClick={() => runInTerminal("pip3 install frida-tools")}
                        >
                            <FiPlay /> Run in Terminal
                        </button>
                    </pre>
                </div>
                <p className="mt-4">
                    For more information, visit the{" "}
                    <a
                        target="_blank"
                        className="link"
                        href="https://frida.re/docs/installation/"
                    >
                        official Frida installation guide
                    </a>
                    .
                </p>
                <p className="my-2">To test whether the install was successful, run:</p>
                <div className="mockup-code w-fit">
                    <pre data-prefix="$">
                        <code>frida --version</code>{" "}
                        <button
                            className="btn btn-sm btn-primary"
                            onClick={() => runInTerminal("frida --version")}
                        >
                            <FiPlay /> Run in Terminal
                        </button>
                    </pre>
                </div>
                <p className="my-2">
                    For patching APKs, you have to install objection:
                </p>
                <div className="mockup-code w-fit">
                    <pre data-prefix="$">
                        <code>pip3 install objection</code>{" "}
                        <button
                            className="btn btn-sm btn-primary"
                            onClick={() => runInTerminal("pip3 install objection")}
                        >
                            <FiPlay /> Run in Terminal
                        </button>
                    </pre>
                </div>
            </div>
            <div
                ref={terminalRef}
                className="flex flex-col w-full h-full overflow-auto ml-10 max-h-[calc(100vh-200px)] bg-black text-green-400 p-4 rounded-lg"
            >
                <pre className="text-sm whitespace-pre-wrap">
                    {filteredOutput.map((line, index) => (
                        <code key={index}>{line + "\n"}</code>
                    ))}
                </pre>
            </div>
        </div>
    );
}
