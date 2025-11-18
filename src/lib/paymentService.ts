// @ts-nocheck
import { getPrimaryPaymentMethod, getEnabledPaymentMethods, getActivePaymentMethods, isPaymentMethodActive, PaymentConfig } from './supabase';

export interface PaymentMethodInfo {
  method: string;
  displayName: string;
  isEnabled: boolean;
  isPrimary: boolean;
  configuration: any;
}

export class PaymentService {
  private static instance: PaymentService;
  private paymentConfigs: PaymentConfig[] = [];
  private primaryMethod: PaymentConfig | null = null;

  private constructor() {}

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      // Use the new scheduling-aware function to get active payment methods
      this.paymentConfigs = await getActivePaymentMethods();
      this.primaryMethod = await getPrimaryPaymentMethod();
    } catch (error) {
      // Fallback to PhonePe if initialization fails
      this.primaryMethod = {
        id: 'fallback',
        payment_method: 'phonepe',
        is_enabled: true,
        is_primary: true,
        display_name: 'PhonePe',
        description: 'PhonePe UPI and wallet payments',
        configuration: {},
        schedule_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  }

  public async getCurrentlyActiveMethod(): Promise<PaymentMethodInfo | null> {
    try {
      const activeMethods = await getActivePaymentMethods();
      const primaryActive = activeMethods.find(config => config.is_primary);
      
      if (primaryActive) {
        return {
          method: primaryActive.payment_method,
          displayName: primaryActive.display_name,
          isEnabled: primaryActive.is_enabled,
          isPrimary: primaryActive.is_primary,
          configuration: primaryActive.configuration
        };
      }
      
      // Fallback to first active method
      if (activeMethods.length > 0) {
        const firstActive = activeMethods[0];
        return {
          method: firstActive.payment_method,
          displayName: firstActive.display_name,
          isEnabled: firstActive.is_enabled,
          isPrimary: firstActive.is_primary,
          configuration: firstActive.configuration
        };
      }
      
      return null;
    } catch (error) {
      return this.getPrimaryPaymentMethod();
    }
  }
  public getPrimaryPaymentMethod(): PaymentMethodInfo | null {
    if (!this.primaryMethod) {
      return null;
    }

    return {
      method: this.primaryMethod.payment_method,
      displayName: this.primaryMethod.display_name,
      isEnabled: this.primaryMethod.is_enabled,
      isPrimary: this.primaryMethod.is_primary,
      configuration: this.primaryMethod.configuration
    };
  }

  public getEnabledPaymentMethods(): PaymentMethodInfo[] {
    return this.paymentConfigs.map(config => ({
      method: config.payment_method,
      displayName: config.display_name,
      isEnabled: config.is_enabled,
      isPrimary: config.is_primary,
      configuration: config.configuration
    }));
  }

  public isPaymentMethodEnabled(method: string): boolean {
    return this.paymentConfigs.some(config => 
      config.payment_method === method && config.is_enabled
    );
  }

  public getPaymentMethodConfig(method: string): PaymentConfig | null {
    return this.paymentConfigs.find(config => config.payment_method === method) || null;
  }

  public async refreshConfig(): Promise<void> {
    await this.initialize();
  }

  public getAvailablePaymentMethods(): string[] {
    return this.paymentConfigs
      .filter(config => config.is_enabled)
      .map(config => config.payment_method);
  }

  public getPrimaryMethodName(): string {
    return this.primaryMethod?.payment_method || 'phonepe';
  }

  public validatePaymentMethod(method: string): boolean {
    return this.paymentConfigs.some(config => 
      config.payment_method === method && config.is_enabled
    );
  }

  public async isPaymentMethodCurrentlyActive(method: string): Promise<boolean> {
    try {
      return await isPaymentMethodActive(method);
    } catch (error) {
      // Fallback to basic enabled check
      return this.validatePaymentMethod(method);
    }
  }

  public getPaymentMethodDisplayName(method: string): string {
    const config = this.paymentConfigs.find(c => c.payment_method === method);
    return config?.display_name || method;
  }
}

// Export singleton instance
export const paymentService = PaymentService.getInstance();
