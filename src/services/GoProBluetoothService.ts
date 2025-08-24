import { BleManager, Device, Service, Characteristic, State } from 'react-native-ble-plx';
import { GOPRO_CONFIG, GOPRO_DEVICE_PATTERNS } from '../config/GoProConfig';
import { 
  GoProBluetoothDevice, 
  GoProError, 
  AsyncResult,
  ConnectionStatus 
} from '../types/GoProTypes';

// GoPro Bluetooth Service for React Native App
// Uses react-native-ble-plx for native Bluetooth LE support
export class GoProBluetoothService {
  private static instance: GoProBluetoothService;
  private bleManager: BleManager;
  private isScanning: boolean = false;
  private discoveredDevices: Map<string, GoProBluetoothDevice> = new Map();
  private connectedDevice: GoProBluetoothDevice | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';

  private constructor() {
    this.bleManager = new BleManager();
    this.setupBleManager();
  }

  public static getInstance(): GoProBluetoothService {
    if (!GoProBluetoothService.instance) {
      GoProBluetoothService.instance = new GoProBluetoothService();
    }
    return GoProBluetoothService.instance;
  }

  // MARK: - Private Methods

  private setupBleManager(): void {
    // Monitor Bluetooth state changes
    this.bleManager.onStateChange((state: State) => {
      console.log('Bluetooth state changed:', state);
      
      if (state === State.PoweredOff) {
        this.connectionStatus = 'disconnected';
        this.connectedDevice = null;
      }
    }, true);
  }

  private createError(type: string, message: string, details?: string): GoProError {
    return {
      type: type as any,
      message,
      details,
      timestamp: Date.now(),
    };
  }

  private isGoProDevice(device: Device): boolean {
    const name = device.name?.toLowerCase() || '';
    const localName = device.localName?.toLowerCase() || '';
    
    return GOPRO_DEVICE_PATTERNS.some(pattern => 
      name.includes(pattern) || localName.includes(pattern)
    );
  }

  private async discoverServices(device: Device): Promise<Service[]> {
    try {
      const services = await device.discoverAllServicesAndCharacteristics();
      return services.services;
    } catch (error: any) {
      console.error('Failed to discover services:', error);
      return [];
    }
  }

  private async discoverCharacteristics(service: Service): Promise<Characteristic[]> {
    try {
      const characteristics = await service.characteristics();
      return characteristics;
    } catch (error: any) {
      console.error('Failed to discover characteristics:', error);
      return [];
    }
  }

  // MARK: - Public Methods

  /**
   * Check if Bluetooth is supported and enabled
   */
  async checkBluetoothSupport(): AsyncResult<boolean> {
    try {
      const state = await this.bleManager.state();
      
      if (state === State.Unsupported) {
        return {
          success: false,
          error: this.createError(
            'bluetooth_not_supported',
            'Bluetooth is not supported on this device'
          ),
        };
      }

      if (state === State.PoweredOff) {
        return {
          success: false,
          error: this.createError(
            'bluetooth_permission_denied',
            'Bluetooth is turned off. Please enable Bluetooth in Settings.'
          ),
        };
      }

      if (state === State.Unauthorized) {
        return {
          success: false,
          error: this.createError(
            'bluetooth_permission_denied',
            'Bluetooth permission denied. Please allow Bluetooth access in Settings.'
          ),
        };
      }

      return { success: true, data: state === State.PoweredOn };
    } catch (error: any) {
      return {
        success: false,
        error: this.createError(
          'unknown',
          'Failed to check Bluetooth support',
          error.message
        ),
      };
    }
  }

  /**
   * Start scanning for GoPro devices
   */
  async startScanning(): AsyncResult<void> {
    try {
      // Check Bluetooth support first
      const supportCheck = await this.checkBluetoothSupport();
      if (!supportCheck.success) {
        return supportCheck;
      }

      if (this.isScanning) {
        return { success: true, data: undefined };
      }

      this.isScanning = true;
      this.discoveredDevices.clear();

      // Start scanning with GoPro service UUIDs
      const goproServiceUUIDs = Object.values(GOPRO_CONFIG.BLE_SERVICES);
      
      this.bleManager.startDeviceScan(goproServiceUUIDs, null, (error, device) => {
        if (error) {
          console.error('Scan error:', error);
          return;
        }

        if (device && this.isGoProDevice(device)) {
          const goproDevice: GoProBluetoothDevice = {
            device,
            name: device.name || device.localName || 'Unknown GoPro',
            rssi: device.rssi || 0,
            isGoPro: true,
          };

          this.discoveredDevices.set(device.id, goproDevice);
        }
      });

      // Stop scanning after 10 seconds
      setTimeout(() => {
        this.stopScanning();
      }, 10000);

      return { success: true, data: undefined };
    } catch (error: any) {
      this.isScanning = false;
      return {
        success: false,
        error: this.createError(
          'unknown',
          'Failed to start scanning',
          error.message
        ),
      };
    }
  }

  /**
   * Stop scanning for devices
   */
  stopScanning(): void {
    if (this.isScanning) {
      this.bleManager.stopDeviceScan();
      this.isScanning = false;
    }
  }

