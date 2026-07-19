"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Leaf,
  MapPin,
  Calendar,
  Weight,
  FlaskConical,
  Package,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from "lucide-react"

interface HerbData {
  _id: string
  herbName: string
  farmerName: string
  farmLocation: string
  harvestDate: string
  initialWeight: number
  status: string
  processing?: {
    dryingMethod: string
    dryingDuration: number
    cleaningSteps: string[]
    finalWeight: number
    processedDate: string
    notes: string
  }
  labTesting?: {
    moistureContent: number
    heavyMetals: string
    microbialCount: number
    pesticideResidue: string
    testResult: string
    testDate: string
    certificateUrl: string
  }
  manufacturing?: {
    batchNumber: string
    finalProductWeight: number
    packagingType: string
    expiryDate: string
    manufacturedDate: string
  }
}

export default function VerifyPage({ params }: { params: { id: string } }) {
  const [herbData, setHerbData] = useState<HerbData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchHerbData()
  }, [params.id])

  const fetchHerbData = async () => {
    try {
      const response = await fetch(`/api/verify/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setHerbData(data)
      } else {
        setError("Product not found or invalid QR code")
      }
    } catch (err) {
      setError("Failed to fetch product data")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying product...</p>
        </div>
      </div>
    )
  }

  if (error || !herbData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>Verification Failed</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => (window.location.href = "/")} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "processing":
        return "bg-yellow-100 text-yellow-800"
      case "lab_testing":
        return "bg-blue-100 text-blue-800"
      case "manufacturing":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <Leaf className="h-8 w-8 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">Product Verification</h1>
          </div>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Product Overview */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">{herbData.herbName}</CardTitle>
              <Badge className={getStatusColor(herbData.status)}>
                {herbData.status.replace("_", " ").toUpperCase()}
              </Badge>
            </div>
            <CardDescription>Complete supply chain journey</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{herbData.farmLocation}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{new Date(herbData.harvestDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Weight className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{herbData.initialWeight}kg (initial)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supply Chain Stages */}
        <div className="space-y-6">
          {/* Farm Stage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Leaf className="h-5 w-5 text-green-600" />
                <span>Farm Origin</span>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Farmer</p>
                  <p className="font-medium">{herbData.farmerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-medium">{herbData.farmLocation}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Harvest Date</p>
                  <p className="font-medium">{new Date(herbData.harvestDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Initial Weight</p>
                  <p className="font-medium">{herbData.initialWeight}kg</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing Stage */}
          {herbData.processing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-orange-600" />
                  <span>Processing</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Drying Method</p>
                    <p className="font-medium">{herbData.processing.dryingMethod}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="font-medium">{herbData.processing.dryingDuration} hours</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Final Weight</p>
                    <p className="font-medium">{herbData.processing.finalWeight}kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Processed Date</p>
                    <p className="font-medium">{new Date(herbData.processing.processedDate).toLocaleDateString()}</p>
                  </div>
                </div>
                {herbData.processing.cleaningSteps.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">Cleaning Steps</p>
                    <ul className="list-disc list-inside space-y-1">
                      {herbData.processing.cleaningSteps.map((step, index) => (
                        <li key={index} className="text-sm">
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {herbData.processing.notes && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">Notes</p>
                    <p className="text-sm">{herbData.processing.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Lab Testing Stage */}
          {herbData.labTesting && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FlaskConical className="h-5 w-5 text-blue-600" />
                  <span>Quality Testing</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Test Result</p>
                    <Badge
                      className={
                        herbData.labTesting.testResult === "approved"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {herbData.labTesting.testResult.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Test Date</p>
                    <p className="font-medium">{new Date(herbData.labTesting.testDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Moisture Content</p>
                    <p className="font-medium">{herbData.labTesting.moistureContent}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Microbial Count</p>
                    <p className="font-medium">{herbData.labTesting.microbialCount} CFU/g</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Heavy Metals</p>
                    <p className="font-medium">{herbData.labTesting.heavyMetals}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pesticide Residue</p>
                    <p className="font-medium">{herbData.labTesting.pesticideResidue}</p>
                  </div>
                </div>
                {herbData.labTesting.certificateUrl && (
                  <div className="mt-4">
                    <Button variant="outline" onClick={() => window.open(herbData.labTesting.certificateUrl, "_blank")}>
                      View Test Certificate
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Manufacturing Stage */}
          {herbData.manufacturing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  <span>Manufacturing</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Batch Number</p>
                    <p className="font-medium">{herbData.manufacturing.batchNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Final Product Weight</p>
                    <p className="font-medium">{herbData.manufacturing.finalProductWeight}kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Packaging Type</p>
                    <p className="font-medium">{herbData.manufacturing.packagingType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Manufactured Date</p>
                    <p className="font-medium">
                      {new Date(herbData.manufacturing.manufacturedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Expiry Date</p>
                    <p className="font-medium">{new Date(herbData.manufacturing.expiryDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Verification Footer */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Product Verified Successfully</span>
            </div>
            <p className="text-center text-sm text-gray-600 mt-2">
              This product has been verified through our secure supply chain tracking system
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
