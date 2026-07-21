import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

/**
 * Base class for HTTP-based AI providers.
 * Encapsulates the native Node.js http/https request logic to avoid external dependencies.
 */
export abstract class BaseHttpProvider {
  /**
   * Helper to perform HTTP POST requests.
   *
   * @param endpoint The URL endpoint.
   * @param headers HTTP headers.
   * @param body Stringified JSON body.
   * @returns A promise that resolves to the raw string response.
   */
  protected post(endpoint: string, headers: Record<string, string>, body: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint);
      const isHttps = url.protocol === 'https:';
      const requestModule = isHttps ? https : http;

      const options = {
        method: 'POST',
        timeout: 120000, // 2 minutes timeout for LLMs
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = requestModule.request(url, options, (res) => {
        res.setEncoding('utf8');
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out after 120 seconds.'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(body);
      req.end();
    });
  }
}
