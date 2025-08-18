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
  id: string;
  title: string;
  preview: string;
  source: string;
  hasGlow?: boolean;
}

interface LeftPanelProps {
  onSectionClick: (section: Section) => void;
  onDocumentSelect: (documentId: string) => void;
}

const LeftPanel = ({ onSectionClick, onDocumentSelect }: LeftPanelProps) => {
  const [activeTab, setActiveTab] = useState<"library" | "saved">("library");
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data - replace with real data
  const documents: Document[] = [
    {
      id: "1",
      name: "Business_Report_2022",
      type: "business",
      sections: [
        {
          id: "1-1",
          title: "Chapter 3 > String Theory",
          preview:
            "Lorem Ipsum is simply dummy text of the printing and typesetting industry...",
          source: "Source: Document Name, Page 5",
          hasGlow: true,
        },
        {
          id: "1-2",
          title: "Chapter 3 > String Theory",
          preview:
            "Lorem Ipsum has been the industry's standard dummy text ever since...",
          source: "Source: Document Name, Page 6",
        },
      ],
    },
    {
      id: "2",
      name: "Market_Report_2022",
      type: "market",
      sections: [],
    },
  ];

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
              <div key={doc.id} className="space-y-2">
                <button
                  onClick={() => onDocumentSelect(doc.id)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-sidebar-hover transition-colors text-left"
                >
                  {getDocumentIcon(doc.type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {doc.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {doc.type === "business"
                        ? "market business report..."
                        : "market mechanics link..."}
                    </div>
                  </div>
                </button>

                {/* Document Sections */}
                {doc.sections && doc.sections.length > 0 && (
                  <div className="ml-6 space-y-2">
                    {doc.sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => onSectionClick(section)}
                        className="w-full p-3 text-left bg-card border border-border rounded-lg hover:shadow-sm transition-all duration-200"
                      >
                        <div className="flex items-start gap-2">
                          {section.hasGlow && (
                            <div className="w-3 h-3 mt-1 flex-shrink-0">
                              <div className="w-full h-full rounded-full bg-yellow-400 bulb-glow animate-pulse" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm mb-1">
                              {section.title}
                            </div>
                            <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {section.preview}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {section.source}
                            </div>
                            <div className="text-right mt-2">
                              <span className="text-2xl">"</span>
                            </div>
                          </div>
                        </div>
                      </button>
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
