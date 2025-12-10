import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
    ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon, FileText, 
    Moon, Sun, Eye, EyeOff, Maximize2, Clock, Plus, Trash2, Edit2, 
    Check, X, Search, Settings, HelpCircle, Bell, Menu, Upload, 
    FolderOpen, Save, HardDrive, FileJson, RefreshCw, Link as LinkIcon, Palette,
    Cloud, Wifi, WifiOff, Copy, LogOut, LayoutGrid, Rows,
    Smartphone, Monitor, ArrowRight, CheckSquare, Circle, CheckCircle,
    Image as ImageIcon, GripVertical, Loader2, User
} from 'lucide-react';
import { 
    format, addMonths, subMonths, startOfMonth, endOfMonth, 
    startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay,
    addDays, subDays, isToday, setMonth, setYear, getYear, getMonth,
    addWeeks, subWeeks, addYears, subYears
} from 'date-fns';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    User as FirebaseUser 
} from 'firebase/auth';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    setDoc, 
    doc, 
    getDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './firebase';
import { Calendar, Todo, Theme, AllEntries, AllColors, AllTodos, UserData, EntryData } from './types';

// --- Constants ---
const THEMES: Record<string, Theme> = {
    light: {
        name: 'Light', bg: 'bg-white', sidebar: 'bg-gray-50 border-r border-gray-200', sidebarText: 'text-gray-500', sidebarActive: 'bg-gray-100', 
        header: 'bg-white', card: 'bg-white', text: 'text-gray-900', subText: 'text-gray-500', border: 'border-gray-200',
        dayBg: 'bg-white', dayHover: 'hover:bg-gray-50', lockBg: 'bg-gray-50',
    },
    dark: {
        name: 'Dark', bg: 'bg-gray-900', sidebar: 'bg-gray-800 border-r border-gray-700', sidebarText: 'text-gray-400', sidebarActive: 'bg-gray-700 text-white',
        header: 'bg-gray-900', card: 'bg-gray-800', text: 'text-gray-100', subText: 'text-gray-500', border: 'border-gray-700',
        dayBg: 'bg-gray-900', dayHover: 'hover:bg-gray-800', lockBg: 'bg-gray-950',
    },
    eyeCare: {
        name: 'Eye Care', bg: 'bg-[#f5f1e6]', sidebar: 'bg-[#e8e4d9] border-r border-[#dcd7cb]', sidebarText: 'text-[#5c5548]', sidebarActive: 'bg-[#dcd7cb] text-[#3e3931]',
        header: 'bg-[#f5f1e6]', card: 'bg-[#fdfbf7]', text: 'text-[#3e3931]', subText: 'text-[#968e81]', border: 'border-[#dcd7cb]',
        dayBg: 'bg-[#fdfbf7]', dayHover: 'hover:bg-[#f5f1e6]', lockBg: 'bg-[#e8e4d9]',
    }
};

const CALENDAR_COLORS = [
    { name: 'Ink', value: 'text-gray-900 dark:text-gray-100', code: '#111827' },
    { name: 'Red', value: 'text-red-600 dark:text-red-400', code: '#dc2626' },
    { name: 'Orange', value: 'text-orange-600 dark:text-orange-400', code: '#ea580c' },
    { name: 'Green', value: 'text-emerald-600 dark:text-emerald-400', code: '#059669' },
    { name: 'Blue', value: 'text-blue-600 dark:text-blue-400', code: '#2563eb' },
    { name: 'Purple', value: 'text-purple-600 dark:text-purple-400', code: '#9333ea' },
    { name: 'Pink', value: 'text-pink-600 dark:text-pink-400', code: '#db2777' },
];

const ENTRY_BG_COLORS = [
    { name: 'Default', class: 'bg-white dark:bg-gray-800/50', code: '#ffffff' }, 
    { name: 'Warm Red', class: 'bg-red-50 dark:bg-red-900/20', code: '#fef2f2' },
    { name: 'Orange', class: 'bg-orange-50 dark:bg-orange-900/20', code: '#fff7ed' },
    { name: 'Amber', class: 'bg-amber-50 dark:bg-amber-900/20', code: '#fffbeb' },
    { name: 'Green', class: 'bg-emerald-50 dark:bg-emerald-900/20', code: '#ecfdf5' },
    { name: 'Teal', class: 'bg-teal-50 dark:bg-teal-900/20', code: '#f0fdfa' },
    { name: 'Blue', class: 'bg-blue-50 dark:bg-blue-900/20', code: '#eff6ff' },
    { name: 'Indigo', class: 'bg-indigo-50 dark:bg-indigo-900/20', code: '#eef2ff' },
    { name: 'Purple', class: 'bg-purple-50 dark:bg-purple-900/20', code: '#faf5ff' },
    { name: 'Rose', class: 'bg-rose-50 dark:bg-rose-900/20', code: '#fff1f2' },
];

const PRIORITY_STYLES = {
    0: { bg: 'bg-white dark:bg-gray-800/40', border: 'border-transparent', iconColor: 'text-gray-300 hover:text-gray-500' },
    1: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-800', iconColor: 'text-blue-500' },
    2: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-100 dark:border-orange-800', iconColor: 'text-orange-500' },
    3: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-100 dark:border-red-800', iconColor: 'text-red-500' }
};

const PAGE_TRANSITION = { type: "tween", ease: "circOut", duration: 0.25 };
const generateId = () => Math.random().toString(36).substring(2, 9);

// --- Helpers ---
const stripHtml = (html: string) => {
    if (!html) return '';
    let text = html.replace(/<img[^>]*>/g, ' [Image] ');
    text = text.replace(/<br\s*\/?>/gi, ' ');
    text = text.replace(/<\/div>/gi, ' ');
    text = text.replace(/<\/p>/gi, ' ');
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return doc.body.textContent || "";
};

