// CUBESAT Mission Control Dashboard with Bluetooth/WiFi Support
class Dashboard {
    constructor() {
        this.state = {
            connected: false,
            connectionType: null, // 'usb', 'bluetooth', 'wifi'
            usbPort: null,
            bluetoothDevice: null,
            bluetoothServer: null,
            bluetoothService: null,
            bluetoothCharacteristic: null,
            wifiSocket: null,
            reader: null,
            packetCount: 0,
            lastPacketTime: null,
            dataRate: 0,
            dataStreamActive: false,
            telemetryLog: [],
            isAutoRotating: true,
            simulationInterval: null,
            bluetoothDevices: [],
            wifiNetworks: []
        };
        
        // Default values
        this.defaults = {
            temperature: 23.0,
            humidity: 52.7,
            pressure: 1016.01,
            power: 3.62,
            powerPercent: 51,
            lightLevel: 51,
            freeHeap: 181,
            heapPercent: 84,
            signal: -65,
            signalQuality: "Good",
            cpuUsage: 23,
            cpuTemp: 42,
            systemUptime: "05:11:22",
            rssi: -65,
            snr: 15.2,
            ber: 1.2e-6,
            wifiRSSI: -65,
            bleRSSI: -72,
            wifiChannel: 6,
            bleChannel: 37,
            txPower: 8,
            frequency: 437.505,
            bandwidth: 25,
            modulation: "GMSK",
            dataRate: 9.6,
            acceleration: { x: 10.10, y: 11.23, z: 9.32 },
            gyro: { x: 18.2, y: 7.4, z: -16.5 },
            orientation: { roll: 0, pitch: 0, yaw: 0 },
            co2: 464,
            altitude: 920,
            latitude: 12.9716,
            longitude: 77.5946
        };
        
        this.init();
    }
    
    init() {
        console.log("🚀 Initializing CUBESAT Dashboard with Bluetooth/WiFi Support...");
        
        this.setupEventListeners();
        this.checkBrowserSupport();
        this.updateAllDisplays();
        this.startTimers();
        this.setupTooltips();
        this.startSignalSimulation();
        
        console.log("✅ Dashboard ready! Supports USB/Bluetooth/WiFi");
    }
    
