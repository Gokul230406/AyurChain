import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, ChevronRight, Shield, Database, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LandingPage = () => {
  const navigate = useNavigate();

  const handleEnterDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3">
              <Leaf className="w-8 h-8 text-green-600" />
              <h1 className="text-3xl font-bold text-gray-900">HerbChain</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-12">
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Blockchain-Powered
              <br />
              <span className="text-green-600">Herb Tracking</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Secure, transparent, and reliable herb supply chain management using blockchain technology. 
              Track your herbs from farm to consumer with complete authenticity.
            </p>
            
            <Button 
              onClick={handleEnterDashboard}
              size="lg"
              className="text-lg px-8 py-6 bg-green-600 hover:bg-green-700"
            >
              Enter Dashboard
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="text-center">
              <CardHeader>
                <Shield className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <CardTitle className="text-xl">Secure Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Immutable records on blockchain ensure complete security and transparency 
                  of your herb supply chain data.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Smartphone className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <CardTitle className="text-xl">Mobile Friendly</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Capture photos, record GPS locations, and manage your herb inventory 
                  directly from your mobile device.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Database className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <CardTitle className="text-xl">Offline Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Works offline and syncs automatically when connection is restored, 
                  ensuring no data loss in remote locations.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CTA Section */}
          <Card className="bg-green-600 text-white">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">Ready to get started?</h3>
              <p className="text-green-100 mb-6 text-lg">
                Join the future of herb supply chain management. Start tracking your herbs with blockchain technology today.
              </p>
              <Button 
                onClick={handleEnterDashboard}
                variant="secondary"
                size="lg"
                className="bg-white text-green-600 hover:bg-gray-100"
              >
                Access Your Dashboard
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center text-gray-600">
            <Leaf className="w-4 h-4 mr-2" />
            <span>© 2024 HerbChain. Powered by blockchain technology.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;