const highlightTextInHtml = (html: string, query: string) => {
    if (!query || !query.trim() || !html) return html;
    try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const walk = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
        let node;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const nodesToReplace: { node: Node, text: string }[] = [];

        while(node = walk.nextNode()) {
            if (node.nodeValue && regex.test(node.nodeValue)) {
                nodesToReplace.push({ node, text: node.nodeValue });
            }
        }

        nodesToReplace.forEach(({ node, text }) => {
            const fragment = document.createDocumentFragment();
            const parts = text.split(regex);
            parts.forEach(part => {
                if (part.toLowerCase() === query.toLowerCase()) {
                    const mark = document.createElement('mark');
                    mark.className = "rounded-sm px-0.5 bg-yellow-200 dark:bg-yellow-600 text-black dark:text-white";
                    mark.textContent = part;
                    fragment.appendChild(mark);
                } else {
                    fragment.appendChild(document.createTextNode(part));
                }
            });
            if (node.parentNode) node.parentNode.replaceChild(fragment, node);
        });

        return doc.body.innerHTML;
    } catch (e) {
        console.error("Highlight error", e);
        return html;
    }
};

const removeHighlights = (html: string) => {
    if (!html) return '';
    try {
        return html.replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1');
    } catch (e) {
        return html;
    }
};

