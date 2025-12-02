import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Tab, Note, UserStats } from './types';
import { 
  IconHome, IconPlus, IconUser, IconStar, 
  IconCamera, IconMagic, IconWineGlass, INITIAL_NOTES,
  IconLocation, IconWallet, IconCalendar, IconX, IconChevronLeft, IconTrash,
  IconPencil, IconTag
} from './constants';
import { editImageWithGemini } from './services/geminiService';

// --- Components ---

const Header = ({ title, leftItem, rightItem }: { title: string, leftItem?: React.ReactNode, rightItem?: React.ReactNode }) => (
  <header className="absolute top-0 left-0 right-0 h-[52px] z-50 flex items-center justify-center bg-[#F2F2F7]/80 backdrop-blur-xl border-b border-[#000000]/5 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
    {leftItem && (
        <div className="absolute left-4 h-full flex items-center">
            {leftItem}
        </div>
    )}
    <h1 className="text-[17px] font-semibold text-[#000000] tracking-tight">{title}</h1>
    {rightItem && (
        <div className="absolute right-4 h-full flex items-center">
            {rightItem}
        </div>
    )}
  </header>
);

const TabBar = ({ activeTab, onTabChange, onAddClick }: { activeTab: Tab; onTabChange: (t: Tab) => void, onAddClick: () => void }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-[88px] bg-[#F2F2F7]/80 backdrop-blur-xl border-t border-[#C6C6C8] flex justify-around items-start pt-4 z-40">
      <button 
        onClick={() => onTabChange(Tab.HOME)}
        className={`flex flex-col items-center justify-center w-20 transition-colors ${activeTab === Tab.HOME ? 'text-[#007AFF]' : 'text-[#999999]'}`}
      >
        <IconHome className="w-8 h-8" />
      </button>

      <button 
        onClick={onAddClick}
        className="flex flex-col items-center justify-center -mt-6 z-50"
      >
        <div className={`w-14 h-14 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.15)] flex items-center justify-center transition-transform active:scale-95 bg-[#007AFF] text-white`}>
           <IconPlus className="w-8 h-8" />
        </div>
      </button>

      <button 
        onClick={() => onTabChange(Tab.PROFILE)}
        className={`flex flex-col items-center justify-center w-20 transition-colors ${activeTab === Tab.PROFILE ? 'text-[#007AFF]' : 'text-[#999999]'}`}
      >
        <IconUser className="w-8 h-8" />
      </button>
    </div>
  );
};

// --- Home Components ---

const GreetingBar = ({ avatarUrl }: { avatarUrl: string }) => (
    <div className="flex justify-between items-center px-6 py-4 bg-transparent z-40">
        <div className="flex flex-col">
            <span className="text-[12px] font-medium text-[#3C3C43]/60 uppercase tracking-wide">Good Evening,</span>
            <span className="text-[18px] font-bold text-black/90 leading-none">Ready for a drink?</span>
        </div>
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 border border-white/50 shadow-sm shrink-0">
             <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        </div>
    </div>
);

interface NoteCardProps {
    note: Note;
    style?: React.CSSProperties; 
    className?: string;
    onClick?: () => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, style, className, onClick }) => (
    <div 
        style={style}
        onClick={onClick}
        className={`w-full max-w-sm h-[65vh] bg-white rounded-[16px] shadow-[0_8px_20px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col transition-all duration-500 ease-out mx-auto border border-black/5 ${className}`}
    >
        {/* Image Area */}
        <div className="h-[60%] bg-gray-100 relative overflow-hidden">
             <img src={note.imageUrl} alt={note.title} className="w-full h-full object-cover" />
        </div>
        
        {/* Content Area */}
        <div className="flex-1 p-5 flex flex-col">
            <div className="flex flex-col items-center justify-center mb-4">
                <h2 className="text-[22px] font-bold text-black/90 leading-snug text-center mb-1">{note.title}</h2>
                <div className="flex text-[#FF9500] gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                        <IconStar key={i} className="w-4 h-4" filled={i <= note.rating} />
                    ))}
                </div>
            </div>
            
            <p className="text-[14px] text-[#3C3C43]/60 leading-relaxed mb-4 line-clamp-3 text-center px-2">
                {note.description}
            </p>

            <div className="mt-auto flex justify-between items-end gap-2 pb-1">
                <div className="flex overflow-x-auto gap-2 no-scrollbar max-w-[70%]">
                    {note.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-[#E5E5EA] text-black/80 text-[12px] font-medium rounded-full whitespace-nowrap">
                            {tag}
                        </span>
                    ))}
                </div>
                <span className="text-[12px] font-medium text-[#C6C6C8] shrink-0">
                    {note.time}
                </span>
            </div>
        </div>
    </div>
);

