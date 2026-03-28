import { Injectable } from '@nestjs/common';

export interface NetworkWarning {
  level: 'info' | 'warning' | 'error';
  code: string;
  title: string;
  message: string;
  suggestion: string;
  showInstallGuide: boolean;
}

@Injectable()
export class NetworkService {
  isPrivateHost(host: string): boolean {
    const value = (host || '').trim();
    const privateRanges = [
      /^10\.\d+\.\d+\.\d+$/,
      /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
      /^192\.168\.\d+\.\d+$/,
      /^127\.\d+\.\d+\.\d+$/,
      /^localhost$/i,
      /^::1$/,
    ];

    return privateRanges.some((range) => range.test(value));
  }

  getNetworkWarning(host: string, deployMode: string): NetworkWarning | null {
    const isPrivate = this.isPrivateHost(host);

    if (isPrivate && deployMode === 'cloud') {
      return {
        level: 'error',
        code: 'PRIVATE_HOST_CLOUD_MODE',
        title: 'This server is on a private network',
        message:
          `${host} is a private IP address. ` +
          'The SERVCTL cloud cannot reach private networks - connections will always fail.',
        suggestion:
          'To manage servers on private networks, install SERVCTL locally on your machine or a server inside the same network.',
        showInstallGuide: true,
      };
    }

    if (isPrivate && deployMode === 'local') {
      return {
        level: 'info',
        code: 'PRIVATE_HOST_LOCAL_MODE',
        title: 'Private network server',
        message: `${host} is a private IP. SERVCTL will connect directly from this machine.`,
        suggestion:
          'Make sure this machine can reach the target server (same LAN, VPN connected, or same company network).',
        showInstallGuide: false,
      };
    }

    return null;
  }
}
