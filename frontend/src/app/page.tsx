"use client";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { BiDevices } from "react-icons/bi";
import { BsAndroid } from "react-icons/bs";
import { CgToolbox } from "react-icons/cg";
import { FaGithub } from "react-icons/fa";
import {
  FiActivity,
  FiCheck,
  FiCode,
  FiCopy,
  FiCpu,
  FiDownload,
  FiExternalLink,
  FiLock,
  FiMaximize,
  FiPlay,
  FiPlus,
  FiPower,
  FiRefreshCcw,
  FiSearch,
  FiSettings,
  FiSmartphone,
  FiStar,
  FiStopCircle,
  FiTrash2,
  FiWifi
} from "react-icons/fi";
import { GrJava } from "react-icons/gr";
import { toast, ToastContainer } from "react-toastify";

export default function Home() {
  const serverURL = "http://localhost:8080";

  const [selectedTab, setSelectedTab] = useState<string>("device");

  const [gettingPackages, setGettingPackages] = useState<boolean>(false);
  const [devices, setDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [connectDeviceIp, setConnectDeviceIp] = useState<string>("192.168.1.");
  const [connectDevicePort, setConnectDevicePort] = useState<number>(5555);
  const [packages, setPackages] = useState<string[]>([]);
  const [search, setSearch] = useState<string>("");

  const [downloadingAPK, setDownloadingAPK] = useState<boolean>(false);
  const [downloadingAPKPkg, setDownloadingAPKPkg] = useState<string>("");

  const [systemApps, setSystemApps] = useState<boolean>(false);
  const [apkPaths, setAPKPaths] = useState<string[]>([]);

  //StartActivity - SA
  const [SApackageName, setSAPackageName] = useState<string>("");
  const [SAactivity, setSAActivity] = useState<string>(".MainActivity");

  //Device
  const [deviceScreenshot, setDeviceScreenshot] = useState<string>("");
  const [deviceOrientation, setDeviceOrientation] = useState<string>("portrait");

  const scrCpy = async () => {
    const config = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      url: `${serverURL}/adb/scrCpy`,
      data: { id: selectedDevice }
    };

    axios(config)
      .then((response) => {
        toast.success("scrcpy -s " + selectedDevice + " executed.");
        console.log(response.data);
      })
      .catch((error) => {
        toast.error("Failed to start SCRCPY");
        console.log(error);
      });
  };

  const getDevices = async () => {
    const config = {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      url: `${serverURL}/adb/devices`
    };

    axios(config)
      .then((response) => {
        console.log(response.data);
        setDevices(response.data);

        if (response.data.length === 0) {
          setSelectedDevice("");
        }
        if (response.data.length > 0 && selectedDevice === "") {
          setSelectedDevice(response.data[0].id);
        }
      })
      .catch((error) => {
        toast.error("Failed to fetch devices");
        console.log(error);
      });
  };

  const connectDevice = async () => {
    const config = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      url: `${serverURL}/adb/connect`,
      data: {
        ip: connectDeviceIp,
        port: connectDevicePort
      }
    };

    axios(config)
      .then((response) => {
        console.log(response.data);
        if (response.data.includes("failed")) {
          toast.error(response.data);
        } else {
          toast.success(response.data);
        }
        getDevices();
      })
      .catch((error) => {
        toast.error("Failed to connect device");
        console.log(error);
      });
  };

  const disconnectDevice = async () => {
    const config = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      url: `${serverURL}/adb/disconnect`,
      data: { id: selectedDevice }
    };

    axios(config)
      .then((response) => {
        console.log(response.data);
        if (response.data.includes("failed")) {
          toast.error(response.data);
        } else {
          toast.success(response.data);
        }
        getDevices();
      })
      .catch((error) => {
        toast.error("Failed to disconnect device");
        console.log(error);
      });
  };

  const getPackages = async (selectedDevice: string) => {
    setGettingPackages(true);
    if (selectedDevice === "") {
      setGettingPackages(false);
      return;
    }
    const config = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      url: `${serverURL}/adb/packages`,
      data: { id: selectedDevice, systemApps: systemApps }
    };

    axios(config)
      .then((response) => {
        setGettingPackages(false);
        console.log(response.data);
        setPackages(response.data);
      })
      .catch((error) => {
        setGettingPackages(false);
        toast.error("Failed to fetch packages");
        console.log(error);
      });
  };

  const launchApp = async (packageName: string) => {
    const config = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      url: `${serverURL}/adb/launch-app`,
      data: { id: selectedDevice, packageName: packageName }
    };

    axios(config)
      .then((response) => {
        console.log(response.data);
        toast.success(packageName + " launched.");
      })
      .catch((error) => {
        toast.error("Failed to launch app");
        console.log(error);
      });
  };

  const getAPKs = async (packageName: string) => {
    setDownloadingAPKPkg(packageName);
    const config = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      url: `${serverURL}/get-apk-paths`,
      data: { id: selectedDevice, packageName: packageName }
    };

    axios(config)
      .then((response) => {
        console.log(response.data);
        setAPKPaths(response.data);
        (
          document.getElementById("download_apk") as HTMLDialogElement
        ).showModal()
      })
      .catch((error) => {
        toast.error("Failed to export APK");
        console.log(error);
      });
  }

  const exportAPK = async (path: string) => {
    setDownloadingAPK(true);
    const config = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      url: `${serverURL}/export-apk`,
      data: { id: selectedDevice, path: path }
    };

    axios(config)
      .then((response) => {
        setDownloadingAPK(false);
        toast.success("APK exported successfully");

        const a = document.createElement("a");
        a.href = response.data;
        a.target = "_blank";
        a.download = downloadingAPKPkg + "_" + path.substring(path.lastIndexOf('/') + 1);
        document.body.appendChild(a);
        a.click();
        setDownloadingAPKPkg("");
      })
      .catch((error) => {
        setDownloadingAPK(false);
        setDownloadingAPKPkg("");
        toast.error("Failed to export APK");
        console.log(error);
      });
  }

  const startActivity = async () => {
    const config = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      url: `${serverURL}/adb/start-activity`,
      data: { id: selectedDevice, packageName: SApackageName, activityName: SAactivity }
    };

    axios(config)
      .then((response) => {
        console.log(response.data);
        toast.success("Activity started successfully");
      })
      .catch((error) => {
        toast.error("Failed to start activity");
        console.log(error);
      });
  }

  const power = async (id: string, action: string) => {
    const config = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      url: `${serverURL}/adb/power`,
      data: { id: id, action: action }
    };

    axios(config)
      .then((response) => {
        console.log(response.data);
        toast.success("Device " + action + "ed successfully");
      })
      .catch((error) => {
        toast.error("Failed to " + action + " device");
        console.log(error);
      });
  }

  const apktoolFileUploadRef = useRef<HTMLInputElement>(null);
  // const jadxFileUploadRef = useRef<HTMLInputElement>(null);

  // const apktoolFileUpload = () => {
  //   apktoolFileUploadRef.current?.click();
  // };

  // const jadxFileUpload = () => {
  //   jadxFileUploadRef.current?.click();
  // };

  const getDeviceScreenshot = async (selectedDevice: string) => {
    const config = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      url: `${serverURL}/adb/screenshot`,
      data: { id: selectedDevice }
    };

    axios(config)
      .then((response) => {
        console.log(response.data);
        if (typeof response.data === "string") {
          const img = new Image();
          img.src = "data:image/png;base64," + response.data;

          img.onload = () => {
            setDeviceOrientation(img.width > img.height ? "landscape" : "portrait");
          }

          setDeviceScreenshot(response.data);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }

  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const getDeviceInfo = async (selectedDevice: string) => {
    const config = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      url: `${serverURL}/device-info`,
      data: { id: selectedDevice }
    };

    axios(config)
      .then((response) => {
        console.log(response.data);
        setDeviceInfo(response.data);
      })
      .catch((error) => {
        console.log(error);
      });
  }

  //Reverse Engineering
  const [reProcesses, setReProcesses] = useState<any[]>([]);
  const [reSelectedProcess, setReSelectedProcess] = useState<string>("");
  const [isTracing, setIsTracing] = useState<boolean>(false);
  const [traceLogs, setTraceLogs] = useState<string[]>([]);
  const [traceEventSource, setTraceEventSource] = useState<EventSource | null>(null);
  const [traceFilter, setTraceFilter] = useState<string>(""); // For user-defined filters
  const traceLogRef = useRef<HTMLDivElement>(null);
  const [reSearch, setReSearch] = useState<string>("");

  const highlightLine = (line: string, search: string) => {
    if (!search) return line;
    const regex = new RegExp(`(${search})`, 'gi');
    // Split the line by the search term, but keep the search term in the results.
    const parts = line.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-yellow-500 text-black">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const filteredLogs = reSearch.trim()
    ? traceLogs.filter((line) =>
      line.toLowerCase().includes(reSearch.toLowerCase())
    )
    : traceLogs;

  useEffect(() => {
    if (traceLogRef.current) {
      traceLogRef.current.scrollTo({
        top: traceLogRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [traceLogs]);

  const getProcesses = () => {
    const config = {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      url: `${serverURL}/frida/processes`,
    };

    axios(config)
      .then((response) => {
        console.log(response.data);
        setReProcesses(response.data);
      })
      .catch((error) => {
        console.log(error);
      });
  }

  const startTrace = (processName: string, filter: string) => {
    if (isTracing) {
      toast.warning("Already tracing a process");
      return;
    }

    const eventSource = new EventSource(`${serverURL}/frida/trace?process=${processName}&filter=${encodeURIComponent(filter)}`);

    eventSource.onopen = () => {
      setIsTracing(true);
      setTraceLogs([]); // Clear previous logs
      setTraceEventSource(eventSource);
      toast.success(`Started tracing ${processName}`);
    };

    const MAX_LOGS = 1000;
    eventSource.onmessage = (event) => {
      const newLines = event.data.split('\n'); // split into lines without any trimming
      setTraceLogs((prevLogs) => {
        // Combine previous logs with the new lines
        let combined = [...prevLogs, ...newLines];
        // If the total exceeds the maximum allowed, keep only the last MAX_LOGS lines
        if (combined.length > MAX_LOGS) {
          combined = combined.slice(-MAX_LOGS);
        }
        return combined;
      });
    };


    eventSource.onerror = (err) => {
      console.error("Frida Trace Error:", err);
      toast.error("Error in tracing");

      eventSource.close();
      setIsTracing(false);
      setTraceEventSource(null);
    };
  };

  useEffect(() => {
    if (selectedDevice !== "" && selectedTab === "device") {
      getDeviceScreenshot(selectedDevice);
      getDeviceInfo(selectedDevice);
    }

    if (selectedTab === "reverse") {
      getProcesses();
    }
  }, [selectedDevice, selectedTab]);

  useEffect(() => {
    getDevices();
    getPackages(selectedDevice);
    getDeviceScreenshot(selectedDevice);
  }, [selectedDevice]);

  useEffect(() => {
    if (selectedDevice === "") return;
    getPackages(selectedDevice);
  }, [systemApps]);

  return (
    <main className="w-screen h-screen flex flex-col  overflow-hidden">
      <div className="p-5 flex-none  flex items-center justify-between">
        <div className="flex items-center">
          <p className="text-lg font-bold">🚀 RevDroid</p>
          <div className="tooltip tooltip-bottom" data-tip="Run the backend server on port 8080. Make sure ADB is installed and running.">
            <div className="cursor-default ml-3 badge badge-primary badge-outline">Backend URL: {serverURL}</div>
          </div>
        </div>
        <a target="_blank" className="flex items-center link link-hover" href="https://github.com/aqeelshamz/revdroid-gui"><FaGithub className="mr-2" /> GitHub</a>
      </div>
      <div className="flex-1 flex w-full min-h-0">
        <div className="flex flex-col p-5 w-[300px] h-full ">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BiDevices size={20} />
              <p className="ml-2 font-semibold">Devices</p>
            </div>
            <div className="flex items-center">
              <button
                className="btn btn-square btn-sm mr-2"
                onClick={() =>
                  (
                    document.getElementById("connect_device") as HTMLDialogElement
                  ).showModal()
                }
              >
                <FiPlus />
              </button>
              <button
                className="btn btn-square btn-sm"
                onClick={async () => {
                  await getDevices();
                  toast.success("Devices refreshed");
                }}
              >
                <FiRefreshCcw />
              </button>
            </div>
          </div>
          <div className="flex flex-col mt-2">
            {devices.map((device: any, index: number) => (
              <div
                key={index}
                className="hover:bg-slate-100 cursor-pointer flex p-3 items-center justify-between"
                onClick={() => setSelectedDevice(device.id)}
              >
                <div className="flex flex-col ml-2">
                  <p className="font-semibold">{device.id}</p>
                  <p>{device.status}</p>
                </div>
                {selectedDevice === device.id && (
                  <FiCheck size={20} className="text-green-500" />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="p-5 flex-1 flex flex-col min-h-0">
          {selectedDevice === "" ? (
            <p>Select a device to continue</p>
          ) : (
            <div className="flex flex-col w-full h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <p className="font-semibold flex items-center">
                    <FiSmartphone className="mr-2" /> {selectedDevice}
                  </p>
                  <button
                    className="btn btn-error btn-sm ml-2"
                    onClick={disconnectDevice}
                  >
                    DISCONNECT
                  </button>
                </div>
              </div>
              <div className="flex items-center my-4">
                <div role="tablist" className="tabs tabs-boxed">
                  <a role="tab" onClick={() => setSelectedTab("device")} className={"tab " + (selectedTab === "device" ? "tab-active" : "")}><FiSmartphone className="mr-2" /> Device</a>
                  <a role="tab" onClick={() => setSelectedTab("applications")} className={"tab " + (selectedTab === "applications" ? "tab-active" : "")}><BsAndroid className="mr-2" /> Applications ({packages.length})</a>
                  <a role="tab" onClick={() => setSelectedTab("reverse")} className={"tab " + (selectedTab === "reverse" ? "tab-active" : "")}><FiSettings className="mr-2" /> Reverse Engineering</a>
                  <a role="tab" onClick={() => setSelectedTab("activity")} className={"tab " + (selectedTab === "activity" ? "tab-active" : "")}><FiActivity className="mr-2" /> Start Activity</a>
                  <a role="tab" onClick={() => setSelectedTab("misc")} className={"tab " + (selectedTab === "misc" ? "tab-active" : "")}><CgToolbox className="mr-2" /> Misc</a>
                </div>
              </div>
              {selectedTab === "device" ?
                <div className="flex flex-col w-full h-full">
                  <div className="flex w-full h-full">
                    <div className="flex flex-col mr-4 w-full h-full overflow-y-auto max-h-[calc(100vh-200px)]">
                      <p className="flex items-center font-semibold text-lg">
                        <FiSmartphone className="mr-2" /> Basic Info <button className="btn btn-xs ml-2"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `Device ID: ${deviceInfo.deviceId}\nBrand: ${deviceInfo.brand}\nModel: ${deviceInfo.model}\nManufacturer: ${deviceInfo.manufacturer}\nDevice Name: ${deviceInfo.deviceName}\nAndroid Version: ${deviceInfo.androidVersion}\nSDK Version: ${deviceInfo.sdkVersion}\nBuild ID: ${deviceInfo.buildId}\nBuild Type: ${deviceInfo.buildType}\nBuild Tags: ${deviceInfo.buildTags}`
                            );
                            toast.success("Basic Info copied to clipboard");
                          }
                          }
                        ><FiCopy /></button>
                      </p>
                      <div className="divider"></div>
                      <p>
                        <span className="font-semibold">Brand:</span> {deviceInfo.brand}<br />
                        <span className="font-semibold">Model:</span> {deviceInfo.model}<br />
                        <span className="font-semibold">Manufacturer:</span> {deviceInfo.manufacturer}<br />
                        <span className="font-semibold">Device Name:</span> {deviceInfo.deviceName}<br />
                        <span className="font-semibold">Android Version:</span> {deviceInfo.androidVersion}<br />
                        <span className="font-semibold">SDK Version:</span> {deviceInfo.sdkVersion}<br />
                        <span className="font-semibold">Build ID:</span> {deviceInfo.buildId}<br />
                        <span className="font-semibold">Build Type:</span> {deviceInfo.buildType}<br />
                        <span className="font-semibold">Build Tags:</span> {deviceInfo.buildTags}<br />
                      </p>
                      <div className="divider"></div>
                      <p className="flex items-center font-semibold text-lg">
                        <FiCpu className="mr-2" /> Hardware<button className="btn btn-xs ml-2"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `Hardware: ${deviceInfo.hardware}\nCPU Architecture: ${deviceInfo.cpuArchitecture}\nSerial Number: ${deviceInfo.serialNumber}`
                            );
                            toast.success("Hardware copied to clipboard");
                          }
                          }
                        ><FiCopy /></button>
                      </p>
                      <div className="divider"></div>
                      <p>
                        <span className="font-semibold">Hardware:</span> {deviceInfo.hardware}<br />
                        <span className="font-semibold">CPU Architecture:</span> {deviceInfo.cpuArchitecture}<br />
                        <span className="font-semibold">Serial Number:</span> {deviceInfo.serialNumber}<br />
                      </p>
                      <div className="divider"></div>
                      <p className="flex items-center font-semibold text-lg">
                        <FiLock className="mr-2" /> Bootloader & Security<button className="btn btn-xs ml-2"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `Bootloader: ${deviceInfo.bootloader}\nEncryption State: ${deviceInfo.encryptionState}\nIs Rooted: ${deviceInfo.isRooted}`
                            );
                            toast.success("Bootloader copied to clipboard");
                          }
                          }
                        ><FiCopy /></button>
                      </p>
                      <div className="divider"></div>
                      <p>
                        <span className="font-semibold">Bootloader:</span> {deviceInfo.bootloader}<br />
                        <span className="font-semibold">Encryption State:</span> {deviceInfo.encryptionState}<br />
                        <span className="font-semibold">Is Rooted:</span> {deviceInfo.isRooted}<br />
                      </p>
                      <div className="divider"></div>
                      <p className="flex items-center font-semibold text-lg">
                        <FiWifi className="mr-2" /> Network Info<button className="btn btn-xs ml-2"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `Carrier: ${deviceInfo.carrier}\nNetwork Type: ${deviceInfo.networkType}\nRadio Version: ${deviceInfo.radioVersion}`
                            );
                            toast.success("Network Info copied to clipboard");
                          }
                          }
                        ><FiCopy /></button>
                      </p>
                      <div className="divider"></div>
                      <p>
                        <span className="font-semibold">Carrier:</span> {deviceInfo.carrier}<br />
                        <span className="font-semibold">Network Type:</span> {deviceInfo.networkType}<br />
                        <span className="font-semibold">Radio Version:</span> {deviceInfo.radioVersion}<br />
                      </p>
                      <div className="divider"></div>
                      <p className="flex items-center font-semibold text-lg">
                        <FiSettings className="mr-2" /> System Settings<button className="btn btn-xs ml-2"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `Timezone: ${deviceInfo.timeZone}\nLanguage: ${deviceInfo.language}`
                            );
                            toast.success("System settings copied to clipboard");
                          }
                          }
                        ><FiCopy /></button>
                      </p>
                      <div className="divider"></div>
                      <p>
                        <span className="font-semibold">Timezone:</span> {deviceInfo.timeZone}<br />
                        <span className="font-semibold">Language:</span> {deviceInfo.language}<br />
                      </p>
                      <div className="divider"></div>
                      <p className="flex items-center font-semibold text-lg">
                        <FiStar className="mr-2" /> Extras<button className="btn btn-xs ml-2"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `Debug Mode: ${deviceInfo.debugMode}\nUSB Debugging: ${deviceInfo.usbDebugging}\nKernel Version: ${deviceInfo.kernelVersion}\nPatch Level: ${deviceInfo.patchLevel}\nBase OS: ${deviceInfo.baseOS}\nVendor OS: ${deviceInfo.vendorOS}`
                            );
                            toast.success("Extras copied to clipboard");
                          }
                          }
                        ><FiCopy /></button>
                      </p>
                      <div className="divider"></div>
                      <p>
                        <span className="font-semibold">Debug Mode:</span> {deviceInfo.debugMode}<br />
                        <span className="font-semibold">USB Debugging:</span> {deviceInfo.usbDebugging}<br />
                        <span className="font-semibold">Kernel Version:</span> {deviceInfo.kernelVersion}<br />
                        <span className="font-semibold">Patch Level:</span> {deviceInfo.patchLevel}<br />
                        <span className="font-semibold">Base OS:</span> {deviceInfo.baseOS}<br />
                        <span className="font-semibold">Vendor OS:</span> {deviceInfo.vendorOS}<br />
                      </p>
                      <div className="divider"></div>
                    </div>
                    <div className="w-full">
                      <div className="flex items-center mb-3">
                        <button className="btn" onClick={() => {
                          const a = document.createElement("a");
                          a.href = deviceScreenshot;
                          a.download = "deviceScreenshot.png";
                          a.click();
                        }}><FiDownload /> Save Screenshot</button>
                        <button className="btn ml-2" onClick={scrCpy}>
                          <FiMaximize /> SCRCPY
                        </button>
                      </div>
                      {deviceScreenshot ? (
                        <img
                          src={deviceScreenshot}
                          className={deviceOrientation === "landscape" ? "w-auto h-[200px]" : "w-[200px] h-auto"}
                        />
                      ) : (
                        ""
                      )}
                      <p className="flex items-center font-semibold text-lg my-2">
                        <FiPower className="mr-2" /> Power
                      </p>
                      <div>
                        <button
                          className="btn m-2"
                          onClick={() => {
                            power(selectedDevice, "shutdown");
                          }}
                        >
                          <FiPower /> SHUTDOWN
                        </button>
                        <button
                          className="btn m-2"
                          onClick={() => {
                            power(selectedDevice, "reboot");
                          }}
                        >
                          <FiPower /> REBOOT
                        </button>
                        <button
                          className="btn m-2"
                          onClick={() => {
                            power(selectedDevice, "reboot recovery");
                          }}
                        >
                          <FiPower /> REBOOT RECOVERY
                        </button>
                        <button
                          className="btn m-2"
                          onClick={() => {
                            power(selectedDevice, "reboot bootloader");
                          }}
                        >
                          <FiPower /> REBOOT BOOTLOADER
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                : selectedTab === "applications" ? <>
                  <div className="flex w-fit items-center justify-between">
                    <div className="tooltip" data-tip="Refresh">
                      <button className="btn mr-2" onClick={() => getPackages(selectedDevice)}><FiRefreshCcw /></button>
                    </div>
                    <input type="text" placeholder="Search package names..." className="mr-4 input input-bordered w-64" value={search} onChange={(x) => setSearch(x.target.value)} />
                    <p className="mr-2">System applications</p>
                    <input type="checkbox" className="toggle" onChange={(x) => setSystemApps(x.target.checked)} checked={systemApps} />
                  </div>
                  <div className="mt-4 flex-1 overflow-auto min-h-0">
                    {gettingPackages ? <div className="flex items-center">
                      <span className="loading loading-spinner loading-md"></span>
                      <p className="ml-2">Fetching applications...</p>
                    </div> : packages.map((package_: any, index) => (
                      search !== "" && !package_.packageName.toLowerCase().includes(search.toLowerCase()) ? "" :
                        <div
                          key={index}
                          className="hover:bg-base-200 cursor-pointer flex p-3 items-center justify-between select-none"
                          onDoubleClick={() => launchApp(package_.packageName)}
                        >
                          <div className="flex items-center">
                            <img src={package_.iconBase64 === "x" ? "data:image/png;base64,UklGRvwOAABXRUJQVlA4WAoAAAAQAAAAvwAAvwAAQUxQSIcCAAANoLNtmyJZed+vqo+7u7srEDmEHhG5yx9wh8ghcg3d3T2CyN3dne6u78Wha6+uE8FExARgsE0a2XuSa6gwqHWp9wAEJg0BhiYBMyZb7/kXHychJuVmarDrvpuimXqOSu1ztzzcGj2v0GDH0/Gn7DmEaXM27WunPoqQcgo1TtsFSH/ofQoIO5/+6KkppHyswSVAXcUiAAE1w06ZflxrngvFUyEfiXJklezY2SeJyiS0O+8Mr1CUIdnxz98TUx5s7FTUI1GYoR52yjm/UFkE3xWoUJwVdphyZ2yzgO2NFMuDKex3a0KOTHEDCnXtqz+ZZxB8Jktl2qh3LGVgmIxSnVR9Bs+AiAksESJYC6gzghJK1SAhQ9LLRUKGBFQsBNQdxaIR1dk2IFUwFNWdCKpYQGUAUBj4f+D/gf8H/h/4//+hsuxE91goiSbmgK81qVC+acfkwGSfaEahfPHjaJk6g1fphdWF8vrUkbUhQ+qBPUwsDgU8MNUc3YtteHLU5jYWRxtffHtKiuoOUmwuP6pyKwwfjkvnjqyNGUBt9dg7B9CtKDzghjFz64roXpCA81fuySayGNQOxwPPLKJIdgfI07DmtLX7V/BiCBE3Pbu8+iUalYEkb0amc784dIUVA165asyq+FNlJHKAS80IPHT9nF0WThwb1HP0b796+9F316/FzxVpyFJyVxuH1w8/+uHICPYcPP00c+P64b+0kWbMRe6SDw/4+aOvE3peccLMEWx/MdKMyNXd5RJsmJHsO7nqRNJyEuRJEpggqOcIUxBIBiOyFeTuklCKJM2MyFiCyx3SH9hj+gMJMxKZCy45BBHqMUIEYSSRvQBBAoR+J0CCGJKCsA2o4vsPbABWUDggTgwAABA6AJ0BKsAAwAA+MRaKQyIhIRVZLMAgAwSm4OwKxlDCbvj7W+GftfyX/I75zLe/s/wx8gd5J2hm99SP6r7t/nV/w/Ut/kPUA/VD/O/lV2vP7L6If1b/bn3c/+l6zvQA/nn9j63v+j/9v2D/2F9aD/tfuF8Nf9l/2H/Y9WP/wXsL+y2wxiTz59rszhhFxt+FwZs0dvUPqVf2f/gdhv0aTLsIZKclOSUjUfSgSm2Q/du2Xn7qZ+8uZVEY3fgThtcPMEkJIeHb7+gnpdSwdo0GkfKP+9yGWxf/+G/oH4RiXqgBmeH3V7nK5U7L//cbQcJoAMjM892Its/kVvssfNJ3Pi05M7BJZhQjIwXoDkG4zDdpklRl99vjfhcxV4dV7LWFqR7C7V0lr3PE87CZMxKsJIQWSOjs68M1E3hfIR/nHkY0S/QmQUQ1+hAsHXqT2KiF5XYz8zYM/Ke5WWUn1SBQHNFdvzeIM1D6lhLG9EpjSskQNY/JspWUwOCNKgr+uvMw+kX9/HpuKUxh9xo5//S9n/0Pccp4El3/13jqdiWp8AoGzt////IBTOKyXJ1GiclTc6USlH7RT7KWmr+al0lFHCGj+nTbbyEJH34LITctrbeIvOSVMgVtGZCAAP7w6QAAABPf/9QfXy4qWxQCUd/y1C5SxOcY9cMUYCGymAj2p/uvNBgS+8K85x04z33+dYX8LHVMlf/HbIdgGklJv+ZxdyP/2j3Pat0PBqmnT/8QCpZrxLkGmQS4nEChuSWG/wvmuvPYyAPq3b/wHSRrwFYo0Kmfg+AwI1W6UV+eLKJe/Ril6PejsiRb4/Yf8iNJxEWIu6AQNX6+3k2MnlKIeveGvC0Giq9wSrm5O63WY8hjECZlTpJH3ZB9CABpWPFDw38xXNd4/NbsL5WI8RdwFQT0Yz87L6dagIufP9mvCHU9YXAcunGcJ8g2/Oo+gqVN+IHoqFRRgX0d1jaOxFpQUT0izKRWdAc/toG4+4rZR99EeCUOhfsezf3G9n4JWWAQ0xrokLFYjPugJ7UbXPA4brwDg/R1zRl+kJQ1mC5sVobk+Ka+Det0VpVpvmyx9aUobMo26SyykDy1VcJTuIH+Xj7d1UP/I7oU6O9aru5mJ1l3X/ik1deAsl6PNTvCD/A17xqL7yf58N4WlsPtmLufHxG6Q6KeytIE4WvAff05CrGxMPcOSCMl0HxGXODXetLw/k6Brt2vmJg/w9ipk0mvgYmRh/Mub/m2Ss/x013kLr1COdIkA0XdHiGGrU8qfZnWeVokP5Q3pq7tDuaZPxTYXIzlK72bPQ8BSJc82AdaQ/59JHa8as3EV9QslmYw4OPZG3GuSHD6wMVLO8bkeafrOCA48GQocx29EA+HB38ki6LGtRfLJO4HGaUvzjlFkis+2McRWSGUqNBDND/Gc0GUIASWci3nrZZblK+FQcNu3iUY/tf/3/Hk//+kGY0wcd7xX+JlupD+btGlEjezOARPoimbM32KEypgMdJMJInHeqcXAiISPOK7Q4LG+cVmabRjCnzWHASpaeLnDVb4uK3AU2PQroaOGn00rWVxrslvhwUDiVEdaG5tYbLiB326n7wC4H5DE9kmY0gQtiAJMtTfM4W6107Ji3w3DqZf2JxcPKEjaN+SQrvwjnhQsIFeZGVvDBnfIH4qvBI307blC0Ice+YJDwCpP3AYmzSec2Pcfr3hKSL5Q3BG7UekyYGRnU3jVwo+lRLOULtiy4Y/r+Q5CygmntonVd7j0f+Vilkb3bGWFHiASU7UweJq9QneyNolc2WN4DSnnhqYuqconGhpq/nzu3PM+CY73VRdzexYqlejLSNjoHxLBUybsyE14P5YCyX9ClXQNmgQVubt4a/E6Gfy4joyj/Ez9vLqtJfhVD2Tfy94yyaVNYPyODnblBuKr3dPSCLvdso+fUqNM9fHTuc4mIKpo81bKxMhW9qgT17TS83h1FeSiJ/mDf3wL3JT2d+fZFUSYdTa2vMxqskJ5Ds59/sa1IhaNCetA5YcS9Br9Du9aDqU36p2JRs+2eBgIeQaObh/7bmgNnc7cZykYGFzRkLsKs3GqB0Tr+hOSKyPXUvHHJ8HfVH+pJdyIIwUYHgAOFZ+GppU8pcLbBXS/sX/zctzx6CnpsUJiKTqyVveRl8DnTrEvy1Jm8cEtJMJy8GpOkTQweWDR8pVh00mz2l8NB+XXfy0S9izAX92n5maNWj9QHrqLTaAdMYDxRP7KlvaTl4evLjF8iInnWGfZazowDe0f0AvaEuMfYwyT2oTQlJ7rW6YYJ8O5bc0HiT9RVIhJyOw1aZdOtn/HykLYTv4EGewm27mtBFDAAFMt72MUjgmoKMojRO4dwn/pj+UsTzkKeQ9krk4rRMdMvMPc8XXgm1vrxlOzNgExlEjLoBB1GDDWlYhR62yTqujTXsNam2X+MALSXrb2fpwXVP3mHph4PtvmeoV3y3GoWA9UvFFOgOl8mxOGv+mf1j4sYlnhwvOEGenpNeyTqpzmZ2UckXCBeeEfQw1jGpyo0ddSl4wHPfLflC3nIJqsP9E8wfj3psZ6Gf1unUG6oflPw8TYsrxOrfjbqCuVh41e/0YiOrGPVFaWjEUinnYJ9qXW/7i2O5D4YjgzufihUjGyc3MfeIsoNEmau8RViSgO4qhGs7z5dIrcAf7VgFPZGG4LJdc3dO30hkmQNcw9HDLmxsvfnkh8nCo70K96O2bktz/Nu6YOg9PdtmmAMul9gaRuMYOBtvr0o68J5j1ho8z3Dz+A4N+znpK0e5z9JRAlYa9GXkoYkLMPP1oqB+7uhKyRIQ09FiH8vEEY8F68geZITejf8F04eJJVgc7/HO0r2pWziiqdkj27F8hOSopxHkEWSmsnCyxLKYTPmHTv70/TQYBul1ZOjn8TYSiXk+tcr8I9j3BVnGABY0K8BWdOrdqN1d+xryZ4O9e+8mEVxvTl2GFLE3+Mg1qvW3b/iAyGwBaqpq9eIcfcdJF9QprThIJZZ+lE6b0pl5t+Q4O56bEoJ6EIz7Qa6mTJrMqj/wShHpsiv4v9+elLxMii2PMRd4dHeWazgAA/3plKJEBOcPfkn4Y25OT8X8nWK3APTGcdHs2OMEdho8pIPzvvNgLaK49X4n+yn9iEsEqcuxFVvVMuSqI7nhsxE1I79bpvzS8hm3wChixeRsDTvHeJgKgYi9cUNAsvuoToGwTTKe7+5IIFvEu47/bvmVZRwB3IRbHlZMWztKrJ4/duJxOCS5HCHRYt1kPo/QgTKypxs23t8X27NxtTOt9+X/Bofgm3fdKjlfmVNYrqbZECBJjVbpQL0pTpzwUxHnCO0vojZ5PcIFRAv48x1OZaV3LiYQzCP4rcsCf3cXcoSYh+Zu5PeS+zF494qI9fg53SDMIWQLnd33Xy8daTNSGb91WmEzjg5zKU1fuoS/zzNVpIMGHSzZx/8XPvJKYNzvBGWBHuceuOYL9riB/e6J2f09ef6y/xOK/+O399z0XLh07BwWolaT4p9gyw9YCuqP3T5mY0c4MSN1ph+Y1HCn4nF6s/39B7/fzvg+2dAZEJKkRlJp2r3yqqV6gw4d+t5Mmtimj/CRAwlkEJXDi2na3dr7cNGPVQiW5ACFdyWe2Y4iGEar/s/9Lc2pJpuRzyCnP5ekasjHQ1pL+r/QmIrRbjUBHChRdVgdPq1dbOIjvnKeBk4LOlqrUvz2wsxntlxvY/64S9Ual1+Wb+Ha4wqCC1OhJCK/quRAz6CC28jW0MLLV4mlmLKUanrvHiwyxfAHjcJfmf/yucIBDjJAErk/m0sxf2yEDx3V5pPZ4Z/3ic1YLclIirRHDYJICEe/hz+8yyT1d6Vjf7dscOLwR/M//eeeJgXXb05nXJsPFhlg4fEGEWQrjmwn+lLyjuot3VUY6u1MBaPNnv88dZss42iwotjc//QbolIG2dEcBG5snGoCoHl0sODGVzYSZgX6dwGnKM174V7subyDEGDb78PvrZ4RIaP43QdU3raXE41YkT6wXrcWDYdxrMWUnWtpm52JWEa6q4lvorgxpCGvZN4z/TWcKsMO47XpX8i/llx/K73NZoQcnOzkS36XC0v6ZOo/1EVajDI377HRNnjRDRHabCQkggDjmihMYdyRQRLzTU57j8sNjHo0PwzthRoiajw/tJfeNMzjo6Yy4u4OzNpLjpplpkYAAAAAAAAAAAAAAAA==" : package_.iconBase64} className="w-8 h-8 mr-2" />
                            <p className="font-semibold">{package_.packageName}</p>
                            <button className="btn btn-xs ml-2" onClick={() => {
                              navigator.clipboard.writeText(package_.packageName);
                              toast.success("Package name copied to clipboard");
                            }}><FiCopy /></button>
                          </div>
                          <div className="flex items-center">
                            <div className="tooltip" data-tip="Launch App">
                              <button className="btn btn-outline" onClick={() => launchApp(package_.packageName)}><FiExternalLink /></button>
                            </div>
                            <div className="tooltip" data-tip="Export APK">
                              <button className="btn btn-outline ml-2" onClick={() => {
                                if (downloadingAPK) return toast.error("Another APK is being downloaded");
                                getAPKs(package_.packageName);
                              }}>{
                                  downloadingAPK && downloadingAPKPkg === package_.packageName
                                    ? <span className="loading loading-spinner loading-xs"></span> : <BsAndroid />
                                }</button>
                            </div>
                          </div>
                        </div>
                    ))}
                  </div>
                </> : selectedTab === "reverse" ?
                  <div className="w-full h-full flex relative">
                    <div className="flex flex-col w-fit">
                      <a target="_blank" href={"/reverse-engineering/" + selectedDevice} className="link link-primary flex items-center">Reverse Engineering Studio <FiExternalLink className="ml-2" /></a>
                      <p className="font-semibold text-lg my-4">Running Processes</p>
                      <select onClick={() => getProcesses()} className="select select-bordered w-full" value={reSelectedProcess} onChange={(x) => {
                        setReSelectedProcess(x.target.value);
                        const process = reProcesses.find((p: any) => p.name === x.target.value);
                        if (process) {
                          setTraceFilter(process.identifier + "*!*");
                        }
                      }}>
                        <option value="">Select process</option>
                        {
                          reProcesses.map((process: any, index) => (
                            <option key={index} value={process.name}>{process.name} ({process.identifier})</option>
                          ))
                        }
                      </select>
                      <div className="flex items-center mt-2">
                        <div className="tooltip" data-tip={"Show classes of " + reSelectedProcess}>
                          {reSelectedProcess ? <button onClick={() => {
                            window.open(`${serverURL}/frida/methods?process=${reSelectedProcess}`, "_blank");
                          }} className="btn btn-square mr-2"><FiCode /></button> : ""}
                        </div>
                        {reSelectedProcess ? <input type="text" placeholder="Method filter (format: class!method)" className="input input-bordered w-full" value={traceFilter} onChange={(x) => setTraceFilter(x.target.value)} /> : ""}
                      </div>
                      {reSelectedProcess ? <button className="btn btn-primary mt-4" onClick={() => {
                        if (isTracing) {
                          traceEventSource?.close();
                          setIsTracing(false);
                          setTraceEventSource(null);
                          toast.success("Trace stopped");
                        }
                        else {
                          startTrace(reSelectedProcess, traceFilter);
                        }
                      }}>
                        {isTracing ? <FiStopCircle /> : <FiPlay />}
                        {isTracing ? "Stop Trace" : "Start Trace"}</button> : ""}
                      <p className="font-semibold text-lg my-4">Decompile</p>
                      <div>
                        <button className="btn mr-2" onClick={() => {
                          (
                            document.getElementById("apktool") as HTMLDialogElement
                          ).showModal()
                        }}>
                          <BsAndroid /> APKTOOL
                        </button>
                        <button className="btn" onClick={() => {
                          (
                            document.getElementById("jadx") as HTMLDialogElement
                          ).showModal()
                        }}>
                          <GrJava /> JADX
                        </button>
                      </div>
                    </div>
                    <div
                      ref={traceLogRef}
                      className="flex flex-col w-full h-full overflow-auto ml-10 max-h-[calc(100vh-200px)] bg-black text-green-400 p-4 rounded-lg"
                    >
                      <pre className="text-sm whitespace-pre-wrap">
                        {filteredLogs.map((log, index) => (
                          <code key={index}>
                            {highlightLine(log, reSearch)}
                            {"\n"}
                          </code>
                        ))}
                      </pre>
                    </div>
                    <div className="flex items-center absolute right-5 top-5">
                      <button className="btn btn-sm mr-2" onClick={() => setTraceLogs([])}><FiTrash2 /></button>
                      <input type="text" placeholder="Search logs..." className="input input-sm input-bordered max-w-sm" value={reSearch} onChange={(x) => setReSearch(x.target.value)} />
                    </div>
                  </div> : selectedTab === "activity" ?
                    <div className="flex flex-col max-w-xl">
                      <div className="flex w-fit items-center justify-between mb-4">
                        <p className="mr-2">System applications</p>
                        <input type="checkbox" className="toggle" onChange={(x) => setSystemApps(x.target.checked)} checked={systemApps} />
                      </div>
                      <p className="font-semibold text-lg mb-2">Start Activity</p>
                      <div className="flex items-center">
                        <select className="select select-bordered w-full" value={SApackageName} onChange={(x) => setSAPackageName(x.target.value)}>
                          <option value="">Select package</option>
                          {
                            packages.map((package_: any, index) => (
                              <option key={index} value={package_.packageName}>{package_.packageName}</option>
                            ))
                          }
                        </select>
                        <p className="mx-2">/</p>
                        <input type="text" placeholder="Activity" className="input input-bordered w-full" value={SAactivity} onChange={(x) => setSAActivity(x.target.value)} />
                        <div className="tooltip" data-tip="Start Activity">
                          <button className="btn btn-square btn-primary ml-2" onClick={() => startActivity()}><FiPlay /></button>
                        </div>
                      </div>
                      {SAactivity === "" ? <p className="mt-2">{SApackageName} Launcher activity will be started by default if available.</p>
                        : <p className="mt-2">{SApackageName}/{SAactivity}</p>}
                    </div> : selectedTab === "misc" ?
                      <div className="flex flex-col w-fit">
                        MISC
                      </div>
                      : "Other Tab"}
            </div>
          )}
        </div>
      </div>

      {/* Connect Device Dialog */}
      <dialog id="connect_device" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Connect to device</h3>
          <div className="flex mt-2">
            <input
              type="text"
              placeholder="IP Address"
              className="mr-2 input input-bordered w-full"
              value={connectDeviceIp}
              onChange={(x) => setConnectDeviceIp(x.target.value)}
            />
            <input
              type="number"
              placeholder="Port"
              className="input input-bordered"
              value={connectDevicePort}
              onChange={(x) => setConnectDevicePort(parseInt(x.target.value))}
            />
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Cancel</button>
              <button className="ml-2 btn btn-primary" onClick={connectDevice}>
                Connect
              </button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Download APK */}
      <dialog id="download_apk" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Download APK ({downloadingAPKPkg})</h3>
          <div className="flex flex-col mt-2">
            {
              apkPaths.map((path, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded-lg mt-2">
                  <p className="font-semibold">{path.substring(path.lastIndexOf('/') + 1)}</p>
                  <button className="btn btn-primary" onClick={() => {
                    exportAPK(path);
                    (
                      document.getElementById("download_apk") as HTMLDialogElement
                    ).close()
                  }}><FiDownload /></button>
                </div>
              ))
            }
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>Cancel</button>
        </form>
      </dialog>

      {/* APKTool */}
      <dialog id="apktool" className="modal">
        <div className="modal-box">
          <h3 className="flex items-center font-bold text-lg"><BsAndroid className="mr-2" /> Apktool</h3>
          <div className="flex flex-col mt-2">
            {/* file upload input hidden */}
            <input type="file" id="file" hidden ref={apktoolFileUploadRef} />
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>Cancel</button>
        </form>
      </dialog>

      {/* jadx */}
      <dialog id="jadx" className="modal">
        <div className="modal-box">
          <h3 className="flex items-center font-bold text-lg"><GrJava className="mr-2" /> JADX</h3>
          <div className="flex flex-col mt-2">
            jadx
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>Cancel</button>
        </form>
      </dialog>

      <ToastContainer />
    </main>
  );
}
