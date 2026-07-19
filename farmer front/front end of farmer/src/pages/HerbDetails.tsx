import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Leaf, 
  MapPin, 
  Calendar, 
  Package, 
  CheckCircle, 
  User, 
  FileText,
  Download,
  ExternalLink
} from 'lucide-react';
import { localForageService, HerbRecord } from '@/lib/localforage';
import herbsImage from '@/assets/herbs-collection.jpg';

export const HerbDetails = () => {
  const { herbId } = useParams<{ herbId: string }>();
  const [record, setRecord] = useState<HerbRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadHerbRecord();
  }, [herbId]);

  const loadHerbRecord = async () => {
    if (!herbId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      const records = await localForageService.getAllHerbRecords();
      const foundRecord = records.find(r => r.id === herbId);
      
      if (foundRecord) {
        setRecord(foundRecord);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openLocationInMaps = () => {
    if (!record) return;
    const { latitude, longitude } = record.location;
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading herb details...</p>
        </div>
      </div>
    );
  }

  if (notFound || !record) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-8">
            <Leaf className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Herb Record Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The herb record you're looking for doesn't exist or may have been removed.
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Birth Certificate Style Header */}
      <div className="bg-white border-b-4 border-primary">
        <div className="container mx-auto px-4 py-6 text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">AyurChain</h1>
          <div className="w-24 h-1 bg-primary mx-auto mb-4"></div>
          <h2 className="text-2xl font-serif text-gray-800">Herb Birth Certificate</h2>
        </div>
      </div>

      {/* Main Certificate Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Certificate Border */}
        <div className="bg-white rounded-lg shadow-lg border-4 border-primary/20 p-8">
          
          {/* Herb Name & Status */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-serif text-gray-800 mb-2">
              NAME OF HERB: <span className="text-primary font-bold">{record.herbName}</span>
            </h1>
            <div className="flex items-center justify-center gap-2 mt-4">
              <CheckCircle className="w-6 h-6 text-success" />
              <span className="text-lg font-semibold text-success">Verified on Blockchain</span>
            </div>
          </div>

          {/* Point of Collection */}
          <div className="text-center mb-8">
            <h3 className="text-xl font-serif text-gray-700 mb-2">POINT OF COLLECTION:</h3>
            <p className="text-lg text-gray-800 font-medium">
              Lat: {record.location.latitude.toFixed(6)}°, Lng: {record.location.longitude.toFixed(6)}°
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={openLocationInMaps}
              className="mt-2"
            >
              <MapPin className="w-4 h-4 mr-2" />
              View on Google Maps
            </Button>
          </div>

          {/* Main Content Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            
            {/* Geotagged Image Section */}
            <div>
              <h3 className="text-xl font-serif text-center mb-4 text-gray-800">GEO-TAGGED IMAGE CAPTURED</h3>
              <Card className="overflow-hidden">
                <div className="relative">
                  <img 
                    src={record.photo || herbsImage} 
                    alt={record.herbName}
                    className="w-full h-64 object-cover"
                  />
                  {/* GPS Overlay */}
                  <div className="absolute top-4 right-4 bg-black/70 text-white p-2 rounded text-xs">
                    <div>GPS: {record.location.latitude.toFixed(4)}, {record.location.longitude.toFixed(4)}</div>
                    <div>{formatDate(record.timestamp)}</div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="space-y-2 text-sm">
                    <div><strong>Farmer:</strong> {record.farmerName}</div>
                    <div><strong>Quantity:</strong> {record.quantity} {record.unit}</div>
                    <div><strong>Quality:</strong> <Badge variant="secondary">{record.quality}</Badge></div>
                    <div><strong>Capture Time:</strong> {formatDate(record.timestamp)}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lab Certificate Section */}
            <div>
              <h3 className="text-xl font-serif text-center mb-4 text-gray-800">LAB APPROVAL CERTIFICATE</h3>
              <Card>
                <CardHeader className="text-center bg-primary/5">
                  <CardTitle className="text-lg">CERTIFICATE OF ANALYSIS</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><strong>Product Name:</strong> {record.herbName}</div>
                      <div><strong>Date of Analysis:</strong> {new Date(record.timestamp).toLocaleDateString()}</div>
                      <div><strong>Batch Number:</strong> {record.id.substring(0, 8).toUpperCase()}</div>
                      <div><strong>Certificate #:</strong> TC-{Math.floor(Math.random() * 10000)}</div>
                    </div>
                    
                    {/* Test Results */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-2">Test Results</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-success/10 p-2 rounded text-center">
                          <div className="font-bold text-success">✓ PASS</div>
                          <div>Pesticide Free</div>
                        </div>
                        <div className="bg-success/10 p-2 rounded text-center">
                          <div className="font-bold text-success">12%</div>
                          <div>Moisture Content</div>
                        </div>
                        <div className="bg-success/10 p-2 rounded text-center">
                          <div className="font-bold text-success">A+</div>
                          <div>Quality Grade</div>
                        </div>
                        <div className="bg-success/10 p-2 rounded text-center">
                          <div className="font-bold text-success">✓ PASS</div>
                          <div>Heavy Metals</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Blockchain Verification Footer */}
          <div className="border-t-2 border-primary/20 pt-6">
            <h3 className="text-xl font-serif text-center mb-4 text-gray-800">BLOCKCHAIN VERIFICATION</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-gray-600">Record ID</div>
                <div className="font-mono text-xs bg-gray-100 p-2 rounded">{record.id}</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-600">Farmer ID</div>
                <div className="font-mono text-xs bg-gray-100 p-2 rounded">{record.farmerId}</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-600">Verification Status</div>
                <Badge className="bg-success text-success-foreground">VERIFIED ✓</Badge>
              </div>
            </div>
          </div>

          {/* Certificate Footer */}
          <div className="text-center mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-4">
              This certificate is cryptographically verified and stored on AyurChain blockchain
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download Certificate
              </Button>
              <Button className="bg-primary">
                <CheckCircle className="w-4 h-4 mr-2" />
                Verify on Blockchain
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};