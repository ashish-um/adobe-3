import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Play, Pause } from 'lucide-react';
import LoadingText from './LoadingText';

interface Section {
  id: string;
  title: string;
  preview: string;
  source: string;
}

interface RightPanelProps {
  selectedText: string;
  onAudioFormatSelect: (format: 'debater' | 'investigator' | 'fundamentals' | 'connections') => void;
  activeAudioFormat: 'debater' | 'investigator' | 'fundamentals' | 'connections' | null;
}

const RightPanel = ({ selectedText, onAudioFormatSelect, activeAudioFormat }: RightPanelProps) => {
  const [activeTab, setActiveTab] = useState<'related' | 'insights'>('related');
  const [activeInsightTab, setActiveInsightTab] = useState<'contradictions' | 'enhancements' | 'connections'>('contradictions');
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    // Show loading for 3 seconds then show content
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

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

  // Mock data for related sections
  const relatedSections: Section[] = [
    {
      id: 'r1',
      title: 'Chapter 3 > String Theory',
      preview: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry...',
      source: 'Source: Document Name, Page 5'
    },
    {
      id: 'r2',
      title: 'Chapter 3 > String Theory',
      preview: 'Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s...',
      source: 'Source: Document Name, Page 6'
    }
  ];

  // Mock data for AI insights
  const aiInsights = {
    contradictions: [
      {
        id: 'c1',
        title: 'Market Trend Contradiction',
        preview: 'The data shows conflicting trends in consumer behavior...',
        source: 'AI Analysis'
      }
    ],
    enhancements: [
      {
        id: 'e1',
        title: 'Data Enhancement Suggestion',
        preview: 'Additional market research could strengthen this analysis...',
        source: 'AI Enhancement'
      }
    ],
    connections: [
      {
        id: 'con1',
        title: 'Cross-Reference Link',
        preview: 'This section relates to findings in Chapter 7...',
        source: 'AI Connection'
      }
    ]
  };

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

  const renderSectionList = (sections: Section[]) => (
    <div className="space-y-3">
      {sections.map((section) => (
        <div
          key={section.id}
          className="p-3 bg-card border border-border rounded-lg hover:shadow-sm transition-all duration-200"
        >
          <div className="font-medium text-sm mb-1">{section.title}</div>
          <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {section.preview}
          </div>
          <div className="text-xs text-muted-foreground">{section.source}</div>
          <div className="text-right mt-2">
            <span className="text-2xl">"</span>
          </div>
        </div>
      ))}
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
            {isLoading ? (
              <LoadingText />
            ) : (
              renderSectionList(relatedSections)
            )}
          </div>
        ) : (
          <div className="p-4">
            {isLoading ? (
              <LoadingText />
            ) : (
              <Tabs value={activeInsightTab} onValueChange={(value) => setActiveInsightTab(value as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="contradictions" className="text-xs">Contradictions</TabsTrigger>
                  <TabsTrigger value="enhancements" className="text-xs">Enhancements</TabsTrigger>
                  <TabsTrigger value="connections" className="text-xs">Connections</TabsTrigger>
                </TabsList>
                
                <TabsContent value="contradictions" className="mt-4">
                  {renderSectionList(aiInsights.contradictions)}
                </TabsContent>
                
                <TabsContent value="enhancements" className="mt-4">
                  {renderSectionList(aiInsights.enhancements)}
                </TabsContent>
                
                <TabsContent value="connections" className="mt-4">
                  {renderSectionList(aiInsights.connections)}
                </TabsContent>
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
              onClick={() => onAudioFormatSelect(format.id as any)}
              className="flex items-center gap-2 h-auto p-3"
            >
              <span className="text-lg">{format.icon}</span>
              <span className="text-xs">{format.label}</span>
            </Button>
          ))}
        </div>
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