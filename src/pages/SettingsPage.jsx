import { useState, useEffect } from 'react';
import { useUIStore } from '@/store/ui-store';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { Globe, Clock, Calendar, Lock, KeyRound, Timer, Upload, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('appearance');
  const { 
    colorScheme, 
    setColorScheme, 
    glassMode, 
    toggleGlassMode, 
    bgWallpaper, 
    setBgWallpaper, 
    customWallpaperUrl, 
    setCustomWallpaperUrl 
  } = useUIStore();
  const { theme, setTheme } = useTheme();
  const [, setSettings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Local form state for general settings
  const [timezone, setTimezone] = useState('America/New_York');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [language, setLanguage] = useState('en');

  // Local form state for security settings
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [passwordMinLength, setPasswordMinLength] = useState('8');

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get('/settings');
        const data = response.data.data || [];
        setSettings(data);

        // Populate form from fetched settings
        data.forEach((s) => {
          if (s.key === 'timezone') setTimezone(s.value);
          if (s.key === 'dateFormat') setDateFormat(s.value);
          if (s.key === 'language') setLanguage(s.value);
          if (s.key === 'sessionTimeout') setSessionTimeout(s.value);
          if (s.key === 'passwordMinLength') setPasswordMinLength(s.value);
        });
      } catch {
        // Settings might not be accessible without auth — use defaults
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const saveSetting = async (key, value, category) => {
    try {
      await apiClient.put(`/settings/${key}`, { value, category });
    } catch {
      // Silently fail if auth not available
    }
  };

  const palettes = [
    { id: 'sapphire', name: 'Sapphire', color: 'bg-blue-500' },
    { id: 'emerald', name: 'Emerald', color: 'bg-emerald-500' },
    { id: 'amber', name: 'Amber', color: 'bg-amber-500' },
    { id: 'ruby', name: 'Ruby', color: 'bg-rose-500' },
    { id: 'violet', name: 'Violet', color: 'bg-violet-500' },
    { id: 'slate', name: 'Slate', color: 'bg-slate-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your application preferences</p>
      </div>

      <div className="flex border-b border-border">
        {['General', 'Appearance', 'Security'].map(tab => (
          <button
            key={tab}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.toLowerCase() ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab(tab.toLowerCase())}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="pt-4 max-w-2xl">
        {activeTab === 'appearance' && (
          <div className="space-y-8 animate-in">
            <div className="glass-card p-6 rounded-xl">
              <h3 className="text-lg font-medium mb-4">Color Scheme</h3>
              <div className="grid grid-cols-3 gap-4">
                {palettes.map(p => (
                  <button
                    key={p.id}
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-lg border transition-all",
                      colorScheme === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}
                    onClick={() => setColorScheme(p.id)}
                  >
                    <div className={cn("w-6 h-6 rounded-full", p.color)} />
                    <span className="font-medium text-sm">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Glassmorphism Toggle */}
            <div className="glass-card p-6 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Glassmorphism</h3>
                <p className="text-sm text-muted-foreground">Enable modern translucent frosted glass UI effects</p>
              </div>
              <button
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  glassMode ? "bg-primary" : "bg-muted"
                )}
                onClick={toggleGlassMode}
              >
                <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", glassMode ? "translate-x-6" : "translate-x-1")} />
              </button>
            </div>

            {/* Background Image Upload for Glassmorphism */}
            <div className="glass-card p-6 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Background Image</h3>
                  <p className="text-sm text-muted-foreground">Upload a custom wallpaper or use our AI generated glass wallpaper</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBgWallpaper('cement');
                      setCustomWallpaperUrl('/cement-factory-bg.png');
                    }}
                    className="px-3.5 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    🏭 Cement Factory
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomWallpaperUrl('/glass_wallpaper.png');
                      setBgWallpaper('custom');
                    }}
                    className="px-3.5 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    ✨ AI Glass
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-1">
                {/* File Upload & URL Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Upload Image File</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        id="wallpaper-upload"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setCustomWallpaperUrl(reader.result);
                              setBgWallpaper('custom');
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <label
                        htmlFor="wallpaper-upload"
                        className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-input/60 bg-background/40 backdrop-blur-md hover:bg-muted/50 text-sm font-medium cursor-pointer transition-all shadow-sm"
                      >
                        <Upload size={16} className="text-primary" />
                        <span>Choose File...</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Or Paste Image URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/wallpaper.jpg"
                      value={customWallpaperUrl && !customWallpaperUrl.startsWith('data:') ? customWallpaperUrl : ''}
                      onChange={(e) => {
                        const url = e.target.value;
                        setCustomWallpaperUrl(url);
                        if (url) {
                          setBgWallpaper('custom');
                        } else {
                          setBgWallpaper('none');
                        }
                      }}
                      className="w-full h-10 px-3 rounded-lg border border-input/60 bg-background/40 backdrop-blur-md text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Preview and Clear Button */}
                {customWallpaperUrl && (
                  <div className="relative rounded-xl border border-border overflow-hidden h-36 flex items-center justify-center group">
                    <img
                      src={customWallpaperUrl}
                      alt="Background Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <span className="text-xs font-semibold text-white bg-black/60 px-3 py-1.5 rounded-full border border-white/20">
                        Active Wallpaper
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomWallpaperUrl('');
                          setBgWallpaper('none');
                        }}
                        className="px-3 py-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                        Remove Image
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <div className="glass-card p-6 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Dark Mode</h3>
                <p className="text-sm text-muted-foreground">Toggle between light and dark themes</p>
              </div>
              <button
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  theme === 'dark' ? "bg-primary" : "bg-muted"
                )}
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", theme === 'dark' ? "translate-x-6" : "translate-x-1")} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'general' && (
          <div className="space-y-6 animate-in">
            {isLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-card border border-border animate-pulse" />)}
              </div>
            ) : (
              <>
                <div className="glass-card p-6 rounded-xl space-y-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Globe size={20} className="text-primary" />
                    <h3 className="text-lg font-medium">Timezone</h3>
                  </div>
                  <select
                    value={timezone}
                    onChange={(e) => { setTimezone(e.target.value); saveSetting('timezone', e.target.value, 'general'); }}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  >
                    <option value="America/New_York">America/New York (EST)</option>
                    <option value="America/Chicago">America/Chicago (CST)</option>
                    <option value="America/Los_Angeles">America/Los Angeles (PST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                  </select>
                </div>

                <div className="glass-card p-6 rounded-xl space-y-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Calendar size={20} className="text-primary" />
                    <h3 className="text-lg font-medium">Date Format</h3>
                  </div>
                  <select
                    value={dateFormat}
                    onChange={(e) => { setDateFormat(e.target.value); saveSetting('dateFormat', e.target.value, 'general'); }}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                    <option value="DD-MMM-YYYY">DD-MMM-YYYY</option>
                  </select>
                </div>

                <div className="glass-card p-6 rounded-xl space-y-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Clock size={20} className="text-primary" />
                    <h3 className="text-lg font-medium">Language</h3>
                  </div>
                  <select
                    value={language}
                    onChange={(e) => { setLanguage(e.target.value); saveSetting('language', e.target.value, 'general'); }}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="hi">हिन्दी</option>
                    <option value="ja">日本語</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6 animate-in">
            {isLoading ? (
              <div className="space-y-4">
                {[1,2].map(i => <div key={i} className="h-20 rounded-xl bg-card border border-border animate-pulse" />)}
              </div>
            ) : (
              <>
                <div className="glass-card p-6 rounded-xl space-y-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Timer size={20} className="text-primary" />
                    <h3 className="text-lg font-medium">Session Timeout</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Auto-logout after inactivity (minutes)</p>
                  <select
                    value={sessionTimeout}
                    onChange={(e) => { setSessionTimeout(e.target.value); saveSetting('sessionTimeout', e.target.value, 'security'); }}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                    <option value="480">8 hours</option>
                  </select>
                </div>

                <div className="glass-card p-6 rounded-xl space-y-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <KeyRound size={20} className="text-primary" />
                    <h3 className="text-lg font-medium">Password Policy</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Minimum password length</p>
                  <select
                    value={passwordMinLength}
                    onChange={(e) => { setPasswordMinLength(e.target.value); saveSetting('passwordMinLength', e.target.value, 'security'); }}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  >
                    <option value="6">6 characters</option>
                    <option value="8">8 characters</option>
                    <option value="10">10 characters</option>
                    <option value="12">12 characters</option>
                    <option value="16">16 characters</option>
                  </select>
                </div>

                <div className="glass-card p-6 rounded-xl space-y-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Lock size={20} className="text-primary" />
                    <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-medium">Enforce 2FA</span>
                    <button
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        "bg-muted"
                      )}
                      disabled
                    >
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground italic">2FA configuration will be available in a future update.</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
