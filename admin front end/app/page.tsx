"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Leaf, Shield, QrCode, Users, Factory } from "lucide-react"

export default function HomePage() {
  const [qrCode, setQrCode] = useState("")

  const handleVerifyProduct = () => {
    if (qrCode.trim()) {
      // Redirect to verification page with the QR code
      window.location.href = `/verify/${qrCode.trim()}`
    }
  }

  const handleUnitSelection = (unitPath: string) => {
    window.location.href = unitPath
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Leaf className="h-8 w-8 text-green-600" />
              <h1 className="text-2xl font-bold text-gray-900">AyurChain</h1>
            </div>
            {/* Unit Selection Dropdown */}
            <div className="flex items-center space-x-4">
              <Button onClick={() => handleUnitSelection('/processing')} className="bg-green-600 hover:bg-green-700">
                Processing Unit
              </Button>
              <Button onClick={() => handleUnitSelection('/lab')} className="bg-blue-600 hover:bg-blue-700">
                Lab Unit
              </Button>
              <Button onClick={() => handleUnitSelection('/manufacturing')} className="bg-purple-600 hover:bg-purple-700">
                Manufacturing Unit
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Transparent Ayurvedic Herb Supply Chain</h2>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Track your Ayurvedic herbs from farm to pharmacy. Verify authenticity, quality testing, and processing
            details with our blockchain-powered transparency system.
          </p>

          {/* QR Code Verification */}
          <Card className="max-w-md mx-auto mb-16">
            <CardHeader>
              <CardTitle className="flex items-center justify-center space-x-2">
                <QrCode className="h-5 w-5" />
                <span>Verify Your Product</span>
              </CardTitle>
              <CardDescription>Enter your product QR code to view its complete journey</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="qr-code">QR Code or Product ID</Label>
                <Input
                  id="qr-code"
                  placeholder="Enter QR code or product ID"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                />
              </div>
              <Button
                onClick={handleVerifyProduct}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={!qrCode.trim()}
              >
                Verify Product
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">Complete Supply Chain Transparency</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Factory className="h-6 w-6 text-green-600" />
                  <CardTitle>Farm to Processing</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Track herbs from organic farms through professional processing units with detailed drying, cleaning,
                  and preparation records.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Shield className="h-6 w-6 text-blue-600" />
                  <CardTitle>Quality Testing</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Comprehensive lab testing for purity, potency, heavy metals, pesticides, and microbial content with
                  certified results.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Users className="h-6 w-6 text-purple-600" />
                  <CardTitle>Manufacturing</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Final product manufacturing with batch tracking, packaging details, and QR code generation for
                  complete traceability.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Leaf className="h-6 w-6 text-green-400" />
            <span className="text-xl font-bold">AyurChain</span>
          </div>
          <p className="text-gray-400">Ensuring authenticity and quality in Ayurvedic herb supply chains</p>
        </div>
      </footer>
    </div>
  )
}
