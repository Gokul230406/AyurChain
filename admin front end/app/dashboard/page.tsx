"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Calendar, User, Package, TestTube, Factory, Eye } from "lucide-react"
import DashboardNavigation from "@/components/DashboardNavigation"
import { API_BASE_URL } from "../../lib/config"

interface HerbFolder {
  id: string
  herbName: string
  quantity: string
  geotaggedImage: string
  location: string
  farmerName: string
  collectionDate: string
  additionalNotes: string
  status: "received" | "processing" | "lab_testing" | "manufacturing" | "completed"
  processingData?: any
  labData?: any
  manufacturingData?: any
  createdAt: string
}

export default function CentralizedDashboard() {
  const [herbFolders, setHerbFolders] = useState<HerbFolder[]>([])
  const [selectedHerb, setSelectedHerb] = useState<HerbFolder | null>(null)
  const [userRole, setUserRole] = useState<string>("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [incomingRecords, setIncomingRecords] = useState<any[]>([])
  const [prevCount, setPrevCount] = useState<number | null>(null)

  useEffect(() => {
    // Get user role from localStorage
    const role = localStorage.getItem("userRole")
    setUserRole(role || "")

    // Fetch all herb folders
    fetchHerbFolders()
  }, [])

  useEffect(() => {
    const loadPending = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/pending`, { cache: 'no-store' })
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        const count = Array.isArray(data) ? data.length : 0
        setPendingCount(count)
        setIncomingRecords(Array.isArray(data) ? data : [])
        
        // Notify user if a new record is synced from the DApp
        setPrevCount((prev) => {
          if (prev !== null && count > prev) {
            alert(`🔔 New herb record synced from farmer DApp! Total pending: ${count}`)
          }
          return count
        })
      } catch {
        setPendingCount(null)
        setIncomingRecords([])
      }
    }
    loadPending()
    const interval = setInterval(loadPending, 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchHerbFolders = async () => {
    try {
      const response = await fetch("/api/herbs/folders")
      const data = await response.json()
      setHerbFolders(data.folders || [])
    } catch (error) {
      console.error("Error fetching herb folders:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "received":
        return "bg-blue-100 text-blue-800"
      case "processing":
        return "bg-yellow-100 text-yellow-800"
      case "lab_testing":
        return "bg-purple-100 text-purple-800"
      case "manufacturing":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "received":
        return <Package className="w-4 h-4" />
      case "processing":
        return <Factory className="w-4 h-4" />
      case "lab_testing":
        return <TestTube className="w-4 h-4" />
      case "manufacturing":
        return <Factory className="w-4 h-4" />
      case "completed":
        return <Package className="w-4 h-4" />
      default:
        return <Package className="w-4 h-4" />
    }
  }

  const canUserEdit = (herbStatus: string) => {
    if (userRole === "processing" && (herbStatus === "received" || herbStatus === "processing")) return true
    if (userRole === "lab" && (herbStatus === "processing" || herbStatus === "lab_testing")) return true
    if (userRole === "manufacturing" && (herbStatus === "lab_testing" || herbStatus === "manufacturing")) return true
    return false
  }

  const handleSelectHerb = (herb: HerbFolder) => {
    setSelectedHerb(herb)
    setFormData({})
    setIsModalOpen(true)
  }

  const handleSubmitEntry = async () => {
    if (!selectedHerb) return

    try {
      const endpoint = `/api/herbs/${selectedHerb.id}/${userRole}`
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setIsModalOpen(false)
        fetchHerbFolders() // Refresh data
        alert("Entry submitted successfully!")
      }
    } catch (error) {
      console.error("Error submitting entry:", error)
      alert("Error submitting entry")
    }
  }

  const renderRoleSpecificForm = () => {
    if (!selectedHerb) return null

    switch (userRole) {
      case "processing":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="dryingMethod">Drying Method</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, dryingMethod: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select drying method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sun-dried">Sun Dried</SelectItem>
                  <SelectItem value="shade-dried">Shade Dried</SelectItem>
                  <SelectItem value="machine-dried">Machine Dried</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="duration">Drying Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration || ""}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cleaningSteps">Cleaning Steps</Label>
              <Textarea
                id="cleaningSteps"
                value={formData.cleaningSteps || ""}
                onChange={(e) => setFormData({ ...formData, cleaningSteps: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="finalWeight">Final Weight (kg)</Label>
              <Input
                id="finalWeight"
                type="number"
                step="0.1"
                value={formData.finalWeight || ""}
                onChange={(e) => setFormData({ ...formData, finalWeight: e.target.value })}
              />
            </div>
          </div>
        )

      case "lab":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="moistureContent">Moisture Content (%)</Label>
              <Input
                id="moistureContent"
                type="number"
                step="0.1"
                value={formData.moistureContent || ""}
                onChange={(e) => setFormData({ ...formData, moistureContent: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="heavyMetals">Heavy Metals (ppm)</Label>
              <Input
                id="heavyMetals"
                type="number"
                step="0.01"
                value={formData.heavyMetals || ""}
                onChange={(e) => setFormData({ ...formData, heavyMetals: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="microbialCount">Microbial Count (CFU/g)</Label>
              <Input
                id="microbialCount"
                type="number"
                value={formData.microbialCount || ""}
                onChange={(e) => setFormData({ ...formData, microbialCount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="testResult">Overall Test Result</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, testResult: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select test result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case "manufacturing":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="batchNumber">Batch Number</Label>
              <Input
                id="batchNumber"
                value={formData.batchNumber || ""}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="finalProductWeight">Final Product Weight (kg)</Label>
              <Input
                id="finalProductWeight"
                type="number"
                step="0.1"
                value={formData.finalProductWeight || ""}
                onChange={(e) => setFormData({ ...formData, finalProductWeight: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="packagingType">Packaging Type</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, packagingType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select packaging type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottles">Bottles</SelectItem>
                  <SelectItem value="pouches">Pouches</SelectItem>
                  <SelectItem value="containers">Containers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate || ""}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
          </div>
        )

      default:
        return <p>No form available for your role.</p>
    }
  }

  const filteredHerbs = herbFolders.filter((herb) => {
    if (userRole === "processing") return ["received", "processing"].includes(herb.status)
    if (userRole === "lab") return ["processing", "lab_testing"].includes(herb.status)
    if (userRole === "manufacturing") return ["lab_testing", "manufacturing", "completed"].includes(herb.status)
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <DashboardNavigation />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Herb Supply Chain Dashboard</h1>
          <p className="text-gray-600">Centralized view of all herb folders - Role: {userRole?.toUpperCase()}</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="rounded border px-3 py-2 text-sm">
              Pending Certifications: {pendingCount === null ? '—' : pendingCount}
            </div>
            <button
              className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
              onClick={() => (window.location.href = '/certification')}
            >
              Review Certifications
            </button>
          </div>
        </div>

        {/* Received from Farmers */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Received from Farmers</h2>
          {incomingRecords.length === 0 ? (
            <p className="text-sm text-gray-600">No new received items.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {incomingRecords.map((rec) => {
                const props = rec.geojson?.properties || {}
                const coords = rec.geojson?.geometry?.coordinates || []
                const lat = coords[1]
                const lng = coords[0]
                const id = props.id || rec.hash
                return (
                  <div key={rec.hash} className="rounded border p-3 bg-white">
                    <div className="aspect-video mb-2 overflow-hidden rounded bg-gray-100">
                      {props.photo ? (
                        <img src={props.photo} alt={props.herbName || 'Herb'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No photo</div>
                      )}
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{props.herbName || 'Unknown Herb'}</div>
                      <div className="text-gray-600">Farmer: {props.farmerName || '—'}</div>
                      <div className="text-gray-600">Qty: {props.quantity} {props.unit}</div>
                      <div className="text-gray-600">GPS: {lat?.toFixed ? lat.toFixed(4) : lat}, {lng?.toFixed ? lng.toFixed(4) : lng}</div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                        onClick={async () => {
                          try {
                            const payload = {
                              id,
                              herbName: props.herbName,
                              quantity: props.quantity,
                              geotaggedImage: props.photo,
                              location: `${lat}, ${lng}`,
                              farmerName: props.farmerName,
                              collectionDate: props.timestamp,
                              additionalNotes: props.notes || '',
                            }
                            const res = await fetch('/api/herbs/folders', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(payload),
                            })
                            if (res.ok) {
                              fetchHerbFolders()
                              alert('Added to All Herbs')
                            } else {
                              alert('Failed to add to All Herbs')
                            }
                          } catch (e) {
                            alert('Error adding to All Herbs')
                          }
                        }}
                      >
                        Add to All Herbs
                      </button>
                      <button
                        className="rounded bg-green-600 px-3 py-1 text-sm text-white"
                        onClick={() => (window.location.href = '/processing')}
                      >
                        Start Processing
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All Herbs</TabsTrigger>
            <TabsTrigger value="received">Received</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="lab_testing">Lab Testing</TabsTrigger>
            <TabsTrigger value="manufacturing">Manufacturing</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHerbs.map((herb) => (
                <Card key={herb.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{herb.herbName}</CardTitle>
                      <Badge className={`${getStatusColor(herb.status)} flex items-center gap-1`}>
                        {getStatusIcon(herb.status)}
                        {herb.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <CardDescription>Quantity: {herb.quantity}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="aspect-video relative overflow-hidden rounded-lg">
                      <img
                        src={herb.geotaggedImage || "/placeholder.svg"}
                        alt={herb.herbName}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{herb.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{herb.farmerName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(herb.collectionDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3">
                      <Dialog open={isModalOpen && selectedHerb?.id === herb.id} onOpenChange={setIsModalOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-transparent"
                            onClick={() => handleSelectHerb(herb)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{herb.herbName} - Details & Entry</DialogTitle>
                            <DialogDescription>Add your {userRole} data for this herb batch</DialogDescription>
                          </DialogHeader>

                          <div className="space-y-6">
                            {/* Herb Details */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h3 className="font-semibold mb-3">Original Data</h3>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <strong>Herb:</strong> {herb.herbName}
                                </div>
                                <div>
                                  <strong>Quantity:</strong> {herb.quantity}
                                </div>
                                <div>
                                  <strong>Location:</strong> {herb.location}
                                </div>
                                <div>
                                  <strong>Farmer:</strong> {herb.farmerName}
                                </div>
                                <div>
                                  <strong>Collection Date:</strong> {new Date(herb.collectionDate).toLocaleDateString()}
                                </div>
                                <div>
                                  <strong>Status:</strong> {herb.status}
                                </div>
                              </div>
                              {herb.additionalNotes && (
                                <div className="mt-3">
                                  <strong>Notes:</strong> {herb.additionalNotes}
                                </div>
                              )}
                            </div>

                            {/* Role-specific form */}
                            {canUserEdit(herb.status) && (
                              <div>
                                <h3 className="font-semibold mb-3">Add Your Entry ({userRole})</h3>
                                {renderRoleSpecificForm()}
                                <Button onClick={handleSubmitEntry} className="w-full mt-4">
                                  Submit Entry
                                </Button>
                              </div>
                            )}

                            {!canUserEdit(herb.status) && (
                              <div className="bg-yellow-50 p-4 rounded-lg">
                                <p className="text-yellow-800">
                                  This herb is not ready for {userRole} stage yet, or you don't have permission to edit
                                  it.
                                </p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Status-specific tabs */}
          {["received", "processing", "lab_testing", "manufacturing"].map((status) => (
            <TabsContent key={status} value={status} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {herbFolders
                  .filter((herb) => herb.status === status)
                  .map((herb) => (
                    <Card key={herb.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{herb.herbName}</CardTitle>
                        <CardDescription>Quantity: {herb.quantity}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="aspect-video relative overflow-hidden rounded-lg">
                          <img
                            src={herb.geotaggedImage || "/placeholder.svg"}
                            alt={herb.herbName}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{herb.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>{herb.farmerName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(herb.collectionDate).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full bg-transparent"
                          onClick={() => handleSelectHerb(herb)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Select & Add Entry
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
