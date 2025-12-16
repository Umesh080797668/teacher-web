import { sessionApi } from './api';

class WebSessionService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private sessionId: string | null = null;
  private onAuthCallback: ((data: any) => void) | null = null;

  /**
   * Generate QR code for login
   */
  async requestQR(userType: 'admin' | 'teacher' = 'teacher', companyId?: string): Promise<{
    sessionId: string;
    qrCode: string;
  }> {
    try {
      console.log('Requesting QR code generation...');
      const response = await sessionApi.generateQR(companyId);
      const data = response.data;
      
      console.log('QR code generated:', data.sessionId);
      
      this.sessionId = data.sessionId;
      
      // Start polling for authentication
      this.startPolling();
      
      return data;
    } catch (error) {
      console.error('Error requesting QR:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Start polling to check if QR has been scanned
   */
  private startPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    console.log('Starting polling for session:', this.sessionId);

    this.pollingInterval = setInterval(async () => {
      if (!this.sessionId) return;

      try {
        console.log('Polling session:', this.sessionId);
        const response = await sessionApi.verifySession(this.sessionId);
        const data = response.data;

        console.log('Polling response:', data);

        if (data.authenticated && data.success) {
          // Authentication successful
          console.log('Authentication successful!', data);
          if (this.onAuthCallback) {
            this.onAuthCallback(data);
          }
          this.stopPolling();
        } else if (data.authenticated === false) {
          console.log('Not authenticated yet, continuing to poll...');
        } else {
          console.warn('Unexpected response format:', data);
        }
      } catch (error: any) {
        // Log error but continue polling
        console.log('Polling error:', error?.response?.status, error?.message);
        
        // If session is definitely gone (404), we might want to regenerate
        if (error?.response?.status === 404) {
          console.warn('Session not found - might need to regenerate QR');
        }
      }
    }, 2000); // Poll every 2 seconds
  }

  /**
   * Stop polling
   */
  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Register callback for authentication event
   */
  onAuthenticated(callback: (data: any) => void) {
    this.onAuthCallback = callback;
  }

  /**
   * Clean up and disconnect
   */
  disconnect() {
    this.stopPolling();
    this.sessionId = null;
    this.onAuthCallback = null;
  }

  /**
   * Disconnect a session
   */
  async disconnectSession(sessionId: string) {
    try {
      await sessionApi.disconnectSession(sessionId);
    } catch (error) {
      console.error('Error disconnecting session:', error);
    }
  }

  // Placeholder methods for compatibility
  onQRExpired(callback: (data: any) => void) {
    // Not implemented in HTTP polling version
    console.log('QR expiration monitoring not available in polling mode');
  }

  onSessionDisconnected(callback: (data: any) => void) {
    // Not implemented in HTTP polling version
    console.log('Session disconnect monitoring not available in polling mode');
  }
}

export const webSessionService = new WebSessionService();
export default webSessionService;
