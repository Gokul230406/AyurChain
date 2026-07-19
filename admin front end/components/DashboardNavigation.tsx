"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Leaf, Home, TestTube, Factory, Package, Shield, RefreshCw } from "lucide-react"

const ROLES = [
  { key: "processing", label: "Processing Unit", color: "bg-blue-100 text-blue-800", path: "/processing" },
  { key: "lab", label: "Lab Unit", color: "bg-purple-100 text-purple-800", path: "/lab" },
  { key: "manufacturing", label: "Manufacturing", color: "bg-green-100 text-green-800", path: "/manufacturing" },
]

export default function DashboardNavigation() {
  const [activeRole, setActiveRole] = useState<string>("")

  useEffect(() => {
    // Detect role from current page path
    const path = window.location.pathname
    const matched = ROLES.find((r) => path.startsWith(r.path))
    if (matched) {
      setActiveRole(matched.key)
      // Persist role to localStorage so other components can use it
      localStorage.setItem("userRole", matched.key)
      const existing = localStorage.getItem("user")
      if (!existing) {
        localStorage.setItem("user", JSON.stringify({ username: matched.label, role: matched.key }))
      } else {
        // Update role in existing user object
        try {
          const u = JSON.parse(existing)
          u.role = matched.key
          u.username = matched.label
          localStorage.setItem("user", JSON.stringify(u))
        } catch {}
      }
    } else {
      const stored = localStorage.getItem("userRole")
      if (stored) setActiveRole(stored)
    }
  }, [])

  const handleRoleSwitch = (role: typeof ROLES[0]) => {
    localStorage.setItem("userRole", role.key)
    localStorage.setItem("user", JSON.stringify({ username: role.label, role: role.key }))
    window.location.href = role.path
  }

  const currentRole = ROLES.find((r) => r.key === activeRole)

  const getRoleIcon = (key: string) => {
    if (key === "processing") return <Package className="w-4 h-4" />
    if (key === "lab") return <TestTube className="w-4 h-4" />
    if (key === "manufacturing") return <Factory className="w-4 h-4" />
    return null
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-3">
            <Leaf className="h-6 w-6 text-green-600" />
            <span className="font-bold text-lg">AyurChain</span>
            {currentRole && (
              <Badge className={`${currentRole.color} flex items-center gap-1`}>
                {getRoleIcon(currentRole.key)}
                {currentRole.label}
              </Badge>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/")}>
              <Home className="w-4 h-4 mr-1" />
              Home
            </Button>

            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/certification")}>
              <Shield className="w-4 h-4 mr-1" />
              Certifications
            </Button>

            {ROLES.map((role) => (
              <Button
                key={role.key}
                variant={activeRole === role.key ? "default" : "outline"}
                size="sm"
                onClick={() => handleRoleSwitch(role)}
                className={activeRole === role.key ? "bg-gray-800 text-white" : ""}
              >
                {getRoleIcon(role.key)}
                <span className="ml-1">{role.label}</span>
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
