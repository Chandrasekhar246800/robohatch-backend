import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { users_role as Role } from '@prisma/client';

/**
 * AuditLogService - Phase 13
 * 
 * Centralized security event logging for:
 * - Authentication events
 * - Payment transactions
 * - Webhook processing
 * - Admin actions
 * - Sensitive data access
 * 
 * CRITICAL: All logs are append-only (no updates/deletes)
 * 
 * Use Cases:
 * - Post-incident forensics
 * - Compliance audits (PCI-DSS, GDPR)
 * - Fraud detection
 * - User behavior analysis
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log a security-relevant event
   * 
   * Fire-and-forget pattern: Failures are logged but not thrown
   */
  async log(params: {
    actorId?: string;
    role?: Role;
    action: string;
    entity: string;
    entityId?: string;
    ip?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.prisma.audit_logs.create({
        data: {
          actorId: params.actorId,
          role: params.role,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          ip: params.ip,
          metadata: params.metadata,
        },
      });
    } catch (error) {
      // CRITICAL: Don't fail the main operation if audit logging fails
      this.logger.error('Failed to create audit log', {
        error: error instanceof Error ? error.message : String(error),
        params,
      });
    }
  }

  // ==================== AUTHENTICATION EVENTS ====================

  async logLoginSuccess(userId: string, email: string, ip: string): Promise<void> {
    await this.log({
      actorId: userId,
      action: 'LOGIN_SUCCESS',
      entity: 'User',
      entityId: userId,
      ip,
      metadata: { email },
    });
  }

  async logLoginFailure(email: string, ip: string, reason: string): Promise<void> {
    await this.log({
      action: 'LOGIN_FAILURE',
      entity: 'User',
      ip,
      metadata: { email, reason },
    });
  }

  async logLogout(userId: string, ip: string): Promise<void> {
    await this.log({
      actorId: userId,
      action: 'LOGOUT',
      entity: 'User',
      entityId: userId,
      ip,
    });
  }

  async logRefreshToken(userId: string, ip: string): Promise<void> {
    await this.log({
      actorId: userId,
      action: 'REFRESH_TOKEN',
      entity: 'User',
      entityId: userId,
      ip,
    });
  }

  // ==================== PAYMENT EVENTS ====================

  async logPaymentInitiated(
    userId: string,
    orderId: string,
    amount: number,
    ip: string,
  ): Promise<void> {
    await this.log({
      actorId: userId,
      action: 'PAYMENT_INITIATED',
      entity: 'Payment',
      entityId: orderId,
      ip,
      metadata: { amount },
    });
  }

  async logPaymentCaptured(
    userId: string,
    orderId: string,
    razorpayPaymentId: string,
    ip: string,
  ): Promise<void> {
    await this.log({
      actorId: userId,
      action: 'PAYMENT_CAPTURED',
      entity: 'Payment',
      entityId: orderId,
      ip,
      metadata: { razorpayPaymentId },
    });
  }

  async logPaymentFailed(
    userId: string,
    orderId: string,
    reason: string,
    ip: string,
  ): Promise<void> {
    await this.log({
      actorId: userId,
      action: 'PAYMENT_FAILED',
      entity: 'Payment',
      entityId: orderId,
      ip,
      metadata: { reason },
    });
  }

  // ==================== WEBHOOK EVENTS ====================

  async logWebhookReceived(
    event: string,
    orderId: string,
    ip: string,
    success: boolean,
  ): Promise<void> {
    await this.log({
      action: success ? 'WEBHOOK_SUCCESS' : 'WEBHOOK_FAILURE',
      entity: 'Webhook',
      entityId: orderId,
      ip,
      metadata: { event },
    });
  }

  async logWebhookSignatureFailure(ip: string, event: string): Promise<void> {
    await this.log({
      action: 'WEBHOOK_SIGNATURE_INVALID',
      entity: 'Webhook',
      ip,
      metadata: { event },
    });
  }

  // ==================== SHIPMENT EVENTS ====================

  async logShipmentCreated(
    adminId: string,
    orderId: string,
    trackingNumber: string,
    ip: string,
  ): Promise<void> {
    await this.log({
      actorId: adminId,
      role: Role.ADMIN,
      action: 'SHIPMENT_CREATED',
      entity: 'Shipment',
      entityId: orderId,
      ip,
      metadata: { trackingNumber },
    });
  }

  async logShipmentStatusChanged(
    adminId: string,
    shipmentId: string,
    oldStatus: string,
    newStatus: string,
    ip: string,
  ): Promise<void> {
    await this.log({
      actorId: adminId,
      role: Role.ADMIN,
      action: 'SHIPMENT_STATUS_CHANGED',
      entity: 'Shipment',
      entityId: shipmentId,
      ip,
      metadata: { oldStatus, newStatus },
    });
  }

  // ==================== ADMIN ACTIONS ====================

  async logAdminAction(
    adminId: string,
    action: string,
    entity: string,
    entityId: string,
    ip: string,
    metadata?: any,
  ): Promise<void> {
    await this.log({
      actorId: adminId,
      role: Role.ADMIN,
      action,
      entity,
      entityId,
      ip,
      metadata,
    });
  }

  // ==================== FILE ACCESS EVENTS ====================

  async logFileDownload(
    userId: string,
    orderId: string,
    fileId: string,
    ip: string,
  ): Promise<void> {
    await this.log({
      actorId: userId,
      action: 'FILE_DOWNLOAD',
      entity: 'File',
      entityId: fileId,
      ip,
      metadata: { orderId },
    });
  }

  // ==================== QUERY AUDIT LOGS ====================

  /**
   * Get audit logs for a specific user
   * (Admin only, requires authorization check in controller)
   */
  async getUserLogs(userId: string, limit = 100) {
    return this.prisma.audit_logs.findMany({
      where: { actorId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get audit logs for a specific entity
   * (Admin only, requires authorization check in controller)
   */
  async getEntityLogs(entity: string, entityId: string, limit = 100) {
    return this.prisma.audit_logs.findMany({
      where: {
        entity,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get failed login attempts from specific IP
   * (Security analysis)
   */
  async getFailedLoginsByIp(ip: string, sinceMinutes = 60) {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);

    return this.prisma.audit_logs.findMany({
      where: {
        action: 'LOGIN_FAILURE',
        ip,
        createdAt: {
          gte: since,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

