"use client"
import { useParams } from "next/navigation"
import { JSX, useState } from "react";
import { BsAndroid } from "react-icons/bs";
import { FiCode, FiDownload, FiInfo, FiSearch, FiSmartphone, FiTarget } from "react-icons/fi";
import { GrJava } from "react-icons/gr";
import InstallFreda from "./components/InstallFreda";

export default function Page() {
    const { deviceId } = useParams();

    const tabsComponents: { [key: string]: JSX.Element } = {
        "install-frida": <InstallFreda />,
        "run-script": <div>Run Script</div>,
        "frida-trace": <div>Frida Trace</div>,
        "frida-interception": <div>Frida Interception</div>,
        "patch-apk": <div>Patch APK</div>,
        "apktool": <div>APKTool</div>,
        "jadx": <div>JADX</div>,
    };

    const [selectedTab, setSelectedTab] = useState<keyof typeof tabsComponents>("install-frida");

    return <div className="flex flex-col w-full h-full">
        <div className="flex items-center justify-between p-3">
            <h1><span className="font-semibold">🚀 RevDroid</span> | Android Reverse Engineering Studio</h1>
            <div className="flex items-center">
                <FiSmartphone className="mr-2" /> {deviceId}
            </div>
        </div>
        <div className="flex w-full h-full">
            <div className="max-w-xs w-full h-full ">
                <ul className="menu">
                    <li className="menu-title">Frida</li>
                    <li onClick={() => setSelectedTab("install-frida")}><a className={selectedTab === "install-frida" ? "active" : ""}><FiDownload /> Install Frida</a></li>
                    <li onClick={() => setSelectedTab("run-script")}><a className={selectedTab === "run-script" ? "active" : ""}><FiCode /> Run Script</a></li>
                    <li onClick={() => setSelectedTab("frida-trace")}><a className={selectedTab === "frida-trace" ? "active" : ""}><FiSearch /> Frida Trace</a></li>
                    <li onClick={() => setSelectedTab("frida-interception")}><a className={selectedTab === "frida-interception" ? "active" : ""}><FiTarget /> Frida Interception</a></li>
                    <li onClick={() => setSelectedTab("patch-apk")}><a className={selectedTab === "patch-apk" ? "active" : ""}><BsAndroid /> Patch APK</a></li>
                    <li className="menu-title">Decompile</li>
                    <li onClick={() => setSelectedTab("apktool")}><a className={selectedTab === "apktool" ? "active" : ""}><BsAndroid /> APKTool</a></li>
                    <li onClick={() => setSelectedTab("jadx")}><a className={selectedTab === "jadx" ? "active" : ""}><GrJava /> JADX</a></li>
                </ul>
            </div>
            <div className="p-2 w-full h-full bg-base-100">
                {tabsComponents[selectedTab]}
            </div>
        </div>
    </div>
}