"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Activity, Users, Coins } from "lucide-react";
import Image from "next/image";

export default function AdminOverviewPage() {
  const [revenue, setRevenue] = useState<string | number>("Loading...");
  const [projects, setProjects] = useState<string | number>("Loading...");
  const [timeSpent, setTimeSpent] = useState<string | number>("Loading...");
  const [resources, setResources] = useState<string | number>("Loading...");

  useEffect(() => {
    // Revenue: try admin analytics; require admin token
    apiClient
      .get("/api/billing/admin/analytics")
      .then((res) => {
        const data = res.data;
        if (data && (data.totalRevenue !== undefined)) {
          setRevenue(`$${Number(data.totalRevenue).toLocaleString()}`);
        } else {
          setRevenue("API not Available for this");
        }
      })
      .catch(() => setRevenue("API not Available for this"));

    // Projects: no dedicated API; mark as not available
    setProjects("API not Available for this");

    // Time spent: no dedicated API; mark as not available
    setTimeSpent("API not Available for this");

    // Resources: try system resource usage
    apiClient
      .get("/api/v1/analytics/system/resource-usage")
      .then((res) => {
        const m = res.data?.metrics;
        if (m) {
          const cpu = Math.round(m.cpuPercent ?? m.cpu?.percent ?? 0);
          const mem = Math.round(m.memoryPercent ?? m.memory?.percent ?? 0);
          setResources(`${cpu}% CPU • ${mem}% MEM`);
        } else {
          setResources("API not Available for this");
        }
      })
      .catch(() => setResources("API not Available for this"));
  }, []);

  return (
    <div className="relative space-y-6">
      {/* Background decorative SVGs */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        {/* Top-left background */}
        <div className="absolute -top-10 -left-10 md:-top-16 md:-left-8 opacity-40 md:opacity-60">
          <Image
            src="/assets/dashboard/BG-left.svg"
            alt=""
            width={700}
            height={700}
            className="max-w-none select-none"
            priority
          />
        </div>

        {/* Right-aligned background */}
        <div className="absolute top-10 right-0 md:-top-4 opacity-40 md:opacity-70">
          <Image
            src="/assets/dashboard/BG-right.svg"
            alt=""
            width={600}
            height={600}
            className="max-w-none select-none"
            priority
          />
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white text-sm">Total revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white whitespace-normal leading-tight">{revenue}</span>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-xs text-white/50 mt-2">Data source check</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white text-sm">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white whitespace-normal leading-tight">{projects}</span>
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-xs text-white/50 mt-2">Data source check</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white text-sm">Time spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white whitespace-normal leading-tight">{timeSpent}</span>
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-xs text-white/50 mt-2">Data source check</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white text-sm">Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white whitespace-normal leading-tight">{resources}</span>
              <Coins className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-xs text-white/50 mt-2">Data source check</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project summary */}
        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Project summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-white/70">Name</TableHead>
                  <TableHead className="text-white/70">Project manager</TableHead>
                  <TableHead className="text-white/70">Due date</TableHead>
                  <TableHead className="text-white/70">Status</TableHead>
                  <TableHead className="text-right text-white/70">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { name: "Nelsa web development", pm: "Om prakash sao", due: "May 25, 2025", status: "Completed", progress: 100, color: "emerald" },
                  { name: "Datascale AI app", pm: "Nelisan mando", due: "Jun 20, 2025", status: "Delayed", progress: 28, color: "yellow" },
                  { name: "Media channel branding", pm: "Truvelly priya", due: "July 13, 2025", status: "At risk", progress: 15, color: "red" },
                  { name: "Corfix iOS app", pm: "Matte hanney", due: "Dec 20, 2025", status: "Completed", progress: 100, color: "emerald" },
                ].map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="text-white">{r.name}</TableCell>
                    <TableCell className="text-white/80">{r.pm}</TableCell>
                    <TableCell className="text-white/60">{r.due}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-white/10 border-white/10 text-white">
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-white/60 w-10 text-right">{r.progress}%</span>
                        <Progress value={r.progress} className="w-36 h-2" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Overall progress */}
        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
                  <path d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                  <path d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="#FF6900" strokeWidth="3" strokeDasharray="72, 100" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold">72%</div>
                    <div className="text-xs text-white/60">Completed</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 w-full mt-6 text-center text-xs text-white/60">
                <div>
                  <div className="text-white text-base font-semibold">95</div>
                  <div>Total</div>
                </div>
                <div>
                  <div className="text-emerald-400 text-base font-semibold">26</div>
                  <div>Completed</div>
                </div>
                <div>
                  <div className="text-yellow-400 text-base font-semibold">35</div>
                  <div>Delayed</div>
                </div>
                <div>
                  <div className="text-orange-400 text-base font-semibold">35</div>
                  <div>On going</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today tasks (simplified) */}
      <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">Today task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { t: "Create a user flow of social application design", s: "Approved" },
            { t: "Landing page design for Fintech project of singapore", s: "In review" },
            { t: "Interactive prototype for app screens of delarnine project", s: "On going" },
          ].map((i) => (
            <div key={i.t} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
              <div className="text-white/90 text-sm">{i.t}</div>
              <Badge variant="outline" className="border-white/20 text-white/80">{i.s}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
