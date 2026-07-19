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
import { Package, Clock, QrCode, User, TestTube, Download } from "lucide-react"
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
  processing: any
  labTesting: any
  manufacturing: any
}

export default function ManufacturingDashboard() {
  const [folders, setFolders] = useState<HerbFolder[]>([])
  const [user, setUser] = useState<any>(null)
  const [selectedFolder, setSelectedFolder] = useState<HerbFolder | null>(null)
  const [isManufacturingModalOpen, setIsManufacturingModalOpen] = useState(false)
  const [manufacturingData, setManufacturingData] = useState({
    batchNumber: "",
    finalProductWeight: "",
    packagingType: "",
    expiryDate: "",
    notes: "",
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
      const response = await fetch("/api/herbs/folders?role=manufacturing")
      const data = await response.json()
      if (data.success) {
        setFolders(data.folders)
      }
    } catch (error) {
      console.error("[v0] Error fetching herb folders:", error)
    }
  }

  const handleStartManufacturing = (folder: HerbFolder) => {
    setSelectedFolder(folder)
    const batchNumber = `${folder.herbName.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`
    setManufacturingData((prev) => ({ ...prev, batchNumber }))
    setIsManufacturingModalOpen(true)
  }

  const handleCompleteManufacturing = async () => {
    if (!selectedFolder) return

    try {
      const response = await fetch("/api/herbs/folders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folderId: selectedFolder.id,
          role: "manufacturing",
          updateData: {
            ...manufacturingData,
            manufacturedBy: user?.username || "Unknown",
          },
        }),
      })

      const data = await response.json()
      if (data.success) {
        setFolders((prev) => prev.map((folder) => (folder.id === selectedFolder.id ? data.folder : folder)))
        setIsManufacturingModalOpen(false)
        setManufacturingData({
          batchNumber: "",
          finalProductWeight: "",
          packagingType: "",
          expiryDate: "",
          notes: "",
        })
      }
    } catch (error) {
      console.error("[v0] Error updating manufacturing data:", error)
    }
  }

  const approvedFolders = folders.filter((folder) => folder.currentStage === "lab-approved")
  const manufacturingFolders = folders.filter((folder) => folder.currentStage === "manufacturing")
  const completedFolders = folders.filter((folder) => folder.currentStage === "completed")

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <DashboardNavigation />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manufacturing Unit Dashboard</h1>
          <p className="text-gray-600">Final product manufacturing and QR code generation</p>
        </div>

        <Tabs defaultValue="approved" className="space-y-6">
          <TabsList>
            <TabsTrigger value="approved" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Lab Approved ({approvedFolders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="manufacturing" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Manufacturing ({manufacturingFolders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center space-x-2">
              <QrCode className="h-4 w-4" />
              <span>Completed ({completedFolders.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="approved" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {approvedFolders.map((folder) => (
                <Card key={folder.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{folder.herbName}</CardTitle>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Lab Approved
                      </Badge>
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
                      <div className="flex items-center space-x-2">
                        <TestTube className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500">Test Date:</span>
                        <span>
                          {folder.labTesting?.testDate
                            ? new Date(folder.labTesting.testDate).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500">Final Weight:</span>
                        <span>{folder.processing?.finalWeight || folder.quantity} kg</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500">Tested by:</span>
                        <span>{folder.labTesting?.testedBy || "Unknown"}</span>
                      </div>
                      {folder.labTesting?.overallResult && (
                        <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                          <Badge variant="outline" className="text-green-600">
                            {folder.labTesting.overallResult}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <Button
                      className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
                      onClick={() => handleStartManufacturing(folder)}
                    >
                      Start Manufacturing
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="manufacturing" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {manufacturingFolders.map((folder) => (
                <Card key={folder.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{folder.herbName}</CardTitle>
                      <Badge variant="outline">Manufacturing</Badge>
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
                        <span className="text-gray-500">Test Date:</span>
                        <span>
                          {folder.labTesting?.testDate
                            ? new Date(folder.labTesting.testDate).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Final Weight:</span>
                        <span>{folder.processing?.finalWeight || folder.quantity} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Test Result:</span>
                        <Badge variant="outline" className="text-green-600">
                          {folder.labTesting?.overallResult || "Approved"}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
                      onClick={() => handleStartManufacturing(folder)}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Generate QR Code
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedFolders.map((folder) => (
                <Card key={folder.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{folder.herbName}</CardTitle>
                      <Badge className="bg-green-600">Completed</Badge>
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
                        <span className="text-gray-500">Batch Number:</span>
                        <span className="font-mono text-xs">{folder.manufacturing?.batchNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Final Product:</span>
                        <span>{folder.manufacturing?.finalProductWeight} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">QR Code:</span>
                        <span className="font-mono text-xs">{folder.manufacturing?.qrCodeId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Expiry:</span>
                        <span className="text-xs">
                          {folder.manufacturing?.expiryDate
                            ? new Date(folder.manufacturing.expiryDate).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button
                        variant="outline"
                        className="flex-1 bg-transparent text-xs"
                        onClick={() => {
                          const qrId = folder.manufacturing?.qrCodeId;
                          if (qrId) window.open(`/verify/${qrId}`, '_blank');
                        }}
                      >
                        <QrCode className="h-3 w-3 mr-1" />
                        View QR
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 bg-transparent text-xs"
                        onClick={() => {
                          const qrId = folder.manufacturing?.qrCodeId;
                          const content = `Herb: ${folder.herbName}\nBatch: ${folder.manufacturing?.batchNumber}\nQR ID: ${qrId}\nExpiry: ${folder.manufacturing?.expiryDate}`;
                          const blob = new Blob([content], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${folder.herbName}-${qrId}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isManufacturingModalOpen} onOpenChange={setIsManufacturingModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manufacturing - {selectedFolder?.herbName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="batchNumber">Batch Number</Label>
              <Input
                id="batchNumber"
                value={manufacturingData.batchNumber}
                onChange={(e) => setManufacturingData((prev) => ({ ...prev, batchNumber: e.target.value }))}
                placeholder="Auto-generated batch number"
              />
            </div>

            <div>
              <Label htmlFor="finalProductWeight">Final Product Weight (kg)</Label>
              <Input
                id="finalProductWeight"
                type="number"
                step="0.1"
                value={manufacturingData.finalProductWeight}
                onChange={(e) => setManufacturingData((prev) => ({ ...prev, finalProductWeight: e.target.value }))}
                placeholder="Enter final product weight"
              />
            </div>

            <div>
              <Label htmlFor="packagingType">Packaging Type</Label>
              <Select
                value={manufacturingData.packagingType}
                onValueChange={(value) => setManufacturingData((prev) => ({ ...prev, packagingType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select packaging type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="powder-sachets">Powder Sachets</SelectItem>
                  <SelectItem value="capsules">Capsules</SelectItem>
                  <SelectItem value="tablets">Tablets</SelectItem>
                  <SelectItem value="bulk-powder">Bulk Powder</SelectItem>
                  <SelectItem value="extract-bottles">Extract Bottles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="date"
                value={manufacturingData.expiryDate}
                onChange={(e) => setManufacturingData((prev) => ({ ...prev, expiryDate: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="notes">Manufacturing Notes</Label>
              <Textarea
                id="notes"
                value={manufacturingData.notes}
                onChange={(e) => setManufacturingData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Manufacturing process notes..."
                rows={3}
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsManufacturingModalOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCompleteManufacturing} className="flex-1 bg-purple-600 hover:bg-purple-700">
                Complete & Generate QR
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