const HomeView: React.FC<{ notes: Note[], onNoteClick: (note: Note) => void }> = ({ notes, onNoteClick }) => {
  const groupedNotes = useMemo(() => {
    const groups: { [key: string]: Note[] } = {};
    notes.forEach(note => {
        if (!groups[note.date]) groups[note.date] = [];
        groups[note.date].push(note);
    });
    return Object.entries(groups).map(([date, groupNotes]) => ({ date, groupNotes }));
  }, [notes]);

  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [activeNoteIndices, setActiveNoteIndices] = useState<{[key: number]: number}>({});
  const verticalScrollRef = useRef<HTMLDivElement>(null);
  
  const touchStartRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const minSwipeDistance = 50;

  const handleVerticalScroll = () => {
    if (verticalScrollRef.current) {
      const { scrollTop, clientHeight } = verticalScrollRef.current;
      const index = Math.round(scrollTop / clientHeight);
      if (index !== activeGroupIndex && index >= 0 && index < groupedNotes.length) {
        setActiveGroupIndex(index);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.targetTouches[0].clientX;
    isDraggingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current !== null) {
        if (Math.abs(e.targetTouches[0].clientX - touchStartRef.current) > 10) {
            isDraggingRef.current = true;
        }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, groupIndex: number, maxIndex: number) => {
    if (touchStartRef.current === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchStartRef.current - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
        setActiveNoteIndices(prev => {
            const currentIndex = prev[groupIndex] || 0;
            let newIndex = currentIndex;
            
            if (isLeftSwipe && currentIndex < maxIndex) {
                newIndex = currentIndex + 1;
            }
            if (isRightSwipe && currentIndex > 0) {
                newIndex = currentIndex - 1;
            }
            return { ...prev, [groupIndex]: newIndex };
        });
    }
    touchStartRef.current = null;
    // Reset dragging ref slightly later to prevent click events from firing immediately
    setTimeout(() => {
        isDraggingRef.current = false;
    }, 100);
  };

  const handleCardClick = (groupIndex: number, maxIndex: number, note: Note) => {
      // Prevent click if we just swiped
      if (isDraggingRef.current) return;

      // If we are on the active card, navigate to details
      const currentStackIndex = activeNoteIndices[groupIndex] || 0;
      const groupNotes = groupedNotes[groupIndex].groupNotes;
      const isActive = groupNotes[currentStackIndex].id === note.id;

      if (isActive) {
        onNoteClick(note);
      }
  };

  const activeGroup = groupedNotes[activeGroupIndex] || groupedNotes[0];
  const activeNoteIndex = activeNoteIndices[activeGroupIndex] || 0;
  const activeNote = activeGroup?.groupNotes[activeNoteIndex] || activeGroup?.groupNotes[0];

  return (
    <div className="relative h-screen overflow-hidden bg-[#F2F2F7]">
        {/* Atmosphere Background Layer */}
        <div className="absolute inset-0 z-0 transition-opacity duration-700 ease-in-out">
            <div 
                key={activeNote?.imageUrl}
                className="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl scale-125 transition-all duration-1000"
                style={{ backgroundImage: `url(${activeNote?.imageUrl})` }}
            />
            <div className="absolute inset-0 bg-[#F2F2F7]/80 mix-blend-overlay" />
        </div>

        <Header title="Drinking Diary" />
        
        <div className="flex flex-col h-full pt-[52px] pb-[90px]">
            <GreetingBar avatarUrl="https://picsum.photos/100/100" />

            <div 
                ref={verticalScrollRef}
                onScroll={handleVerticalScroll}
                className="flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar z-10"
            >
                {groupedNotes.map((group, groupIndex) => {
                    const groupActiveIndex = activeNoteIndices[groupIndex] || 0;
                    
                    return (
                        <div key={group.date} className="h-full w-full snap-center flex flex-col justify-center relative overflow-hidden">
                            <div 
                                className="relative w-full h-[65vh] flex items-center justify-center perspective-[1000px]"
                                style={{ touchAction: 'pan-y' }}
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={(e) => handleTouchEnd(e, groupIndex, group.groupNotes.length - 1)}
                            >
                                {group.groupNotes.map((note, noteIndex) => {
                                    const offset = noteIndex - groupActiveIndex;
                                    let style: React.CSSProperties = {};
                                    let zIndex = 0;
                                    let pointerEvents: 'auto' | 'none' = 'none';

                                    if (offset === 0) {
                                        style = { transform: 'translateX(0) scale(1) rotate(0deg)', opacity: 1 };
                                        zIndex = 30;
                                        pointerEvents = 'auto';
                                    } else if (offset === 1) {
                                        style = { transform: 'translateX(20px) scale(0.95) rotate(3deg)', opacity: 1 };
                                        zIndex = 20;
                                    } else if (offset === 2) {
                                        style = { transform: 'translateX(35px) scale(0.9) rotate(6deg)', opacity: 0.5 };
                                        zIndex = 10;
                                    } else if (offset > 2) {
                                        style = { transform: 'translateX(40px) scale(0.85)', opacity: 0 };
                                        zIndex = 0;
                                    } else if (offset < 0) {
                                        style = { transform: 'translateX(-120%) scale(0.9) rotate(-10deg)', opacity: 0 };
                                        zIndex = 40;
                                    }

                                    return (
                                        <div 
                                            key={note.id} 
                                            className="absolute w-full px-8 transition-all duration-500 ease-out-expo"
                                            style={{ zIndex, ...style, pointerEvents }}
                                        >
                                            <NoteCard 
                                                note={note} 
                                                onClick={() => handleCardClick(groupIndex, group.groupNotes.length - 1, note)} 
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            {group.groupNotes.length > 1 && (
                                <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none transition-opacity duration-300" style={{ opacity: groupActiveIndex < group.groupNotes.length - 1 ? 0.4 : 0 }}>
                                    <span className="text-[10px] uppercase tracking-widest text-black/50">Swipe Left</span>
                                </div>
                            )}

                        </div>
                    );
                })}
            </div>
        </div>

        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-30 flex flex-col items-end gap-2 pr-1 pointer-events-none">
            {groupedNotes.map((group, idx) => {
                const isActive = idx === activeGroupIndex;
                return (
                    <div 
                        key={group.date}
                        className={`transition-all duration-300 flex items-center justify-center
                            ${isActive ? 'bg-black text-white pr-3 pl-4 py-1.5 rounded-l-full translate-x-0' : 'bg-white/40 backdrop-blur-md text-black/50 pr-2 pl-2 py-1 rounded-l-md translate-x-2'}
                        `}
                        style={{
                            boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.2)' : 'none'
                        }}
                    >
                        <span className={`text-[10px] font-bold tracking-wider ${isActive ? 'opacity-100' : 'opacity-0 hidden'}`}>
                             {group.date}
                        </span>
                        {!isActive && (
                            <div className="w-1.5 h-1.5 rounded-full bg-black/20" />
                        )}
                    </div>
                );
            })}
        </div>
    </div>
  );
};

// --- Editor Component (Create & Edit) ---

interface NoteEditorProps {
    initialNote?: Note | null;
    onSave: (note: Note) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ initialNote, onSave, onDelete, onClose }) => {
  const isEditing = !!initialNote;

  // State initialization
  const [image, setImage] = useState<string | null>(initialNote?.imageUrl || null);
  const [title, setTitle] = useState(initialNote?.title || "");
  const [description, setDescription] = useState(initialNote?.description || "");
  const [rating, setRating] = useState(initialNote?.rating || 3);
  const [location, setLocation] = useState(initialNote?.location || "");
  const [price, setPrice] = useState<string>(initialNote?.price?.toString() || "");
  
  // Tags handling
  const [selectedTags, setSelectedTags] = useState<string[]>(initialNote?.tags || []);
  const [customTag, setCustomTag] = useState("");

  // AI State
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const PRESET_TAGS = ['Fruity', 'Smoky', 'Sweet', 'Dry', 'Bitter', 'Strong', 'Smooth'];

  const toggleTag = (tag: string) => {
      if (selectedTags.includes(tag)) {
          setSelectedTags(selectedTags.filter(t => t !== tag));
      } else {
          setSelectedTags([...selectedTags, tag]);
      }
  };

  const addCustomTag = () => {
      if (customTag && !selectedTags.includes(customTag)) {
          setSelectedTags([...selectedTags, customTag]);
          setCustomTag("");
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!image || !prompt) return;
    setIsGenerating(true);
    try {
      const result = await editImageWithGemini(image, prompt, 'image/jpeg');
      if (result) {
        setImage(result);
        setPrompt("");
        setShowAiInput(false);
      } else {
        alert("Failed to edit image.");
      }
    } catch (e) {
      console.error(e);
      alert("Error generating image.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!title) return;
    const now = new Date();
    const noteToSave: Note = {
        id: initialNote?.id || Date.now().toString(),
        title,
        description,
        rating,
        tags: selectedTags,
        imageUrl: image || `https://images.unsplash.com/photo-1514362545857-3bc16549766b?auto=format&fit=crop&w=800&q=80`,
        date: initialNote?.date || now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }).replace('/', '.'),
        time: initialNote?.time || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        location,
        price: price ? parseFloat(price) : undefined
    };
    onSave(noteToSave);
  };

  return (
      <div className="fixed inset-0 z-[60] bg-[#F2F2F7] flex flex-col animate-slide-up">
          <Header 
            title={isEditing ? "Edit Note" : "New Entry"} 
            leftItem={
                <button onClick={onClose} className="text-[#007AFF] text-[17px] flex items-center gap-1">
                    {isEditing ? <><IconChevronLeft className="w-5 h-5"/> Back</> : "Cancel"}
                </button>
            }
            rightItem={
                isEditing && (
                    <button onClick={() => initialNote && onDelete(initialNote.id)} className="text-[#FF3B30]">
                        <IconTrash className="w-5 h-5" />
                    </button>
                )
            }
          />

          <div className="flex-1 overflow-y-auto pb-32 pt-[70px]">
              {/* Photo Section */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative group">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-[120px] h-[120px] bg-white rounded-[24px] shadow-sm flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-transform border border-gray-200"
                    >
                        {image ? (
                            <img src={image} alt="Upload" className="w-full h-full object-cover" />
                        ) : (
                            <IconCamera className="w-8 h-8 text-[#999999]" />
                        )}
                    </div>
                    {image && (
                        <button 
                            onClick={() => setShowAiInput(!showAiInput)}
                            className="absolute -bottom-3 -right-3 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shadow-lg border-2 border-[#F2F2F7] active:scale-90 transition-transform"
                        >
                            <IconMagic className="w-5 h-5" />
                        </button>
                    )}
                </div>
                 <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            </div>

            {/* AI Prompt Area */}
            {showAiInput && (
                <div className="mx-4 mb-6 p-4 bg-white rounded-[16px] shadow-sm animate-fade-in-up">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Gemini AI Editor</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="E.g. 'Add a moody vintage filter'"
                            className="flex-1 bg-[#F2F2F7] rounded-lg px-3 py-2 text-sm outline-none"
                        />
                        <button 
                            onClick={handleGenerate}
                            disabled={!prompt || isGenerating}
                            className="bg-[#007AFF] text-white px-4 rounded-lg text-sm font-semibold disabled:opacity-50"
                        >
                            {isGenerating ? "..." : "Magic"}
                        </button>
                    </div>
                </div>
            )}

            {/* Core Info Group */}
            <div className="mx-4 mb-6 bg-white rounded-[12px] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <div className="flex items-center p-4 border-b border-[#C6C6C8]/30">
                    <label className="w-20 text-[17px] text-black flex items-center gap-2">
                        <IconPencil className="w-5 h-5 text-gray-400" /> Name
                    </label>
                    <input 
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Drink Name"
                        className="flex-1 text-[17px] outline-none text-right bg-transparent placeholder-gray-300"
                    />
                </div>
                <div className="flex items-center p-4">
                    <label className="w-20 text-[17px] text-black flex items-center gap-2">
                        <IconStar className="w-5 h-5 text-gray-400" /> Rating
                    </label>
                    <div className="flex-1 flex justify-end gap-1">
                        {[1,2,3,4,5].map(i => (
                            <button key={i} onClick={() => setRating(i)}>
                                <IconStar className={`w-7 h-7 ${i <= rating ? 'text-[#FF9500]' : 'text-[#E5E5EA]'}`} filled={true} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Location & Price Group */}
            <div className="mx-4 mb-6 bg-white rounded-[12px] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <div className="flex items-center p-4 border-b border-[#C6C6C8]/30">
                    <label className="flex items-center gap-2 w-28 text-[17px] text-black">
                        <IconLocation className="w-5 h-5 text-gray-400"/> Location
                    </label>
                    <input 
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Bar or City"
                        className="flex-1 text-[17px] outline-none text-right bg-transparent placeholder-gray-300"
                    />
                </div>
                <div className="flex items-center p-4">
                    <label className="flex items-center gap-2 w-28 text-[17px] text-black">
                        <IconWallet className="w-5 h-5 text-gray-400"/> Price
                    </label>
                    <input 
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 text-[17px] outline-none text-right bg-transparent placeholder-gray-300"
                    />
                </div>
            </div>

            {/* Tags Group */}
            <div className="mx-4 mb-6 bg-white rounded-[12px] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-4">
                <label className="text-[17px] text-black mb-3 flex items-center gap-2">
                    <IconTag className="w-5 h-5 text-gray-400" /> Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                     {PRESET_TAGS.map(t => (
                         <button 
                            key={t}
                            onClick={() => toggleTag(t)}
                            className={`px-4 py-1.5 rounded-full text-[15px] font-medium transition-colors
                                ${selectedTags.includes(t) ? 'bg-[#007AFF] text-white' : 'bg-[#E5E5EA] text-black/70 active:bg-[#D1D1D6]'}
                            `}
                         >
                            {t}
                         </button>
                     ))}
                     {/* Custom user tags */}
                     {selectedTags.filter(t => !PRESET_TAGS.includes(t)).map(t => (
                         <button 
                            key={t}
                            onClick={() => toggleTag(t)}
                            className="px-4 py-1.5 bg-[#007AFF] text-white rounded-full text-[15px] font-medium"
                         >
                            {t} <span className="opacity-50 ml-1">×</span>
                         </button>
                     ))}
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#C6C6C8]/30">
                    <input 
                        type="text"
                        value={customTag}
                        onChange={(e) => setCustomTag(e.target.value)}
                        placeholder="Add custom tag..."
                        className="flex-1 text-sm outline-none bg-transparent"
                        onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
                    />
                    {customTag && (
                        <button onClick={addCustomTag} className="text-[#007AFF] text-sm font-semibold">Add</button>
                    )}
                </div>
            </div>

            {/* Description Group */}
             <div className="mx-4 mb-24 bg-white rounded-[12px] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-4">
                <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tasting notes..."
                    rows={4}
                    className="w-full text-[17px] leading-relaxed outline-none bg-transparent resize-none placeholder-gray-300"
                />
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#F2F2F7]/90 backdrop-blur-md">
                <button 
                    onClick={handleSave}
                    className="w-full h-[50px] bg-[#007AFF] text-white text-[17px] font-semibold rounded-[14px] shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
                >
                    {isEditing ? 'Save Entry' : 'Save Entry'}
                </button>
            </div>
      </div>
  );
};


// --- Profile Components ---

const ProfileView: React.FC<{ stats: UserStats, notes: Note[], onNoteClick: (note: Note) => void }> = ({ stats, notes, onNoteClick }) => {
    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-40 animate-fade-in relative">
             <Header title="My Gallery" />

             <div className="pt-[70px]">
                 {/* User Info */}
                 <div className="flex flex-col items-center mb-6">
                     <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-md mb-2">
                        <img src="https://picsum.photos/100/100" alt="Avatar" className="w-full h-full object-cover" />
                     </div>
                     <h2 className="text-[20px] font-bold text-black">Alex</h2>
                     <span className="text-sm text-gray-500">Sommelier in training</span>
                 </div>

                {/* Stats Card */}
                <div className="mx-4 mb-8 bg-white rounded-[16px] shadow-[0_4px_12px_rgba(0,0,0,0.03)] grid grid-cols-3 py-6 divide-x divide-[#C6C6C8]/30">
                    <div className="flex flex-col items-center gap-1">
                        <IconWineGlass className="w-6 h-6 text-[#007AFF] mb-1 opacity-80" />
                        <span className="text-[20px] font-bold text-black leading-none">{stats.totalNotes}</span>
                        <span className="text-[10px] font-bold text-[#999999] uppercase tracking-wider">GLASSES</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <IconWallet className="w-6 h-6 text-[#FF9500] mb-1 opacity-80" />
                        <span className="text-[20px] font-bold text-black leading-none">${stats.totalSpent}</span>
                        <span className="text-[10px] font-bold text-[#999999] uppercase tracking-wider">SPENT</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <IconCalendar className="w-6 h-6 text-[#34C759] mb-1 opacity-80" />
                        <span className="text-[20px] font-bold text-black leading-none">{stats.daysActive}</span>
                        <span className="text-[10px] font-bold text-[#999999] uppercase tracking-wider">DAYS</span>
                    </div>
                </div>

                {/* Photo Grid */}
                {notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center pt-20 opacity-50">
                        <IconWineGlass className="w-16 h-16 text-[#999999] mb-4" />
                        <p className="text-[#999999] font-medium">No Records Yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-px bg-[#F2F2F7]">
                        {notes.map(note => (
                            <div 
                                key={note.id} 
                                className="aspect-square relative bg-gray-100 cursor-pointer active:opacity-80 transition-opacity"
                                onClick={() => onNoteClick(note)}
                            >
                                <img src={note.imageUrl} alt={note.title} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                )}
             </div>
        </div>
    );
};

// --- Main App Logic ---

const App = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  
  // Editor State
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  const stats: UserStats = useMemo(() => {
      const totalSpent = notes.reduce((acc, curr) => acc + (curr.price || 0), 0);
      
      // Calculate active days in current month (Assuming dates are 'MM.DD')
      const currentMonthPrefix = new Date().toLocaleDateString('en-US', { month: '2-digit' }).replace('/', '') + '.';
      // For demo, since date format is MM.DD, let's just count unique dates in general or naive "this month" check
      const uniqueDays = new Set(notes.map(n => n.date)).size;

      return {
          totalNotes: notes.length,
          totalSpent,
          daysActive: uniqueDays
      };
  }, [notes]);

  const handleSaveNote = (savedNote: Note) => {
    if (editingNote) {
        // Update existing
        setNotes(notes.map(n => n.id === savedNote.id ? savedNote : n));
    } else {
        // Create new
        setNotes([savedNote, ...notes]);
        setActiveTab(Tab.HOME); // Go to home to see new note
    }
    handleCloseEditor();
  };

  const handleDeleteNote = (id: string) => {
      if (confirm("Are you sure you want to delete this note?")) {
          setNotes(notes.filter(n => n.id !== id));
          handleCloseEditor();
      }
  };

  const handleCloseEditor = () => {
      setIsCreating(false);
      setEditingNote(null);
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1C1C1E] font-sans selection:bg-blue-200">
        
      <main className="max-w-md mx-auto min-h-screen bg-[#F2F2F7] relative shadow-2xl overflow-hidden">
         
         {activeTab === Tab.HOME && (
             <HomeView notes={notes} onNoteClick={setEditingNote} />
         )}

         {activeTab === Tab.PROFILE && (
            <ProfileView stats={stats} notes={notes} onNoteClick={setEditingNote} />
         )}

         <TabBar 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            onAddClick={() => setIsCreating(true)}
         />

         {/* Editor Overlay */}
         {(isCreating || editingNote) && (
             <NoteEditor 
                initialNote={editingNote}
                onSave={handleSaveNote}
                onDelete={handleDeleteNote}
                onClose={handleCloseEditor}
             />
         )}

      </main>

      <style>{`
        @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slide-up {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
        }
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fade-in 0.3s ease-out;
        }
        .animate-slide-up {
            animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
};

export default App;