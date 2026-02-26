import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import DocumentApproval from "./pages/DocumentApproval";
import RoleManagement from "./pages/RoleManagement";
import CodeInspector from "./pages/CodeInspector";
import DocumentCreator from "./pages/DocumentCreator";
import PRDChatbot from "./pages/PRDChatbot";
import StrategicPlanner from "./pages/StrategicPlanner";
import ROICalculator from "./pages/ROICalculator";
import GitHubRepos from "./pages/GitHubRepos";
import Activities from "./pages/Activities";
import DiagramGeneration from "./pages/DiagramGeneration";
import DiagramGenerationLanding from "./pages/DiagramGenerationLanding";
import DiagramGenerationPRD from "./pages/DiagramGenerationPRD";
import DiagramGenerationRepository from "./pages/DiagramGenerationRepository";
import SquadBotPage from "./pages/SquadBotPage";

import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/signin" element={<SignIn />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/activities" element={
                <ProtectedRoute>
                  <Activities />
                </ProtectedRoute>
              } />
              <Route path="/code-inspector" element={
                <ProtectedRoute>
                  <CodeInspector />
                </ProtectedRoute>
              } />
              <Route path="/documentation" element={
                <ProtectedRoute>
                  <DocumentCreator />
                </ProtectedRoute>
              } />
              <Route path="/squadbot" element={
                <ProtectedRoute>
                  <SquadBotPage />
                </ProtectedRoute>
              } />
              <Route path="/requirement-assistant" element={
                <ProtectedRoute>
                  <PRDChatbot />
                </ProtectedRoute>
              } />
              <Route path="/diagram-generation" element={
                <ProtectedRoute>
                  <DiagramGenerationLanding />
                </ProtectedRoute>
              } />
              <Route path="/diagram-generation/prd" element={
                <ProtectedRoute>
                  <DiagramGenerationPRD />
                </ProtectedRoute>
              } />
              <Route path="/diagram-generation/repository" element={
                <ProtectedRoute>
                  <DiagramGenerationRepository />
                </ProtectedRoute>
              } />
              <Route path="/strategic-planner" element={
                <ProtectedRoute>
                  <StrategicPlanner />
                </ProtectedRoute>
              } />
              <Route path="/roi-calculator" element={
                <ProtectedRoute>
                  <ROICalculator />
                </ProtectedRoute>
              } />
              <Route path="/github-repos" element={
                <ProtectedRoute>
                  <GitHubRepos />
                </ProtectedRoute>
              } />
              <Route path="/document-approval" element={
                <ProtectedRoute>
                  <DocumentApproval />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminPanel />
                </ProtectedRoute>
              } />
              <Route path="/admin/documents" element={
                <ProtectedRoute>
                  <DocumentApproval />
                </ProtectedRoute>
              } />
              <Route path="/admin/roles" element={
                <ProtectedRoute>
                  <RoleManagement />
                </ProtectedRoute>
              } />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </GoogleOAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
