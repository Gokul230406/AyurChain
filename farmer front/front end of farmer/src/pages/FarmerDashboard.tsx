import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Leaf, Plus, User, LogOut, Wifi, WifiOff, Upload } from 'lucide-react';
import { HerbForm } from '@/components/forms/HerbForm';
import { HerbList } from '@/components/dashboard/HerbList';
import { authService } from '@/lib/auth';
import { localForageService } from '@/lib/localforage';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

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

export const FarmerDashboard = () => {
  const [farmer, setFarmer] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadFarmerData();
    loadUnsyncedCount();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back online",
        description: "Your data will be synced automatically"
      });
      syncData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline mode",
        description: "Your data will be saved locally"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadFarmerData = async () => {
    const farmerData = await authService.getCurrentFarmer();
    setFarmer(farmerData);
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

      loadUnsyncedCount();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "Could not sync data. Will retry automatically.",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
    toast({
      title: "Logged out",
      description: "You have been logged out successfully"
    });
  };

  const handleRecordSaved = () => {
    loadUnsyncedCount();
    setRefreshTrigger(prev => prev + 1);
    
    // Auto-sync if online
    if (isOnline) {
      setTimeout(() => syncData(), 1000);
    }
  };

  if (!farmer) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Leaf className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">AyurChain</h1>
            </div>
            
            <div className="flex items-center gap-3">
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

              {/* User Menu */}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{farmer.name}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
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
};