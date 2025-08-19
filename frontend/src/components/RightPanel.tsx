import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Play, Pause } from 'lucide-react';
import LoadingText from './LoadingText';

// Update Section interface to allow empty original_content and flexible fields
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
}

interface RightPanelProps {
  selectedText: string;
  onAudioFormatSelect: (format: 'debater' | 'investigator' | 'fundamentals' | 'connections') => void;
  activeAudioFormat: 'debater' | 'investigator' | 'fundamentals' | 'connections' | null;
  onSectionCardClick?: (docId: string, searchTerm: string) => void;
}

const RightPanel = ({ selectedText, onAudioFormatSelect, activeAudioFormat, onSectionCardClick }: RightPanelProps) => {
  const [activeTab, setActiveTab] = useState<'related' | 'insights'>('related');
  const [activeInsightTab, setActiveInsightTab] = useState<'contradictions' | 'enhancements' | 'connections'>('contradictions');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60);

  // Related sections and AI insights from API
  const [relatedSections, setRelatedSections] = useState<Section[]>([]);
  const [aiInsights, setAiInsights] = useState<{ contradictions: Section[]; enhancements: Section[]; connections: Section[]; podcast_script: { line: string; speaker: string }[] }>({ contradictions: [], enhancements: [], connections: [], podcast_script: [] });
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  
  // New state for podcast data and loading
  const [podcastData, setPodcastData] = useState<any>(null);
  const [isPodcastLoading, setIsPodcastLoading] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 1;
          if (newTime >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  useEffect(() => {
    if (!selectedText) {
      setRelatedSections([]);
      setAiInsights({ contradictions: [], enhancements: [], connections: [], podcast_script: [] });
      setPodcastData(null); // Clear podcast data when no text is selected
      return;
    }
    
    setIsLoadingRelated(true);
    setIsLoadingInsights(true);
    setPodcastData(null); // Clear previous podcast data
    
    // Fetch related sections
    const fetchRelated = async () => {
      try {
        const response = await fetch("http://localhost:8000/get_retrieved_sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selection: selectedText })
        });
        const data = await response.json();
        setRelatedSections(data.retrieved_sections || []);
      } catch (error) {
        console.error("Error retrieving sections:", error);
        setRelatedSections([]);
      } finally {
        setIsLoadingRelated(false);
      }
    };
    
    // Fetch AI insights
    const fetchInsights = async () => {
      try {
        const response = await fetch("http://localhost:8000/get_generated_insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selection: selectedText })
        });
        const data = await response.json();
        setAiInsights({
          contradictions: data.contradictions || [],
          enhancements: data.enhancements || [],
          connections: data.connections || [],
          podcast_script: data.podcast_script || []
        });
      } catch (error) {
        console.error("Error retrieving insights:", error);
        setAiInsights({ contradictions: [], enhancements: [], connections: [], podcast_script: [] });
      } finally {
        setIsLoadingInsights(false);
      }
    };

    fetchRelated();
    fetchInsights();
  }, [selectedText]);

  // New effect to fetch podcast data when both related sections and insights are loaded
  useEffect(() => {
    const shouldFetchPodcast = selectedText && !isLoadingRelated && !isLoadingInsights;
    
    if (shouldFetchPodcast && !podcastData && !isPodcastLoading) {
      const fetchPodcastData = async () => {
        setIsPodcastLoading(true);
        try {
          const response = await fetch("http://localhost:8000/get_persona_podcast", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ selection: selectedText })
          });
          const data = await response.json();
          setPodcastData(data);
          console.log('Podcast data fetched:', data);
        } catch (error) {
          console.error("Error fetching podcast data:", error);
          setPodcastData(null);
        } finally {
          setIsPodcastLoading(false);
        }
      };

      fetchPodcastData();
    }
  }, [selectedText, isLoadingRelated, isLoadingInsights, podcastData, isPodcastLoading]);

  const audioFormats = [
    { id: 'debater', label: 'Debater', icon: '💬' },
    { id: 'investigator', label: 'Investigator', icon: '🔍' },
    { id: 'fundamentals', label: 'Fundamentals', icon: '🧠' },
    { id: 'connections', label: 'Connections', icon: '🔗' }
  ];

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    setCurrentTime(value[0]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFormatLabel = (format: string) => {
    const formatData = audioFormats.find(f => f.id === format);
    return formatData ? formatData.label : format;
  };

  // Updated podcast click handler to use stored data
  const handlePodcastClick = (persona: string) => {
    if (podcastData && podcastData[persona]) {
      console.log(`Podcast for ${persona}:`, podcastData[persona]);
      onAudioFormatSelect(persona as any);
      // Here you can do whatever you need with the stored podcast data
      // For example, set up the audio player, display content, etc.
    }
  };

  // Check if podcast buttons should be disabled
  const arePodcastButtonsDisabled = isLoadingRelated || isLoadingInsights || isPodcastLoading || !podcastData;

  // Update renderSectionList to handle empty original_content and show all fields
  const renderSectionList = (sections: Section[]) => (
    <div className="space-y-3">
      {sections.map((section, idx) => {
        const docId = section.document_name;
        return (
          <button
            key={idx}
            className="break-all w-full text-left p-3 bg-card border border-border rounded-lg hover:shadow-sm transition-all duration-200"
            onClick={() => {
              if (onSectionCardClick && docId) {
                const trimmedContent = section.original_content && section.original_content.trim() !== ''
                  ? section.original_content.slice(0, 30)
                  : (section.section_title || section.full_path || '');
                onSectionCardClick(docId, trimmedContent);
              }
            }}
            title={section.section_title}
          >
            <div className="break-all font-medium text-sm mb-1">{section.section_title || section.full_path || 'Untitled'}</div>
            {section.original_content && section.original_content.trim() !== '' ? (
              <div className="text-xs text-foreground mb-2 line-clamp-3">
                {section.original_content.length > 120
                  ? section.original_content.slice(0, 120) + '...'
                  : section.original_content}
              </div>
            ) : null}
            <div className="text-xs text-muted-foreground mb-2 line-clamp-2">{section.full_path}</div>
            <div className="text-xs text-muted-foreground">Page: {section.page_number} | Doc: {section.document_name}</div>
            {section.bounding_box && (
              <div className="text-xs text-muted-foreground mt-1">
                Bounding Box: x0={section.bounding_box.x0}, x1={section.bounding_box.x1}, y0={section.bounding_box.y0}, y1={section.bounding_box.y1}
              </div>
            )}
            <div className="text-right mt-2">
              <span className="text-2xl">"</span>
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="h-full flex flex-col panel border-l">
      {/* Selected Text */}
      <div className="p-4 border-b border-panel-border">
        <h3 className="font-medium text-sm mb-2">Selected Text</h3>
        <div className="text-sm text-muted-foreground italic">
          {selectedText || '"Select text from the document to see insights"'}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-panel-border">
        <button
          onClick={() => setActiveTab('related')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'related'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Related Sections
          {activeTab === 'related' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'insights'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          AI Insights
          {activeTab === 'insights' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {activeTab === 'related' ? (
          <div className="p-4">
            {!selectedText ? (
              <div className="text-muted-foreground italic">Select text from the document to see related sections.</div>
            ) : isLoadingRelated ? (
              <LoadingText />
            ) : (
              renderSectionList(relatedSections)
            )}
          </div>
        ) : (
          <div className="p-4">
            {isLoadingInsights ? (
              <LoadingText />
            ) : (
              <Tabs value={activeInsightTab} onValueChange={(value) => setActiveInsightTab(value as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="contradictions" className="text-xs">Contradictions</TabsTrigger>
                  <TabsTrigger value="enhancements" className="text-xs">Enhancements</TabsTrigger>
                  <TabsTrigger value="connections" className="text-xs">Connections</TabsTrigger>
                </TabsList>
                <TabsContent value="contradictions" className="mt-4">
                  {aiInsights.contradictions.length > 0 ? renderSectionList(aiInsights.contradictions) : <div className="text-muted-foreground italic">No contradictions found.</div>}
                </TabsContent>
                <TabsContent value="enhancements" className="mt-4">
                  {aiInsights.enhancements.length > 0 ? renderSectionList(aiInsights.enhancements) : <div className="text-muted-foreground italic">No enhancements found.</div>}
                </TabsContent>
                <TabsContent value="connections" className="mt-4">
                  {aiInsights.connections.length > 0 ? renderSectionList(aiInsights.connections) : <div className="text-muted-foreground italic">No connections found.</div>}
                </TabsContent>
                {/* Podcast Script Display */}
                {aiInsights.podcast_script.length > 0 && (
                  <div className="mt-6">
                    <div className="font-semibold text-base mb-2">Podcast Script</div>
                    <div className="space-y-2">
                      {aiInsights.podcast_script.map((line, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground"><span className="font-bold">{line.speaker}:</span> {line.line}</div>
                      ))}
                    </div>
                  </div>
                )}
              </Tabs>
            )}
          </div>
        )}
      </div>

      {/* Audio Format Selection */}
      <div className="p-4 border-t border-panel-border">
        <h3 className="font-medium text-sm mb-3">Choose Audio Format</h3>
        <div className="grid grid-cols-2 gap-2">
          {audioFormats.map((format) => (
            <Button
              key={format.id}
              variant="outline"
              size="sm"
              onClick={() => handlePodcastClick(format.id)}
              className="flex items-center gap-2 h-auto p-3"
              disabled={arePodcastButtonsDisabled}
            >
              <span className="text-lg">{format.icon}</span>
              <span className="text-xs">{format.label}</span>
              {isPodcastLoading && (
                <span className="ml-2 w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
              )}
            </Button>
          ))}
        </div>
        {/* Loading indicator for podcast data */}
        {isPodcastLoading && (
          <div className="mt-2 text-xs text-muted-foreground text-center">
            Loading podcast data...
          </div>
        )}
      </div>

      {/* Audio Player */}
      {activeAudioFormat && (
        <div className="p-4 border-t border-panel-border bg-card">
          <div className="mb-3">
            <h3 className="font-medium text-sm capitalize">{getFormatLabel(activeAudioFormat)}</h3>
            <p className="text-xs text-muted-foreground">
              Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum 
              has been the industry's standard dummy text ever since the 1500s...
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              onClick={handlePlayPause}
              size="sm"
              className="w-8 h-8 rounded-full p-0"
            >
              {isPlaying ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
            </Button>
            
            <div className="flex-1 flex items-center gap-2">
              <span className="text-xs text-muted-foreground min-w-[32px]">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration}
                step={1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground min-w-[32px]">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RightPanel;