"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { API_BASE_URL } from "../../lib/config";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface RecordItem {
  _id?: string;
  farmer: string;
  geojson: any;
  ipfsCid: string;
  hash: string;
  certified?: boolean;
}

export default function Page() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [prevCount, setPrevCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [certifying, setCertifying] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<RecordItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const addToAllHerbs = async (rec: RecordItem) => {
    try {
      const p: any = rec.geojson?.properties || {};
      const coords: any[] = rec.geojson?.geometry?.coordinates || [];
      const lat = coords[1];
      const lng = coords[0];
      const payload = {
        id: p.id || rec.hash,
        herbName: p.herbName,
        quantity: p.quantity,
        geotaggedImage: p.photo,
        location: `${lat?.toFixed ? lat.toFixed(4) : lat}, ${lng?.toFixed ? lng.toFixed(4) : lng}`,
        farmerName: p.farmerName,
        collectionDate: p.timestamp,
        additionalNotes: p.notes || '',
      };
      // Step 1: Create the folder entry
      const createRes = await fetch('/api/herbs/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!createRes.ok) return false;
      // Step 2: Approve it so Processing Unit can see it
      const folder = await createRes.json();
      const folderId = folder?.folder?.id || payload.id;
      await fetch('/api/herbs/folders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId,
          action: 'approve',
          adminUser: 'Admin',
        }),
      });
      return true;
    } catch (e) {
      return false;
    }
  };

  const fetchPending = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/pending`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : 0;
      setRecords(data as RecordItem[]);
      setPrevCount((prev) => {
        if (prev !== null && count > prev) {
          alert(`🔔 New herb record synced from farmer DApp! Total pending: ${count}`);
        }
        return count;
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load pending records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 3000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  const certify = async (hash: string) => {
    setCertifying(hash);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/certify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error("Certification failed");
      // Find the record and add it to the herb supply chain pipeline
      const certifiedRecord = records.find((r) => r.hash === hash);
      if (certifiedRecord) {
        const added = await addToAllHerbs(certifiedRecord);
        console.log("[certification] Added to supply chain pipeline:", added);
      }
      setRecords((prev) => prev.filter((r) => r.hash !== hash));
    } catch (e: any) {
      setError(e?.message || "Failed to certify record");
    } finally {
      setCertifying(null);
    }
  };


  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Admin • Pending Certifications</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPending}
            className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
          >
            Refresh
          </button>
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
            Go to Dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-600">Loading pending certifications…</div>
      ) : records.length === 0 ? (
        <div className="text-gray-600">No pending certifications.</div>
      ) : (
        <div className="grid gap-4">
          {records.map((rec) => {
            const p: any = rec.geojson?.properties || {};
            const coords: any[] = rec.geojson?.geometry?.coordinates || [];
            const lat = coords[1];
            const lng = coords[0];
            return (
              <div key={rec.hash} className="rounded border p-4">
                <div className="grid md:grid-cols-3 gap-4 items-start">
                  <div className="md:col-span-1">
                    <div className="aspect-video w-full overflow-hidden rounded bg-gray-100">
                      {p.photo ? (
                        <img src={p.photo} alt={p.herbName || 'Herb'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No photo</div>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500">Farmer</div>
                        <div className="font-medium">{p.farmerName || rec.farmer || '—'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Herb</div>
                        <div className="font-medium">{p.herbName || '—'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Quantity</div>
                        <div className="font-medium">{p.quantity} {p.unit}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Location</div>
                        <div className="font-medium">{lat?.toFixed ? lat.toFixed(4) : lat}, {lng?.toFixed ? lng.toFixed(4) : lng}</div>
                      </div>
                    </div>
                    {p.notes ? (
                      <div className="text-sm mt-3">
                        <div className="text-gray-500 mb-1">Notes</div>
                        <div className="rounded bg-gray-50 p-2 whitespace-pre-wrap">{p.notes}</div>
                      </div>
                    ) : null}
                    <div className="mt-4 flex gap-2">
                      <Button onClick={() => certify(rec.hash)} disabled={certifying === rec.hash}>
                        {certifying === rec.hash ? 'Certifying…' : 'Certify'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setRejectTarget(rec); setRejectReason(''); setRejectOpen(true); }}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject submission</DialogTitle>
            <DialogDescription>
              Add a comment or reason for rejecting this submission. The farmer will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              placeholder="Reason for rejection"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!rejectTarget) { setRejectOpen(false); return; }
                setRejecting(true);
                try {
                  const p: any = rejectTarget.geojson?.properties || {};
                  // Call backend to mark rejection
                  const resp = await fetch(`${API_BASE_URL}/admin/reject`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      hash: rejectTarget.hash,
                      reason: rejectReason || 'No reason provided',
                    }),
                  });
                  if (resp.ok) {
                    // Remove from list and close dialog
                    setRecords((prev) => prev.filter(r => r.hash !== rejectTarget.hash));
                    setRejectOpen(false);
                  }
                } finally {
                  setRejecting(false);
                }
              }}
              disabled={rejecting || !rejectReason.trim()}
            >
              {rejecting ? 'Rejecting…' : 'Submit rejection'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
