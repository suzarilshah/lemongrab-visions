/**
 * Project Browser Component
 * Dialog for managing video editor projects - create, load, delete, list
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Plus,
  FolderOpen,
  Trash2,
  Copy,
  Clock,
  Film,
  Search,
  Loader2,
  MoreVertical,
  Calendar,
  FileVideo,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  listEditorProjects,
  deleteEditorProject,
  duplicateEditorProject,
  saveEditorProject,
} from '@/lib/editorProjectStorage';
import { createDefaultProject } from '@/lib/editor/timelineState';
import { cn } from '@/lib/utils';

interface ProjectInfo {
  id: string;
  name: string;
  duration: number;
  status: string;
  thumbnailUrl: string | null;
  updatedAt: string;
  createdAt: string;
}

interface ProjectBrowserProps {
  trigger?: React.ReactNode;
  onProjectSelect?: (projectId: string) => void;
  currentProjectId?: string;
}

export default function ProjectBrowser({
  trigger,
  onProjectSelect,
  currentProjectId,
}: ProjectBrowserProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteProject, setDeleteProject] = useState<ProjectInfo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load projects when dialog opens
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const projectList = await listEditorProjects(50);
      setProjects(projectList);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen, loadProjects]);

  // Filter projects by search
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Create new project
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setIsCreating(true);
    try {
      const project = createDefaultProject(newProjectName);
      const projectId = await saveEditorProject(project);
      toast.success('Project created!');
      setShowNewProjectDialog(false);
      setNewProjectName('');
      setIsOpen(false);

      // Navigate to the new project
      if (onProjectSelect) {
        onProjectSelect(projectId);
      } else {
        navigate(`/video-editor/${projectId}`);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  // Open existing project
  const handleOpenProject = (projectId: string) => {
    setIsOpen(false);
    if (onProjectSelect) {
      onProjectSelect(projectId);
    } else {
      navigate(`/video-editor/${projectId}`);
    }
  };

  // Delete project
  const handleDeleteProject = async () => {
    if (!deleteProject) return;

    setIsDeleting(true);
    try {
      await deleteEditorProject(deleteProject.id);
      toast.success('Project deleted');
      setDeleteProject(null);
      loadProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  // Duplicate project
  const handleDuplicateProject = async (projectId: string) => {
    try {
      const newId = await duplicateEditorProject(projectId);
      toast.success('Project duplicated!');
      loadProjects();

      // Optionally open the duplicated project
      // handleOpenProject(newId);
    } catch (error) {
      console.error('Failed to duplicate project:', error);
      toast.error('Failed to duplicate project');
    }
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exported':
        return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'exporting':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'published':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Projects
            </Button>
          )}
        </DialogTrigger>

        <DialogContent className="sm:max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Film className="h-5 w-5 text-primary" />
              Project Browser
            </DialogTitle>
            <DialogDescription>
              Create, open, or manage your video editor projects
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Actions bar */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowNewProjectDialog(true)}
                className="gap-2 btn-premium"
              >
                <Plus className="h-4 w-4" />
                New Project
              </Button>

              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Projects list */}
            <ScrollArea className="h-[400px] rounded-lg border">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Loading projects...</p>
                  </div>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-3">
                    {searchQuery ? (
                      <>
                        <Search className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                        <div>
                          <p className="font-medium">No projects found</p>
                          <p className="text-sm text-muted-foreground">
                            Try adjusting your search query
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <FileVideo className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                        <div>
                          <p className="font-medium">No projects yet</p>
                          <p className="text-sm text-muted-foreground">
                            Create your first project to get started
                          </p>
                        </div>
                        <Button
                          onClick={() => setShowNewProjectDialog(true)}
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Project
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  <AnimatePresence mode="popLayout">
                    {filteredProjects.map((project, index) => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.03 }}
                        className={cn(
                          'group p-4 rounded-lg border transition-all cursor-pointer',
                          project.id === currentProjectId
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        )}
                        onClick={() => handleOpenProject(project.id)}
                      >
                        <div className="flex items-start gap-4">
                          {/* Thumbnail */}
                          <div className="w-32 h-20 rounded-md bg-black overflow-hidden flex-shrink-0">
                            {project.thumbnailUrl ? (
                              <img
                                src={project.thumbnailUrl}
                                alt={project.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                                <Film className="h-8 w-8 text-primary/50" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold truncate">{project.name}</h3>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDuration(project.duration)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(project.updatedAt), 'MMM d, yyyy')}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn('text-[10px]', getStatusColor(project.status))}
                                >
                                  {project.status}
                                </Badge>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenProject(project.id);
                                      }}
                                    >
                                      <FolderOpen className="h-4 w-4 mr-2" />
                                      Open
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDuplicateProject(project.id);
                                      }}
                                    >
                                      <Copy className="h-4 w-4 mr-2" />
                                      Duplicate
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteProject(project);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            {project.id === currentProjectId && (
                              <Badge className="mt-2 text-[10px]" variant="secondary">
                                Currently Open
                              </Badge>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter className="text-sm text-muted-foreground">
            {projects.length > 0 && (
              <span>{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Project Dialog */}
      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Create New Project
            </DialogTitle>
            <DialogDescription>
              Give your project a name to get started
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="My Awesome Video"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newProjectName.trim()) {
                    handleCreateProject();
                  }
                }}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewProjectDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={isCreating || !newProjectName.trim()}
              className="btn-premium"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteProject}
        onOpenChange={(open) => !open && setDeleteProject(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete Project?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteProject?.name}"? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
