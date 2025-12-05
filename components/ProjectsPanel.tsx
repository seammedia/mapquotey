"use client";

import { useState, useEffect } from "react";
import { DrawnArea, LatLng } from "@/types";
import { FolderOpen, Plus, Trash2, MapPin, ChevronRight, Save } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { getServiceById } from "@/lib/services";

export interface Project {
  id: string;
  address: string;
  center: LatLng;
  zoom: number;
  areas: DrawnArea[];
  createdAt: string;
  updatedAt: string;
}

interface ProjectsPanelProps {
  currentAddress: string;
  currentCenter?: LatLng;
  currentZoom: number;
  currentAreas: DrawnArea[];
  onLoadProject: (project: Project) => void;
  onNewProject: () => void;
}

const STORAGE_KEY = "mapquotey_projects";

export default function ProjectsPanel({
  currentAddress,
  currentCenter,
  currentZoom,
  currentAreas,
  onLoadProject,
  onNewProject,
}: ProjectsPanelProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Load projects from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProjects(parsed);
      } catch (e) {
        console.error("Failed to load projects:", e);
      }
    }
  }, []);

  // Save projects to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const calculateProjectTotal = (areas: DrawnArea[]): number => {
    return areas.reduce((sum, area) => {
      if (area.enabled === false || !area.serviceType) return sum;
      const service = getServiceById(area.serviceType);
      if (!service) return sum;
      const price = area.pricePerUnit !== undefined
        ? area.measurements.area * area.pricePerUnit
        : area.measurements.area * service.pricePerSqM;
      return sum + price;
    }, 0);
  };

  const handleSaveProject = () => {
    if (!currentAddress || !currentCenter) {
      alert("Please search for an address first before saving a project.");
      return;
    }

    const now = new Date().toISOString();

    // Check if we're updating an existing project for this address
    const existingIndex = projects.findIndex(p => p.address === currentAddress);

    if (existingIndex >= 0) {
      // Update existing project
      const updated = [...projects];
      updated[existingIndex] = {
        ...updated[existingIndex],
        areas: currentAreas,
        center: currentCenter,
        zoom: currentZoom,
        updatedAt: now,
      };
      setProjects(updated);
      setActiveProjectId(updated[existingIndex].id);
    } else {
      // Create new project
      const newProject: Project = {
        id: `project-${Date.now()}`,
        address: currentAddress,
        center: currentCenter,
        zoom: currentZoom,
        areas: currentAreas,
        createdAt: now,
        updatedAt: now,
      };
      setProjects([newProject, ...projects]);
      setActiveProjectId(newProject.id);
    }
  };

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this project?")) {
      setProjects(projects.filter(p => p.id !== projectId));
      if (activeProjectId === projectId) {
        setActiveProjectId(null);
      }
    }
  };

  const handleSelectProject = (project: Project) => {
    setActiveProjectId(project.id);
    onLoadProject(project);
  };

  const handleNewProject = () => {
    setActiveProjectId(null);
    onNewProject();
  };

  // Get short address (first part before comma)
  const getShortAddress = (address: string): string => {
    const parts = address.split(",");
    return parts[0] || address;
  };

  return (
    <div className="projects-panel flex flex-col h-full bg-white border-r border-gray-200 w-72">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
          </div>
          <span className="text-xs text-gray-400">{projects.length} saved</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleNewProject}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
          <button
            onClick={handleSaveProject}
            disabled={!currentAddress || !currentCenter}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto">
        {projects.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm font-medium">No projects yet</p>
            <p className="text-gray-400 text-xs mt-1">
              Search an address and click Save to create your first project
            </p>
          </div>
        ) : (
          <div className="p-2">
            {projects.map((project) => {
              const isActive = activeProjectId === project.id;
              const total = calculateProjectTotal(project.areas);

              return (
                <button
                  key={project.id}
                  onClick={() => handleSelectProject(project)}
                  className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${
                    isActive
                      ? "bg-orange-50 border border-orange-200"
                      : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <MapPin className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-orange-500" : "text-gray-400"}`} />
                        <p className={`font-medium text-sm truncate ${isActive ? "text-orange-700" : "text-gray-900"}`}>
                          {getShortAddress(project.address)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 ml-6 truncate">
                        {project.areas.length} area{project.areas.length !== 1 ? "s" : ""}
                        {total > 0 && ` • ${formatCurrency(total)}`}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 ml-6">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className={`w-4 h-4 ${isActive ? "text-orange-500" : "text-gray-300"}`} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Current Project Indicator */}
      {currentAddress && (
        <div className="p-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 mb-1">Current Location</p>
          <p className="text-sm font-medium text-gray-900 truncate">
            {getShortAddress(currentAddress)}
          </p>
        </div>
      )}
    </div>
  );
}
