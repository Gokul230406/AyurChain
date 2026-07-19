export interface NotificationConfig {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface SyncNotificationData {
  recordCount: number;
  herbNames: string[];
  syncTime: string;
  status: 'success' | 'error' | 'partial';
}

export class NotificationService {
  private permission: NotificationPermission = 'default';
  private isSupported: boolean;
  private notificationSettings: {
    syncEnabled: boolean;
    soundEnabled: boolean;
    showRecordDetails: boolean;
  };

  constructor() {
    this.isSupported = 'Notification' in window;
    this.permission = this.isSupported ? Notification.permission : 'denied';
    
    // Load settings from localStorage
    this.notificationSettings = this.loadSettings();
    
    // Initialize service worker for background notifications if supported
    this.initializeServiceWorker();
  }

  private loadSettings() {
    const stored = localStorage.getItem('herbchain-notification-settings');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.warn('Failed to load notification settings:', error);
      }
    }
    
    // Default settings
    return {
      syncEnabled: true,
      soundEnabled: true,
      showRecordDetails: true
    };
  }

  private saveSettings() {
    localStorage.setItem('herbchain-notification-settings', JSON.stringify(this.notificationSettings));
  }

  private async initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        // Register a simple service worker for background notifications
        const registration = await navigator.serviceWorker.register('/sw-notifications.js', {
          scope: '/'
        });
        console.log('Notification service worker registered:', registration);
      } catch (error) {
        console.warn('Service worker registration failed:', error);
      }
    }
  }

  isNotificationSupported(): boolean {
    return this.isSupported;
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      return 'denied';
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      
      if (permission === 'granted') {
        // Send a welcome notification
        this.showNotification({
          title: '🔔 HerbChain Notifications Enabled',
          body: 'You will now receive notifications when your herb records are synced to the blockchain.',
          icon: '/favicon.ico',
          tag: 'welcome'
        });
      }
      
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  private async showNotification(config: NotificationConfig): Promise<void> {
    if (!this.isSupported || this.permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(config.title, {
        body: config.body,
        icon: config.icon || '/favicon.ico',
        badge: config.badge || '/favicon.ico',
        tag: config.tag,
        requireInteraction: config.requireInteraction || false,
        silent: config.silent || !this.notificationSettings.soundEnabled,
        timestamp: Date.now(),
        data: {
          url: window.location.origin + '/dashboard'
        }
      });

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        
        // Navigate to dashboard if not already there
        if (window.location.pathname !== '/dashboard') {
          window.location.href = '/dashboard';
        }
        
        notification.close();
      };

      // Auto-close after 10 seconds unless requireInteraction is true
      if (!config.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 10000);
      }

    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  async notifySyncSuccess(data: SyncNotificationData): Promise<void> {
    if (!this.notificationSettings.syncEnabled) {
      return;
    }

    const { recordCount, herbNames, syncTime } = data;
    
    let title: string;
    let body: string;

    if (recordCount === 1) {
      title = '✅ Herb Record Synced';
      body = this.notificationSettings.showRecordDetails && herbNames.length > 0
        ? `"${herbNames[0]}" has been synced to blockchain`
        : 'Your herb record has been successfully synced to blockchain';
    } else {
      title = `✅ ${recordCount} Records Synced`;
      body = this.notificationSettings.showRecordDetails && herbNames.length > 0
        ? `${herbNames.slice(0, 3).join(', ')}${herbNames.length > 3 ? ` and ${herbNames.length - 3} more` : ''} synced to blockchain`
        : `${recordCount} herb records have been successfully synced to blockchain`;
    }

    await this.showNotification({
      title,
      body,
      icon: '/favicon.ico',
      tag: 'sync-success',
      requireInteraction: false
    });
  }

  async notifySyncError(data: { recordCount: number; error: string }): Promise<void> {
    if (!this.notificationSettings.syncEnabled) {
      return;
    }

    await this.showNotification({
      title: '❌ Sync Failed',
      body: `Failed to sync ${data.recordCount} record${data.recordCount !== 1 ? 's' : ''}. Click to retry.`,
      icon: '/favicon.ico',
      tag: 'sync-error',
      requireInteraction: true
    });
  }

  async notifyOfflineMode(): Promise<void> {
    if (!this.notificationSettings.syncEnabled) {
      return;
    }

    await this.showNotification({
      title: '📱 Offline Mode Active',
      body: 'Your herb records will be saved locally and synced when connection is restored.',
      icon: '/favicon.ico',
      tag: 'offline-mode',
      requireInteraction: false
    });
  }

  async notifyBackOnline(pendingCount: number): Promise<void> {
    if (!this.notificationSettings.syncEnabled || pendingCount === 0) {
      return;
    }

    await this.showNotification({
      title: '🌐 Back Online',
      body: `Connection restored! ${pendingCount} record${pendingCount !== 1 ? 's' : ''} will be synced automatically.`,
      icon: '/favicon.ico',
      tag: 'back-online',
      requireInteraction: false
    });
  }

  async notifyNewRecordSaved(herbName: string): Promise<void> {
    if (!this.notificationSettings.syncEnabled) {
      return;
    }

    await this.showNotification({
      title: '💾 Record Saved',
      body: `"${herbName}" record saved${navigator.onLine ? ' and will be synced automatically' : ' offline - will sync when online'}`,
      icon: '/favicon.ico',
      tag: 'record-saved',
      requireInteraction: false
    });
  }

  // Settings management
  getSyncNotificationsEnabled(): boolean {
    return this.notificationSettings.syncEnabled;
  }

  setSyncNotificationsEnabled(enabled: boolean): void {
    this.notificationSettings.syncEnabled = enabled;
    this.saveSettings();
  }

  getSoundEnabled(): boolean {
    return this.notificationSettings.soundEnabled;
  }

  setSoundEnabled(enabled: boolean): void {
    this.notificationSettings.soundEnabled = enabled;
    this.saveSettings();
  }

  getShowRecordDetailsEnabled(): boolean {
    return this.notificationSettings.showRecordDetails;
  }

  setShowRecordDetailsEnabled(enabled: boolean): void {
    this.notificationSettings.showRecordDetails = enabled;
    this.saveSettings();
  }

  // Test notification
  async sendTestNotification(): Promise<void> {
    await this.showNotification({
      title: '🧪 Test Notification',
      body: 'This is a test notification from HerbChain. Notifications are working correctly!',
      icon: '/favicon.ico',
      tag: 'test',
      requireInteraction: false
    });
  }

  // Clear all notifications
  clearAllNotifications(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.getNotifications) {
          registration.getNotifications().then(notifications => {
            notifications.forEach(notification => notification.close());
          });
        }
      });
    }
  }

  // Schedule sync reminder (for offline mode)
  scheduleSyncReminder(minutes: number = 30): void {
    setTimeout(async () => {
      const unsyncedCount = await this.getUnsyncedCount();
      if (unsyncedCount > 0 && !navigator.onLine) {
        await this.showNotification({
          title: '⏰ Sync Reminder',
          body: `You have ${unsyncedCount} unsynced record${unsyncedCount !== 1 ? 's' : ''}. Connect to internet to sync to blockchain.`,
          icon: '/favicon.ico',
          tag: 'sync-reminder',
          requireInteraction: false
        });
      }
    }, minutes * 60 * 1000);
  }

  private async getUnsyncedCount(): Promise<number> {
    try {
      // This would integrate with your localforage service
      const { localForageService } = await import('./localforage');
      const unsyncedRecords = await localForageService.getUnsyncedRecords();
      return unsyncedRecords.length;
    } catch (error) {
      return 0;
    }
  }
}

// Create singleton instance
export const notificationService = new NotificationService();

// Auto-request permission on first load if notifications are supported
if (typeof window !== 'undefined') {
  // Wait a bit after page load to request permission
  setTimeout(() => {
    if (notificationService.getPermission() === 'default' && notificationService.isNotificationSupported()) {
      // Only request if user hasn't explicitly denied before
      const hasRequestedBefore = localStorage.getItem('herbchain-notification-requested');
      if (!hasRequestedBefore) {
        localStorage.setItem('herbchain-notification-requested', 'true');
        notificationService.requestPermission();
      }
    }
  }, 3000);
}