// --- Auth Modal ---
function AuthModal({ isOpen, onClose, theme }: { isOpen: boolean, onClose: () => void, theme: Theme }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    if (!isOpen) return null;

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMsg({ type: '', text: '' });

        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
                setMsg({ type: 'success', text: 'Account created! Logging in...' });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                onClose();
            }
        } catch (err: any) {
            setMsg({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl ${theme.card} ${theme.text} border ${theme.border}`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <User size={20}/> {isSignUp ? 'Create Account' : 'Welcome Back'}
                    </h2>
                    <button onClick={onClose}><X size={18} className={theme.subText}/></button>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium mb-1 opacity-70">Email</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            className={`w-full p-2.5 rounded-lg border ${theme.border} bg-transparent text-sm focus:ring-2 focus:ring-gray-200 outline-none`} 
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1 opacity-70">Password</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            className={`w-full p-2.5 rounded-lg border ${theme.border} bg-transparent text-sm focus:ring-2 focus:ring-gray-200 outline-none`} 
                            required 
                        />
                    </div>

                    {msg.text && (
                        <div className={`text-xs p-2 rounded ${msg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            {msg.text}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${loading ? 'opacity-50 cursor-wait' : ''} bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200`}
                    >
                        {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <button 
                        onClick={() => { setIsSignUp(!isSignUp); setMsg({type:'', text:''}); }}
                        className={`text-xs ${theme.subText} hover:underline`}
                    >
                        {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Main App ---
export default function App() {
    const [isMobileMode, setIsMobileMode] = useState(window.innerWidth < 768);
    const [calendars, setCalendars] = useState<Calendar[]>([{ id: 'default', name: 'My Diary', colorIndex: 4 }]);
    const [todos, setTodos] = useState<AllTodos>({}); 
    const [entryColors, setEntryColors] = useState<AllColors>({});
    const [entries, setEntries] = useState<AllEntries>({ 'default': {} });
    
    const [activeCalendarId, setActiveCalendarId] = useState('default');
    const [visibleCalendarIds, setVisibleCalendarIds] = useState(new Set(['default']));
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [view, setView] = useState('day');
    const [themeMode, setThemeMode] = useState('light');
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [saveStatus, setSaveStatus] = useState('idle');
    const [isLoadingData, setIsLoadingData] = useState(false);
    
    const [user, setUser] = useState<FirebaseUser | null>(null);

    const theme = THEMES[themeMode];
    const searchInputRef = useRef<HTMLInputElement>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Init Auth & Settings ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Load User Configuration (Settings) from Firestore
                loadUserSettings(currentUser.uid);
            } else {
                // Reset to defaults or load from local storage if needed
                const savedTheme = localStorage.getItem('diary_theme');
                if (savedTheme && THEMES[savedTheme]) setThemeMode(savedTheme);
                setEntries({ 'default': {} });
                // We could clear calendars/todos here to ensure privacy if not logged in
            }
        });
        return () => unsubscribe();
    }, []);

    // Sync specific settings to Firestore if logged in, otherwise local
    useEffect(() => {
        if (!user) {
             localStorage.setItem('diary_theme', themeMode);
             return;
        }
        
        // Debounce saving config to avoid too many writes
        const timeout = setTimeout(async () => {
            try {
                await setDoc(doc(db, "users", user.uid, "settings", "config"), {
                   calendars,
                   todos,
                   entryColors,
                   themeMode 
                }, { merge: true });
            } catch (e) {
                console.error("Error saving settings", e);
            }
        }, 2000);
        return () => clearTimeout(timeout);
    }, [calendars, todos, entryColors, themeMode, user]);

    const loadUserSettings = async (uid: string) => {
        try {
            const docRef = doc(db, "users", uid, "settings", "config");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as UserData;
                if(data.calendars) setCalendars(data.calendars);
                if(data.todos) setTodos(data.todos);
                if(data.entryColors) setEntryColors(data.entryColors);
                if(data.themeMode) setThemeMode(data.themeMode);
            }
        } catch (e) {
            console.error("Failed to load user settings", e);
        }
    };

    // --- Firebase: Load Month Data ---
    const loadMonthData = useCallback(async () => {
        if (!user) return; 

        setIsLoadingData(true);
        const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
        
        try {
            // Firestore Query for entries in this range
            const entriesRef = collection(db, "users", user.uid, "entries");
            const q = query(
                entriesRef, 
                where("calendarId", "==", activeCalendarId),
                where("date", ">=", start),
                where("date", "<=", end)
            );
            
            const querySnapshot = await getDocs(q);
            const newEntries: EntryData = {};
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                newEntries[data.date] = data.content;
            });

            setEntries(prev => ({
                ...prev,
                [activeCalendarId]: {
                    ...(prev[activeCalendarId] || {}),
                    ...newEntries
                }
            }));
        } catch (err) {
            console.error("Failed to load month data:", err);
        } finally {
            setIsLoadingData(false);
        }
    }, [currentDate, activeCalendarId, user]);

    useEffect(() => {
        loadMonthData();
    }, [loadMonthData]);

    // --- Firebase: Upsert Single Entry ---
    const saveEntryToFirebase = useCallback(async (dateStr: string, content: string) => {
        if (!user) {
            setSaveStatus('error');
            return;
        }

        setSaveStatus('saving');
        try {
            // Using a composite ID for easy overwrite: calendarId_date
            const docId = `${activeCalendarId}_${dateStr}`;
            await setDoc(doc(db, "users", user.uid, "entries", docId), {
                calendarId: activeCalendarId,
                date: dateStr,
                content: content,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            setSaveStatus('saved');
        } catch (err) {
            console.error("Save failed:", err);
            setSaveStatus('error');
        }
    }, [activeCalendarId, user]);

    const debouncedSave = useCallback((dateStr: string, content: string) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            saveEntryToFirebase(dateStr, content);
        }, 1000); 
    }, [saveEntryToFirebase]);

    const handleEntryChange = (dateStr: string, text: string) => {
        setEntries(prev => ({ 
            ...prev, 
            [activeCalendarId]: { 
                ...(prev[activeCalendarId] || {}), 
                [dateStr]: text 
            } 
        }));
        debouncedSave(dateStr, text);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && view === 'day') {
                setView(isMobileMode ? 'week' : 'month');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view, isMobileMode]);

    const handleColorChange = (dateStr: string, colorIndex: number) => setEntryColors(prev => ({ ...prev, [activeCalendarId]: { ...(prev[activeCalendarId] || {}), [dateStr]: colorIndex } }));
    
    // Todo Handlers
    const handleTodoAdd = (text: string) => {
        const newTodo: Todo = { id: generateId(), text, completed: false, createdAt: new Date().toISOString(), priority: 0 };
        setTodos(prev => ({ ...prev, [activeCalendarId]: [...(prev[activeCalendarId] || []), newTodo] }));
    };
    const handleTodoToggle = (id: string) => {
        setTodos(prev => ({ ...prev, [activeCalendarId]: prev[activeCalendarId].map(t => t.id === id ? { ...t, completed: !t.completed } : t) }));
    };
    const handleTodoDelete = (id: string) => {
        setTodos(prev => ({ ...prev, [activeCalendarId]: prev[activeCalendarId].filter(t => t.id !== id) }));
    };
    const handleTodoEdit = (id: string, newText: string) => {
        setTodos(prev => ({ ...prev, [activeCalendarId]: prev[activeCalendarId].map(t => t.id === id ? { ...t, text: newText } : t) }));
    };
    const handleTodoReorder = (newOrder: Todo[]) => {
        setTodos(prev => ({ ...prev, [activeCalendarId]: newOrder }));
    };
    const handleTodoPriorityChange = (id: string) => {
        setTodos(prev => ({
            ...prev,
            [activeCalendarId]: prev[activeCalendarId].map(t => {
                if (t.id === id) {
                    const currentPriority = t.priority || 0;
                    const nextPriority = (currentPriority + 1) % 4; 
                    return { ...t, priority: nextPriority };
                }
                return t;
            })
        }));
    };

    const handleNavigate = (direction: 'prev' | 'next') => {
        if (view === 'month') setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
        else if (view === 'week') setCurrentDate(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
        else setSelectedDate(prev => {
            const newDate = direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1);
            if (!isSameMonth(newDate, currentDate)) setCurrentDate(newDate);
            return newDate;
        });
    };

    const toggleLayoutMode = () => {
        const newMode = !isMobileMode;
        setIsMobileMode(newMode);
        if (newMode) { setIsSidebarOpen(false); setView('week'); } else { setIsSidebarOpen(true); setView('month'); }
    };
    
    const getEntry = (date: Date) => entries[activeCalendarId]?.[format(date, 'yyyy-MM-dd')] || '';
    const pendingTodoCount = (todos[activeCalendarId] || []).filter(t => !t.completed).length;

    // --- Image Upload Logic ---
    const uploadImage = useCallback(async (file: File): Promise<string | null> => {
        if (!user) {
            alert("Please login to upload images.");
            return null;
        }
        
        const MAX_WIDTH = 1024;
        const QUALITY = 0.7;

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target?.result as string;
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(async (blob) => {
                        if(!blob) { resolve(null); return; }
                        try {
                            const fileName = `${user.uid}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                            const storageRef = ref(storage, fileName);
                            await uploadBytes(storageRef, blob, { cacheControl: '3600' });
                            const url = await getDownloadURL(storageRef);
                            resolve(url);
                        } catch (err) {
                            console.error("Upload failed", err);
                            resolve(null);
                        }
                    }, 'image/jpeg', QUALITY);
                };
            };
            reader.readAsDataURL(file);
        });
    }, [user]);

    return (
        <div className={`flex h-screen w-full overflow-hidden ${theme.bg} ${theme.text} ${themeMode === 'dark' ? 'dark' : ''}`}>
            
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} theme={theme} />

            <AnimatePresence>
                {isMobileMode && isSidebarOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-30 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
                )}
            </AnimatePresence>

            <motion.div animate={{ width: isSidebarOpen ? 260 : 0, x: isSidebarOpen ? 0 : (isMobileMode ? -260 : 0), opacity: (isSidebarOpen || isMobileMode) ? 1 : 0 }} className={`flex-shrink-0 flex flex-col ${theme.sidebar} h-full z-40 pt-safe-top overflow-hidden ${isMobileMode ? 'fixed top-0 left-0 shadow-2xl' : 'relative'} ${!isSidebarOpen && !isMobileMode ? 'pointer-events-none' : ''}`}>
                <div className="p-5 flex flex-col h-full pt-6 w-[260px]">
                    {isMobileMode && <button onClick={() => setIsSidebarOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400"><X size={20}/></button>}
                    <div className="space-y-1 flex-1 overflow-y-auto scrollbar-thin mt-8 md:mt-0">
                        <SidebarItem icon={<LayoutGrid size={18} />} label="Month View" active={view==='month'} theme={theme} onClick={() => { setView('month'); if(isMobileMode) setIsSidebarOpen(false); }} />
                        <SidebarItem icon={<Rows size={18} />} label="Week View" active={view==='week'} theme={theme} onClick={() => { setView('week'); if(isMobileMode) setIsSidebarOpen(false); }} />
                        <SidebarItem icon={<Maximize2 size={18} />} label="Focus Mode" theme={theme} onClick={() => { setSelectedDate(new Date()); setView('day'); if(isMobileMode) setIsSidebarOpen(false); }} />
                        
                        <div className="my-2 border-t border-gray-200 dark:border-gray-700 opacity-50"></div>
                        <SidebarItem 
                            icon={<CheckSquare size={18} />} 
                            label="To-Do List" 
                            active={view==='todo'} 
                            theme={theme} 
                            onClick={() => { setView('todo'); if(isMobileMode) setIsSidebarOpen(false); }}
                            badge={pendingTodoCount > 0 ? pendingTodoCount : undefined} 
                        />

                        <div className="pt-6 mt-2">
                            <p className={`px-3 text-xs font-medium mb-3 ${theme.subText} uppercase tracking-wider`}>Calendars</p>
                            {calendars.map(cal => (
                                <CalendarListItem key={cal.id} calendar={cal} isActive={activeCalendarId === cal.id} isVisible={visibleCalendarIds.has(cal.id)} theme={theme}
                                    onClick={() => { setActiveCalendarId(cal.id); setVisibleCalendarIds(prev => new Set([...prev, cal.id])); }}
                                    onToggleVisibility={() => { const newSet = new Set(visibleCalendarIds); if (newSet.has(cal.id)) { if(newSet.size>1) newSet.delete(cal.id); } else newSet.add(cal.id); setVisibleCalendarIds(newSet); }}
                                    onRename={(n) => setCalendars(calendars.map(c => c.id === cal.id ? { ...c, name: n } : c))}
                                    onChangeColor={(i) => setCalendars(calendars.map(c => c.id === cal.id ? { ...c, colorIndex: i } : c))}
                                    onDelete={() => { if(calendars.length<=1) return; setCalendars(calendars.filter(c=>c.id!==cal.id)); setActiveCalendarId(calendars.find(c=>c.id!==cal.id)!.id); }}
                                />
                            ))}
                            <button onClick={() => { const newId = generateId(); setCalendars([...calendars, { id: newId, name: 'New Calendar', colorIndex: calendars.length % 7 }]); setActiveCalendarId(newId); setVisibleCalendarIds(prev => new Set([...prev, newId])); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${theme.subText} hover:text-gray-900`}><Plus size={14} /> Add calendar</button>
                        </div>
                    </div>
                    <div className={`mt-auto pt-4 border-t ${theme.border} space-y-2`}>
                        {/* Auth Status Bar */}
                        {user ? (
                            <div className="group relative">
                                <button className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs font-medium transition-colors bg-blue-50 text-blue-700 border border-blue-100`}>
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="flex-1 text-left truncate">{user.email}</span>
                                    <LogOut size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); signOut(auth); }} />
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setIsAuthModalOpen(true)} className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs font-medium transition-colors bg-gray-100 text-gray-500 hover:bg-gray-200`}>
                                <div className="w-2 h-2 rounded-full bg-gray-400"></div> 
                                <span className="flex-1 text-left">Login / Cloud Sync</span>
                            </button>
                        )}

                        <div className={`flex items-center gap-2 px-1 py-1 text-[10px] ${saveStatus === 'error' ? 'text-red-500' : theme.subText}`}>
                            {saveStatus === 'saving' ? <Loader2 size={12} className="animate-spin"/> : (saveStatus === 'saved' ? <Check size={12}/> : <div className="w-3"/>)}
                            <span>{saveStatus === 'saving' ? 'Syncing...' : (saveStatus === 'saved' ? 'Saved' : (saveStatus === 'error' ? 'Sync Failed' : 'Ready'))}</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className={`flex-1 flex flex-col h-full overflow-hidden relative ${theme.bg}`}>
                <header className={`flex-shrink-0 px-4 md:px-8 pt-6 pb-2 ${theme.header} border-b ${theme.border}`}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 -ml-2 ${theme.subText}`} title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}><Menu size={20}/></button>
                            
                            {view === 'todo' ? (
                                <div className="hidden md:flex items-center gap-2">
                                    <h1 className={`text-xl md:text-2xl font-bold ${theme.text}`}>To-Do List</h1>
                                    <span className={`text-sm ${theme.subText} px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800`}>
                                        {calendars.find(c => c.id === activeCalendarId)?.name}
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col cursor-pointer group" onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}>
                                        <div className="flex items-center gap-2">
                                            <h1 className={`text-xl md:text-2xl font-bold ${theme.text}`}>{format(currentDate, 'MMMM yyyy')}</h1>
                                            {isLoadingData && <Loader2 size={16} className="animate-spin text-gray-400" />}
                                            <ChevronDown size={18} className={`${theme.subText}`} />
                                        </div>
                                        {isDatePickerOpen && <div className="absolute top-16 z-50"><DatePicker currentDate={currentDate} onChange={(d: Date) => { setCurrentDate(d); setIsDatePickerOpen(false); }} theme={theme} /></div>}
                                    </div>
                                    <div className={`flex items-center ${theme.card} border ${theme.border} rounded-lg shadow-sm h-9 ml-2 md:ml-0`}>
                                        <button onClick={() => handleNavigate('prev')} className={`px-2 h-full border-r ${theme.border} hover:bg-gray-50`}><ChevronLeft size={16}/></button>
                                        <button onClick={() => { const today=new Date(); setCurrentDate(today); setSelectedDate(today); }} className={`px-3 h-full text-xs font-semibold uppercase`}>{isMobileMode ? <span className="text-[10px]">T</span> : 'Today'}</button>
                                        <button onClick={() => handleNavigate('next')} className={`px-2 h-full border-l ${theme.border} hover:bg-gray-50`}><ChevronRight size={16}/></button>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative hidden md:block">
                                <Search size={14} className={`absolute left-2.5 top-2.5 ${theme.subText}`} />
                                <input ref={searchInputRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search" className={`pl-8 pr-2 py-1.5 rounded-lg border ${theme.border} text-sm w-48 focus:ring-1 focus:ring-gray-200 ${theme.card} ${theme.text}`} />
                            </div>
                            <div className="flex border rounded-lg overflow-hidden border-gray-200">
                                <button onClick={toggleLayoutMode} className={`p-2 transition-colors ${theme.card} ${theme.text} hover:bg-gray-100 border-r ${theme.border}`}>{isMobileMode ? <Monitor size={14}/> : <Smartphone size={14}/>}</button>
                                <ThemeBtn mode="light" current={themeMode} set={setThemeMode} icon={<Sun size={14} />} />
                                <ThemeBtn mode="dark" current={themeMode} set={setThemeMode} icon={<Moon size={14} />} />
                                <ThemeBtn mode="eyeCare" current={themeMode} set={setThemeMode} icon={<Eye size={14} />} />
                            </div>
                        </div>
                    </div>
                </header>

                <main className={`flex-1 overflow-hidden relative ${theme.bg}`} onClick={() => setIsDatePickerOpen(false)}>
                        <AnimatePresence mode="wait">
                        {view === 'month' ? (
                            <CalendarView key="month" viewType="month" currentDate={currentDate} entries={entries} entryColors={entryColors} calendars={calendars} activeCalendarId={activeCalendarId} visibleCalendarIds={visibleCalendarIds} theme={theme} onEntryChange={handleEntryChange} onColorChange={handleColorChange} onDayClick={(date: Date) => setSelectedDate(date)} onDayTripleClick={(date: Date) => { setSelectedDate(date); setView('day'); }} selectedDate={selectedDate} searchQuery={searchQuery} isMobileMode={isMobileMode} />
                        ) : view === 'week' ? (
                                <CalendarView key="week" viewType="week" currentDate={currentDate} entries={entries} entryColors={entryColors} calendars={calendars} activeCalendarId={activeCalendarId} visibleCalendarIds={visibleCalendarIds} theme={theme} onEntryChange={handleEntryChange} onColorChange={handleColorChange} onDayClick={(date: Date) => setSelectedDate(date)} onDayTripleClick={(date: Date) => { setSelectedDate(date); setView('day'); }} selectedDate={selectedDate} searchQuery={searchQuery} isMobileMode={isMobileMode} />
                        ) : view === 'day' ? (
                            <DayView key="day" date={selectedDate} entry={getEntry(selectedDate)} calendarName={calendars.find(c => c.id === activeCalendarId)?.name} calendarColorIndex={calendars.find(c => c.id === activeCalendarId)?.colorIndex} theme={theme} onChange={(text: string) => handleEntryChange(format(selectedDate, 'yyyy-MM-dd'), text)} onBack={() => setView(isMobileMode ? 'week' : 'month')} searchQuery={searchQuery} onUploadImage={uploadImage} />
                        ) : (
                            <TodoView 
                                key="todo" 
                                todos={todos[activeCalendarId] || []} 
                                onAdd={handleTodoAdd} 
                                onToggle={handleTodoToggle} 
                                onDelete={handleTodoDelete} 
                                onEdit={handleTodoEdit} 
                                onReorder={handleTodoReorder}
                                onPriorityChange={handleTodoPriorityChange}
                                theme={theme} 
                                calendarColor={CALENDAR_COLORS[calendars.find(c => c.id === activeCalendarId)?.colorIndex || 0]} 
                            />
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}

// --- Sub Components ---
function TodoItem({ todo, onToggle, onDelete, startEdit, editingId, editText, setEditText, saveEdit, onPriorityChange, theme, calendarColor }: any) {
    const controls = useDragControls();
    const priority = todo.priority || 0;
    const pStyle = PRIORITY_STYLES[priority as keyof typeof PRIORITY_STYLES] || PRIORITY_STYLES[0];

    return (
        <Reorder.Item
            value={todo}
            dragListener={false}
            dragControls={controls}
            dragMomentum={false} 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-colors ${pStyle.bg} select-none relative shadow-sm border ${priority === 0 ? 'border-transparent hover:border-gray-100 dark:hover:border-gray-700' : pStyle.border}`}
        >
                <div
                onPointerDown={(e) => controls.start(e)}
                className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none flex-shrink-0 p-1"
                style={{ touchAction: 'none' }} 
            >
                <GripVertical size={16} />
            </div>

            <button onClick={() => onToggle(todo.id)} className={`flex-shrink-0 transition-colors ${todo.completed ? 'text-gray-400' : calendarColor.value}`}>
                {todo.completed ? <CheckCircle size={20} /> : <Circle size={20} />}
            </button>
            
            {editingId === todo.id ? (
                <input
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') startEdit(null); }} 
                    className={`flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 outline-none ${theme.text} text-sm pb-1`}
                />
            ) : (
                <span 
                    onClick={() => startEdit(todo)}
                    className={`flex-1 text-sm transition-colors cursor-text ${todo.completed ? 'line-through text-gray-400' : theme.text}`}
                    title="Click to edit"
                >
                    {todo.text}
                </span>
            )}

            <button 
                onClick={() => onPriorityChange(todo.id)} 
                className={`p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${pStyle.iconColor}`}
                title="Change Priority"
            >
                <Circle size={14} fill={priority > 0 ? "currentColor" : "none"} strokeWidth={2} />
            </button>

            <button onClick={() => onDelete(todo.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
        </Reorder.Item>
    );
}

function TodoView({ todos, onAdd, onToggle, onDelete, onEdit, onReorder, onPriorityChange, theme, calendarColor }: any) {
    const [newTodo, setNewTodo] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTodo.trim()) { onAdd(newTodo); setNewTodo(''); }
    };
    
    const startEdit = (todo: Todo | null) => {
        if (!todo) { setEditingId(null); return; }
        setEditingId(todo.id);
        setEditText(todo.text);
    };

    const saveEdit = () => {
        if (editingId && editText.trim()) {
            onEdit(editingId, editText);
        }
        setEditingId(null);
    };

    const completedCount = todos.filter((t: Todo) => t.completed).length;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={PAGE_TRANSITION} className={`flex flex-col h-full max-w-4xl mx-auto p-4 md:p-8 w-full`}>
            <div className={`flex-1 rounded-2xl shadow-xl border ${theme.border} flex flex-col overflow-hidden ${theme.card}`}>
                <div className={`px-6 py-4 border-b ${theme.border} bg-opacity-50 flex justify-between items-center`}>
                    <h2 className={`text-lg font-bold ${theme.text}`}>My Tasks</h2>
                    <div className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                        {completedCount} / {todos.length} Completed
                    </div>
                </div>

                <form onSubmit={handleAdd} className="p-4 border-b border-gray-100 dark:border-gray-800 flex gap-2">
                    <input 
                        type="text" 
                        value={newTodo} 
                        onChange={(e) => setNewTodo(e.target.value)} 
                        placeholder="Add a new task..." 
                        className={`flex-1 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border-none outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 transition-all ${theme.text}`} 
                    />
                    <button type="submit" disabled={!newTodo.trim()} className={`px-4 py-2 rounded-lg font-medium transition-colors ${!newTodo.trim() ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>Add</button>
                </form>

                <div className="flex-1 overflow-y-auto p-2">
                    {todos.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50 gap-2">
                            <CheckSquare size={48} strokeWidth={1} />
                            <p className="text-sm">No tasks yet</p>
                        </div>
                    ) : (
                        <Reorder.Group axis="y" values={todos} onReorder={onReorder} className="space-y-1">
                            {todos.map((todo: Todo) => (
                                <TodoItem 
                                    key={todo.id}
                                    todo={todo}
                                    onToggle={onToggle}
                                    onDelete={onDelete}
                                    startEdit={startEdit}
                                    editingId={editingId}
                                    editText={editText}
                                    setEditText={setEditText}
                                    saveEdit={saveEdit}
                                    onPriorityChange={onPriorityChange}
                                    theme={theme}
                                    calendarColor={calendarColor}
                                />
                            ))}
                        </Reorder.Group>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function SidebarItem({ icon, label, active, theme, onClick, badge }: any) {
    return (
        <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 ${active ? `${theme.sidebarActive} text-gray-900` : `${theme.sidebarText} hover:bg-gray-100`}`}>
            {icon}
            <span className="flex-1 text-left">{label}</span>
            {badge > 0 && (
                <span className="flex-shrink-0 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {badge}
                </span>
            )}
        </button>
    );
}

function CalendarListItem({ calendar, isActive, isVisible, theme, onClick, onToggleVisibility, onRename, onChangeColor, onDelete }: any) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(calendar.name);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const color = CALENDAR_COLORS[calendar.colorIndex || 0];
    return (
        <div onClick={onClick} className={`group relative flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition-all text-sm ${isActive ? 'bg-gray-100' : `hover:bg-gray-50`}`}>
            <div className="flex items-center gap-3 flex-1 overflow-hidden">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0 relative" style={{ backgroundColor: color.code }} onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }} />
                {showColorPicker && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowColorPicker(false); }} />
                        <div className="absolute top-6 left-0 z-50 p-2 bg-white dark:bg-gray-800 rounded shadow-xl border border-gray-200 dark:border-gray-700 grid grid-cols-4 gap-1 w-[120px]" onClick={e=>e.stopPropagation()}>
                            {CALENDAR_COLORS.map((c, idx) => <div key={idx} className="w-5 h-5 rounded-full cursor-pointer hover:scale-110" style={{ backgroundColor: c.code }} onClick={() => { onChangeColor(idx); setShowColorPicker(false); }} />)}
                        </div>
                    </>
                )}
                {isEditing ? <input value={editName} onChange={e => setEditName(e.target.value)} onClick={e => e.stopPropagation()} onBlur={()=>{ onRename(editName); setIsEditing(false); }} className="bg-transparent border-b border-gray-300 w-full outline-none text-xs" autoFocus />
                : <span className={`truncate flex-1 font-medium ${!isVisible && !isActive ? 'opacity-50 line-through' : ''} ${color.value}`}>{calendar.name}</span>}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }} className={`p-0.5 rounded hover:bg-gray-200 text-gray-500`}> {isVisible ? <Eye size={12} /> : <EyeOff size={12} />} </button>
                    <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-0.5 hover:bg-gray-200 rounded text-gray-500"><Edit2 size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-0.5 hover:bg-red-100 hover:text-red-500 rounded text-gray-500"><Trash2 size={12} /></button>
            </div>
        </div>
    );
}

function HighlightedText({ text, highlight }: { text: string, highlight: string }) {
    if (!highlight?.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return <span>{parts.map((part, i) => part.toLowerCase() === highlight.toLowerCase() ? <mark key={i} className="highlight rounded-sm px-0.5">{part}</mark> : <span key={i}>{part}</span>)}</span>;
}

function CalendarView({ viewType, currentDate, entries, entryColors, calendars, activeCalendarId, visibleCalendarIds, theme, onEntryChange, onColorChange, onDayClick, onDayTripleClick, selectedDate, searchQuery, isMobileMode }: any) {
    const isMonth = viewType === 'month';
    let days;
    if (isMonth) {
        const monthStart = startOfMonth(currentDate);
        days = eachDayOfInterval({ start: startOfWeek(monthStart, { weekStartsOn: 0 }), end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 }) });
    } else {
        days = eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 0 }), end: endOfWeek(currentDate, { weekStartsOn: 0 }) });
    }
    const [bgPicker, setBgPicker] = useState<any>(null);
    const clickRef = useRef({ count: 0, lastTime: 0, id: '' });

    const otherVisibleCalendars = calendars.filter((c: Calendar) => visibleCalendarIds.has(c.id) && c.id !== activeCalendarId);

    const rowCount = Math.ceil(days.length / 7);
    const gridStyle = isMonth ? { gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` } : {};

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={PAGE_TRANSITION} className={`flex flex-col h-full ${theme.bg}`}>
            <div className={`grid grid-cols-7 border-b ${theme.border} ${!isMonth && isMobileMode ? 'hidden' : 'grid'}`}>
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(w => <div key={w} className={`px-4 py-2 text-xs font-semibold ${theme.subText} text-center`}>{w}</div>)}
            </div>
            <div 
                className={`flex-1 grid ${isMonth ? 'grid-cols-7' : (isMobileMode ? 'grid-cols-1 grid-rows-7' : 'grid-cols-7 grid-rows-1')} overflow-y-auto`}
                style={gridStyle}
            >
                {days.map((day: Date, i: number) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isCurrent = isSameMonth(day, currentDate);
                    const colorIndex = entryColors[activeCalendarId]?.[dateStr] || 0;
                    const bgColorClass = ENTRY_BG_COLORS[colorIndex]?.class || '';
                    const opacityClass = (isMonth && !isCurrent) ? 'bg-opacity-50 opacity-50' : '';

                    return (
                        <div key={dateStr}
                            onClick={(e) => {
                                e.stopPropagation();
                                const now = Date.now();
                                if (clickRef.current.id === dateStr && (now - clickRef.current.lastTime) < 400) clickRef.current.count++; else clickRef.current = { count: 1, id: dateStr, lastTime: now };
                                onDayClick(day);
                                if (clickRef.current.count >= 3) onDayTripleClick(day);
                            }}
                            className={`relative flex flex-col border-b border-r ${theme.border} ${bgColorClass} ${opacityClass} ${isSameDay(day, selectedDate) ? 'ring-inset ring-2 ring-indigo-400' : ''} group transition-colors`}
                        >
                            <div className="flex justify-between p-1 items-center flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    {!isMonth && isMobileMode && <span className={`text-xs font-bold ${theme.subText} uppercase w-8`}>{format(day, 'EEE')}</span>}
                                    <span className={`text-xs font-medium ${isToday(day) ? 'bg-gray-900 text-white w-6 h-6 flex items-center justify-center rounded-full' : theme.text}`}>{format(day, "d")}</span>
                                </div>
                                <button className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-gray-600 transition-colors" onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setBgPicker({ dateStr, top: r.bottom, left: r.right - 120 }); }}><div className="w-2 h-2 rounded-full bg-current opacity-50 hover:opacity-100"></div></button>
                            </div>
                            
                            <div className="flex-1 w-full flex flex-col gap-1 overflow-hidden min-h-0 px-2 pb-2 mini-cell-content">
                                {otherVisibleCalendars.map((cal: Calendar) => {
                                    const txt = entries[cal.id]?.[dateStr];
                                    if (!txt) return null;
                                    const calColor = CALENDAR_COLORS[cal.colorIndex || 0];
                                    const preview = stripHtml(txt);
                                    return (
                                        <div key={cal.id} className={`text-xs ${calColor.value} opacity-90 truncate flex-shrink-0`}>
                                            <HighlightedText text={preview} highlight={searchQuery} />
                                        </div>
                                    );
                                })}
                                
                                <div
                                    className={`w-full h-full text-xs md:text-sm leading-relaxed ${theme.text} break-words whitespace-pre-wrap outline-none overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-600 cursor-text`}
                                    contentEditable={true}
                                    suppressContentEditableWarning={true}
                                    onBlur={(e) => {
                                        const rawHtml = e.currentTarget.innerHTML;
                                        const cleanHtml = removeHighlights(rawHtml);
                                        if (cleanHtml !== (entries[activeCalendarId]?.[dateStr] || '')) {
                                            onEntryChange(dateStr, cleanHtml);
                                        }
                                    }}
                                    dangerouslySetInnerHTML={{ 
                                        __html: highlightTextInHtml(entries[activeCalendarId]?.[dateStr] || '', searchQuery) 
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const now = Date.now();
                                        if (clickRef.current.id === dateStr && (now - clickRef.current.lastTime) < 400) clickRef.current.count++; else clickRef.current = { count: 1, id: dateStr, lastTime: now };
                                        onDayClick(day);
                                        if (clickRef.current.count >= 3) onDayTripleClick(day);
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            {bgPicker && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setBgPicker(null)} />
                    <div className="fixed z-50 p-3 rounded-xl shadow-xl border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 grid grid-cols-5 gap-2" style={{ top: bgPicker.top, left: bgPicker.left }}>
                        {ENTRY_BG_COLORS.map((c, idx) => (
                            <div key={idx} 
                                className={`w-6 h-6 rounded-full cursor-pointer ${c.class || 'bg-white'} border border-black/5 hover:scale-110 transition-transform relative`} 
                                style={{backgroundColor: c.code}}
                                onClick={() => { onColorChange(bgPicker.dateStr, idx); setBgPicker(null); }}
                            >
                            </div>
                        ))}
                    </div>
                </>
            )}
        </motion.div>
    );
}

function DayView({ date, entry, calendarName, calendarColorIndex, theme, onChange, onBack, searchQuery, onUploadImage }: any) {
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (editorRef.current) {
            let html = entry || '';
            if (html && !html.includes('<') && html.includes('\n')) {
                html = html.replace(/\n/g, '<br>');
            }
            if (editorRef.current.innerHTML !== html) {
                editorRef.current.innerHTML = html;
            }
        }
    }, [date, entry]); 

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        const html = e.currentTarget.innerHTML;
        onChange(html);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                if(blob) handleImageUpload(blob);
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleImageUpload(e.target.files[0]);
        }
        e.target.value = ''; 
    };

    const handleImageUpload = async (file: File) => {
        setIsUploading(true);
        const url = await onUploadImage(file);
        setIsUploading(false);
        
        if (url) {
            document.execCommand('insertHTML', false, `<img src="${url}" />`);
            if(editorRef.current) {
                onChange(editorRef.current.innerHTML);
            }
        }
    };

    return (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={PAGE_TRANSITION} className="flex flex-col h-full max-w-3xl mx-auto p-4 md:p-8 w-full relative">
            <button onClick={onBack} className="md:hidden mb-2 text-sm text-gray-500 flex items-center gap-1"><ChevronLeft size={16}/> Back</button>
            <div className={`rounded-2xl shadow-xl border ${theme.border} flex flex-col h-full overflow-hidden ${theme.card} relative`}>
                <div className={`px-6 py-4 border-b ${theme.border} bg-opacity-50 flex justify-between items-center`}>
                    <div>
                        <h2 className={`text-2xl font-bold ${theme.text}`}>{format(date, 'd MMMM yyyy')}</h2>
                        <p className={`text-xs uppercase tracking-wide ${CALENDAR_COLORS[calendarColorIndex || 0].value}`}>{format(date, 'EEEE')} • {calendarName}</p>
                    </div>
                    {isUploading && <div className="text-xs text-blue-500 flex items-center gap-1 animate-pulse"><Loader2 size={12} className="animate-spin"/> Uploading...</div>}
                </div>
                
                <div 
                    ref={editorRef}
                    contentEditable
                    onInput={handleInput}
                    onPaste={handlePaste}
                    className={`rich-editor flex-1 w-full p-6 text-lg leading-relaxed outline-none overflow-y-auto bg-transparent ${theme.text} ${CALENDAR_COLORS[calendarColorIndex || 0].value}`} 
                    placeholder="Write here..."
                />
                
                <div className="absolute bottom-6 right-6">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-12 h-12 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95"
                        title="Add Image"
                        disabled={isUploading}
                    >
                        <Plus size={24} />
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileSelect} 
                    />
                </div>
            </div>
        </motion.div>
    );
}

function DatePicker({ currentDate, onChange, theme }: any) {
    const [viewMode, setViewMode] = useState('month');
    const [viewYear, setViewYear] = useState(getYear(currentDate));
    const months = Array.from({ length: 12 }, (_, i) => i);
    const startYear = viewYear - 5;
    const years = Array.from({ length: 12 }, (_, i) => startYear + i);

    return (
        <div className={`p-4 rounded-xl shadow-2xl border ${theme.border} ${theme.card} w-64 animate-in fade-in zoom-in-95 duration-150`}>
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => { if(viewMode==='month') onChange(subYears(currentDate, 1)); else setViewYear(viewYear - 12); }} className={`p-1 hover:bg-gray-100 rounded ${theme.subText}`}><ChevronLeft size={16}/></button>
                <button onClick={() => setViewMode(viewMode === 'month' ? 'year' : 'month')} className={`font-semibold hover:bg-gray-100 px-2 py-1 rounded transition-colors ${theme.text}`}>{viewMode === 'month' ? format(currentDate, 'yyyy') : `${startYear} - ${startYear + 11}`}</button>
                <button onClick={() => { if(viewMode==='month') onChange(addYears(currentDate, 1)); else setViewYear(viewYear + 12); }} className={`p-1 hover:bg-gray-100 rounded ${theme.subText}`}><ChevronRight size={16}/></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {viewMode === 'month' ? (months.map(m => (
                        <button key={m} onClick={() => onChange(setMonth(currentDate, m))} className={`py-2 rounded text-sm hover:bg-gray-50 ${getMonth(currentDate) === m ? 'bg-gray-900 text-white font-medium' : theme.text}`}>{format(new Date(2000, m, 1), 'MMM')}</button>
                    ))) : (years.map(y => (
                        <button key={y} onClick={() => { onChange(setYear(currentDate, y)); setViewMode('month'); }} className={`py-2 rounded text-sm hover:bg-gray-50 ${getYear(currentDate) === y ? 'bg-gray-900 text-white font-medium' : theme.text} ${y === getYear(new Date()) ? 'border border-gray-200' : ''}`}>{y}</button>
                    )))}
            </div>
        </div>
    );
}

function ThemeBtn({ mode, current, set, icon }: any) {
    return <button onClick={() => set(mode)} className={`p-2 transition-colors ${current === mode ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>{icon}</button>;
}