import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Upload, Calendar, FileText, Edit, MapPin, Eye, Play, Filter, X, ArrowDownRight, ArrowLeft, UploadIcon, ArrowRight, RockingChair, Target, TargetIcon, PinOff, Pin, Save, RefreshCcw, SaveIcon, SaveOff, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import * as mammoth from 'mammoth/mammoth.browser';
import { FaSpinner } from 'react-icons/fa';
import upload from '../../assets/images/upload.png';
import calendar from '../../assets/images/calendar.png';

interface Task {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  color: string;
  swimlane: string;
  priority: 'high' | 'medium' | 'low';
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked';
  assignee?: string;
  attachments?: string[];
  comments?: string[];
  notes?: string;
  labels?: string[]; // color hex strings
}

interface Milestone {
  id: string;
  title: string;
  date: string;
  description: string;
}

interface Swimlane {
  id: string;
  name: string;
  tasks: Task[];
}

interface RoadmapData {
  title: string;
  overview: string;
  timeframe: {
    startYear: number;
    endYear: number;
    quarters: string[];
  };
  swimlanes: Swimlane[];
  milestones: Milestone[];
}

type ViewMode = 'quarter' | 'month' | 'week' | 'day' | 'year';

export default function StrategicPlanner() {
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [hoveredMilestone, setHoveredMilestone] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('quarter');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedWindow, setSelectedWindow] = useState<{ start: string; end: string; label: string; sublabel?: string } | null>(null);
  const [attachmentInput, setAttachmentInput] = useState<string>('');
  const [commentInput, setCommentInput] = useState<string>('');
  const [labelInput, setLabelInput] = useState<string>('#7c3aed');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedRoadmapId, setSavedRoadmapId] = useState<string | null>(null);
  const [savedRoadmaps, setSavedRoadmaps] = useState<any[]>([]);
  const [isLoadingRoadmaps, setIsLoadingRoadmaps] = useState<boolean>(false);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [tempTitle, setTempTitle] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const fetchSavedRoadmaps = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      setIsLoadingRoadmaps(true);
      const res = await fetch('/api/roadmaps', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load PRDs');
      const data = await res.json();
      setSavedRoadmaps(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingRoadmaps(false);
    }
  };

  useEffect(() => {
    fetchSavedRoadmaps();
  }, []);

  // Handle zoom level change
  const handleZoomChange = (value: number[]) => {
    setZoomLevel(value[0]);
  };

  // Reset zoom to 100%
  const resetZoom = () => {
    setZoomLevel(100);
  };

  const loadRoadmapFromBackend = async (roadmapId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please sign in');
        return;
      }
      toast.loading('Loading roadmap...');
      const res = await fetch(`/api/roadmaps/${roadmapId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load roadmap');
      const data = await res.json();
      const roadmap = data.roadmap;
      const embeddedTasks = Array.isArray(roadmap.tasks) ? roadmap.tasks : [];
      const lanes = Array.isArray(roadmap.swimlanes) ? roadmap.swimlanes : [];
      const swimlanes = lanes.map((lane: any) => ({
        id: lane.id,
        name: lane.name,
        tasks: embeddedTasks
          .filter((t: any) => t.swimlaneId === lane.id)
          .map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            startDate: t.startDate,
            endDate: t.endDate,
            color: t.color || lane.color,
            swimlane: t.swimlaneId,
            priority: (t.priority || 'medium') as Task['priority'],
            status: (t.status || 'not-started') as Task['status'],
            assignee: t.assignee,
            attachments: t.attachments,
            comments: t.comments,
            notes: t.notes,
            labels: t.labels,
          }))
      }));
      const milestones = Array.isArray(roadmap.milestones) ? roadmap.milestones : [];
      const assembled: RoadmapData = {
        title: roadmap.title,
        overview: roadmap.overview || '',
        timeframe: roadmap.timeframe || { startYear: 0, endYear: 0, quarters: ['Q1', 'Q2', 'Q3', 'Q4'] },
        swimlanes,
        milestones,
      };
      setRoadmapData(assembled);
      setStartDate(roadmap.projectStartDate || '');
      setEndDate(roadmap.projectEndDate || '');
      setFileName(roadmap.prdFileName || '');
      setSavedRoadmapId(roadmap._id);
      toast.dismiss();
      toast.success('Roadmap loaded');
    } catch (e) {
      console.error(e);
      toast.dismiss();
      toast.error('Failed to load roadmap');
    }
  };

  const saveTaskMeta = async (task: Task) => {
    if (!savedRoadmapId) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please sign in to save tasks');
        return;
      }
      const currentLane = roadmapData?.swimlanes.find(l => l.id === task.swimlane);
      const payload: any = {
        roadmapId: savedRoadmapId,
        swimlaneId: task.swimlane,
        swimlaneName: currentLane?.name,
        id: task.id,
        title: task.title,
        description: task.description,
        startDate: task.startDate,
        endDate: task.endDate,
        color: task.color,
        priority: task.priority,
        status: task.status,
        assignee: task.assignee || '',
        attachments: task.attachments || [],
        comments: task.comments || [],
        notes: task.notes || '',
        labels: task.labels || [],
      };
    } catch (e) {
      console.error(e);
      toast.error('Failed to save task');
    }
  };

  const taskOverlapsWindow = (task: Task, window: { start: string; end: string }) => {
    const taskStart = new Date(task.startDate).getTime();
    const taskEnd = new Date(task.endDate).getTime();
    const windowStart = new Date(window.start).getTime();
    const windowEnd = new Date(window.end).getTime();
    return taskStart <= windowEnd && taskEnd >= windowStart;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') &&
      !file.name.toLowerCase().endsWith('.txt') &&
      !file.name.toLowerCase().endsWith('.md') &&
      !file.name.toLowerCase().endsWith('.doc') &&
      !file.name.toLowerCase().endsWith('.docx')) {
      toast.error('Please upload a PDF, TXT, MD, DOC, or DOCX file');
      return;
    }

    setIsUploading(true);

    try {
      setUploadedFile(file);
      setFileName(file.name);
      toast.success('PRD uploaded successfully! Please set project dates.');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const generateRoadmap = async () => {
    if (!uploadedFile || !startDate || !endDate) {
      toast.error('Please upload a PRD and set project dates');
      return;
    }

    setIsGenerating(true);
    toast.loading('Analyzing your PRD and generating roadmap...');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.dismiss();
        toast.error('Please sign in to generate roadmap');
        return;
      }

      // Create FormData to send file and dates
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('startDate', startDate);
      formData.append('endDate', endDate);
      formData.append('saveToDatabase', 'false'); // We'll save separately with the save button

      const response = await fetch('/api/strategic-planner/generate-roadmap', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.roadmap) {
        throw new Error(result.error || 'Failed to generate roadmap');
      }

      // The backend returns the roadmap in the correct format
      setRoadmapData(result.roadmap);
      toast.dismiss();
      toast.success('Product roadmap generated successfully!');
    } catch (error) {
      console.error('Generation error:', error);
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : 'Failed to generate roadmap. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateTask = (updatedTask: Task) => {
    if (!roadmapData) return;

    const updatedRoadmap = {
      ...roadmapData,
      swimlanes: roadmapData.swimlanes.map(swimlane => ({
        ...swimlane,
        tasks: swimlane.tasks.map(task =>
          task.id === updatedTask.id ? updatedTask : task
        )
      }))
    };

    setRoadmapData(updatedRoadmap);
    setEditingTask(null);
    toast.success('Task updated successfully!');
    // Persist to backend (embedded task upsert)
    void saveTaskMeta(updatedTask);
  };

  const updateMilestone = (updatedMilestone: Milestone) => {
    if (!roadmapData) return;

    const updatedRoadmap = {
      ...roadmapData,
      milestones: roadmapData.milestones.map(milestone =>
        milestone.id === updatedMilestone.id ? updatedMilestone : milestone
      )
    };

    setRoadmapData(updatedRoadmap);
    setEditingMilestone(null);
    toast.success('Milestone updated successfully!');
  };

  const getTimelineConfig = () => {
    if (!roadmapData || !startDate || !endDate) return { periods: [], columns: 12 };

    const start = new Date(startDate);
    const end = new Date(endDate);
    const periods = [];

    const getISOWeek = (date: Date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d as any) - (yearStart as any)) / 86400000 + 1) / 7);
    };

    switch (viewMode) {
      case 'year':
        for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
          periods.push({
            label: year.toString(),
            sublabel: '',
            start: new Date(year, 0, 1),
            end: new Date(year, 11, 31)
          });
        }
        return { periods, columns: periods.length };

      case 'quarter':
        const startYear = start.getFullYear();
        const endYear = end.getFullYear();
        for (let year = startYear; year <= endYear; year++) {
          for (let q = 1; q <= 4; q++) {
            const quarterStart = new Date(year, (q - 1) * 3, 1);
            const quarterEnd = new Date(year, q * 3 - 1, 0);
            if (quarterStart <= end && quarterEnd >= start) {
              periods.push({
                label: year.toString(),
                sublabel: `Q${q}`,
                start: quarterStart,
                end: quarterEnd
              });
            }
          }
        }
        return { periods, columns: periods.length };

      case 'month':
        const current = new Date(start);
        while (current <= end) {
          const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
          const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          periods.push({
            label: current.toLocaleDateString('en-US', { month: 'short' }),
            sublabel: current.getFullYear().toString(),
            start: monthStart,
            end: monthEnd
          });
          current.setMonth(current.getMonth() + 1);
        }
        return { periods, columns: Math.min(periods.length, 24) };

      case 'week':
        // Align to Monday of the first week in range
        const first = new Date(start);
        const startDay = (first.getDay() + 6) % 7; // 0 = Monday
        first.setDate(first.getDate() - startDay);
        const weekCursor = new Date(first);
        while (weekCursor <= end) {
          const weekStart = new Date(weekCursor);
          const weekEnd = new Date(weekCursor);
          weekEnd.setDate(weekStart.getDate() + 6);
          if (weekStart <= end && weekEnd >= start) {
            periods.push({
              label: `W${getISOWeek(weekStart)}`,
              sublabel: weekStart.getFullYear().toString(),
              start: weekStart,
              end: weekEnd,
            });
          }
          weekCursor.setDate(weekCursor.getDate() + 7);
        }
        return { periods, columns: Math.min(periods.length, 52) };

      case 'day':
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const daysCurrent = new Date(start);
        let dayCount = 0;
        while (daysCurrent <= end && dayCount < 90) { // Limit to 90 days for readability
          periods.push({
            label: daysCurrent.getDate().toString(),
            sublabel: daysCurrent.toLocaleDateString('en-US', { month: 'short' }),
            start: new Date(daysCurrent),
            end: new Date(daysCurrent)
          });
          daysCurrent.setDate(daysCurrent.getDate() + Math.max(1, Math.floor(totalDays / 30)));
          dayCount++;
        }
        return { periods, columns: periods.length };
    }

    return { periods, columns: 12 };
  };

  const getDatePosition = (date: string) => {
    if (!startDate || !endDate) return 0;

    const taskDate = new Date(date);
    const start = new Date(startDate);
    const end = new Date(endDate);

    const totalDuration = end.getTime() - start.getTime();
    const taskPosition = taskDate.getTime() - start.getTime();

    return Math.max(0, Math.min(100, (taskPosition / totalDuration) * 100));
  };

  const getTaskWidth = (taskStartDate: string, taskEndDate: string) => {
    if (!startDate || !endDate) return 5;

    const start = new Date(taskStartDate);
    const end = new Date(taskEndDate);
    const projectStart = new Date(startDate);
    const projectEnd = new Date(endDate);

    const totalDuration = projectEnd.getTime() - projectStart.getTime();
    const taskDuration = end.getTime() - start.getTime();

    return Math.max(2, Math.min(100, (taskDuration / totalDuration) * 100));
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    switch (viewMode) {
      case 'day':
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'week':
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'month':
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      case 'quarter':
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'year':
        return d.getFullYear().toString();
      default:
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'blocked': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const renderSwimlaneView = () => {
    if (!roadmapData) return null;

    const { swimlanes, milestones } = roadmapData;
    const { periods, columns } = getTimelineConfig();

    // Calculate zoom scale factor (50% = 0.5, 100% = 1, 150% = 1.5)
    const zoomScale = zoomLevel / 100;

    return (
      <div className="space-y-6">
        {/* View Controls */}
        <div className="flex mb-6 w-full gap-6 items-center">
          <div className="flex items-center gap-3 bg-squadrun-gray/20 p-3 rounded-full border border-squadrun-gray/30 relative group">
            {/* Hover overlay */}
            <div className="absolute inset-4 rounded-full bg-squadrun-gray/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"></div>
            <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
              <SelectTrigger
                className="w-36 bg-transparent text-white relative z-20 focus:outline-none focus:ring-0 focus:border-0 ring-0 border-0 shadow-none"
                style={{
                  outline: "none",
                  boxShadow: "none",
                  border: "none"
                }}
              >
                <img src={calendar} alt="calendar" className="w-6 h-6 text-white" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-squadrun-darker/90 border-squadrun-gray/40">
                <SelectItem value="year">Year</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="day">Day</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Timeline Header */}
          <div className="grid grid-cols-auto w-full gap-6">
            {/* <div className="h-16"></div> */}
            <div className="relative bg-squadrun-gray/20 rounded-full border border-squadrun-gray/30 backdrop-blur-sm shadow-lg transition-all duration-300"
              style={{ padding: `${16 * zoomScale}px` }}
            >
              <div className={`relative grid gap-0 text-center`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {periods.map((period, index) => {
                  const isSelected = !!selectedWindow &&
                    selectedWindow.start === period.start.toISOString() &&
                    selectedWindow.end === period.end.toISOString();
                  const composedLabel = period.sublabel ? `${period.sublabel} ${period.label}` : period.label;
                  return (
                    <div
                      key={index}
                      className={`text-white font-semibold cursor-pointer transition-all duration-300 ${isSelected
                        ? 'bg-squadrun-gray/40 rounded-full shadow-md transform scale-105'
                        : 'hover:bg-squadrun-gray/30 hover:scale-102 hover:shadow-sm rounded-full'
                        }`}
                      style={{
                        padding: `${8 * zoomScale}px`,
                        margin: `0 ${24 * zoomScale}px`,
                      }}
                      onClick={() => {
                        const next = {
                          start: period.start.toISOString(),
                          end: period.end.toISOString(),
                          label: composedLabel,
                          sublabel: period.sublabel,
                        };
                        setSelectedWindow((prev) =>
                          prev && prev.start === next.start && prev.end === next.end ? null : next
                        );
                      }}
                      title={`Focus on ${composedLabel}`}
                    >
                      <div
                        className="font-bold text-white transition-all duration-300"
                        style={{ fontSize: `${0.875 * zoomScale}rem` }}
                      >{period.label}</div>
                      {period.sublabel && (
                        <div
                          className="text-gray-300 font-medium transition-all duration-300"
                          style={{ fontSize: `${0.75 * zoomScale}rem` }}
                        >{period.sublabel}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Swimlanes */}
        <div className="space-y-4 transition-all duration-300">
          {swimlanes.map((swimlane, index) => (
            <div key={swimlane.id} className="grid grid-cols-[280px_1fr] gap-6 group">
              {/* Swimlane Label */}
              <div
                className="bg-squadrun-darker/10 p-5 flex items-center border border-squadrun-gray/30 backdrop-blur-sm shadow-lg group-hover:shadow-xl transition-all duration-300"
                style={{
                  transform: `scale(${zoomScale})`,
                  transformOrigin: 'left center',
                }}
              >
                <div className="flex items-center justify-center gap-3 w-full">
                  <div
                    className="rounded-sm shadow-md justify-center transition-all duration-300"
                    style={{
                      backgroundColor: swimlane.tasks[0]?.color || '#888888',
                      width: `${4 * zoomScale}px`,
                      height: `${4 * zoomScale}px`,
                    }}
                  ></div>
                  <h3
                    className="text-white font-semibold tracking-wide transition-all duration-300"
                    style={{ fontSize: `${0.875 * zoomScale}rem` }}
                  >{swimlane.name}</h3>
                </div>
              </div>

              {/* Tasks Timeline */}
              <div
                className="relative bg-squadrun-darker/10 rounded-xl p-4 backdrop-blur-sm shadow-inner group-hover:shadow-lg transition-all duration-300"
                style={{
                  minHeight: `${120 * zoomScale}px`,
                }}
              >
                {swimlane.tasks.map((task, taskIndex) => {
                  const startPos = getDatePosition(task.startDate);
                  const width = getTaskWidth(task.startDate, task.endDate);
                  const isDimmed = !!selectedWindow && !taskOverlapsWindow(task, selectedWindow);

                  return (
                    <div
                      key={task.id}
                      className={`absolute rounded-lg cursor-pointer transition-all duration-300 flex items-center group/task shadow-lg ${hoveredTask === task.id
                        ? 'scale-105 shadow-2xl ring-2 ring-white/60 z-10 transform -translate-y-1'
                        : 'hover:scale-102 hover:shadow-xl hover:-translate-y-0.5'
                        } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
                      style={{
                        left: `${startPos}%`,
                        width: `${width}%`,
                        backgroundColor: task.color,
                        top: `${(taskIndex % 2) * 52 * zoomScale + 16 * zoomScale}px`,
                        border: `1px solid ${task.color}80`,
                        height: `${48 * zoomScale}px`,
                        padding: `0 ${16 * zoomScale}px`,
                      }}
                      onMouseEnter={() => setHoveredTask(task.id)}
                      onMouseLeave={() => setHoveredTask(null)}
                      onClick={() => setEditingTask(task)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div
                          className="bg-white/80 rounded-full transition-all duration-300"
                          style={{
                            width: `${8 * zoomScale}px`,
                            height: `${8 * zoomScale}px`,
                          }}
                        ></div>
                        <span
                          className="text-white font-semibold truncate flex-1 drop-shadow-sm transition-all duration-300"
                          style={{ fontSize: `${0.75 * zoomScale}rem` }}
                        >
                          {task.title}
                        </span>
                        <span
                          className="text-white/80 font-medium transition-all duration-300"
                          style={{ fontSize: `${0.75 * zoomScale}rem` }}
                        >
                          {formatDate(task.startDate).split(' ')[0]} - {formatDate(task.endDate).split(' ')[0]}
                        </span>
                      </div>

                      {/* Enhanced Hover Tooltip */}
                      {hoveredTask === task.id && (
                        <div className="absolute bottom-full left-0 mb-3 w-80 bg-squadrun-darker/95 rounded-xl p-4 shadow-2xl z-50 backdrop-blur-md">
                          <div className="absolute -bottom-2 left-4 w-4 h-4 bg-squadrun-gray/95 border-r border-b border-squadrun-gray/30 rotate-45"></div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: task.color }}></div>
                            <h4 className="text-white font-bold text-sm">{task.title}</h4>
                          </div>
                          <p className="text-gray-300 text-xs mb-3 leading-relaxed">{task.description}</p>
                          <div className="flex justify-between items-center text-xs mb-2">
                            <span className="text-gray-300 font-medium">{formatDate(task.startDate)} → {formatDate(task.endDate)}</span>
                            <Badge variant="secondary" className="text-[10px] font-semibold bg-purple-500/20 text-purple-300 border-purple-500/30">
                              {task.priority}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-purple-300 font-medium bg-purple-500/10 px-2 py-1 rounded-md">
                              Status: {task.status}
                            </span>
                            {task.assignee && (
                              <span className="text-blue-300 font-medium bg-blue-500/10 px-2 py-1 rounded-md">
                                @{task.assignee}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Focused Tasks Panel */}
        <div className="mt-4">
          <div className="{`transition-all duration-300 ${selectedWindow ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}">
            {selectedWindow && (
              <div className="bg-transparent border border-purple-500/20 rounded-lg p-4">
                <div className="flex justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-purple-400" />
                    <h3 className="text-white font-medium">
                      Focused view: {selectedWindow.label}
                    </h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedWindow(null)}
                    className="text-white-400 bg-transparent border-transparent hover:bg-purple-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {(() => {
                  const focusedTasks = roadmapData.swimlanes
                    .flatMap((lane) =>
                      lane.tasks
                        .filter((t) => taskOverlapsWindow(t, selectedWindow))
                        .map((t) => ({ ...t, swimlaneName: lane.name }))
                    )
                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
                  if (focusedTasks.length === 0) {
                    return <div className="text-sm text-gray-400">No tasks in this period.</div>;
                  }
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {focusedTasks.map((task) => (
                        <div
                          key={task.id}
                          className="bg-squadrun-darker/10 rounded-lg p-3 border border-squadrun-gray/40 hover:border-purple-500/40 transition-colors cursor-pointer"
                          onClick={() => setEditingTask(task)}
                          style={{ borderLeft: `4px solid ${task.color}` }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-white font-medium text-sm truncate">{task.title}</div>
                            <div className={`w-2 h-2 rounded-full ml-2 ${getStatusColor(task.status)}`} />
                          </div>
                          <div className="text-xs text-purple-300 mt-1">{(task as any).swimlaneName}</div>
                          <div className="text-xs text-gray-300 mt-1 line-clamp-2">{task.description}</div>
                          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                            <span>{formatDate(task.startDate)} - {formatDate(task.endDate)}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">{task.priority}</Badge>
                              {task.assignee && <span className="text-blue-400">@{task.assignee}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Milestones */}
        <div className="grid grid-cols-[280px_1fr] gap-6 mt-8">
          <div
            className="flex items-center bg-transparent p-5 border border-squadrun-gray/30 backdrop-blur-sm transition-all duration-300"
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: 'left center',
            }}
          >
            <div className="flex items-center gap-3 justify-center w-full">
              <MapPin
                className="text-purple-400 transition-all duration-300"
                style={{
                  width: `${16 * zoomScale}px`,
                  height: `${16 * zoomScale}px`
                }}
              />
              <h3
                className="text-white font-semibold tracking-wide transition-all duration-300"
                style={{ fontSize: `${0.875 * zoomScale}rem` }}
              >Milestones</h3>
            </div>
          </div>
          <div
            className="relative bg-transparent p-4 backdrop-blur-sm shadow-inner transition-all duration-300"
            style={{ height: `${80 * zoomScale}px` }}
          >
            {milestones.map((milestone) => {
              const position = getDatePosition(milestone.date);

              return (
                <div
                  key={milestone.id}
                  className={`absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 cursor-pointer transition-all duration-300 ${hoveredMilestone === milestone.id
                    ? 'scale-125 drop-shadow-2xl'
                    : 'hover:scale-115 hover:drop-shadow-xl'
                    }`}
                  style={{ left: `${position}%` }}
                  onMouseEnter={() => setHoveredMilestone(milestone.id)}
                  onMouseLeave={() => setHoveredMilestone(null)}
                  onClick={() => setEditingMilestone(milestone)}
                >
                  <div className="relative">
                    <div
                      className="bg-purple-500 rounded-full border-2 border-white flex items-center justify-center shadow-xl ring-2 ring-purple-500/30 transition-all duration-300"
                      style={{
                        width: `${32 * zoomScale}px`,
                        height: `${32 * zoomScale}px`,
                      }}
                    >
                      <Pin
                        className="bg-purple-500 rounded-full flex items-center justify-center transition-all duration-300"
                        style={{
                          width: `${32 * zoomScale}px`,
                          height: `${32 * zoomScale}px`,
                        }}
                      />
                      {/* <div className="w-3 h-3 bg-white rounded-full shadow-inner"></div> */}
                    </div>
                    {hoveredMilestone === milestone.id && (
                      <div className="absolute -inset-1 bg-purple-500/30 rounded-full blur-sm -z-10 animate-pulse"></div>
                    )}
                  </div>

                  {/* Enhanced Milestone Tooltip */}
                  {hoveredMilestone === milestone.id && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 w-64 bg-squadrun-darker/95 border border-squadrun-gray/30 rounded-xl p-4 shadow-2xl z-50 backdrop-blur-md">
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-squadrun-gray/95 border-r border-b border-squadrun-gray/30 rotate-45"></div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <h4 className="text-white font-bold text-sm">{milestone.title}</h4>
                      </div>
                      <p className="text-gray-300 text-xs mb-3 leading-relaxed">{milestone.description}</p>
                      <div className="flex items-center justify-center">
                        <span className="text-purple-300 font-semibold text-xs bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                          {formatDate(milestone.date)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Upload Section */}
      {!roadmapData && !uploadedFile && (
        <>
          {/* Upload PRD Card */}
          <Card className="p-6 bg-transparent mt-8 mb-6 max-w-6xl py-1 mx-auto border-white/10">
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 rounded-lg bg-squadrun-darker/10 mt-2">
                <img src={upload} className="w-12 h-12 text-white/80 mb-4" />
                <h3 className="text-lg font-semibold text-white/80 mb-2">Upload your PRD</h3>
                <p className="text-white/40 text-center mb-6 max-w">
                  Our AI will analyze your document and generate a comprehensive product roadmap.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-purple-600 hover:bg-purple-800 text-white mt-4 px-8 rounded-full"
                >
                  {isUploading ? 'Uploading...' : 'Upload File'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* My PRDs Card */}
          <Card className="p-6 bg-transparent mb-6 max-w-6xl py-1 mx-auto border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  My PRDs
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white rounded-full px-3 py-3"
                  onClick={fetchSavedRoadmaps}
                >
                  <RefreshCcw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-transparent">
                {isLoadingRoadmaps ? (
                  <div className="text-gray-400 text-sm">Loading...</div>
                ) : savedRoadmaps.length === 0 ? (
                  <div className="text-gray-400 text-sm">No saved PRDs yet.</div>
                ) : (
                  <div className="space-y-2">
                    {savedRoadmaps.map((r) => (
                      <div key={r._id} className="flex items-center justify-between bg-transparent rounded-md p-2">
                        <div>
                          <div className="text-white text-sm font-medium">{r.title}</div>
                          <div className="text-xs text-gray-400 truncate max-w-[40ch]">{r.overview}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-3 py-3 "
                            onClick={() => loadRoadmapFromBackend(r._id)}
                          >
                            <Eye className="w-4 h-4" />
                            View Roadmap
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white rounded-full px-3 py-3"
                            onClick={async () => {
                              const newTitle = window.prompt('Rename roadmap title', r.title);
                              if (!newTitle || newTitle.trim() === r.title) return;
                              try {
                                const token = localStorage.getItem('token');
                                if (!token) {
                                  toast.error('Please sign in');
                                  return;
                                }
                                const res = await fetch('/api/roadmaps', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`
                                  },
                                  body: JSON.stringify({ _id: r._id, title: newTitle.trim() })
                                });
                                if (!res.ok) throw new Error('Failed to rename');
                                const updated = await res.json();
                                setSavedRoadmaps((prev) => prev.map((it) => it._id === r._id ? { ...it, title: updated.title } : it));
                                if (roadmapData && savedRoadmapId === r._id) {
                                  setRoadmapData({ ...roadmapData, title: updated.title });
                                }
                                toast.success('Title updated');
                              } catch (e) {
                                console.error(e);
                                toast.error('Failed to update title');
                              }
                            }}
                          >
                            <Edit className="w-6 h-6 " />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Date Selection Modal */}
      <Dialog open={!!uploadedFile && !roadmapData} onOpenChange={(open) => { if (!open) { setUploadedFile(null); setFileName(''); } }}>
        <DialogContent className="bg-squadrun-darker/10 border-[#21262d] text-white max-w-[800px] p-0 rounded-lg">
          <div className="bg-squadrun-gray/10 flex flex-col gap-[18px] p-4 rounded-lg">
            {/* Header */}
            <div className="flex items-center justify-between bg-squadrun-gray/20 rounded-lg px-5 py-3">
              <div className="font-bold text-white text-xl tracking-wide">
                TIMELINE SELECTION
              </div>
            </div>

            {/* Main Content */}
            <div className="flex gap-[88px] items-center rounded-lg mt-4">
              <div className="flex flex-col gap-2">
                <div className="text-white text-medium mx-6">
                  Choose a Timeline
                </div>
                <div className="text-white text-sm mx-6">
                  Select a start date and an end date to generate an interactive product roadmap
                </div>
              </div>
              <Button
                onClick={generateRoadmap}
                disabled={isGenerating || !startDate || !endDate}
                className={
                  isGenerating
                    ? "bg-transparent text-white px-4 py-2 rounded-[24px] h-9 font-bold text-sm ml-auto"
                    : "bg-purple-600 hover:bg-purple-800 text-white px-4 py-2 rounded-[24px] h-9 font-bold text-sm ml-auto"
                }
              >
                {isGenerating ? (
                  <>
                    <FaSpinner className="w-4 h-4 mr-2 text-white animate-spin" />
                    <span className="bg-transparent border-gray-500 text-white">Generating Roadmap</span>
                  </>
                ) : (
                  <>
                    <span className="text-white">Generate Roadmap</span>
                    <ArrowRight className="text-white" />
                  </>
                )}
              </Button>
            </div>
            {/* Divider */}
            <div className="h-px bg-[#21262d] w-full"></div>

            {/* Date Inputs */}
            <div className="flex gap-4 items-center">
              <div className="bg-[#181d23] border border-[#21262d] rounded-[17px] h-8 px-3 py-[7px] flex items-center gap-2 flex-1">
                <Calendar className="w-4 h-4 text-[#ffffff]" />
                <Input
                  type="text"
                  onFocus={(e) => e.target.type = 'date'}
                  onBlur={(e) => e.target.type = 'text'}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-0 text-[#ffffff] placeholder-[#8b949e] text-sm p-0 h-auto focus:outline-none focus:ring-0"
                  placeholder="Select start date"
                  style={{ boxShadow: 'none', outline: 'none' }}
                />
              </div>
              <div className="bg-[#181d23] border border-[#21262d] rounded-[17px] h-8 px-3 py-[7px] flex items-center gap-2 flex-1">
                <Calendar className="w-4 h-4 text-[#ffffff]" />
                <Input
                  type="text"
                  onFocus={(e) => e.target.type = 'date'}
                  onBlur={(e) => e.target.type = 'text'}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-0 text-[#ffffff] placeholder-[#8b949e] text-sm p-0 h-auto focus:outline-none focus:ring-0"
                  placeholder="Select end date"
                  style={{ boxShadow: 'none', outline: 'none' }}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Roadmap Dashboard */}
      {roadmapData && (
        <Card className="bg-squadrun-darker/10 backdrop-blur-lg shadow-2xl">
          <CardHeader className="bg-squadrun-darker/10 pb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setRoadmapData(null); setSelectedWindow(null); setSavedRoadmapId(null); }}
                  className="text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-lg"
                  aria-label="Back to Strategic Planner"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="space-y-2">
                  {!isEditingTitle ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {roadmapData.title}
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setIsEditingTitle(true); setTempTitle(roadmapData.title); }}
                        className="text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                        aria-label="Rename roadmap title"
                      >
                        <Edit className="w-5 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        placeholder="Enter roadmap title"
                        className="bg-gray-800 border-gray-600 max-w-sm"
                        aria-label="Roadmap title input"
                      />
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => {
                          const next = (tempTitle || '').trim();
                          if (!next) {
                            toast.error('Title cannot be empty');
                            return;
                          }
                          setRoadmapData(prev => prev ? { ...prev, title: next } : prev);
                          setIsEditingTitle(false);
                          toast.success('Title updated');
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingTitle(false)}
                        className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">{roadmapData.overview}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    if (!roadmapData || !startDate || !endDate) {
                      toast.error('Missing timeline or roadmap data');
                      return;
                    }
                    try {
                      setIsSaving(true);
                      toast.loading('Saving roadmap...');
                      const token = localStorage.getItem('token');
                      if (!token) {
                        toast.dismiss();
                        toast.error('Please sign in to save');
                        setIsSaving(false);
                        return;
                      }
                      const swimlaneSummaries = roadmapData.swimlanes.map((lane) => {
                        const colorCounts: Record<string, number> = {};
                        for (const t of lane.tasks) {
                          if (!t.color) continue;
                          colorCounts[t.color] = (colorCounts[t.color] || 0) + 1;
                        }
                        const laneColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '#888888';
                        return { id: lane.id, name: lane.name, color: laneColor };
                      });
                      const embeddedTasks = roadmapData.swimlanes.flatMap((lane) =>
                        lane.tasks.map((t) => ({
                          swimlaneId: lane.id,
                          swimlaneName: lane.name,
                          id: t.id,
                          title: t.title,
                          description: t.description,
                          startDate: t.startDate,
                          endDate: t.endDate,
                          color: t.color,
                          priority: t.priority,
                          status: t.status,
                          assignee: t.assignee || '',
                          attachments: t.attachments || [],
                          comments: t.comments || [],
                          notes: t.notes || '',
                          labels: t.labels || [],
                        }))
                      );
                      const payload = {
                        _id: savedRoadmapId || undefined,
                        prdFileName: fileName || undefined,
                        title: roadmapData.title,
                        overview: roadmapData.overview,
                        projectStartDate: startDate,
                        projectEndDate: endDate,
                        timeframe: roadmapData.timeframe || {
                          startYear: new Date(startDate).getFullYear(),
                          endYear: new Date(endDate).getFullYear(),
                          quarters: ['Q1', 'Q2', 'Q3', 'Q4']
                        },
                        swimlanes: swimlaneSummaries,
                        tasks: embeddedTasks,
                        milestones: roadmapData.milestones,
                      };
                      const res = await fetch('/api/roadmaps', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(payload),
                      });
                      if (!res.ok) {
                        throw new Error(`Save failed (${res.status})`);
                      }
                      const saved = await res.json();
                      setSavedRoadmapId(saved?._id || null);
                      toast.dismiss();
                      toast.success(savedRoadmapId ? 'Roadmap updated' : 'Roadmap saved');
                    } catch (e) {
                      console.error(e);
                      toast.dismiss();
                      toast.error('Failed to save roadmap');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-full mx-1 py-5 px-5"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : savedRoadmapId ? 'Update Roadmap' : 'Save Roadmap'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRoadmapData(null);
                    setUploadedFile(null);
                    setFileName('');
                    setStartDate('');
                    setEndDate('');
                    setSavedRoadmapId(null);
                  }}
                  className="text-purple-400 py-5 px-6 hover:bg-purple-500 mx-3 rounded-full hover:text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  New PRD
                </Button>
                {/* <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
                >
                  <ArrowDownRight className="w-4 h-4 mr-2" />
                  Attach to PRD
                </Button> */}
              </div>
            </div>
            {/* Zoom Controls */}
            <div className="flex items-center gap-4 bg-squadrun-gray/20 p-3 px-6 rounded-full border border-squadrun-gray/30 backdrop-blur-sm shadow-lg ml-auto">
                  <ZoomOut className="w-4 h-4 text-purple-400" />
                  <Slider
                    value={[zoomLevel]}
                    onValueChange={handleZoomChange}
                    min={50}
                    max={150}
                    step={5}
                    className="w-40 cursor-pointer"
                  />
                  <ZoomIn className="w-4 h-4 text-purple-400" />
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-sm min-w-[45px] text-center">
                      {zoomLevel}%
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={resetZoom}
                      className="h-7 w-7 p-0 text-purple-400 hover:text-white hover:bg-purple-500/20 rounded-full"
                      title="Reset zoom to 100%"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
          </CardHeader>

          <CardContent className="p-6">
            {renderSwimlaneView()}
          </CardContent>
        </Card>
      )}

      {/* Task Edit Dialog */}
      <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
        <DialogContent className="bg-gray-900 border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-purple-400" />
              Edit Task
            </DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Task Title</Label>
                <Input
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="bg-gray-800 border-gray-600"
                />
              </div>
              <div>
                <Label className="text-sm">Description</Label>
                <Textarea
                  value={editingTask.description}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="bg-gray-800 border-gray-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Start Date</Label>
                  <Input
                    type="date"
                    value={editingTask.startDate}
                    onChange={(e) => setEditingTask({ ...editingTask, startDate: e.target.value })}
                    className="bg-gray-800 border-gray-600"
                  />
                </div>
                <div>
                  <Label className="text-sm">Due Date</Label>
                  <Input
                    type="date"
                    value={editingTask.endDate}
                    onChange={(e) => setEditingTask({ ...editingTask, endDate: e.target.value })}
                    className="bg-gray-800 border-gray-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Status</Label>
                  <Select
                    value={editingTask.status}
                    onValueChange={(value: Task['status']) => setEditingTask({ ...editingTask, status: value })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="not-started">Not Started</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Assignee</Label>
                  <Input
                    value={editingTask.assignee || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, assignee: e.target.value })}
                    placeholder="Enter assignee name"
                    className="bg-gray-800 border-gray-600"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm">Attachments</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="https://link-to-resource"
                    value={attachmentInput}
                    onChange={(e) => setAttachmentInput(e.target.value)}
                    className="bg-gray-800 border-gray-600"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (!attachmentInput.trim()) return;
                      try {
                        const url = new URL(attachmentInput.trim());
                        setEditingTask({
                          ...editingTask,
                          attachments: [...(editingTask.attachments || []), url.toString()],
                        });
                        setAttachmentInput('');
                      } catch (_) {
                        toast.error('Please enter a valid URL');
                      }
                    }}
                  >Add</Button>
                </div>
                {!!(editingTask.attachments && editingTask.attachments.length) && (
                  <div className="mt-2 space-y-1">
                    {editingTask.attachments!.map((att, idx) => (
                      <div key={`${att}-${idx}`} className="flex items-center justify-between text-xs bg-gray-800/60 rounded px-2 py-1">
                        <a href={att} target="_blank" rel="noreferrer" className="text-blue-400 truncate max-w-[75%]">{att}</a>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setEditingTask({
                            ...editingTask,
                            attachments: (editingTask.attachments || []).filter((_, i) => i !== idx)
                          })}
                        >Remove</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-sm">Comments</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Add a comment"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    className="bg-gray-800 border-gray-600"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (!commentInput.trim()) return;
                      setEditingTask({
                        ...editingTask,
                        comments: [...(editingTask.comments || []), commentInput.trim()],
                      });
                      setCommentInput('');
                    }}
                  >Add</Button>
                </div>
                {!!(editingTask.comments && editingTask.comments.length) && (
                  <div className="mt-2 space-y-1">
                    {editingTask.comments!.map((c, idx) => (
                      <div key={`${c}-${idx}`} className="flex items-center justify-between text-xs bg-gray-800/60 rounded px-2 py-1">
                        <span className="text-gray-200 truncate max-w-[75%]">{c}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setEditingTask({
                            ...editingTask,
                            comments: (editingTask.comments || []).filter((_, i) => i !== idx)
                          })}
                        >Remove</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-sm">Notes</Label>
                <Textarea
                  placeholder="Additional notes..."
                  value={editingTask.notes || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, notes: e.target.value })}
                  className="bg-gray-800 border-gray-600"
                />
              </div>
              <div>
                <Label className="text-sm">Labels (colors)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="color"
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    className="w-10 h-10 p-1 bg-gray-800 border-gray-600"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (!labelInput) return;
                      setEditingTask({
                        ...editingTask,
                        labels: Array.from(new Set([...(editingTask.labels || []), labelInput]))
                      });
                    }}
                  >Add Label</Button>
                </div>
                {!!(editingTask.labels && editingTask.labels.length) && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editingTask.labels!.map((hex, idx) => (
                      <div key={`${hex}-${idx}`} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded" style={{ backgroundColor: hex }} />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setEditingTask({
                            ...editingTask,
                            labels: (editingTask.labels || []).filter((_, i) => i !== idx)
                          })}
                        >Remove</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingTask(null)}>
                  Cancel
                </Button>
                <Button onClick={() => updateTask(editingTask)} className="bg-purple-600 hover:bg-purple-700">
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Milestone Edit Dialog */}
      <Dialog open={!!editingMilestone} onOpenChange={() => setEditingMilestone(null)}>
        <DialogContent className="bg-gray-900 border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-400" />
              Edit Milestone
            </DialogTitle>
          </DialogHeader>
          {editingMilestone && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Milestone Title</Label>
                <Input
                  value={editingMilestone.title}
                  onChange={(e) => setEditingMilestone({ ...editingMilestone, title: e.target.value })}
                  className="bg-gray-800 border-gray-600"
                />
              </div>
              <div>
                <Label className="text-sm">Description</Label>
                <Textarea
                  value={editingMilestone.description}
                  onChange={(e) => setEditingMilestone({ ...editingMilestone, description: e.target.value })}
                  className="bg-gray-800 border-gray-600"
                />
              </div>
              <div>
                <Label className="text-sm">Date</Label>
                <Input
                  type="date"
                  value={editingMilestone.date}
                  onChange={(e) => setEditingMilestone({ ...editingMilestone, date: e.target.value })}
                  className="bg-gray-800 border-gray-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingMilestone(null)}>
                  Cancel
                </Button>
                <Button onClick={() => updateMilestone(editingMilestone)} className="bg-purple-600 hover:bg-purple-700">
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}