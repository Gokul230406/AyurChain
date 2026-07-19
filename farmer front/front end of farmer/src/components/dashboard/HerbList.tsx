import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Leaf, MapPin, Calendar, Package } from 'lucide-react';
import { localForageService, HerbRecord } from '@/lib/localforage';
import { useToast } from '@/hooks/use-toast';
import { getFarmerStatus } from '@/lib/api';

interface HerbListProps {
  refreshTrigger: number;
}

export const HerbList = ({ refreshTrigger }: HerbListProps) => {
  const [records, setRecords] = useState<HerbRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<HerbRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRecords();
  }, [refreshTrigger]);

  useEffect(() => {
    // Filter records based on search term
    const filtered = records.filter(record =>
      record.herbName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRecords(filtered);
  }, [records, searchTerm]);

  const loadRecords = async () => {
    try {
      const allRecords = await localForageService.getAllHerbRecords();
      // attempt to refresh statuses from backend when backendHash exists
      for (const rec of allRecords) {
        if (rec.backendHash) {
          try {
            const st = await getFarmerStatus(rec.backendHash);
            const newStatus = st.status as HerbRecord['status'];
            if (newStatus && newStatus !== rec.status) {
              await localForageService.updateRecord(rec.id, { status: newStatus, rejectedReason: st.reason });
              rec.status = newStatus;
              rec.rejectedReason = st.reason;
            }
          } catch {}
        }
      }
      setRecords(allRecords.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
    } catch (error) {
      toast({
        title: "Failed to load records",
        description: "Could not retrieve herb records",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (record: HerbRecord) => {
    if (record.status === 'rejected') {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    if (record.status === 'certified') {
      return <Badge variant="secondary">Certified</Badge>;
    }
    if (record.status === 'pending') {
      return <Badge variant="outline">Pending Review</Badge>;
    }
    if (record.synced) {
      return <Badge variant="secondary">Synced</Badge>;
    }
    return <Badge variant="outline" className="bg-warning text-warning-foreground">Pending Sync</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Leaf className="w-5 h-5" />
          Your Herb Records ({records.length})
        </CardTitle>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search herbs by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredRecords.length === 0 ? (
          <div className="text-center py-8">
            <Leaf className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'No herbs found matching your search' : 'No herb records yet. Start by recording your first harvest!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((record) => (
              <div key={record.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{record.herbName}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        <span>{record.quantity} {record.unit}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(record.timestamp)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{record.location.latitude.toFixed(4)}, {record.location.longitude.toFixed(4)}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(record)}
                  </div>
                </div>

                {/* Photo thumbnail */}
                {record.photo && (
                  <div className="flex justify-center">
                    <img 
                      src={record.photo} 
                      alt={record.herbName}
                      className="h-24 w-40 object-contain bg-gray-50 rounded-md border"
                      style={{ aspectRatio: '16/9' }}
                    />
                  </div>
                )}

                {/* Quality and Notes */}
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="secondary">{record.quality}</Badge>
                  {record.notes && (
                    <span className="text-muted-foreground italic">"{record.notes}"</span>
                  )}
                  {record.status === 'rejected' && record.rejectedReason && (
                    <span className="text-destructive">Reason: {record.rejectedReason}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};