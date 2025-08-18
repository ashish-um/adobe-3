import { useState } from "react";
import axios from "axios";
import ResizablePanel from "@/components/ResizablePanel";
import LeftPanel from "@/components/LeftPanel";
import PDFViewer from "@/components/PDFViewer";
import RightPanel from "@/components/RightPanel";

interface Section {
  id: string;
  title: string;
  preview: string;
  source: string;
}

const Index = () => {
  const [selectedDocument, setSelectedDocument] = useState<string>("");
  const [selectedText, setSelectedText] = useState<string>("");
  const [audioFormat, setAudioFormat] = useState<
    "debater" | "investigator" | "fundamentals" | "connections" | null
  >(null);
  // Removed retrievedSections state; will be handled in LeftPanel

  const handleSectionClick = (section: Section) => {
    console.log("Section clicked:", section);
    // Here you would handle section selection logic
  };

  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocument(documentId);
    console.log("Document selected:", documentId);
  };

  const handleTextSelect = (text: string) => {
    setSelectedText(text);
  };

  const handleAudioFormatSelect = (
    format: "debater" | "investigator" | "fundamentals" | "connections"
  ) => {
    setAudioFormat(format);
    console.log("Audio format selected:", format);
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Left Panel */}
      <ResizablePanel
        defaultWidth={340}
        minWidth={340}
        maxWidth={500}
        position="left"
        collapsible={true}
      >
        <LeftPanel
          onSectionClick={handleSectionClick}
          onDocumentSelect={handleDocumentSelect}
          selectedText={selectedText}
        />
      </ResizablePanel>

      {/* Middle Panel - PDF Viewer */}
      <div className="flex-1 h-full">
        <PDFViewer
          documentId={selectedDocument}
          onTextSelect={handleTextSelect}
        />
      </div>

      {/* Right Panel */}
      <ResizablePanel
        defaultWidth={350}
        minWidth={300}
        maxWidth={500}
        position="right"
        collapsible={true}
      >
        <RightPanel
          selectedText={selectedText}
          onAudioFormatSelect={handleAudioFormatSelect}
          activeAudioFormat={audioFormat}
        />
      </ResizablePanel>
    </div>
  );
};

export default Index;
