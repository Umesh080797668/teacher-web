import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private readonly url: string;

  constructor() {
    this.url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3004';
  }

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(this.url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  requestQR(userType: 'admin' | 'teacher' = 'teacher'): Promise<{
    sessionId: string;
    qrCode: string;
  }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.socket.emit('request-qr', { userType });

      this.socket.once('qr-generated', (data) => {
        resolve(data);
      });

      this.socket.once('error', (error) => {
        reject(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('QR code generation timeout'));
      }, 10000);
    });
  }

  onAuthenticated(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('authenticated', callback);
    }
  }

  onQRExpired(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('qr-expired', callback);
    }
  }

  onSessionDisconnected(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('session-disconnected', callback);
    }
  }

  authenticateQR(sessionId: string, teacherId: string, deviceId: string) {
    if (this.socket?.connected) {
      this.socket.emit('authenticate-qr', { sessionId, teacherId, deviceId });
    }
  }

  disconnectSession(sessionId: string) {
    if (this.socket?.connected) {
      this.socket.emit('disconnect-session', { sessionId });
    }
  }
}

export const wsService = new WebSocketService();
export default wsService;
