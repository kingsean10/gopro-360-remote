import { GOPRO_CONFIG, getGoProUrl } from '../config/GoProConfig';
import { 
  GoProCameraInfo, 
  GoProCameraStatus, 
  GoProMediaFile, 
  GoProMediaList,
  GoProError,
  AsyncResult 
} from '../types/GoProTypes';

// Main GoPro Service for React Native App
export class GoProService {
  private static instance: GoProService;
  private baseUrl: string;
  private timeout: number;

  private constructor() {
    this.baseUrl = GOPRO_CONFIG.BASE_URL;
    this.timeout = GOPRO_CONFIG.API_TIMEOUT;
  }

  public static getInstance(): GoProService {
    if (!GoProService.instance) {
      GoProService.instance = new GoProService();
    }
    return GoProService.instance;
  }

  // MARK: - Private Helper Methods

  private createError(type: string, message: string, details?: string): GoProError {
    return {
      type: type as any,
      message,
      details,
      timestamp: Date.now(),
    };
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<{ success: true; data: T } | { success: false; error: GoProError }> {
    try {
      const url = getGoProUrl(endpoint);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: this.createError(
            'invalid_response',
            `HTTP ${response.status}: ${response.statusText}`,
            `Failed to fetch ${endpoint}`
          ),
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: this.createError(
            'api_timeout',
            'Request timed out',
            `Timeout after ${this.timeout}ms`
          ),
        };
      }

      return {
        success: false,
        error: this.createError(
          'network_error',
          'Network request failed',
          error.message
        ),
      };
    }
  }

  // MARK: - GoPro API Methods

  /**
   * Get camera information
   */
  async getCameraInfo(): AsyncResult<GoProCameraInfo> {
    return this.makeRequest<GoProCameraInfo>(GOPRO_CONFIG.ENDPOINTS.INFO);
  }

  /**
   * Get camera status
   */
  async getCameraStatus(): AsyncResult<GoProCameraStatus> {
    return this.makeRequest<GoProCameraStatus>(GOPRO_CONFIG.ENDPOINTS.STATUS);
  }

  /**
   * Start recording
   */
  async startRecording(): AsyncResult<void> {
    const result = await this.makeRequest(GOPRO_CONFIG.ENDPOINTS.SHUTTER, {
      method: 'POST',
      body: GOPRO_CONFIG.SHUTTER_COMMANDS.START,
    });

    if (result.success) {
      return { success: true, data: undefined };
    } else {
      return result;
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(): AsyncResult<void> {
    const result = await this.makeRequest(GOPRO_CONFIG.ENDPOINTS.SHUTTER, {
      method: 'POST',
      body: GOPRO_CONFIG.SHUTTER_COMMANDS.STOP,
    });

    if (result.success) {
      return { success: true, data: undefined };
    } else {
      return result;
    }
  }

  /**
   * Set camera mode
   */
  async setCameraMode(mode: string): AsyncResult<void> {
    const result = await this.makeRequest(GOPRO_CONFIG.ENDPOINTS.MODE, {
      method: 'POST',
      body: mode,
    });

    if (result.success) {
      return { success: true, data: undefined };
    } else {
      return result;
    }
  }

  /**
   * Get media list
   */
  async getMediaList(): AsyncResult<GoProMediaFile[]> {
    const result = await this.makeRequest<GoProMediaList>(GOPRO_CONFIG.ENDPOINTS.MEDIA_LIST);
    
    if (result.success) {
      return { success: true, data: result.data.media };
    } else {
      return result;
    }
  }

  /**
   * Get media files with filtering
   */
  async getMediaFiles(filter?: {
    type?: 'video' | 'photo' | 'all';
    format?: string;
  }): AsyncResult<GoProMediaFile[]> {
    const result = await this.getMediaList();
    
    if (!result.success) {
      return result;
    }

    let filteredFiles = result.data;

    // Filter by type
    if (filter?.type && filter.type !== 'all') {
      filteredFiles = filteredFiles.filter(file => {
        if (filter.type === 'video') {
          return file.type.toLowerCase() === 'video';
        } else if (filter.type === 'photo') {
          return file.type.toLowerCase() === 'photo';
        }
        return true;
      });
    }

    // Filter by format
    if (filter?.format) {
      filteredFiles = filteredFiles.filter(file => 
        file.name.toLowerCase().includes(filter.format!.toLowerCase())
      );
    }

    return { success: true, data: filteredFiles };
  }

  /**
   * Get 360° media files specifically
   */
  async get360MediaFiles(): AsyncResult<GoProMediaFile[]> {
    return this.getMediaFiles({ format: '.360' });
  }

  /**
   * Get video files
   */
  async getVideoFiles(): AsyncResult<GoProMediaFile[]> {
    return this.getMediaFiles({ type: 'video' });
  }

  /**
   * Get photo files
   */
  async getPhotoFiles(): AsyncResult<GoProMediaFile[]> {
    return this.getMediaFiles({ type: 'photo' });
  }

  // MARK: - Utility Methods

  /**
   * Check if camera is reachable
   */
  async pingCamera(): AsyncResult<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(getGoProUrl(GOPRO_CONFIG.ENDPOINTS.INFO), {
        signal: controller.signal,
        method: 'HEAD',
      });

      clearTimeout(timeoutId);

      return { 
        success: true, 
        data: response.ok 
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.createError(
          'network_error',
          'Cannot reach GoPro camera',
          error.message
        ),
      };
    }
  }

  /**
   * Get camera battery level
   */
  async getBatteryLevel(): AsyncResult<number> {
    const result = await this.getCameraStatus();
    
    if (!result.success) {
      return result;
    }

    const batteryLevel = result.data.battery_level;
    if (batteryLevel === undefined) {
      return {
        success: false,
        error: this.createError(
          'invalid_response',
          'Battery level not available',
          'Camera status response missing battery information'
        ),
      };
    }

    return { success: true, data: batteryLevel };
  }

  /**
   * Check if camera is recording
   */
  async isRecording(): AsyncResult<boolean> {
    const result = await this.getCameraStatus();
    
    if (!result.success) {
      return result;
    }

    return { 
      success: true, 
      data: result.data.recording || false 
    };
  }

  /**
   * Get current camera mode
   */
  async getCurrentMode(): AsyncResult<string> {
    const result = await this.getCameraStatus();
    
    if (!result.success) {
      return result;
    }

    const mode = result.data.mode;
    if (!mode) {
      return {
        success: false,
        error: this.createError(
          'invalid_response',
          'Camera mode not available',
          'Camera status response missing mode information'
        ),
      };
    }

    return { success: true, data: mode };
  }

  // MARK: - Configuration Methods

  /**
   * Update base URL (useful for custom GoPro IP addresses)
   */
  updateBaseUrl(newUrl: string): void {
    this.baseUrl = newUrl;
  }

  /**
   * Update timeout value
   */
  updateTimeout(newTimeout: number): void {
    this.timeout = newTimeout;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      endpoints: GOPRO_CONFIG.ENDPOINTS,
      cameraModes: GOPRO_CONFIG.CAMERA_MODES,
      shutterCommands: GOPRO_CONFIG.SHUTTER_COMMANDS,
    };
  }
}

// Export singleton instance
export const goProService = GoProService.getInstance();
