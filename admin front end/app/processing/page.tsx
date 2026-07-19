"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Package, Clock, CheckCircle, MapPin, Calendar, Weight, Shield } from "lucide-react"
import DashboardNavigation from "@/components/DashboardNavigation"

interface HerbFolder {
  id: string
  herbName: string
  quantity: number
  geotaggedImage: string
  location: string
  farmerName: string
  collectionDate: string
  additionalNotes: string
  status: string
  currentStage: string
  createdAt: string
  processing: any
}

export default function ProcessingDashboard() {
  const [folders, setFolders] = useState<HerbFolder[]>([])
  const [user, setUser] = useState<any>(null)
  const [selectedFolder, setSelectedFolder] = useState<HerbFolder | null>(null)
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false)
  const [processingData, setProcessingData] = useState({
    // Cleaning Phase
    cleaningMethod: "",
    cleaningDuration: "",
    contaminantsRemoved: "",
    cleaningNotes: "",
    
    // Drying Phase  
    dryingMethod: "",
    dryingTemperature: "",
    dryingDuration: "",
    moistureContentBefore: "",
    moistureContentAfter: "",
    dryingNotes: "",
    
    // Packaging Phase
    packagingType: "",
    batchNumber: "",
    packagingDate: "",
    finalWeight: "",
    packagingNotes: "",
    
    // General
    processedBy: "",
    qualityCheck: "",
    overallNotes: "",
  })

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }

    fetchHerbFolders()
  }, [])

  const fetchHerbFolders = async () => {
    try {
      const response = await fetch("/api/herbs/folders?role=processing")
      const data = await response.json()
      if (data.success) {
        // Only show admin-approved folders to processing unit
        const approvedFolders = data.folders.filter(
          (folder: HerbFolder) => 
            folder.currentStage === "admin_approved" || folder.currentStage === "processing"
        )
        setFolders(approvedFolders)
        console.log("[Processing] Loaded", approvedFolders.length, "admin-approved folders")
      }
    } catch (error) {
      console.error("[v0] Error fetching herb folders:", error)
    }
  }

  const handleStartProcessing = (folder: HerbFolder) => {
    setSelectedFolder(folder)
    setIsProcessingModalOpen(true)
  }

  const handleCompleteProcessing = async () => {
    if (!selectedFolder) return

    try {
      const response = await fetch("/api/herbs/folders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folderId: selectedFolder.id,
          role: "processing",
          updateData: {
            ...processingData,
            processedBy: user?.username || "Unknown",
          },
        }),
      })

      const data = await response.json()
      if (data.success) {
        setFolders((prev) => prev.map((folder) => (folder.id === selectedFolder.id ? data.folder : folder)))
        setIsProcessingModalOpen(false)
        // Reset all processing data
        setProcessingData({
          cleaningMethod: "",
          cleaningDuration: "",
          contaminantsRemoved: "",
          cleaningNotes: "",
          dryingMethod: "",
          dryingTemperature: "",
          dryingDuration: "",
          moistureContentBefore: "",
          moistureContentAfter: "",
          dryingNotes: "",
          packagingType: "",
          batchNumber: "",
          packagingDate: "",
          finalWeight: "",
          packagingNotes: "",
          processedBy: "",
          qualityCheck: "",
          overallNotes: "",
        })
      }
    } catch (error) {
      console.error("[v0] Error updating processing data:", error)
    }
  }

  // Admin-approved folders ready for processing
  const approvedFolders = folders.filter((folder) => folder.currentStage === "admin_approved")
  // Folders currently being processed
  const processingFolders = folders.filter((folder) => folder.currentStage === "processing")

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <DashboardNavigation />

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => window.location.href = '/certification'}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Shield className="h-4 w-4 mr-2" />
                Certifications
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">Processing Unit Dashboard</h1>
            </div>
          </div>
          <p className="text-gray-600">Manage herb processing and preparation</p>
        </div>

        <Tabs defaultValue="approved" className="space-y-6">
          <TabsList>
            <TabsTrigger value="approved" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Admin Approved ({approvedFolders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="processing" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>In Processing ({processingFolders.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="approved" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {approvedFolders.map((folder) => (
                <Card key={folder.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{folder.herbName}</CardTitle>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin Approved
                      </Badge>
                    </div>
                    <CardDescription>From {folder.farmerName}</CardDescription>
                    {folder.approvedBy && (
                      <p className="text-xs text-green-600 mt-1">
                        Approved by {folder.approvedBy} on {new Date(folder.approvedAt).toLocaleDateString()}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <img
                        src={folder.geotaggedImage || "/placeholder.svg"}
                        alt={folder.herbName}
                        className="w-full h-32 object-cover rounded-md"
                      />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500">Collection:</span>
                        <span>{new Date(folder.collectionDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Weight className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500">Quantity:</span>
                        <span>{folder.quantity} kg</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500">Location:</span>
                        <span className="text-xs">{folder.location}</span>
                      </div>
                      {folder.additionalNotes && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <strong>Notes:</strong> {folder.additionalNotes}
                        </div>
                      )}
                    </div>
                    <Button
                      className="w-full mt-4 bg-green-600 hover:bg-green-700"
                      onClick={() => handleStartProcessing(folder)}
                    >
                      Start Processing
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="processing" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {processingFolders.map((folder) => (
                <Card key={folder.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{folder.herbName}</CardTitle>
                      <Badge variant="outline">Processing</Badge>
                    </div>
                    <CardDescription>From {folder.farmerName}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <img
                        src={folder.geotaggedImage || "/placeholder.svg"}
                        alt={folder.herbName}
                        className="w-full h-32 object-cover rounded-md"
                      />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Collection Date:</span>
                        <span>{new Date(folder.collectionDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Quantity:</span>
                        <span>{folder.quantity} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Location:</span>
                        <span className="text-xs">{folder.location}</span>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full mt-4 bg-transparent" onClick={() => handleStartProcessing(folder)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Processing
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isProcessingModalOpen} onOpenChange={setIsProcessingModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Process {selectedFolder?.herbName}</DialogTitle>
            <p className="text-sm text-gray-600">Complete the 3-phase processing workflow: Cleaning → Drying → Packaging</p>
          </DialogHeader>
          
          <Tabs defaultValue="cleaning" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="cleaning">🧼 Cleaning</TabsTrigger>
              <TabsTrigger value="drying">🌡️ Drying</TabsTrigger>
              <TabsTrigger value="packaging">📦 Packaging</TabsTrigger>
            </TabsList>

            {/* CLEANING PHASE */}
            <TabsContent value="cleaning" className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center">
                🧼 Cleaning Phase
                <Badge variant="outline" className="ml-2">Step 1 of 3</Badge>
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cleaningMethod">Cleaning Method</Label>
                  <Select
                    value={processingData.cleaningMethod}
                    onValueChange={(value) => setProcessingData((prev) => ({ ...prev, cleaningMethod: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cleaning method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="water-washing">Water Washing</SelectItem>
                      <SelectItem value="air-cleaning">Air Cleaning</SelectItem>
                      <SelectItem value="manual-sorting">Manual Sorting</SelectItem>
                      <SelectItem value="mechanical-cleaning">Mechanical Cleaning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cleaningDuration">Duration (minutes)</Label>
                  <Input
                    id="cleaningDuration"
                    type="number"
                    value={processingData.cleaningDuration}
                    onChange={(e) => setProcessingData((prev) => ({ ...prev, cleaningDuration: e.target.value }))}
                    placeholder="Cleaning duration"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="contaminantsRemoved">Contaminants Removed</Label>
                <Input
                  id="contaminantsRemoved"
                  value={processingData.contaminantsRemoved}
                  onChange={(e) => setProcessingData((prev) => ({ ...prev, contaminantsRemoved: e.target.value }))}
                  placeholder="e.g., dirt, stones, damaged parts"
                />
              </div>

              <div>
                <Label htmlFor="cleaningNotes">Cleaning Notes</Label>
                <Textarea
                  id="cleaningNotes"
                  value={processingData.cleaningNotes}
                  onChange={(e) => setProcessingData((prev) => ({ ...prev, cleaningNotes: e.target.value }))}
                  placeholder="Any observations during cleaning..."
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* DRYING PHASE */}
            <TabsContent value="drying" className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center">
                🌡️ Drying Phase
                <Badge variant="outline" className="ml-2">Step 2 of 3</Badge>
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dryingMethod">Drying Method</Label>
                  <Select
                    value={processingData.dryingMethod}
                    onValueChange={(value) => setProcessingData((prev) => ({ ...prev, dryingMethod: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select drying method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sun-drying">Sun Drying</SelectItem>
                      <SelectItem value="shade-drying">Shade Drying</SelectItem>
                      <SelectItem value="oven-drying">Oven Drying</SelectItem>
                      <SelectItem value="freeze-drying">Freeze Drying</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dryingTemperature">Temperature (°C)</Label>
                  <Input
                    id="dryingTemperature"
                    type="number"
                    value={processingData.dryingTemperature}
                    onChange={(e) => setProcessingData((prev) => ({ ...prev, dryingTemperature: e.target.value }))}
                    placeholder="Drying temperature"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dryingDuration">Duration (hours)</Label>
                  <Input
                    id="dryingDuration"
                    type="number"
                    value={processingData.dryingDuration}
                    onChange={(e) => setProcessingData((prev) => ({ ...prev, dryingDuration: e.target.value }))}
                    placeholder="Hours"
                  />
                </div>

                <div>
                  <Label htmlFor="moistureContentBefore">Moisture Before (%)</Label>
                  <Input
                    id="moistureContentBefore"
                    type="number"
                    step="0.1"
                    value={processingData.moistureContentBefore}
                    onChange={(e) => setProcessingData((prev) => ({ ...prev, moistureContentBefore: e.target.value }))}
                    placeholder="%"
                  />
                </div>

                <div>
                  <Label htmlFor="moistureContentAfter">Moisture After (%)</Label>
                  <Input
                    id="moistureContentAfter"
                    type="number"
                    step="0.1"
                    value={processingData.moistureContentAfter}
                    onChange={(e) => setProcessingData((prev) => ({ ...prev, moistureContentAfter: e.target.value }))}
                    placeholder="%"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="dryingNotes">Drying Notes</Label>
                <Textarea
                  id="dryingNotes"
                  value={processingData.dryingNotes}
                  onChange={(e) => setProcessingData((prev) => ({ ...prev, dryingNotes: e.target.value }))}
                  placeholder="Any observations during drying..."
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* PACKAGING PHASE */}
            <TabsContent value="packaging" className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center">
                📦 Packaging Phase
                <Badge variant="outline" className="ml-2">Step 3 of 3</Badge>
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="packagingType">Packaging Type</Label>
                  <Select
                    value={processingData.packagingType}
                    onValueChange={(value) => setProcessingData((prev) => ({ ...prev, packagingType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select packaging" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sealed-bags">Sealed Bags</SelectItem>
                      <SelectItem value="glass-containers">Glass Containers</SelectItem>
                      <SelectItem value="metal-tins">Metal Tins</SelectItem>
                      <SelectItem value="biodegradable-pouches">Biodegradable Pouches</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="batchNumber">Batch Number</Label>
                  <Input
                    id="batchNumber"
                    value={processingData.batchNumber}
                    onChange={(e) => setProcessingData((prev) => ({ ...prev, batchNumber: e.target.value }))}
                    placeholder="e.g., PRO-2024-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="packagingDate">Packaging Date</Label>
                  <Input
                    id="packagingDate"
                    type="date"
                    value={processingData.packagingDate}
                    onChange={(e) => setProcessingData((prev) => ({ ...prev, packagingDate: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="finalWeight">Final Weight (kg)</Label>
                  <Input
                    id="finalWeight"
                    type="number"
                    step="0.1"
                    value={processingData.finalWeight}
                    onChange={(e) => setProcessingData((prev) => ({ ...prev, finalWeight: e.target.value }))}
                    placeholder="Final packaged weight"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="packagingNotes">Packaging Notes</Label>
                <Textarea
                  id="packagingNotes"
                  value={processingData.packagingNotes}
                  onChange={(e) => setProcessingData((prev) => ({ ...prev, packagingNotes: e.target.value }))}
                  placeholder="Packaging observations, storage instructions..."
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* GENERAL FIELDS */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold">Final Processing Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="processedBy">Processed By</Label>
                <Input
                  id="processedBy"
                  value={processingData.processedBy}
                  onChange={(e) => setProcessingData((prev) => ({ ...prev, processedBy: e.target.value }))}
                  placeholder="Processor name"
                />
              </div>

              <div>
                <Label htmlFor="qualityCheck">Quality Check Result</Label>
                <Select
                  value={processingData.qualityCheck}
                  onValueChange={(value) => setProcessingData((prev) => ({ ...prev, qualityCheck: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Quality status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="acceptable">Acceptable</SelectItem>
                    <SelectItem value="needs-review">Needs Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="overallNotes">Overall Processing Notes</Label>
              <Textarea
                id="overallNotes"
                value={processingData.overallNotes}
                onChange={(e) => setProcessingData((prev) => ({ ...prev, overallNotes: e.target.value }))}
                placeholder="Any additional observations or recommendations..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsProcessingModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleCompleteProcessing} className="flex-1 bg-green-600 hover:bg-green-700">
              Complete All Processing Phases
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
