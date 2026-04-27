# VisionGuard (Thermal HUD)

VisionGuard is a high-performance, web-based thermal driving assistant dashboard designed to run in a car using a tablet or display. It combines a standard USB camera feed with data from an AMG8833 thermal sensor to provide a heads-up display (HUD) with thermal overlays, helping drivers spot pedestrians, animals, and objects in low-visibility or night-driving conditions.

## 🚀 Features

- **Thermal Overlay & Split View**: Combines standard optical camera input with thermal data in real-time.
- **Dynamic Auto-Switching**: Automatically detects ambient brightness using the optical camera and switches to Thermal Overlay mode when it gets dark.
- **Custom Palettes**: Supports standard `Ironbow` and custom `Heatmap` thermal color palettes.
- **Real-Time Telemetry**: Calculates and displays minimum, maximum, and average ambient temperatures in the viewport. High-temperature alerts flash automatically.
- **Calibration Settings**: Easily tweak the camera offset (X/Y), scale, and thermal threshold values (Min/Max Temp) directly from the UI.
- **Simulation Mode**: Test the UI without any hardware connected using the built-in random thermal noise generator.

## 🛠 Hardware Requirements

To use the full capabilities of VisionGuard, you need:
1. **Host Device**: An Android tablet, laptop, or head-unit running a modern browser (Chrome/Edge/Opera). Note: iOS devices (iPads/iPhones) do not currently support the Web Serial API.
2. **Standard USB Web Camera**: Any UVC-compliant USB camera.
3. **Thermal Sensor**: An AMG8833 Thermal Camera Module wired to an Arduino (or similar microcontroller).
4. **USB-OTG Hub**: To connect both the USB Camera and the Arduino simultaneously to the host device.

### Flashing the Arduino
The necessary Arduino sketch is provided in the repository: `arduino_amg8833.ino`.
Upload this script to your Arduino to ensure it outputs serial data in the format the `useWebSerial` hook expects.

## 💻 Software Setup

This is a [Next.js](https://nextjs.org) project bootstrapped with `create-next-app` using the App Router.

### Local Development
```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 🔒 Security & Browser Context (Important!)

VisionGuard relies heavily on two specific browser APIs:
* **WebRTC (`navigator.mediaDevices`)** for the optical USB camera.
* **Web Serial (`navigator.serial`)** for the Arduino thermal data.

Modern web browsers enforce a **Secure Context** policy for these hardware APIs. They will completely disable access to your camera and serial ports if you do not meet security requirements. 

### How to use VisionGuard successfully:

1. **Localhost**: Running the app locally (`http://localhost:3000`) is automatically considered a secure context.
2. **Vercel / Cloud Deployment**: Deploying the app to [Vercel](https://vercel.com/) provides automatic HTTPS. If you open your `https://your-app.vercel.app` link on your car's tablet, both APIs will work perfectly natively.
3. **Network Access (Hotspot)**: If you run the Next.js server on a laptop in your car and connect your Android tablet to it via a local IP (e.g., `http://10.111.129.134:3000`), the browser will **block** the hardware. 
   * **Bypass (Android/Chrome):** On your tablet, navigate to `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, set it to Enabled, add your local Next.js URL to the list, and relaunch Chrome.

## 📦 Deployment

The easiest way to deploy this application is to use [Vercel](https://vercel.com).
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```
