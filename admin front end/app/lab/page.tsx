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
import { TestTube, Clock, CheckCircle, User, Calendar, Weight, Upload } from "lucide-react"
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
}

export default function LabDashboard() {
  const [folders, setFolders] = useState<HerbFolder[]>([])
  const [user, setUser] = useState<any>(null)
  const [selectedFolder, setSelectedFolder] = useState<HerbFolder | null>(null)
  const [isTestingModalOpen, setIsTestingModalOpen] = useState(false)
  const [testingData, setTestingData] = useState({
    moistureContent: "",
    heavyMetals: "",
    microbialCount: "",
    pesticideResidue: "",
    certificateFile: null as File | null,
    overallResult: "",
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
      const response = await fetch("/api/herbs/folders?role=lab")
      const data = await response.json()
      if (data.success) {
        setFolders(data.folders)
      }
    } catch (error) {
      console.error("[v0] Error fetching herb folders:", error)
    }
  }

  const handleStartTesting = (folder: HerbFolder) => {
    setSelectedFolder(folder)
    setIsTestingModalOpen(true)
  }

  const handleCompleteTesting = async () => {
    if (!selectedFolder) return

    try {
      const response = await fetch("/api/herbs/folders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folderId: selectedFolder.id,
          role: "lab",
          updateData: {
            ...testingData,
            testedBy: user?.username || "Unknown",
            testParameters: [
              { name: "Moisture Content", value: testingData.moistureContent, unit: "%" },
              { name: "Heavy Metals", value: testingData.heavyMetals, unit: "ppm" },
              { name: "Microbial Count", value: testingData.microbialCount, unit: "CFU/g" },
              { name: "Pesticide Residue", value: testingData.pesticideResidue, unit: "ppm" },
            ],
            certificateUrl: testingData.certificateFile ? "certificate_uploaded.pdf" : null,
          },
        }),
      })

      const data = await response.json()
      if (data.success) {
        setFolders((prev) => prev.map((folder) => (folder.id === selectedFolder.id ? data.folder : folder)))
        setIsTestingModalOpen(false)
        setTestingData({
          moistureContent: "",
          heavyMetals: "",
          microbialCount: "",
          pesticideResidue: "",
          certificateFile: null,
          overallResult: "",
          notes: "",
        })
      }
    } catch (error) {
      console.error("[v0] Error updating testing data:", error)
    }
  }

  const readyForTesting = folders.filter((folder) => folder.currentStage === "processed")
  const currentlyTesting = folders.filter((folder) => folder.currentStage === "lab-testing")

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <DashboardNavigation />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Lab Unit Dashboard</h1>
          <p className="text-gray-600">Quality testing and certification management</p>
        </div>

        <Tabs defaultValue="ready" className="space-y-6">
          <TabsList>
            <TabsTrigger value="ready" className="flex items-center space-x-2">
              <TestTube className="h-4 w-4" />
              <span>Ready for Testing ({readyForTesting.length})</span>
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Currently Testing ({currentlyTesting.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ready" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {readyForTesting.map((folder) => (
                <Card key={folder.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{folder.herbName}</CardTitle>
                      <Badge variant="secondary">Ready</Badge>
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
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500">Processed:</span>
                        <span>
                          {folder.processing?.processedDate
                            ? new Date(folder.processing.processedDate).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Weight className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500">Final Weight:</span>
                        <span>{folder.processing?.finalWeight || folder.quantity} kg</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500">Processed by:</span>
                        <span>{folder.processing?.processedBy || "Unknown"}</span>
                      </div>
                      {folder.processing?.dryingMethod && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <strong>Drying:</strong> {folder.processing.dryingMethod} ({folder.processing.dryingDuration}
                          h)
                        </div>
                      )}
                    </div>
                    <Button
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleStartTesting(folder)}
                    >
                      Start Testing
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="testing" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {currentlyTesting.map((folder) => (
                <Card key={folder.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{folder.herbName}</CardTitle>
                      <Badge variant="outline">Testing</Badge>
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
                        <span className="text-gray-500">Processed Date:</span>
                        <span>
                          {folder.processing?.processedDate
                            ? new Date(folder.processing.processedDate).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Final Weight:</span>
                        <span>{folder.processing?.finalWeight || folder.quantity} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Processing Unit:</span>
                        <span>{folder.processing?.processedBy || "Unknown"}</span>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full mt-4 bg-transparent" onClick={() => handleStartTesting(folder)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Testing
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isTestingModalOpen} onOpenChange={setIsTestingModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lab Testing - {selectedFolder?.herbName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="moistureContent">Moisture Content (%)</Label>
                <Input
                  id="moistureContent"
                  type="number"
                  step="0.1"
                  value={testingData.moistureContent}
                  onChange={(e) => setTestingData((prev) => ({ ...prev, moistureContent: e.target.value }))}
                  placeholder="e.g., 12.5"
                />
              </div>

              <div>
                <Label htmlFor="heavyMetals">Heavy Metals (ppm)</Label>
                <Input
                  id="heavyMetals"
                  type="number"
                  step="0.01"
                  value={testingData.heavyMetals}
                  onChange={(e) => setTestingData((prev) => ({ ...prev, heavyMetals: e.target.value }))}
                  placeholder="e.g., 0.05"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="microbialCount">Microbial Count (CFU/g)</Label>
                <Input
                  id="microbialCount"
                  type="number"
                  value={testingData.microbialCount}
                  onChange={(e) => setTestingData((prev) => ({ ...prev, microbialCount: e.target.value }))}
                  placeholder="e.g., 1000"
                />
              </div>

              <div>
                <Label htmlFor="pesticideResidue">Pesticide Residue (ppm)</Label>
                <Input
                  id="pesticideResidue"
                  type="number"
                  step="0.001"
                  value={testingData.pesticideResidue}
                  onChange={(e) => setTestingData((prev) => ({ ...prev, pesticideResidue: e.target.value }))}
                  placeholder="e.g., 0.001"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="certificateFile">Test Certificate</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="certificateFile"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) =>
                    setTestingData((prev) => ({ ...prev, certificateFile: e.target.files?.[0] || null }))
                  }
                  className="flex-1"
                />
                <Upload className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <Label htmlFor="overallResult">Overall Test Result</Label>
              <Select
                value={testingData.overallResult}
                onValueChange={(value) => setTestingData((prev) => ({ ...prev, overallResult: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select test result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="conditional">Conditional Approval</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Lab Notes</Label>
              <Textarea
                id="notes"
                value={testingData.notes}
                onChange={(e) => setTestingData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional observations and notes..."
                rows={3}
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsTestingModalOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCompleteTesting} className="flex-1 bg-blue-600 hover:bg-blue-700">
                Complete Testing
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
