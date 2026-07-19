import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Leaf, Plus, Wifi, WifiOff, Upload, Home, Bell, BellOff } from 'lucide-react';
import { HerbForm } from '@/components/forms/HerbForm';
import { HerbList } from '@/components/dashboard/HerbList';
import { localForageService } from '@/lib/localforage';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '@/lib/notifications';

const TotalRecordsDisplay = ({ refreshTrigger }: { refreshTrigger: number }) => {
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    const loadTotalRecords = async () => {
      try {
        const records = await localForageService.getAllHerbRecords();
        setTotalRecords(records.length);
      } catch (error) {
        setTotalRecords(0);
      }
    };
    loadTotalRecords();
  }, [refreshTrigger]);

  return <span>{totalRecords}</span>;
};

export default function Index() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadUnsyncedCount();
    
    // Initialize notifications
    initializeNotifications();

    // Listen for online/offline events
    const handleOnline = async () => {
      setIsOnline(true);
      const unsyncedRecords = await localForageService.getUnsyncedRecords();
      
      toast({
        title: "Back online",
        description: "Your data will be synced automatically"
      });
      
      // Notify about back online status
      await notificationService.notifyBackOnline(unsyncedRecords.length);
      
      syncData();
    };

    const handleOffline = async () => {
      setIsOnline(false);
      toast({
        title: "Offline mode",
        description: "Your data will be saved locally"
      });
      
      // Notify about offline mode
      await notificationService.notifyOfflineMode();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const initializeNotifications = async () => {
    if (notificationService.isNotificationSupported()) {
      const permission = notificationService.getPermission();
      setNotificationPermission(permission);
      
      // Schedule sync reminders for offline mode
      notificationService.scheduleSyncReminder(30); // Remind every 30 minutes
    }
  };

  const loadUnsyncedCount = async () => {
    const unsyncedRecords = await localForageService.getUnsyncedRecords();
    setUnsyncedCount(unsyncedRecords.length);
  };

  const syncData = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const unsyncedRecords = await localForageService.getUnsyncedRecords();
      
      if (unsyncedRecords.length === 0) {
        return;
      }

      // Extract herb names for notification
      const herbNames = unsyncedRecords.map(record => record.herbName);

      // Mock sync process - in real app, this would call your backend API
      for (const record of unsyncedRecords) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mark as synced
        await localForageService.markRecordAsSynced(record.id);
      }

      toast({
        title: "Data synced",
        description: `${unsyncedRecords.length} records synced to blockchain`
      });

      // Send sync success notification
      await notificationService.notifySyncSuccess({
        recordCount: unsyncedRecords.length,
        herbNames,
        syncTime: new Date().toISOString(),
        status: 'success'
      });

      loadUnsyncedCount();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "Could not sync data. Will retry automatically.",
        variant: "destructive"
      });
      
      // Send sync error notification
      await notificationService.notifySyncError({
        recordCount: unsyncedCount,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleNotificationToggle = async () => {
    if (notificationPermission === 'denied') {
      toast({
        title: "Notifications blocked",
        description: "Please enable notifications in your browser settings to receive sync notifications.",
        variant: "destructive"
      });
      return;
    }
    
    if (notificationPermission === 'default') {
      const permission = await notificationService.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        toast({
          title: "Notifications enabled",
          description: "You will now receive notifications when records are synced."
        });
      }
    } else if (notificationPermission === 'granted') {
      // Toggle notification settings
      const currentState = notificationService.getSyncNotificationsEnabled();
      notificationService.setSyncNotificationsEnabled(!currentState);
      
      toast({
        title: !currentState ? "Sync notifications enabled" : "Sync notifications disabled",
        description: !currentState 
          ? "You will receive notifications when records are synced" 
          : "You will no longer receive sync notifications"
      });
    }
  };

  const testNotification = async () => {
    if (notificationPermission !== 'granted') {
      const permission = await notificationService.requestPermission();
      setNotificationPermission(permission);
      if (permission !== 'granted') return;
    }
    
    await notificationService.sendTestNotification();
    toast({
      title: "Test notification sent",
      description: "Check if you received the browser notification."
    });
  };

  const handleRecordSaved = async (herbName?: string) => {
    loadUnsyncedCount();
    setRefreshTrigger(prev => prev + 1);
    
    // Send record saved notification
    if (herbName) {
      await notificationService.notifyNewRecordSaved(herbName);
    }
    
    // Auto-sync if online
    if (isOnline) {
      setTimeout(() => syncData(), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/')}
                className="mr-2"
              >
                <Home className="w-4 h-4" />
              </Button>
              <Leaf className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">HerbChain Dashboard</h1>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Notification Controls */}
              {notificationService.isNotificationSupported() && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNotificationToggle}
                    className="text-xs px-2"
                    title={
                      notificationPermission === 'granted' && notificationService.getSyncNotificationsEnabled()
                        ? 'Disable sync notifications'
                        : 'Enable sync notifications'
                    }
                  >
                    {notificationPermission === 'granted' && notificationService.getSyncNotificationsEnabled() ? (
                      <Bell className="w-4 h-4 text-primary" />
                    ) : (
                      <BellOff className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                  
                  {notificationPermission === 'granted' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={testNotification}
                      className="text-xs px-1"
                      title="Send test notification"
                    >
                      <span className="text-xs">Test</span>
                    </Button>
                  )}
                </div>
              )}
              
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-success" />
                ) : (
                  <WifiOff className="w-4 h-4 text-warning" />
                )}
                <span className="text-sm text-muted-foreground">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Sync Status */}
              {unsyncedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncData}
                  disabled={!isOnline || isSyncing}
                  className="text-xs"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  {isSyncing ? 'Syncing...' : `Sync ${unsyncedCount}`}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                <TotalRecordsDisplay refreshTrigger={refreshTrigger} />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pending Sync</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-warning">
                  {unsyncedCount}
                </div>
                {unsyncedCount > 0 && (
                  <Badge variant="outline" className="bg-warning text-warning-foreground">
                    Offline
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Connection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={`text-2xl font-bold ${isOnline ? 'text-success' : 'text-warning'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </div>
                {isOnline ? (
                  <Wifi className="w-5 h-5 text-success" />
                ) : (
                  <WifiOff className="w-5 h-5 text-warning" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Content */}
        <Tabs defaultValue="records" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="records">My Records</TabsTrigger>
            <TabsTrigger value="add-record">Add New Record</TabsTrigger>
          </TabsList>
          
          <TabsContent value="records">
            <HerbList refreshTrigger={refreshTrigger} />
          </TabsContent>
          
          <TabsContent value="add-record">
            <HerbForm onSave={handleRecordSaved} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}