    setupEventListeners() {
        // Connection type selector
        document.querySelectorAll('.connection-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.switchConnectionType(type);
            });
        });
        
        // USB Connection
        document.getElementById('connect-usb').addEventListener('click', () => this.connectUSB());
        document.getElementById('disconnect-usb').addEventListener('click', () => this.disconnectUSB());
        
        // Bluetooth Connection
        document.getElementById('scan-bluetooth').addEventListener('click', () => this.scanBluetoothDevices());
        document.getElementById('connect-bluetooth').addEventListener('click', () => this.connectBluetooth());
        document.getElementById('disconnect-bluetooth').addEventListener('click', () => this.disconnectBluetooth());
        
        // WiFi Connection
        document.getElementById('scan-wifi').addEventListener('click', () => this.scanWiFiNetworks());
        document.getElementById('connect-wifi').addEventListener('click', () => this.connectWiFi());
        document.getElementById('disconnect-wifi').addEventListener('click', () => this.disconnectWiFi());
        
        // Data Controls (common for all connections)
        document.getElementById('start-data').addEventListener('click', () => this.startDataStream());
        document.getElementById('stop-data').addEventListener('click', () => this.stopDataStream());
        document.getElementById('clear-data').addEventListener('click', () => this.clearData());
        
        // 3D Controls
        document.getElementById('reset-view').addEventListener('click', () => this.resetView());
        document.getElementById('auto-rotate').addEventListener('click', (e) => {
            this.state.isAutoRotating = !this.state.isAutoRotating;
            e.target.classList.toggle('active');
            if (window.Satellite3D) {
                window.Satellite3D.setAutoRotate(this.state.isAutoRotating);
            }
        });
        
        document.getElementById('toggle-axes').addEventListener('click', (e) => {
            e.target.classList.toggle('active');
            if (window.Satellite3D) {
                window.Satellite3D.toggleAxes();
            }
        });
        
        // Export
        document.getElementById('export-log').addEventListener('click', () => this.exportTelemetry());
        
        // Screenshot
        document.getElementById('save-model-view').addEventListener('click', () => this.saveModelScreenshot());
        
        // Model Upload
        document.getElementById('model-upload').addEventListener('change', (e) => this.handleModelUpload(e));
        document.getElementById('load-default-model').addEventListener('click', () => this.loadDefaultModel());
    }
    
    setupTooltips() {
        document.querySelectorAll('[data-tooltip]').forEach(el => {
            el.addEventListener('mouseenter', (e) => {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = e.target.dataset.tooltip;
                
                document.body.appendChild(tooltip);
                
                const rect = e.target.getBoundingClientRect();
                tooltip.style.left = (rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)) + 'px';
                tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
                
                e.target._tooltip = tooltip;
            });
            
            el.addEventListener('mouseleave', (e) => {
                if (e.target._tooltip) {
                    e.target._tooltip.remove();
                    delete e.target._tooltip;
                }
            });
        });
    }
    
    switchConnectionType(type) {
        // Update active button
        document.querySelectorAll('.connection-type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
        
        // Show/hide connection sections
        document.querySelectorAll('.connection-section').forEach(section => {
            section.classList.toggle('active', section.id === `${type}-section`);
        });
        
        // Update status
        this.updateValue('status-text', `Select ${type.toUpperCase()} connection settings...`);
        
        console.log(`Switched to ${type} connection mode`);
    }
    
    checkBrowserSupport() {
        const usbBtn = document.getElementById('connect-usb');
        const bluetoothBtn = document.getElementById('scan-bluetooth');
        
        // Check Web Serial API
        if (!navigator.serial) {
            usbBtn.disabled = true;
            usbBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Web Serial Not Supported';
            console.warn("⚠️ Use Chrome/Edge 89+ for USB connection");
        } else {
            console.log("✅ Web Serial API supported");
        }
        
        // Check Web Bluetooth API
        if (!navigator.bluetooth) {
            bluetoothBtn.disabled = true;
            bluetoothBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Bluetooth Not Supported';
            console.warn("⚠️ Use Chrome/Edge 56+ for Bluetooth connection");
        } else {
            console.log("✅ Web Bluetooth API supported");
        }
        
        // WiFi is always supported (WebSocket)
        console.log("✅ WiFi/WebSocket supported");
    }
    
    /* ===== USB CONNECTION ===== */
    async connectUSB() {
        console.log("🔌 Connecting USB...");
        
        try {
            // Request port
            const port = await navigator.serial.requestPort();
            const baudRate = parseInt(document.getElementById('baud-select').value);
            
            // Open port
            await port.open({ baudRate });
            
            this.state.usbPort = port;
            this.state.connected = true;
            this.state.connectionType = 'usb';
            
            // Update UI
            this.updateConnectionStatus();
            document.getElementById('connect-usb').disabled = true;
            document.getElementById('disconnect-usb').disabled = false;
            document.getElementById('start-data').disabled = false;
            
            // Start reading
            this.startReading(port);
            
            console.log("✅ USB Connected");
            
        } catch (error) {
            console.error("❌ USB Connection failed:", error);
            alert(`USB Connection Failed: ${error.message}`);
        }
    }
    
    async disconnectUSB() {
        if (this.state.reader) {
            this.state.reader.cancel();
            this.state.reader = null;
        }
        
        if (this.state.usbPort) {
            try {
                await this.state.usbPort.close();
            } catch (error) {
                console.error('Error closing USB port:', error);
            }
            this.state.usbPort = null;
        }
        
        this.state.connected = false;
        this.state.connectionType = null;
        this.state.dataStreamActive = false;
        
        this.updateConnectionStatus();
        
        document.getElementById('connect-usb').disabled = false;
        document.getElementById('disconnect-usb').disabled = true;
        document.getElementById('start-data').disabled = true;
        document.getElementById('stop-data').disabled = true;
        
        console.log("USB Disconnected");
    }
    
    /* ===== BLUETOOTH CONNECTION ===== */
    async scanBluetoothDevices() {
        console.log("📡 Scanning for Bluetooth devices...");
        
        try {
            this.updateValue('status-text', 'Scanning for Bluetooth devices...');
            
            // Request Bluetooth device with specific service
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'ESP32' },
                    { namePrefix: 'CUBESAT' },
                    { namePrefix: 'BLE' },
                    { services: ['battery_service', 'device_information', 'environmental_sensing'] }
                ],
                optionalServices: [
                    'battery_service',
                    'device_information',
                    'environmental_sensing',
                    '0000ffe0-0000-1000-8000-00805f9b34fb' // Common BLE UART service
                ]
            });
            
            this.state.bluetoothDevice = device;
            
            // Update device info
            document.getElementById('bluetooth-device-name').textContent = device.name || 'Unknown';
            
            // Add to device list
            const deviceList = document.getElementById('bluetooth-device-list');
            deviceList.innerHTML = '';
            
            const deviceItem = document.createElement('div');
            deviceItem.className = 'device-item';
            deviceItem.innerHTML = `
                <div><strong>${device.name || 'Unknown Device'}</strong></div>
                <div>ID: ${device.id}</div>
            `;
            deviceItem.addEventListener('click', () => {
                document.getElementById('connect-bluetooth').disabled = false;
            });
            
            deviceList.appendChild(deviceItem);
            
            // Listen for disconnection
            device.addEventListener('gattserverdisconnected', () => {
                console.log('Bluetooth device disconnected');
                this.disconnectBluetooth();
            });
            
            this.updateValue('status-text', `Found device: ${device.name}`);
            console.log("✅ Found Bluetooth device:", device);
            
        } catch (error) {
            console.error("❌ Bluetooth scan failed:", error);
            if (error.name !== 'NotFoundError') {
                alert(`Bluetooth Scan Failed: ${error.message}`);
            }
            this.updateValue('status-text', 'Bluetooth scan cancelled or no devices found');
        }
    }
    
    async connectBluetooth() {
        if (!this.state.bluetoothDevice) {
            alert('Please scan and select a Bluetooth device first');
            return;
        }
        
        console.log("🔗 Connecting Bluetooth...");
        
        try {
            this.updateValue('status-text', 'Connecting to Bluetooth device...');
            
            // Connect to GATT Server
            const server = await this.state.bluetoothDevice.gatt.connect();
            this.state.bluetoothServer = server;
            
            // Try to get common services
            const services = await server.getPrimaryServices();
            
            console.log('Found services:', services.map(s => s.uuid));
            
            // Look for UART service (common for ESP32)
            const uartService = services.find(s => s.uuid.includes('ffe0'));
            
            if (uartService) {
                const characteristics = await uartService.getCharacteristics();
                const txCharacteristic = characteristics.find(c => c.uuid.includes('ffe1'));
                const rxCharacteristic = characteristics.find(c => c.uuid.includes('ffe2'));
                
                if (rxCharacteristic) {
                    await rxCharacteristic.startNotifications();
                    rxCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
                        const value = event.target.value;
                        const textDecoder = new TextDecoder();
                        const data = textDecoder.decode(value);
                        this.processData(data);
                    });
                    
                    this.state.bluetoothCharacteristic = rxCharacteristic;
                }
            }
            
            this.state.connected = true;
            this.state.connectionType = 'bluetooth';
            
            // Update UI
            this.updateConnectionStatus();
            document.getElementById('connect-bluetooth').disabled = true;
            document.getElementById('disconnect-bluetooth').disabled = false;
            document.getElementById('start-data').disabled = false;
            
            // Hide scan button when connected
            document.getElementById('scan-bluetooth').style.display = 'none';
            
            // Update RSSI
            this.updateValue('bluetooth-rssi', '-65 dBm');
            this.updateValue('ble-rssi-value', '-65');
            
            console.log("✅ Bluetooth Connected");
            this.updateValue('status-text', 'Bluetooth connected successfully');
            
        } catch (error) {
            console.error("❌ Bluetooth connection failed:", error);
            alert(`Bluetooth Connection Failed: ${error.message}`);
            this.updateValue('status-text', 'Bluetooth connection failed');
        }
    }
    
    async disconnectBluetooth() {
        if (this.state.bluetoothDevice && this.state.bluetoothDevice.gatt.connected) {
            try {
                this.state.bluetoothDevice.gatt.disconnect();
            } catch (error) {
                console.error('Error disconnecting Bluetooth:', error);
            }
        }
        
        this.state.bluetoothDevice = null;
        this.state.bluetoothServer = null;
        this.state.bluetoothCharacteristic = null;
        this.state.connected = false;
        this.state.connectionType = null;
        this.state.dataStreamActive = false;
        
        this.updateConnectionStatus();
        
        document.getElementById('connect-bluetooth').disabled = false;
        document.getElementById('disconnect-bluetooth').disabled = true;
        document.getElementById('start-data').disabled = true;
        document.getElementById('stop-data').disabled = true;
        
        // Show scan button again
        document.getElementById('scan-bluetooth').style.display = 'flex';
        
        // Clear device list
        const deviceList = document.getElementById('bluetooth-device-list');
        deviceList.innerHTML = '<div class="device-item empty">No devices found. Click "Scan" to discover.</div>';
        
        console.log("Bluetooth Disconnected");
    }
    
    /* ===== WIFI CONNECTION ===== */
    async scanWiFiNetworks() {
        console.log("📡 Scanning WiFi networks (simulated)...");
        
        // In a real implementation, this would use WebSocket or HTTP to get WiFi scan results
        // For now, we'll simulate it
        
        this.updateValue('status-text', 'Scanning WiFi networks...');
        
        // Simulate network scan
        setTimeout(() => {
            const networks = [
                { ssid: 'ESP32-C3-AP', signal: -45, channel: 6, security: 'WPA2' },
                { ssid: 'HomeWiFi', signal: -65, channel: 11, security: 'WPA2' },
                { ssid: 'CUBESAT_AP', signal: -55, channel: 1, security: 'Open' },
                { ssid: 'GuestNetwork', signal: -75, channel: 3, security: 'WPA2' }
            ];
            
            this.state.wifiNetworks = networks;
            
            // Populate SSID dropdown or show in list
            const ssidInput = document.getElementById('wifi-ssid');
            ssidInput.value = 'ESP32-C3-AP';
            
            this.updateValue('wifi-signal', 'Excellent (-45 dBm)');
            this.updateValue('status-text', `Found ${networks.length} WiFi networks`);
            
            console.log("✅ WiFi scan complete (simulated)");
            
        }, 1000);
    }
    
    async connectWiFi() {
        const ssid = document.getElementById('wifi-ssid').value;
        const password = document.getElementById('wifi-password').value;
        const ip = document.getElementById('wifi-ip').value;
        const port = document.getElementById('wifi-port').value;
        
        if (!ssid) {
            alert('Please enter WiFi SSID');
            return;
        }
        
        if (!ip) {
            alert('Please enter ESP32 IP address');
            return;
        }
        
        console.log(`📶 Connecting to WiFi: ${ssid} @ ${ip}:${port}`);
        
        try {
            this.updateValue('status-text', `Connecting to WiFi: ${ssid}...`);
            
            // For WiFi, we'll use WebSocket connection
            const wsUrl = `ws://${ip}:${port}/ws`;
            const socket = new WebSocket(wsUrl);
            
            socket.onopen = () => {
                console.log('✅ WebSocket connected');
                this.state.wifiSocket = socket;
                this.state.connected = true;
                this.state.connectionType = 'wifi';
                
                // Update UI
                this.updateConnectionStatus();
                document.getElementById('connect-wifi').disabled = true;
                document.getElementById('disconnect-wifi').disabled = false;
                document.getElementById('start-data').disabled = false;
                
                // Hide scan button when connected
                document.getElementById('scan-wifi').style.display = 'none';
                
                this.updateValue('wifi-ip-address', ip);
                this.updateValue('wifi-connected', 'Yes');
                this.updateValue('wifi-rssi-value', '-45');
                this.updateValue('status-text', `Connected to WiFi: ${ssid}`);
            };
            
            socket.onmessage = (event) => {
                this.processData(event.data);
            };
            
            socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                alert(`WiFi Connection Failed: ${error.message}`);
                this.updateValue('status-text', 'WiFi connection failed');
            };
            
            socket.onclose = () => {
                console.log('WebSocket disconnected');
                this.disconnectWiFi();
            };
            
            // Set timeout for connection
            setTimeout(() => {
                if (socket.readyState !== WebSocket.OPEN) {
                    socket.close();
                    alert('WiFi connection timeout. Please check IP/Port and ensure ESP32 is in AP mode.');
                    this.updateValue('status-text', 'WiFi connection timeout');
                }
            }, 5000);
            
        } catch (error) {
            console.error("❌ WiFi connection failed:", error);
            alert(`WiFi Connection Failed: ${error.message}`);
            this.updateValue('status-text', 'WiFi connection failed');
        }
    }
    
    disconnectWiFi() {
        if (this.state.wifiSocket) {
            this.state.wifiSocket.close();
            this.state.wifiSocket = null;
        }
        
        this.state.connected = false;
        this.state.connectionType = null;
        this.state.dataStreamActive = false;
        
        this.updateConnectionStatus();
        
        document.getElementById('connect-wifi').disabled = false;
        document.getElementById('disconnect-wifi').disabled = true;
        document.getElementById('start-data').disabled = true;
        document.getElementById('stop-data').disabled = true;
        
        // Show scan button again
        document.getElementById('scan-wifi').style.display = 'flex';
        
        this.updateValue('wifi-connected', 'No');
        this.updateValue('wifi-ip-address', '-');
        
        console.log("WiFi Disconnected");
    }
    
    /* ===== COMMON DATA HANDLING ===== */
    async startReading(port) {
        try {
            const textDecoder = new TextDecoderStream();
            port.readable.pipeTo(textDecoder.writable);
            const reader = textDecoder.readable.getReader();
            
            this.state.reader = reader;
            
            while (true) {
                try {
                    const { value, done } = await reader.read();
                    if (done) break;
                    
                    if (value) {
                        this.processData(value);
                    }
                } catch (error) {
                    console.error('Read error:', error);
                    break;
                }
            }
        } catch (error) {
            console.error('Reader setup error:', error);
            if (this.state.connectionType === 'usb') {
                this.disconnectUSB();
            }
        }
    }
    
    processData(rawData) {
        const lines = rawData.trim().split('\n');
        
        for (const line of lines) {
            if (line.trim()) {
                this.parseLine(line.trim());
            }
        }
    }
    
    parseLine(line) {
        try {
            // Format 1: JSON
            if (line.startsWith('{') && line.endsWith('}')) {
                const data = JSON.parse(line);
                this.updateFromJSON(data);
                this.logTelemetry(line);
                return;
            }
            
            // Format 2: Key=Value (most common for ESP32)
            if (line.includes('=')) {
                const packet = {};
                const parts = line.split(',');
                
                parts.forEach(part => {
                    const [key, value] = part.split('=');
                    if (key && value) {
                        const numValue = parseFloat(value);
                        const strValue = value.trim();
                        switch(key.toLowerCase()) {
                            // Environment
                            case 't': case 'temp': packet.temperature = numValue; break;
                            case 'h': case 'hum': packet.humidity = numValue; break;
                            case 'p': case 'press': packet.pressure = numValue; break;
                            // Motion
                            case 'ax': packet.accelX = numValue; break;
                            case 'ay': packet.accelY = numValue; break;
                            case 'az': packet.accelZ = numValue; break;
                            case 'gx': packet.gyroX = numValue; break;
                            case 'gy': packet.gyroY = numValue; break;
                            case 'gz': packet.gyroZ = numValue; break;
                            case 'roll': packet.roll = numValue; break;
                            case 'pitch': packet.pitch = numValue; break;
                            case 'yaw': packet.yaw = numValue; break;
                            // Air Quality
                            case 'co2': packet.co2 = numValue; break;
                            case 'alt': packet.altitude = numValue; break;
                            // Signal
                            case 'rssi': packet.rssi = numValue; break;
                            case 'snr': packet.snr = numValue; break;
                            case 'ber': packet.ber = numValue; break;
                            case 'wifi_rssi': packet.wifiRSSI = numValue; break;
                            case 'ble_rssi': packet.bleRSSI = numValue; break;
                            // System
                            case 'cpu': packet.cpuUsage = numValue; break;
                            case 'cpu_temp': packet.cpuTemp = numValue; break;
                            case 'heap': packet.freeHeap = numValue; break;
                            case 'power': packet.power = numValue; break;
                            case 'light': packet.lightLevel = numValue; break;
                        }
                    }
                });
                
                this.updateFromPacket(packet);
                this.logTelemetry(line);
                return;
            }
            
            // Log unparsed data
            this.logTelemetry(line);
            
        } catch (error) {
            console.log('Parse error:', error, 'Line:', line);
            this.logTelemetry(line);
        }
    }
    
    updateFromJSON(data) {
        const packet = {
            temperature: data.temp || data.temperature || data.T || this.defaults.temperature,
            humidity: data.hum || data.humidity || data.H || this.defaults.humidity,
            pressure: data.press || data.pressure || data.P || this.defaults.pressure,
            accelX: data.ax || data.accelX || data.AX || this.defaults.acceleration.x,
            accelY: data.ay || data.accelY || data.AY || this.defaults.acceleration.y,
            accelZ: data.az || data.accelZ || data.AZ || this.defaults.acceleration.z,
            gyroX: data.gx || data.gyroX || data.GX || this.defaults.gyro.x,
            gyroY: data.gy || data.gyroY || data.GY || this.defaults.gyro.y,
            gyroZ: data.gz || data.gyroZ || data.GZ || this.defaults.gyro.z,
            roll: data.roll || data.R || this.defaults.orientation.roll,
            pitch: data.pitch || data.P || this.defaults.orientation.pitch,
            yaw: data.yaw || data.Y || this.defaults.orientation.yaw,
            co2: data.co2 || data.CO2 || this.defaults.co2,
            altitude: data.alt || data.altitude || this.defaults.altitude,
            rssi: data.rssi || data.RSSI || this.defaults.rssi,
            snr: data.snr || data.SNR || this.defaults.snr,
            ber: data.ber || data.BER || this.defaults.ber,
            wifiRSSI: data.wifi_rssi || data.wifiRSSI || this.defaults.wifiRSSI,
            bleRSSI: data.ble_rssi || data.bleRSSI || this.defaults.bleRSSI,
            cpuUsage: data.cpu || data.cpuUsage || this.defaults.cpuUsage,
            cpuTemp: data.cpu_temp || data.cpuTemp || this.defaults.cpuTemp,
            freeHeap: data.heap || data.freeHeap || this.defaults.freeHeap,
            power: data.power || data.voltage || this.defaults.power,
            lightLevel: data.light || data.lightLevel || this.defaults.lightLevel
        };
        
        this.updateFromPacket(packet);
    }
    
    updateFromPacket(packet) {
        // Update packet stats
        this.state.packetCount++;
        const now = Date.now();
        
        if (this.state.lastPacketTime) {
            const elapsed = (now - this.state.lastPacketTime) / 1000;
            this.state.dataRate = 1 / elapsed;
            this.updateValue('data-rate', this.state.dataRate.toFixed(1) + ' Hz');
        }
        this.state.lastPacketTime = now;
        
        // Update displays
        this.updateValue('packet-count', this.state.packetCount);
        this.updateValue('last-packet', 'Just now');
        
        // Update sensor values
        if (packet.temperature !== undefined) {
            this.updateValue('temp-value', packet.temperature.toFixed(1) + ' °C');
            const tempBar = Math.min((packet.temperature / 50) * 100, 100);
            document.getElementById('temp-bar').style.width = tempBar + '%';
            if (window.charts) window.charts.updateTemperature(packet.temperature);
        }
        
        if (packet.humidity !== undefined) {
            this.updateValue('humidity-value', packet.humidity.toFixed(1) + ' %');
            document.getElementById('humidity-bar').style.width = packet.humidity + '%';
        }
        
        if (packet.pressure !== undefined) {
            this.updateValue('pressure-value', packet.pressure.toFixed(2) + ' hPa');
            const pressBar = ((packet.pressure - 980) / 60) * 100;
            document.getElementById('pressure-bar').style.width = Math.min(pressBar, 100) + '%';
        }
        
        // Motion data
        if (packet.accelX !== undefined) this.updateValue('x-axis-value', packet.accelX.toFixed(2));
        if (packet.accelY !== undefined) this.updateValue('y-axis-value', packet.accelY.toFixed(2));
        if (packet.accelZ !== undefined) this.updateValue('z-axis-value', packet.accelZ.toFixed(2));
        
        if (packet.gyroX !== undefined) this.updateValue('gyro-x', packet.gyroX.toFixed(1) + ' °/s');
        if (packet.gyroY !== undefined) this.updateValue('gyro-y', packet.gyroY.toFixed(1) + ' °/s');
        if (packet.gyroZ !== undefined) this.updateValue('gyro-z', packet.gyroZ.toFixed(1) + ' °/s');
        
        if (packet.roll !== undefined) this.updateValue('roll-value', packet.roll.toFixed(1) + '°');
        if (packet.pitch !== undefined) this.updateValue('pitch-value', packet.pitch.toFixed(1) + '°');
        if (packet.yaw !== undefined) this.updateValue('yaw-value', packet.yaw.toFixed(1) + '°');
        
        // Update 3D model
        if (window.Satellite3D && packet.roll !== undefined && packet.pitch !== undefined && packet.yaw !== undefined) {
            window.Satellite3D.updateOrientation({
                roll: packet.roll,
                pitch: packet.pitch,
                yaw: packet.yaw
            });
        }
        
        // System status
        if (packet.power !== undefined) {
            this.updateValue('power-value', packet.power.toFixed(2) + 'V');
            const powerPercent = Math.min(Math.max((packet.power - 3.0) / (4.2 - 3.0) * 100, 0), 100);
            this.updateValue('power-percent', Math.round(powerPercent) + '%');
        }
        
        if (packet.freeHeap !== undefined) {
            this.updateValue('heap-value', Math.round(packet.freeHeap) + ' KB');
        }
        
        if (packet.cpuUsage !== undefined) {
            this.updateValue('cpu-value', Math.round(packet.cpuUsage) + '%');
        }
        
        if (packet.cpuTemp !== undefined) {
            this.updateValue('cpu-temp', Math.round(packet.cpuTemp) + '°C');
        }
        
        if (packet.lightLevel !== undefined) {
            this.updateValue('light-value', Math.round(packet.lightLevel) + '%');
        }
        
        // Signal data
        if (packet.rssi !== undefined) {
            this.updateValue('signal-value', Math.round(packet.rssi) + ' dBm');
            this.updateValue('signal-quality', packet.rssi > -60 ? 'Excellent' : packet.rssi > -70 ? 'Good' : 'Fair');
        }
        
        if (packet.wifiRSSI !== undefined) {
            this.updateValue('wifi-rssi-value', Math.round(packet.wifiRSSI));
            if (window.charts) window.charts.updateSignal(packet.wifiRSSI);
        }
        
        if (packet.bleRSSI !== undefined) {
            this.updateValue('ble-rssi-value', Math.round(packet.bleRSSI));
        }
        
        if (packet.snr !== undefined) {
            this.updateValue('snr-value', packet.snr.toFixed(1));
        }
        
        if (packet.ber !== undefined) {
            this.updateValue('ber-value', packet.ber.toExponential(1));
        }
        
        // Air quality
        if (packet.co2 !== undefined) {
            const co2Value = Math.round(packet.co2);
            this.updateValue('co2-value', co2Value);
            this.updateValue('co2-level', co2Value + ' ppm');
            
            const statusEl = document.getElementById('quality-status');
            if (co2Value < 500) {
                statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Good';
                statusEl.style.color = '#00e676';
            } else if (co2Value < 1000) {
                statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Moderate';
                statusEl.style.color = '#ff9800';
            } else {
                statusEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Poor';
                statusEl.style.color = '#ff5252';
            }
        }
        
        if (packet.altitude !== undefined) {
            this.updateValue('altitude-value', Math.round(packet.altitude) + ' m');
        }
    }
    
    logTelemetry(data) {
        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        // Add to log
        this.state.telemetryLog.unshift({
            time: time,
            data: data.substring(0, 60) + (data.length > 60 ? '...' : '')
        });
        
        // Keep only last 10 entries
        if (this.state.telemetryLog.length > 10) {
            this.state.telemetryLog.pop();
        }
        
        this.updateTelemetryDisplay();
    }
    
    updateTelemetryDisplay() {
        const container = document.getElementById('telemetry-list');
        container.innerHTML = '';
        
        if (this.state.telemetryLog.length === 0) {
            container.innerHTML = '<div class="log-item empty">Waiting for data...</div>';
            return;
        }
        
        this.state.telemetryLog.forEach(item => {
            const div = document.createElement('div');
            div.className = 'log-item slide-in';
            div.innerHTML = `
                <span>${item.time}</span>
                <span>${item.data}</span>
            `;
            container.appendChild(div);
        });
    }
    
    updateValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element && element.textContent !== value) {
            element.textContent = value;
            element.classList.add('pulse');
            setTimeout(() => element.classList.remove('pulse'), 500);
        }
    }
    
    updateAllDisplays() {
        // Set all default values
        this.updateValue('temp-value', this.defaults.temperature.toFixed(1) + ' °C');
        this.updateValue('humidity-value', this.defaults.humidity.toFixed(1) + ' %');
        this.updateValue('pressure-value', this.defaults.pressure.toFixed(2) + ' hPa');
        this.updateValue('power-value', this.defaults.power.toFixed(2) + 'V');
        this.updateValue('power-percent', this.defaults.powerPercent + '%');
        this.updateValue('light-value', this.defaults.lightLevel + '%');
        this.updateValue('heap-value', this.defaults.freeHeap + ' KB');
        this.updateValue('heap-percent', this.defaults.heapPercent + '%');
        this.updateValue('signal-value', this.defaults.signal + ' dBm');
        this.updateValue('signal-quality', this.defaults.signalQuality);
        this.updateValue('cpu-value', this.defaults.cpuUsage + '%');
        this.updateValue('cpu-temp', this.defaults.cpuTemp + '°C');
        this.updateValue('system-uptime', this.defaults.systemUptime);
        
        // Signal data
        this.updateValue('wifi-rssi-value', Math.round(this.defaults.wifiRSSI));
        this.updateValue('ble-rssi-value', Math.round(this.defaults.bleRSSI));
        this.updateValue('snr-value', this.defaults.snr.toFixed(1));
        this.updateValue('ber-value', this.defaults.ber.toExponential(1));
        this.updateValue('wifi-channel', this.defaults.wifiChannel);
        this.updateValue('ble-channel', this.defaults.bleChannel);
        this.updateValue('tx-power', '+' + this.defaults.txPower + ' dBm');
        this.updateValue('datarate-value', this.defaults.dataRate.toFixed(1) + ' kbps');
        
        // Motion data
        this.updateValue('x-axis-value', this.defaults.acceleration.x.toFixed(2));
        this.updateValue('y-axis-value', this.defaults.acceleration.y.toFixed(2));
        this.updateValue('z-axis-value', this.defaults.acceleration.z.toFixed(2));
        this.updateValue('gyro-x', this.defaults.gyro.x.toFixed(1) + ' °/s');
        this.updateValue('gyro-y', this.defaults.gyro.y.toFixed(1) + ' °/s');
        this.updateValue('gyro-z', this.defaults.gyro.z.toFixed(1) + ' °/s');
        this.updateValue('roll-value', this.defaults.orientation.roll.toFixed(1) + '°');
        this.updateValue('pitch-value', this.defaults.orientation.pitch.toFixed(1) + '°');
        this.updateValue('yaw-value', this.defaults.orientation.yaw.toFixed(1) + '°');
        
        // Air quality
        this.updateValue('co2-value', this.defaults.co2);
        this.updateValue('co2-level', this.defaults.co2 + ' ppm');
        this.updateValue('altitude-value', this.defaults.altitude + ' m');
        this.updateValue('gps-position', this.defaults.latitude.toFixed(2) + '° N, ' + this.defaults.longitude.toFixed(2) + '° E');
        
        // Set progress bars
        const tempBar = Math.min((this.defaults.temperature / 50) * 100, 100);
        document.getElementById('temp-bar').style.width = tempBar + '%';
        document.getElementById('humidity-bar').style.width = this.defaults.humidity + '%';
        const pressBar = ((this.defaults.pressure - 980) / 60) * 100;
        document.getElementById('pressure-bar').style.width = Math.min(pressBar, 100) + '%';
        
        // Initialize charts
        if (window.charts) {
            window.charts.initialize();
        }
    }
    
    updateConnectionStatus() {
        const usbDot = document.getElementById('usb-dot');
        const usbStatus = document.getElementById('usb-status');
        const bluetoothDot = document.getElementById('bluetooth-dot');
        const bluetoothStatus = document.getElementById('bluetooth-status');
        const wifiDot = document.getElementById('wifi-dot');
        const wifiStatus = document.getElementById('wifi-status');
        const statusText = document.getElementById('status-text');
        const connectionType = document.getElementById('connection-type');
        
        // Reset all indicators
        usbDot.style.background = '#ff5252';
        usbStatus.textContent = 'OFFLINE';
        usbStatus.style.color = '#ff5252';
        
        bluetoothDot.style.background = '#ff5252';
        bluetoothStatus.textContent = 'OFFLINE';
        bluetoothStatus.style.color = '#ff5252';
        
        wifiDot.style.background = '#ff5252';
        wifiStatus.textContent = 'OFFLINE';
        wifiStatus.style.color = '#ff5252';
        
        if (this.state.connected) {
            // Update active connection
            if (this.state.connectionType === 'usb') {
                usbDot.style.background = '#00e676';
                usbStatus.textContent = 'CONNECTED';
                usbStatus.style.color = '#00e676';
            } else if (this.state.connectionType === 'bluetooth') {
                bluetoothDot.style.background = '#4fc3f7';
                bluetoothStatus.textContent = 'CONNECTED';
                bluetoothStatus.style.color = '#4fc3f7';
            } else if (this.state.connectionType === 'wifi') {
                wifiDot.style.background = '#ff9800';
                wifiStatus.textContent = 'CONNECTED';
                wifiStatus.style.color = '#ff9800';
            }
            
            if (this.state.dataStreamActive) {
                statusText.textContent = 'Receiving telemetry data...';
                statusText.style.color = '#00e676';
                connectionType.textContent = `${this.state.connectionType.toUpperCase()} CONNECTED`;
                connectionType.style.color = '#00e676';
            } else {
                statusText.textContent = 'Connected - Start data stream';
                statusText.style.color = '#ff9800';
                connectionType.textContent = `${this.state.connectionType.toUpperCase()} CONNECTED`;
                connectionType.style.color = '#00e676';
            }
        } else {
            statusText.textContent = 'Select connection type to begin...';
            statusText.style.color = '#ff5252';
            connectionType.textContent = 'DISCONNECTED';
            connectionType.style.color = '#ff5252';
        }
    }
    
    startDataStream() {
        this.state.dataStreamActive = true;
        document.getElementById('start-data').disabled = true;
        document.getElementById('stop-data').disabled = false;
        this.updateConnectionStatus();
        
        // Start simulation if not connected to real device
        if (!this.state.connected) {
            this.startDataSimulation();
        }
        
        console.log("Data stream started");
    }
    
    stopDataStream() {
        this.state.dataStreamActive = false;
        document.getElementById('start-data').disabled = false;
        document.getElementById('stop-data').disabled = true;
        this.updateConnectionStatus();
        
        // Stop simulation
        if (this.state.simulationInterval) {
            clearInterval(this.state.simulationInterval);
            this.state.simulationInterval = null;
        }
        
        console.log("Data stream stopped");
    }
    
    startDataSimulation() {
        // Simulate telemetry data
        this.state.simulationInterval = setInterval(() => {
            const packet = {
                temperature: 23.0 + (Math.random() - 0.5) * 2,
                humidity: 52.7 + (Math.random() - 0.5) * 5,
                pressure: 1016.01 + (Math.random() - 0.5) * 5,
                accelX: 10.10 + (Math.random() - 0.5) * 2,
                accelY: 11.23 + (Math.random() - 0.5) * 2,
                accelZ: 9.32 + (Math.random() - 0.5) * 2,
                gyroX: 18.2 + (Math.random() - 0.5) * 5,
                gyroY: 7.4 + (Math.random() - 0.5) * 3,
                gyroZ: -16.5 + (Math.random() - 0.5) * 4,
                roll: (Math.random() - 0.5) * 20,
                pitch: (Math.random() - 0.5) * 20,
                yaw: (Math.random() - 0.5) * 20,
                co2: 464 + (Math.random() - 0.5) * 30,
                altitude: 920 + (Math.random() - 0.5) * 10,
                rssi: -65 + (Math.random() - 0.5) * 10,
                wifiRSSI: -45 + (Math.random() - 0.5) * 10,
                bleRSSI: -72 + (Math.random() - 0.5) * 10,
                cpuUsage: 23 + (Math.random() - 0.5) * 5,
                power: 3.62 + (Math.random() - 0.5) * 0.1,
                freeHeap: 181 + (Math.random() - 0.5) * 5
            };
            
            this.updateFromPacket(packet);
            
            // Log simulated data
            const line = `T=${packet.temperature.toFixed(1)},H=${packet.humidity.toFixed(1)},P=${packet.pressure.toFixed(2)},AX=${packet.accelX.toFixed(2)},AY=${packet.accelY.toFixed(2)},AZ=${packet.accelZ.toFixed(2)},GX=${packet.gyroX.toFixed(1)},GY=${packet.gyroY.toFixed(1)},GZ=${packet.gyroZ.toFixed(1)},ROLL=${packet.roll.toFixed(1)},PITCH=${packet.pitch.toFixed(1)},YAW=${packet.yaw.toFixed(1)},CO2=${Math.round(packet.co2)},ALT=${Math.round(packet.altitude)},RSSI=${Math.round(packet.rssi)}`;
            this.logTelemetry(line);
            
        }, 1000);
    }
    
    clearData() {
        this.state.packetCount = 0;
        this.state.telemetryLog = [];
        this.state.dataRate = 0;
        
        this.updateValue('packet-count', '0');
        this.updateValue('last-packet', 'Never');
        this.updateValue('data-rate', '0.0 Hz');
        
        this.updateTelemetryDisplay();
        console.log("Data cleared");
    }
    
    resetView() {
        if (window.Satellite3D) {
            window.Satellite3D.resetView();
        }
    }
    
    handleModelUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.endsWith('.glb') && !file.name.endsWith('.gltf')) {
            alert('Please upload a GLB or GLTF file');
            return;
        }
        
        console.log('Uploading model:', file.name);
        
        const loading = document.getElementById('model-loading');
        const loadingText = document.getElementById('loading-text');
        
        loading.style.display = 'block';
        loadingText.textContent = 'Uploading model...';
        
        // Create object URL for the file
        const url = URL.createObjectURL(file);
        
        // Load the model
        if (window.Satellite3D) {
            window.Satellite3D.loadModelFromURL(url, file.name);
        }
        
        // Clean up
        setTimeout(() => {
            loading.style.display = 'none';
            URL.revokeObjectURL(url);
        }, 1000);
    }
    
    loadDefaultModel() {
        console.log('Loading default cube model');
        
        if (window.Satellite3D) {
            window.Satellite3D.loadDefaultModel();
        }
    }
    
    saveModelScreenshot() {
        if (window.Satellite3D) {
            window.Satellite3D.takeScreenshot();
        }
    }
    
    startSignalSimulation() {
        // Initialize waveform
        this.updateSignalWaveform();
        
        // Update waveform periodically
        setInterval(() => {
            this.updateSignalWaveform();
        }, 100);
    }
    
    updateSignalWaveform() {
        const canvas = document.getElementById('signal-waveform');
        if (!canvas) return;
        
        // Set proper canvas dimensions
        const container = canvas.parentElement;
        if (container) {
            canvas.width = container.clientWidth;
            canvas.height = 80; // Fixed height for waveform
        }
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas with semi-transparent background
        ctx.fillStyle = 'rgba(10, 15, 25, 0.5)';
        ctx.fillRect(0, 0, width, height);
        
        // Draw subtle grid
        ctx.strokeStyle = 'rgba(42, 58, 90, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        
        // Horizontal lines
        for (let i = 0; i <= height; i += height / 4) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(width, i);
            ctx.stroke();
        }
        
        // Vertical lines
        for (let i = 0; i <= width; i += width / 10) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, height);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
        
        // Draw signal waveform
        ctx.strokeStyle = '#4fc3f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const time = Date.now() / 1000;
        const amplitude = height / 3;
        const centerY = height / 2;
        const frequency = 3;
        
        for (let x = 0; x < width; x++) {
            // Create more realistic signal with noise
            const noise = Math.sin(time * 0.5 + x * 0.01) * 0.5 + 
                         Math.cos(time * 0.3 + x * 0.03) * 0.3;
            const signal = Math.sin(x * 0.05 + time * frequency) * (0.8 + noise * 0.2);
            const y = centerY + amplitude * signal;
            
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        // Add fade effect at ends
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, 'rgba(10, 15, 25, 0.7)');
        gradient.addColorStop(0.1, 'transparent');
        gradient.addColorStop(0.9, 'transparent');
        gradient.addColorStop(1, 'rgba(10, 15, 25, 0.7)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }
    
    startTimers() {
        // Uptime counter
        let seconds = 0;
        setInterval(() => {
            seconds++;
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            this.updateValue('uptime', 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        }, 1000);
        
        // Last update time
        setInterval(() => {
            const now = new Date();
            const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            this.updateValue('last-update', time);
        }, 1000);
        
        // System status updates
        setInterval(() => {
            // Simulate small changes in system values
            const power = this.defaults.power + (Math.random() - 0.5) * 0.1;
            const cpu = this.defaults.cpuUsage + (Math.random() - 0.5) * 2;
            const heap = this.defaults.freeHeap + (Math.random() - 0.5) * 2;
            const light = this.defaults.lightLevel + (Math.random() - 0.5) * 2;
            
            this.updateValue('power-value', Math.max(power, 3.0).toFixed(2) + 'V');
            this.updateValue('cpu-value', Math.max(cpu, 0).toFixed(0) + '%');
            this.updateValue('heap-value', Math.max(heap, 170).toFixed(0) + ' KB');
            this.updateValue('light-value', Math.max(light, 0).toFixed(0) + '%');
        }, 3000);
    }
    
    exportTelemetry() {
        if (this.state.telemetryLog.length === 0) {
            alert('No data to export');
            return;
        }
        
        const csvContent = "Time,Data\n" + 
            this.state.telemetryLog.map(item => 
                `"${item.time}","${item.data.replace(/"/g, '""')}"`
            ).join("\n");
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `cubesat_telemetry_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log("Data exported");
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
    console.log("📊 CUBESAT Dashboard with Bluetooth/WiFi fully loaded!");
    
    // Initialize signal waveform
    window.addEventListener('resize', () => {
        if (window.dashboard) {
            window.dashboard.updateSignalWaveform();
        }
    });
});