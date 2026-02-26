import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Upload, Search, Plus, Save, X, FileText, Star, Users, User, ArrowLeft, CheckCircle, CheckIcon, Eye } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import files_02 from '@/assets/images/requirement_asst/files_02.png';
import upload from '@/assets/images/upload.png';

interface Template {
  _id: string;
  name: string;
  description: string;
  content: string;
  category: 'Predefined' | 'Uploaded by User';
  isPublic: boolean;
  tags: string[];
  usageCount: number;
  createdBy: {
    name: string;
    email: string;
  };
  fileType: string;
  createdAt: string;
}

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSelect: (template: Template) => void;
  onTemplateUpload: (file: File) => void;
}

export default function TemplateSelector({
  isOpen,
  onClose,
  onTemplateSelect,
  onTemplateUpload
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'Predefined' | 'Uploaded by User'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [saveFormData, setSaveFormData] = useState({
    name: '',
    description: '',
    tags: '',
    isPublic: true
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch templates on component mount
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  // Filter templates based on search and category
  useEffect(() => {
    let filtered = templates;

    if (searchQuery) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    setFilteredTemplates(filtered);
  }, [templates, searchQuery, selectedCategory]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch templates',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (template: Template) => {
    onTemplateSelect(template);
    onClose();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setSaveFormData(prev => ({
        ...prev,
        name: file.name.split('.')[0]
      }));
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('templateFile', uploadFile);
      formData.append('name', saveFormData.name);
      formData.append('description', saveFormData.description);
      formData.append('tags', saveFormData.tags);
      formData.append('isPublic', saveFormData.isPublic.toString());

      const token = localStorage.getItem('token');
      const response = await fetch('/api/templates/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload template');
      }

      const newTemplate = await response.json();
      setTemplates(prev => [newTemplate, ...prev]);
      setShowUploadForm(false);
      setUploadFile(null);
      setSaveFormData({ name: '', description: '', tags: '', isPublic: true });

      toast({
        title: 'Success',
        description: 'Template uploaded successfully'
      });
    } catch (error) {
      console.error('Error uploading template:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload template',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: saveFormData.name,
          description: saveFormData.description,
          content: selectedTemplate.content,
          tags: saveFormData.tags.split(',').map(tag => tag.trim()),
          isPublic: saveFormData.isPublic
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      const newTemplate = await response.json();
      setTemplates(prev => [newTemplate, ...prev]);
      setShowSaveForm(false);
      setSelectedTemplate(null);
      setSaveFormData({ name: '', description: '', tags: '', isPublic: true });

      toast({
        title: 'Success',
        description: 'Template saved successfully'
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedTemplates = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/templates/seed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to seed templates');
      }

      await fetchTemplates();
      toast({
        title: 'Success',
        description: 'Predefined templates created successfully'
      });
    } catch (error) {
      console.error('Error seeding templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to create predefined templates',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewClick = (e: React.MouseEvent, template: Template) => {
    e.stopPropagation(); // Prevent card click from firing
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-4/5 overflow-y-auto bg-[#0D1117] border-none flex flex-col justify-start">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white text-sm font-light">
              <div className="flex items-center gap-2">
                <img src={files_02} className="w-4 h-4" />
                PRD TEMPLATES
              </div>
            </DialogTitle>
          </div>
          <div className="border-b border-[#23272F] w-full mb-4 mt-4" />
        </DialogHeader>

        <div className="w-full">
          {!showUploadForm ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="space-y-2">
                <p className="text-white text-3xl font-extralight">Template Library</p>
                <p className="text-[#8B949E] text-sm">Predefined and uploaded templates</p>
              </div>

              {/* Search and Filter */}
              <div className="flex gap-4 items-center">
                <div className="relative flex-1 flex justify-end">
                  <div className="relative w-2/5">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8B949E] w-4 h-4" />
                    <Input
                      placeholder="Search for a template"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full bg-[#181D23] border-none text-white placeholder:text-[#8B949E] rounded-full"
                    />
                  </div>
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                  className="px-1 py-2 bg-[#181D23] border text-[#C9D1D9] rounded-full"
                >
                  <option value="all">All Templates</option>
                  <option value="predefined">Predefined Templates</option>
                  <option value="Uploaded by User">Uploaded by User</option>
                </select>
                <Button
                  onClick={() => setShowUploadForm(true)}
                  className="bg-[#4F52B2] hover:bg-[#4F52B2]/80 text-white rounded-full px-4 py-2 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Template
                </Button>
              </div>

              {/* Templates Grid */}
              <ScrollArea className="h-[500px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-squadrun-gray">Loading templates...</div>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-squadrun-gray">No templates found</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map((template) => (
                      <Card
                        key={template._id}
                        className="bg-[#181D23] border-transparent hover:border-squadrun-primary/40 transition-colors cursor-pointer"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-white text-sm">{template.name}</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-[#79C0FF]/20"
                                onClick={(e) => handlePreviewClick(e, template)}
                              >
                                <Eye className="h-4 w-4 text-[#79C0FF]" />
                              </Button>
                              <Badge variant="secondary" className="text-xs bg-transparent text-[#79C0FF] border border-[#79C0FF]">
                                {template.category}
                              </Badge>
                            </div>
                          </div>
                          <CardDescription className="text-squadrun-gray text-xs">
                            {template.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex flex-wrap gap-1 mb-2">
                            {template.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs text-[#C9D1D9] border-white">
                                {tag}
                              </Badge>
                            ))}
                            {template.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-1 text-xs text-[#79C0FF]">
                              <User className="w-3 h-3" />
                              {template.createdBy.name}
                            </div>
                            {/* <div className="flex items-center gap-1 text-xs text-[#79C0FF]">
                              <Users className="w-3 h-3" />
                              Used {template.usageCount} Times
                            </div> */}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : (
            /* Upload Form */
            <div className="space-y-4">
              {/* Header with back button */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setShowUploadForm(false)}
                  variant="ghost"
                  className="text-white hover:text-white/80 p-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <p className="text-white text-3xl tracking-wide font-extralight">Upload Template</p>
                </div>
              </div>

              <div className="w-3/4 mx-auto border-none rounded-lg p-12 text-center mt-12">
                <img src={upload} className="w-10 h-10 mx-auto mb-4" />
                <h3 className="text-white text-lg font-light mb-2">Upload Your Template File</h3>
                <p className="text-squadrun-gray mb-4 font-extralight">
                  Supported file types: PDF and TXT
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  accept=".txt,.pdf"
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#4F52B2] hover:bg-[#4F52B2]/80 text-white rounded-full"
                >
                  Choose a File
                </Button>
              </div>
              <div className="border-b border-[#2D2D2D]"></div>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-white text-sm font-light">Template Name</label>
                    <Input
                      value={saveFormData.name}
                      onChange={(e) => setSaveFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter a name for this template"
                      className="bg-[#181D23] border rounded-full text-white mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-white text-sm font-light">Description</label>
                    <Input
                      value={saveFormData.description}
                      onChange={(e) => setSaveFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter a description for this template"
                      className="bg-[#181D23] border rounded-full text-white mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-white text-sm font-light">Tags (Use comma to separate each tag)</label>
                    <Input
                      value={saveFormData.tags}
                      onChange={(e) => setSaveFormData(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="e.g., Software, Product, Requirements"
                      className="bg-[#181D23] border rounded-full text-white mt-2"
                    />
                  </div>
                </div>
                <div className="border-b border-[#2D2D2D]"></div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={saveFormData.isPublic}
                      onChange={(e) => setSaveFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="isPublic" className="text-white text-sm font-extralight">
                      Make this template public
                    </label>
                  </div>
                  <Button
                    onClick={handleUploadSubmit}
                    disabled={isLoading || !saveFormData.name}
                    className="bg-[#4F52B2] hover:bg-[#4F52B2]/80 text-white rounded-full"
                  >
                    <CheckIcon className="w-4 h-4" />
                    Upload Template
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl h-4/5 overflow-hidden bg-[#0D1117] border-none flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white text-sm font-light">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  TEMPLATE PREVIEW
                </div>
              </DialogTitle>
            </div>
            <div className="border-b border-[#23272F] w-full mb-4 mt-4" />
          </DialogHeader>
          
          {previewTemplate && (
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
              <div className="space-y-2">
                <h3 className="text-white text-2xl font-light">{previewTemplate.name}</h3>
                <p className="text-[#8B949E] text-sm">{previewTemplate.description}</p>
                <div className="flex flex-wrap gap-2">
                  {previewTemplate.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs text-[#C9D1D9] border-white">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="border-b border-[#23272F]" />
              
              <ScrollArea className="flex-1">
                <div className="bg-[#181D23] rounded-lg p-6">
                  <pre className="text-[#C9D1D9] text-sm whitespace-pre-wrap font-mono">
                    {previewTemplate.content}
                  </pre>
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#23272F]">
                <Button
                  onClick={() => {
                    handleTemplateSelect(previewTemplate);
                    setShowPreview(false);
                  }}
                  className="bg-[#4F52B2] hover:bg-[#4F52B2]/80 text-white rounded-full"
                >
                  Use This Template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
