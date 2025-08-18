import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import useDebounce from "../hooks/useDebounce"; // Your existing debounce hook

interface PDFViewerProps {
  documentId?: string;
  onTextSelect: (text: string) => void;
}

// Add Adobe DC View types
declare global {
  interface Window {
    AdobeDC: {
      View: new (config: { clientId: string; divId: string }) => any; // Simplified for brevity
    };
  }
}

const PDFViewer = ({ documentId, onTextSelect }: PDFViewerProps) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [adobeViewer, setAdobeViewer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectionInterval, setSelectionInterval] =
    useState<NodeJS.Timeout | null>(null);

  // --- DEBOUNCE LOGIC START ---
  // 1. Store the "live" selection in a local state as the user selects text.
  const [liveSelection, setLiveSelection] = useState<string>("");

  // 2. The useDebounce hook watches the live selection. Its output, `debouncedSelection`,
  //    will only update after 2000ms (2 seconds) of inactivity.
  const debouncedSelection = useDebounce(liveSelection, 2000);

  // 3. This effect runs only when the `debouncedSelection` changes.
  useEffect(() => {
    // Only call the main onTextSelect function if the debounced selection is valid.
    if (debouncedSelection && debouncedSelection.trim() !== "") {
      console.log(debouncedSelection);
      onTextSelect(debouncedSelection);
    }
  }, [debouncedSelection, onTextSelect]);
  // --- DEBOUNCE LOGIC END ---

  const ADOBE_CLIENT_ID = import.meta.env.VITE_ADOBE_CLIENT_ID;

  useEffect(() => {
    // This effect handles loading the Adobe script
    const loadAdobeScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.AdobeDC) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://documentservices.adobe.com/view-sdk/viewer.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Adobe script"));
        document.head.appendChild(script);
      });
    };

    loadAdobeScript().catch((error) =>
      console.error("Error loading Adobe script:", error)
    );

    // Cleanup interval on component unmount
    return () => {
      if (selectionInterval) {
        clearInterval(selectionInterval);
      }
    };
  }, []); // Run only once

  useEffect(() => {
    // This effect handles loading the PDF when the documentId changes
    if (documentId && window.AdobeDC && viewerRef.current) {
      loadPDF();
    }
  }, [documentId]);

  const loadPDF = async () => {
    if (!viewerRef.current || !documentId) return;

    setIsLoading(true);

    try {
      viewerRef.current.innerHTML = "";
      const adobeViewerDiv = document.createElement("div");
      adobeViewerDiv.id = `adobe-pdf-viewer-${Date.now()}`;
      adobeViewerDiv.style.width = "100%";
      adobeViewerDiv.style.height = "100%";
      viewerRef.current.appendChild(adobeViewerDiv);

      const adobeDCView = new window.AdobeDC.View({
        clientId: ADOBE_CLIENT_ID,
        divId: adobeViewerDiv.id,
      });

      // Replace with your actual PDF URL logic
      const pdfUrl = "test.pdf";

      const previewFilePromise = adobeDCView.previewFile(
        {
          content: { location: { url: pdfUrl } },
          metaData: { fileName: `Document_${documentId}.pdf` },
        },
        {
          embedMode: "SIZED_CONTAINER",
          showAnnotationTools: false,
          showLeftHandPanel: true,
          showDownloadPDF: false,
          showPrintPDF: false,
          showZoomControl: true,
          showBookmarks: true,
          enableFormFilling: false,
          enableSearchAPIs: true,
        }
      );

      previewFilePromise.then((viewer) => {
        console.log("PDF loaded successfully");
        setAdobeViewer(viewer);
        setIsLoading(false);
        setupTextSelectionMonitoring(viewer);
      });
    } catch (error) {
      console.error("Error initializing Adobe PDF viewer:", error);
      setIsLoading(false);
    }
  };

  const setupTextSelectionMonitoring = (viewer: any) => {
    // Clear any pre-existing interval
    if (selectionInterval) {
      clearInterval(selectionInterval);
    }

    viewer.getAPIs().then((apis: any) => {
      // Poll for text selection every 200ms
      const interval = setInterval(() => {
        apis
          .getSelectedContent()
          .then((result: { data: string }) => {
            if (result && result.data && result.data.trim()) {
              // Continuously update the live selection state
              setLiveSelection(result.data.trim());
            }
          })
          .catch((error: any) => {
            // When the selection is cleared, update the live state to an empty string
            if (error.code === "NO_SELECTION") {
              setLiveSelection("");
            }
          });
      }, 200);

      setSelectionInterval(interval);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (adobeViewer && searchTerm.trim()) {
      adobeViewer.getAPIs().then((apis: any) => {
        if (apis.search) {
          apis
            .search(searchTerm)
            .catch((error: any) => console.error("Search error:", error));
        }
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* PDF Toolbar */}
      <div className="flex items-center justify-between p-[1rem] border-b border-panel-border bg-panel-background">
        <div className="flex items-center gap-4">
          <h2 className="font-medium text-lg">
            {documentId ? `Document ${documentId}` : "PDF Viewer"}
          </h2>
          {isLoading && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-muted-foreground">
                Loading PDF...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* PDF Content Area */}
      <div className="flex-1 relative">
        <div
          ref={viewerRef}
          className="w-full h-full bg-gray-100"
          style={{ minHeight: "400px" }}
        >
          {!documentId && !isLoading && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <p>Select a document to start reading</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