  /**
   * Get discovered devices
   */
  getDiscoveredDevices(): GoProBluetoothDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  /**
   * Connect to a GoPro device
   */
  async connectToDevice(deviceId: string): AsyncResult<GoProBluetoothDevice> {
    try {
      const goproDevice = this.discoveredDevices.get(deviceId);
      if (!goproDevice) {
        return {
          success: false,
          error: this.createError(
            'device_not_found',
            'Device not found in discovered devices'
          ),
        };
      }

      this.connectionStatus = 'bluetooth_pairing';

      // Connect to the device
      const connectedDevice = await goproDevice.device.connect();
      
      // Discover services
      const services = await this.discoverServices(connectedDevice);
      
      // Discover characteristics for each service
      const allCharacteristics: Characteristic[] = [];
      for (const service of services) {
        const characteristics = await this.discoverCharacteristics(service);
        allCharacteristics.push(...characteristics);
      }

      // Update device with discovered services and characteristics
      const updatedDevice: GoProBluetoothDevice = {
        ...goproDevice,
        device: connectedDevice,
        services,
        characteristics: allCharacteristics,
      };

      this.connectedDevice = updatedDevice;
      this.connectionStatus = 'bluetooth_connected';

      return { success: true, data: updatedDevice };
    } catch (error: any) {
      this.connectionStatus = 'disconnected';
      return {
        success: false,
        error: this.createError(
          'connection_failed',
          'Failed to connect to GoPro device',
          error.message
        ),
      };
    }
  }

  /**
   * Disconnect from the connected device
   */
  async disconnect(): AsyncResult<void> {
    try {
      if (this.connectedDevice) {
        await this.connectedDevice.device.cancelConnection();
        this.connectedDevice = null;
        this.connectionStatus = 'disconnected';
      }

      return { success: true, data: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: this.createError(
          'unknown',
          'Failed to disconnect',
          error.message
        ),
      };
    }
  }

  /**
   * Enable WiFi on the connected GoPro
   */
  async enableWiFi(): AsyncResult<void> {
    try {
      if (!this.connectedDevice) {
        return {
          success: false,
          error: this.createError(
            'connection_failed',
            'No GoPro device connected'
          ),
        };
      }

      // Find WiFi service and characteristic
      const wifiService = this.connectedDevice.services?.find(service => 
        service.uuid.toLowerCase().includes(GOPRO_CONFIG.BLE_SERVICES.WIFI_SERVICE)
      );

      if (!wifiService) {
        return {
          success: false,
          error: this.createError(
            'connection_failed',
            'WiFi service not found on GoPro device'
          ),
        };
      }

      const wifiCharacteristic = this.connectedDevice.characteristics?.find(char => 
        char.uuid.toLowerCase().includes(GOPRO_CONFIG.BLE_CHARACTERISTICS.WIFI_SSID)
      );

      if (!wifiCharacteristic) {
        return {
          success: false,
          error: this.createError(
            'connection_failed',
            'WiFi characteristic not found on GoPro device'
          ),
        };
      }

      // Send WiFi enable command
      const wifiEnableCommand = Buffer.from([0x01]); // Enable WiFi
      await wifiCharacteristic.writeWithResponse(wifiEnableCommand);

      return { success: true, data: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: this.createError(
          'connection_failed',
          'Failed to enable WiFi on GoPro',
          error.message
        ),
      };
    }
  }

  /**
   * Get WiFi credentials from GoPro
   */
  async getWiFiCredentials(): AsyncResult<{ ssid: string; password: string }> {
    try {
      if (!this.connectedDevice) {
        return {
          success: false,
          error: this.createError(
            'connection_failed',
            'No GoPro device connected'
          ),
        };
      }

      // Find WiFi SSID and password characteristics
      const ssidCharacteristic = this.connectedDevice.characteristics?.find(char => 
        char.uuid.toLowerCase().includes(GOPRO_CONFIG.BLE_CHARACTERISTICS.WIFI_SSID)
      );

      const passwordCharacteristic = this.connectedDevice.characteristics?.find(char => 
        char.uuid.toLowerCase().includes(GOPRO_CONFIG.BLE_CHARACTERISTICS.WIFI_PASSWORD)
      );

      if (!ssidCharacteristic || !passwordCharacteristic) {
        return {
          success: false,
          error: this.createError(
            'connection_failed',
            'WiFi credentials characteristics not found'
          ),
        };
      }

      // Read SSID and password
      const ssidValue = await ssidCharacteristic.read();
      const passwordValue = await passwordCharacteristic.read();

      const ssid = ssidValue.value ? Buffer.from(ssidValue.value, 'base64').toString() : '';
      const password = passwordValue.value ? Buffer.from(passwordValue.value, 'base64').toString() : '';

      return { success: true, data: { ssid, password } };
    } catch (error: any) {
      return {
        success: false,
        error: this.createError(
          'connection_failed',
          'Failed to get WiFi credentials',
          error.message
        ),
      };
    }
  }

  // MARK: - Getters

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Get connected device
   */
  getConnectedDevice(): GoProBluetoothDevice | null {
    return this.connectedDevice;
  }

  /**
   * Check if currently scanning
   */
  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }

  /**
   * Check if device is connected
   */
  isConnected(): boolean {
    return this.connectionStatus === 'bluetooth_connected' && this.connectedDevice !== null;
  }

  // MARK: - Cleanup

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopScanning();
    if (this.connectedDevice) {
      this.disconnect();
    }
    this.bleManager.destroy();
  }
}

// Export singleton instance
export const goProBluetoothService = GoProBluetoothService.getInstance();
