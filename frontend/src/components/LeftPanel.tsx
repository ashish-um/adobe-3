import { useState } from "react";
import { Search, FileText, Mic, Bookmark } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import LoadingText from "./LoadingText";

interface Document {
  id: string;
  name: string;
  type: "business" | "market";
  sections?: Section[];
}

interface Section {
  bounding_box?: {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
  };
  document_name?: string;
  full_path?: string;
  original_content?: string;
  page_number?: number;
  section_title?: string;
  // legacy fields for savedSections
  id?: string;
  title?: string;
  preview?: string;
  source?: string;
  hasGlow?: boolean;
}

interface LeftPanelProps {
  onSectionClick: (section: Section) => void;
  onDocumentSelect: (documentId: string) => void;
}

const LeftPanel = ({ onSectionClick, onDocumentSelect }: LeftPanelProps) => {
  const [activeTab, setActiveTab] = useState<"library" | "saved">("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);

  // Fetch PDF list from backend
  const fetchDocuments = async () => {
    try {
      const response = await fetch("http://localhost:8000/list_pdfs");
      const data = await response.json();
      if (data.pdfs) {
        // For each document, fetch its related sections
        const docsWithSections = await Promise.all(
          data.pdfs.map(async (filename: string) => {
            let sections: any[] = [];
            try {
              const secRes = await fetch("http://localhost:8000/get_retrieved_sections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ document_name: filename })
              });
              const secData = await secRes.json();
              sections = secData.retrieved_sections || [];
            } catch (err) {
              sections = [];
            }
            return {
              id: filename,
              name: filename,
              type: "business",
              sections: sections
            };
          })
        );
        setDocuments(docsWithSections);
      }
    } catch (error) {
      console.error("Error fetching PDFs:", error);
      setDocuments([]);
    }
  };

  // Initial fetch
  useState(() => {
    fetchDocuments();
  });

  // Handle batch upload
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    try {
      const response = await fetch("http://localhost:8000/upload_batch", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (data.filenames) {
        fetchDocuments();
      }
    } catch (error) {
      console.error("Error uploading PDFs:", error);
    } finally {
      setUploading(false);
    }
  };

  const savedSections: Section[] = [
    {
      id: "s1",
      title: "Market Analysis Overview",
      preview:
        "Comprehensive analysis of market trends and consumer behavior...",
      source: "Business_Report_2022, Page 12",
    },
  ];



  
  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "business":
        return <FileText className="w-4 h-4 text-orange-500" />;
      case "market":
        return <FileText className="w-4 h-4 text-blue-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col panel border-r">
      {/* Upload PDFs */}
      <div className="p-4 border-b border-panel-border flex items-center gap-4">
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleUpload}
          disabled={uploading}
        />
        {uploading && <span className="text-xs text-muted-foreground">Uploading...</span>}
      </div>

      {/* Tab Headers */}
      <div className="flex border-b border-panel-border">
        <button
          onClick={() => setActiveTab("library")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === "library"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Library
          {activeTab === "library" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === "saved"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Saved
          {activeTab === "saved" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-panel-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={`Search your ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Mic className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {activeTab === "library" ? (
          <div className="p-4 space-y-4">
            {documents.map((doc) => (
              <div key={doc.id} className="space-y-2 flex items-center">
                <button
                  onClick={() => onDocumentSelect(doc.id)}
                  className="flex items-center gap-3 flex-1 p-3 rounded-lg hover:bg-sidebar-hover transition-colors text-left"
                >
                  {getDocumentIcon(doc.type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate max-w-[180px]" title={doc.name}>
                      {doc.name.length > 32 ? doc.name.slice(0, 29) + '...' : doc.name}
                    </div>
                  </div>
                <button
                  className="ml-2 px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50"
                  title="Delete document"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!window.confirm(`Delete ${doc.name}? This cannot be undone.`)) return;
                    try {
                      const response = await fetch("http://localhost:8000/delete_document", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ document_name: doc.name })
                      });
                      const data = await response.json();
                      if (!data.error) {
                        fetchDocuments();
                      } else {
                        alert("Delete failed: " + data.error);
                      }
                    } catch (err) {
                      alert("Delete failed: " + err);
                    }
                  }}
                >
                  Delete
                </button>
                </button>

                {/* Related Sections for this document */}
                {doc.sections && doc.sections.length > 0 && (
                  <div className="ml-6 space-y-2">
                    {doc.sections.map((section, idx) => (
                      <div
                        key={idx}
                        className="w-full p-3 text-left bg-card border border-border rounded-lg hover:shadow-sm transition-all duration-200"
                      >
                        <div className="flex flex-col min-w-0">
                          <div className="font-medium text-xs mb-1">
                            {section.section_title || section.title}
                          </div>
                          {section.original_content && section.original_content.trim() !== '' && (
                            <div className="text-xs text-foreground mb-2 line-clamp-3">
                              {section.original_content.length > 120
                                ? section.original_content.slice(0, 120) + '...'
                                : section.original_content}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {section.full_path || section.preview}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {section.page_number !== undefined ? `Page: ${section.page_number}` : ''}
                          </div>
                          <div className="text-right mt-2">
                            <span className="text-2xl">"</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {savedSections.length > 0 ? (
              savedSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => onSectionClick(section)}
                  className="w-full p-3 text-left bg-card border border-border rounded-lg hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-start gap-2">
                    <Bookmark className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm mb-1">
                        {section.title}
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {section.preview}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {section.source}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No saved sections yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftPanel;
