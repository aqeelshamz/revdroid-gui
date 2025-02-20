"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { BiDevices } from "react-icons/bi";
import {
  FiCheck,
  FiCheckCircle,
  FiMaximize,
  FiPlus,
  FiRefreshCcw,
  FiSmartphone
} from "react-icons/fi";
import { toast, ToastContainer } from "react-toastify";

export default function Home() {
  const serverURL = "http://localhost:8080";

  const [gettingPackages, setGettingPackages] = useState<boolean>(false);
  const [devices, setDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [connectDeviceIp, setConnectDeviceIp] = useState<string>("192.168.1.");
  const [connectDevicePort, setConnectDevicePort] = useState<number>(5555);
  const [packages, setPackages] = useState<string[]>([]);

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
      data: { id: selectedDevice }
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

  useEffect(() => {
    getDevices();
    getPackages(selectedDevice);
  }, [selectedDevice]);

  return (
    <main className="w-screen h-screen flex flex-col bg-white overflow-hidden">
      <div className="p-5 flex-none bg-white">
        <p className="text-lg font-semibold">RevDroid UI</p>
      </div>
      <div className="flex-1 flex w-full bg-slate-50 min-h-0">
        <div className="flex flex-col p-5 w-[300px] h-full bg-white">
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
            {devices.map((device: any, index) => (
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
                <button className="btn" onClick={scrCpy}>
                  <FiMaximize /> SCRCPY
                </button>
              </div>

              <div className="mt-4 flex-1 overflow-auto min-h-0 w-1/3">
                {gettingPackages ? <div className="flex items-center">
                  <span className="loading loading-spinner loading-md"></span>
                  <p className="ml-2">Fetching packages...</p>
                </div> : packages.map((package_: any, index) => (
                  <div
                    key={index}
                    className="hover:bg-slate-100 cursor-pointer flex p-3 items-center justify-between"
                  >
                    <div className="flex items-center">
                      <img src={package_.iconBase64 === "x" ? "data:image/png;base64,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" : package_.iconBase64} className="w-8 h-8 mr-2" />
                      <p className="font-semibold">{package_.packageName}</p>
                    </div>
                    <FiCheckCircle size={20} className="text-green-500" />
                  </div>
                ))}
              </div>
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

      <ToastContainer />
    </main>
  );
}
