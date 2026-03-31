import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter?: nodemailer.Transporter;

  constructor() {
    const smtpHost = (process.env.SMTP_HOST || '').trim();
    const resolvedHost = smtpHost === 'localhost' ? '127.0.0.1' : smtpHost;

    if (!resolvedHost) {
      this.logger.warn(
        'SMTP_HOST is not configured. Password reset emails will be skipped in this environment.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: resolvedHost,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });
  }

  async sendPasswordReset(opts: {
    to: string;
    name: string;
    resetUrl: string;
    expiresInMinutes: number;
  }): Promise<void> {
    const fromAddress = process.env.SMTP_FROM || 'noreply@servctl.dev';

    if (!this.transporter) {
      this.logger.warn(
        `Skipping password reset email to ${opts.to}: SMTP transport is not configured. Reset URL: ${opts.resetUrl}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"SERVCTL" <${fromAddress}>`,
        to: opts.to,
        subject: 'Reset your SERVCTL password',
        html: `
          <!DOCTYPE html>
          <html>
          <body style="background:#0d0f14;color:#e8eaf0;
                       font-family:'Courier New',monospace;
                       padding:40px;max-width:480px;margin:0 auto;">
            <div style="margin-bottom:24px;">
              <span style="font-size:18px;font-weight:700;
                           letter-spacing:0.1em;">SERVCTL</span>
              <span style="font-size:10px;color:#555a72;
                           margin-left:8px;">server control panel</span>
            </div>
            <div style="background:#13161e;border:1px solid #2a2f3f;
                        border-radius:12px;padding:28px;">
              <p style="font-size:13px;color:#8b90a8;margin-bottom:16px;">
                Hi ${opts.name},
              </p>
              <p style="font-size:13px;color:#e8eaf0;margin-bottom:8px;">
                We received a request to reset your SERVCTL password.
              </p>
              <p style="font-size:11px;color:#8b90a8;margin-bottom:24px;">
                This link expires in ${opts.expiresInMinutes} minutes.
              </p>
              <a href="${opts.resetUrl}"
                 style="display:inline-block;background:#4f8ef7;
                        color:#fff;padding:12px 24px;border-radius:8px;
                        text-decoration:none;font-size:13px;
                        font-weight:500;">
                -> Reset Password
              </a>
              <p style="font-size:10px;color:#555a72;margin-top:24px;">
                If you didn't request this, ignore this email.
                Your password won't change.
              </p>
              <p style="font-size:10px;color:#2a2f3f;margin-top:8px;
                        word-break:break-all;">
                Or copy this link: ${opts.resetUrl}
              </p>
            </div>
            <p style="font-size:9px;color:#555a72;
                      margin-top:20px;text-align:center;">
              SERVCTL · MIT License · Self-hosted
            </p>
          </body>
          </html>
        `,
        text: `Reset your SERVCTL password:\n\n${opts.resetUrl}\n\nExpires in ${opts.expiresInMinutes} minutes.\n\nIf you didn't request this, ignore this email.`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${opts.to}: ${(error as Error)?.message}`,
        (error as Error)?.stack,
      );

      if (process.env.NODE_ENV === 'production') {
        throw error;
      }

      this.logger.warn(
        `[DEV] Email delivery failed. Reset URL logged for manual testing: ${opts.resetUrl}`,
      );
    }
  }
}
